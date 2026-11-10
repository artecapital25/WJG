/**
 * Servicio de procesamiento y optimización de imágenes para WJGEEKS 3D.
 * Redimensiona y comprime imágenes (fotos desde celulares o capturas de canvas Three.js)
 * a formato WebP ultraliviano (25 KB - 40 KB) para mantener la base de datos ligera,
 * evitar desbordar localStorage y asegurar subidas ultrarrápidas a Supabase Storage.
 */

export async function processAndOptimizeImage(
  input: File | string,
  maxWidth = 640,
  maxHeight = 640,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calcular relación de aspecto
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback a imagen original si no hay contexto canvas
          if (typeof input === 'string') resolve(input);
          else {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.readAsDataURL(input);
          }
          return;
        }

        // Suavizado de bordes para alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Dibujar en el lienzo redimensionado
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir prioritariamente a WebP (ultra compacto) o JPEG de respaldo
        let dataUrl = '';
        try {
          dataUrl = canvas.toDataURL('image/webp', quality);
          // Si el navegador no soporta webp, devuelve image/png
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };

      img.onerror = (err) => {
        console.error('Error cargando imagen en processAndOptimizeImage:', err);
        reject(new Error('No se pudo procesar la imagen seleccionada.'));
      };

      if (typeof input === 'string') {
        img.src = input;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(input);
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Convierte un DataURL Base64 a un Blob binario para subida eficiente a Supabase Storage
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'image/webp';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Convierte un File a un Blob optimizado directamente
 */
export async function fileToOptimizedBlob(
  file: File,
  maxWidth = 640,
  maxHeight = 640,
  quality = 0.75
): Promise<Blob> {
  const dataUrl = await processAndOptimizeImage(file, maxWidth, maxHeight, quality);
  return dataUrlToBlob(dataUrl);
}

/**
 * Descarga una imagen DataURL directamente en el dispositivo del usuario
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
