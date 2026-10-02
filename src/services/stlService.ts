import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

export interface MeshHealthReport {
  isWatertight: boolean;
  openEdgesCount: number;
  nonManifoldEdgesCount: number;
  invertedNormalsCount: number;
  totalTriangles: number;
  totalUniqueEdges: number;
  status: 'perfecto' | 'advertencia' | 'critico';
  diagnostico: string;
  recomendacion: string;
  openEdgePositions?: Float32Array; // Coordenadas [x1,y1,z1, x2,y2,z2, ...] para pintar las aristas abiertas en Three.js
}

export interface STLAnalysisResult {
  fileName: string;
  fileSizeBytes: number;
  trianglesCount: number;
  originalDimensions: {
    x: number; // Ancho (Horizontal)
    y: number; // Fondo (Profundidad)
    z: number; // Altura (Vertical)
  };
  originalVolumeMm3: number;
  originalVolumeCm3: number;
  bboxVolumeCm3: number;
  isVolumeEstimated: boolean;
  wasConvertedFromMeters: boolean;
  wasLikelyInCentimeters: boolean;
  geometry: THREE.BufferGeometry;
  meshHealth: MeshHealthReport;
}

/**
 * Calcula el volumen exacto de una malla triangular 3D (en mm³)
 * Utiliza el teorema de la divergencia / suma de tetraedros orientados con respecto al origen.
 */
export function calculateGeometryVolume(geometry: THREE.BufferGeometry): number {
  const position = geometry.attributes.position;
  if (!position) return 0;

  const count = position.count;
  let totalVolume = 0;

  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();

  // Si tiene índice (Indexed BufferGeometry)
  if (geometry.index) {
    const indices = geometry.index;
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i);
      const b = indices.getX(i + 1);
      const c = indices.getX(i + 2);

      p1.fromBufferAttribute(position, a);
      p2.fromBufferAttribute(position, b);
      p3.fromBufferAttribute(position, c);

      totalVolume += (
        -p3.x * p2.y * p1.z +
         p2.x * p3.y * p1.z +
         p3.x * p1.y * p2.z -
         p1.x * p3.y * p2.z -
         p2.x * p1.y * p3.z +
         p1.x * p2.y * p3.z
      ) / 6.0;
    }
  } else {
    // Geometría no indexada (STL estándar directo)
    for (let i = 0; i < count; i += 3) {
      p1.fromBufferAttribute(position, i + 0);
      p2.fromBufferAttribute(position, i + 1);
      p3.fromBufferAttribute(position, i + 2);

      totalVolume += (
        -p3.x * p2.y * p1.z +
         p2.x * p3.y * p1.z +
         p3.x * p1.y * p2.z -
         p1.x * p3.y * p2.z -
         p2.x * p1.y * p3.z +
         p1.x * p2.y * p3.z
      ) / 6.0;
    }
  }

  return Math.abs(totalVolume);
}

/**
 * Parsea un archivo STL (Binario o ASCII) desde ArrayBuffer y extrae métricas 3D
 */
