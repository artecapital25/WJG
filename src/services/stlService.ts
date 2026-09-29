import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

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
  geometry: THREE.BufferGeometry;
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

  // Computar normales y caja delimitadora
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  const bbox = geometry.boundingBox || new THREE.Box3();
  const size = new THREE.Vector3();
  bbox.getSize(size);

  // Centrar la geometría en el origen para facilitar la rotación 3D
  geometry.center();

  let volumeMm3 = calculateGeometryVolume(geometry);
  const bboxVolumeMm3 = size.x * size.y * size.z;
  const bboxVolumeCm3 = bboxVolumeMm3 / 1000;

  // Detección de malla defectuosa o no hermética:
  // Si el cálculo da 0, NaN o es inferior al 3% de la caja envolvente, significa que el STL tiene
  // caras invertidas, mallas disjuntas o huecos que cancelan el teorema de la divergencia.
  let isVolumeEstimated = false;
  if (!volumeMm3 || isNaN(volumeMm3) || volumeMm3 < (bboxVolumeMm3 * 0.03)) {
    // Estimación física para piezas y figuras de resina: 45% del volumen de la caja envolvente
    volumeMm3 = bboxVolumeMm3 * 0.45;
    isVolumeEstimated = true;
  }

  const volumeCm3 = volumeMm3 / 1000;
  const trianglesCount = (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;

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
    originalVolumeCm3: Number(volumeCm3.toFixed(2)),
    bboxVolumeCm3: Number(bboxVolumeCm3.toFixed(2)),
    isVolumeEstimated,
    geometry
  };
}
