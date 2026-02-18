/**
 * Compresses an image file to max 1200px on the longest side,
 * JPEG quality 0.82. Returns a new File ready for upload.
 * Falls through untouched for non-image files.
 */
export async function compressImage(file: File, maxPx = 1200, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width <= maxPx && height <= maxPx) {
        // Already small enough — skip compression
        resolve(file);
        return;
      }

      const ratio = Math.min(maxPx / width, maxPx / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => {
          if (!blob) { resolve(file); return; }
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fall through on error
    };

    img.src = url;
  });
}
