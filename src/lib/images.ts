export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

export class UploadError extends Error {}

export function validateImage(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new UploadError('That file does not look like an image. Please choose a JPEG, PNG, WebP or HEIC photo.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new UploadError('That photo is larger than 25 MB. Please choose a smaller version.');
  }
}

/**
 * Create a small JPEG thumbnail for the gallery. The original file is always
 * stored untouched; if the browser cannot decode the image (e.g. HEIC on some
 * browsers), we return undefined and the gallery falls back to the original.
 */
export async function createThumbnail(file: Blob, maxSide = 640): Promise<Blob | undefined> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return await new Promise<Blob | undefined>((resolve) => canvas.toBlob((b) => resolve(b ?? undefined), 'image/jpeg', 0.82));
  } catch {
    return undefined;
  }
}

export function extensionFor(mime: string, fallbackName = ''): string {
  const fromName = fallbackName.match(/\.([a-z0-9]{2,5})$/i)?.[1];
  if (fromName) return fromName.toLowerCase();
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/avif': 'avif',
  };
  return map[mime] ?? 'img';
}
