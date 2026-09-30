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
  wasConvertedFromMeters: boolean;
  wasLikelyInCentimeters: boolean;
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
    geometry
  };
}