export function analyzeSTLFile(buffer: ArrayBuffer, fileName: string): STLAnalysisResult {
  const loader = new STLLoader();
  const geometry = loader.parse(buffer);

  // Computar normales y caja delimitadora inicial
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  const bbox = geometry.boundingBox || new THREE.Box3();
  const size = new THREE.Vector3();
  bbox.getSize(size);

  // 1. Detección automática de escala (Metros vs Milímetros vs Centímetros):
  let wasConvertedFromMeters = false;
  const initialMaxDim = Math.max(size.x, size.y, size.z);
  
  // Si la dimensión máxima es menor a 2.5 (ej. 0.15m), fue exportado en METROS -> convertir a mm (x1000)
  if (initialMaxDim > 0 && initialMaxDim < 2.5) {
    geometry.scale(1000, 1000, 1000);
    geometry.computeBoundingBox();
    geometry.boundingBox?.getSize(size);
    wasConvertedFromMeters = true;
  }

  // Si la dimensión máxima está entre 2.5 y 35 (ej. 12 = 12cm = 120mm): muy probablemente en centímetros
  const currentMaxDim = Math.max(size.x, size.y, size.z);
  const wasLikelyInCentimeters = !wasConvertedFromMeters && currentMaxDim >= 2.5 && currentMaxDim <= 35;

  // Centrar la geometría en el origen para facilitar la rotación 3D
  geometry.center();

  let volumeMm3 = calculateGeometryVolume(geometry);
  const bboxVolumeMm3 = size.x * size.y * size.z;
  const bboxVolumeCm3 = bboxVolumeMm3 / 1000;

  // 2. Detección matemática de volumen anómalo o no hermético:
  // - Si el cálculo del teorema de divergencia da <= 0, NaN o excede la caja envolvente (+10% margen numérico)
  //   o es inferior al 1% de la caja envolvente, significa que la malla no es hermética (caras abiertas o invertidas).
  let isVolumeEstimated = false;
  if (!volumeMm3 || isNaN(volumeMm3) || volumeMm3 < (bboxVolumeMm3 * 0.01) || volumeMm3 > (bboxVolumeMm3 * 1.10)) {
    // Estimación física de pieza maciza/sólida: 65% de la caja envolvente (geometrías orgánicas y mecánicas promedio).
    // IMPORTANTE: No reducir a 35% aquí, para evitar doble descuento cuando el usuario aplique modo ahuecado en la interfaz.
    volumeMm3 = bboxVolumeMm3 * 0.65;
    isVolumeEstimated = true;
  }

  const volumeCm3 = volumeMm3 / 1000;
  const trianglesCount = (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;

  // 3. Inspección minuciosa de salud de la malla (caras abiertas, aristas no manifold y hermeticidad)
  const meshHealth = analyzeMeshHealth(geometry);

  return {
    fileName,
    fileSizeBytes: buffer.byteLength,
    trianglesCount: Math.round(trianglesCount),
    originalDimensions: {
      x: Number(size.x.toFixed(2)),
      y: Number(size.y.toFixed(2)),
      z: Number(size.z.toFixed(2))
    },
    originalVolumeMm3: Number(volumeMm3.toFixed(2)),
    originalVolumeCm3: volumeCm3 < 0.01 ? Number(volumeCm3.toFixed(4)) : Number(volumeCm3.toFixed(2)),
    bboxVolumeCm3: bboxVolumeCm3 < 0.01 ? Number(bboxVolumeCm3.toFixed(4)) : Number(bboxVolumeCm3.toFixed(2)),
    isVolumeEstimated,
    wasConvertedFromMeters,
    wasLikelyInCentimeters,
    geometry,
    meshHealth
  };
}

/**
 * Inspecciona exhaustivamente una BufferGeometry en busca de:
 * 1. Aristas abiertas (Naked Edges / Agujeros / Caras abiertas) -> count === 1
 * 2. Aristas no-manifold (T-junctions / Caras triples) -> count > 2
 * 3. Normales invertidas
 * 4. Genera buffer de líneas para visualización 3D en rojo de las aristas defectuosas
 */
export function analyzeMeshHealth(geometry: THREE.BufferGeometry): MeshHealthReport {
  const position = geometry.attributes.position;
  if (!position) {
    return {
      isWatertight: false,
      openEdgesCount: 0,
      nonManifoldEdgesCount: 0,
      invertedNormalsCount: 0,
      totalTriangles: 0,
      totalUniqueEdges: 0,
      status: 'critico',
      diagnostico: 'Geometría sin vértices.',
      recomendacion: 'Verifica el archivo STL.'
    };
  }

  // Mapa de aristas: clave con resolución de 0.001 mm (1 micra) para absorber micro-variaciones numéricas de coma flotante
  const edgeMap = new Map<string, { count: number; v0: THREE.Vector3; v1: THREE.Vector3; directed: { from: string; to: string }[] }>();

  const toKey = (v: THREE.Vector3) => `${Math.round(v.x * 1000)},${Math.round(v.y * 1000)},${Math.round(v.z * 1000)}`;

  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();

  const addEdge = (a: THREE.Vector3, b: THREE.Vector3) => {
    const kA = toKey(a);
    const kB = toKey(b);
    if (kA === kB) return; // Arista degenerada (longitud cero)

    const edgeKey = kA < kB ? `${kA}|${kB}` : `${kB}|${kA}`;
    let entry = edgeMap.get(edgeKey);
    if (!entry) {
      entry = {
        count: 0,
        v0: a.clone(),
        v1: b.clone(),
        directed: []
      };
      edgeMap.set(edgeKey, entry);
    }
    entry.count++;
    entry.directed.push({ from: kA, to: kB });
  };

  let triCount = 0;
  if (geometry.index) {
    const index = geometry.index;
    triCount = index.count / 3;
    for (let i = 0; i < index.count; i += 3) {
      v0.fromBufferAttribute(position, index.getX(i));
      v1.fromBufferAttribute(position, index.getX(i + 1));
      v2.fromBufferAttribute(position, index.getX(i + 2));
      addEdge(v0, v1);
      addEdge(v1, v2);
      addEdge(v2, v0);
    }
  } else {
    triCount = position.count / 3;
    for (let i = 0; i < position.count; i += 3) {
      v0.fromBufferAttribute(position, i);
      v1.fromBufferAttribute(position, i + 1);
      v2.fromBufferAttribute(position, i + 2);
      addEdge(v0, v1);
      addEdge(v1, v2);
      addEdge(v2, v0);
    }
  }

  let openEdgesCount = 0;
  let nonManifoldEdgesCount = 0;
  let invertedNormalsCount = 0;
  const openLineCoords: number[] = [];

  edgeMap.forEach((entry) => {
    if (entry.count === 1) {
      openEdgesCount++;
      openLineCoords.push(entry.v0.x, entry.v0.y, entry.v0.z, entry.v1.x, entry.v1.y, entry.v1.z);
    } else if (entry.count > 2) {
      nonManifoldEdgesCount++;
    } else if (entry.count === 2) {
      // En una superficie orientable cerrada, dos caras adyacentes deben cruzar la arista en sentidos opuestos
      if (entry.directed.length === 2 && entry.directed[0].from === entry.directed[1].from) {
        invertedNormalsCount++;
      }
    }
  });

  const isWatertight = openEdgesCount === 0 && nonManifoldEdgesCount === 0;

  let status: 'perfecto' | 'advertencia' | 'critico' = 'perfecto';
  let diagnostico = '';
  let recomendacion = '';

  if (isWatertight && invertedNormalsCount === 0) {
    status = 'perfecto';
    diagnostico = 'Malla 100% hermética (Watertight / Sólido Manifold cerrado).';
    recomendacion = 'El archivo está en perfectas condiciones para laminar e imprimir en Anycubic Photon Workshop sin errores de relleno.';
  } else if (openEdgesCount > 0 && openEdgesCount <= 80 && nonManifoldEdgesCount === 0) {
    status = 'advertencia';
    diagnostico = `Se detectaron ${openEdgesCount} aristas abiertas (fisuras superficiales o caras no selladas).`;
    recomendacion = 'Puedes presionar "Reparar Malla en Línea" para soldar los vértices y cerrar las fugas antes de enviar a taller.';
  } else {
    status = 'critico';
    diagnostico = `Malla no hermética con ${openEdgesCount} bordes abiertos y ${nonManifoldEdgesCount} aristas no-múltiples.`;
    recomendacion = 'Prueba la reparación automática en el visor. Si aún quedan caras complejas abiertas, se recomienda "Voxel Remesh" o "Fix Holes" en Photon Workshop o Microsoft 3D Builder.';
  }

  return {
    isWatertight,
    openEdgesCount,
    nonManifoldEdgesCount,
    invertedNormalsCount,
    totalTriangles: Math.round(triCount),
    totalUniqueEdges: edgeMap.size,
    status,
    diagnostico,
    recomendacion,
    openEdgePositions: openLineCoords.length > 0 ? new Float32Array(openLineCoords) : undefined
  };
}

/**
 * Corrige y repara errores típicos en mallas STL:
 * 1. Soldadura de vértices desoldados (Welding) con tolerancia de 0.05 mm
 * 2. Cierre y sellado de orificios de borde cerrados (Hole Capping)
 * 3. Recálculo automático de normales hacia el exterior
 */
export function repairMeshGeometry(geometry: THREE.BufferGeometry): {
  repairedGeometry: THREE.BufferGeometry;
  report: MeshHealthReport;
  weldedVerticesCount: number;
  healedHolesCount: number;
} {
  // 1. Clonar para preservar el original
  let geom = geometry.clone();
  const initialVertCount = geom.attributes.position.count;

  // 2. Soldar vértices desconectados (unifica fisuras por exportación o tolerancia)
  try {
    const merged = BufferGeometryUtils.mergeVertices(geom, 0.05);
    if (merged) {
      geom = merged;
    }
  } catch (err) {
    console.warn('mergeVertices omitido:', err);
  }

  const finalVertCount = geom.attributes.position.count;
  const weldedVerticesCount = Math.max(0, initialVertCount - finalVertCount);

  // 3. Detectar loops de aristas abiertas simples y sellarlas con tapas trianguladas
  let healedHolesCount = 0;
  try {
    const preHealth = analyzeMeshHealth(geom);
    if (preHealth.openEdgesCount > 0 && preHealth.openEdgePositions) {
      const nonIndexed = geom.toNonIndexed();
      const posAttr = nonIndexed.attributes.position;
      const positions: number[] = Array.from(posAttr.array);

      const edgePositions = preHealth.openEdgePositions;
      const numEdges = edgePositions.length / 6;

      const adj = new Map<string, { pt: THREE.Vector3; nextKeys: string[]; nextPts: THREE.Vector3[] }>();
      const toK = (x: number, y: number, z: number) => `${Math.round(x * 100)},${Math.round(y * 100)},${Math.round(z * 100)}`;

      for (let i = 0; i < numEdges; i++) {
        const x1 = edgePositions[i * 6 + 0];
        const y1 = edgePositions[i * 6 + 1];
        const z1 = edgePositions[i * 6 + 2];
        const x2 = edgePositions[i * 6 + 3];
        const y2 = edgePositions[i * 6 + 4];
        const z2 = edgePositions[i * 6 + 5];

        const k1 = toK(x1, y1, z1);
        const k2 = toK(x2, y2, z2);

        if (!adj.has(k1)) adj.set(k1, { pt: new THREE.Vector3(x1, y1, z1), nextKeys: [], nextPts: [] });
        adj.get(k1)!.nextKeys.push(k2);
        adj.get(k1)!.nextPts.push(new THREE.Vector3(x2, y2, z2));
      }

      const visited = new Set<string>();
      adj.forEach((node, startKey) => {
        if (visited.has(startKey)) return;

        const loop: THREE.Vector3[] = [node.pt];
        let currKey = startKey;
        let isClosed = false;

        for (let step = 0; step < 24; step++) {
          const currNode = adj.get(currKey);
          if (!currNode || currNode.nextKeys.length === 0) break;

          const nextKey = currNode.nextKeys[0];
          const nextPt = currNode.nextPts[0];

          if (nextKey === startKey) {
            isClosed = true;
            break;
          }

          if (visited.has(nextKey)) break;
          loop.push(nextPt);
          currKey = nextKey;
        }

        if (isClosed && loop.length >= 3 && loop.length <= 24) {
          loop.forEach(pt => visited.add(toK(pt.x, pt.y, pt.z)));

          const p0 = loop[0];
          for (let k = 1; k < loop.length - 1; k++) {
            const p1 = loop[k];
            const p2 = loop[k + 1];
            positions.push(p0.x, p0.y, p0.z);
            positions.push(p1.x, p1.y, p1.z);
            positions.push(p2.x, p2.y, p2.z);
          }
          healedHolesCount++;
        }
      });

      if (healedHolesCount > 0) {
        const newGeom = new THREE.BufferGeometry();
        newGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom = BufferGeometryUtils.mergeVertices(newGeom, 0.05);
      }
    }
  } catch (err) {
    console.warn('Fallo al tapar orificios automáticamente:', err);
  }

  // 4. Recalcular normales orientadas
  geom.computeVertexNormals();
  geom.computeBoundingBox();

  // 5. Diagnóstico tras la reparación
  const report = analyzeMeshHealth(geom);

  return {
    repairedGeometry: geom,
    report,
    weldedVerticesCount,
    healedHolesCount
  };
}

/**
 * Exporta una geometría a archivo STL binario descargable
 */
export function exportGeometryToSTL(geometry: THREE.BufferGeometry, baseFileName: string): void {
  const exporter = new STLExporter();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  const stlBinary = exporter.parse(mesh, { binary: true });

  const blob = new Blob([stlBinary], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const cleanName = baseFileName.replace(/\.stl$/i, '');
  a.href = url;
  a.download = `${cleanName}_reparado_WJG.stl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
