/**
 * Servicio de procesamiento y optimización de imágenes para WJGEEKS 3D.
 * Redimensiona y comprime imágenes (fotos desde celulares o capturas de canvas Three.js)
 * para mantener la base de datos ligera, evitar desbordar localStorage y asegurar
 * que la generación de PDFs con jsPDF sea rápida y nítida.
 */

export async function processAndOptimizeImage(
  input: File | string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.85
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

        // Convertir a JPEG para fotos o PNG para transparencia
        const isPng = typeof input === 'string' && input.startsWith('data:image/png');
        const outputFormat = isPng ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputFormat, quality);

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
