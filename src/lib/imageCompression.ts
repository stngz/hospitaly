/**
 * Client-side JPEG compression utility for Firestore `media` documents (Spec §1 & §3).
 * Resizes images to at most 1600px wide/tall and steps down JPEG quality until <= 300 KB / 380,000 characters.
 */

export interface CompressedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

const MAX_DIMENSION = 1600;
const MAX_BYTES = 260 * 1024; // 260 KB
const MAX_DATA_URL_LENGTH = 380000; // Well below 409600 char limit in firestore.rules

function estimateBase64Bytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}

export async function compressImageFileToJpeg(file: File): Promise<CompressedImageResult> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not decode image'));
    el.src = dataUrl;
  });

  let targetW = img.naturalWidth || img.width || 800;
  let targetH = img.naturalHeight || img.height || 600;

  if (targetW > MAX_DIMENSION || targetH > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / targetW, MAX_DIMENSION / targetH);
    targetW = Math.max(1, Math.round(targetW * ratio));
    targetH = Math.max(1, Math.round(targetH * ratio));
  }

  const canvas = document.createElement('canvas');
  const qualities = [0.82, 0.72, 0.62, 0.52, 0.42, 0.32];
  const scales = [1, 0.85, 0.7, 0.55];

  for (const scale of scales) {
    const w = Math.max(1, Math.round(targetW * scale));
    const h = Math.max(1, Math.round(targetH * scale));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    for (const q of qualities) {
      const encoded = canvas.toDataURL('image/jpeg', q);
      const sizeBytes = estimateBase64Bytes(encoded);
      if (sizeBytes <= MAX_BYTES && encoded.length <= MAX_DATA_URL_LENGTH) {
        return { dataUrl: encoded, width: w, height: h, sizeBytes };
      }
    }
  }

  // Fallback: iteratively scale down until strictly under MAX_DATA_URL_LENGTH
  let currentScale = 0.45;
  while (currentScale > 0.05) {
    const w = Math.max(1, Math.round(targetW * currentScale));
    const h = Math.max(1, Math.round(targetH * currentScale));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const encoded = canvas.toDataURL('image/jpeg', 0.5);
      if (encoded.length <= MAX_DATA_URL_LENGTH) {
        return {
          dataUrl: encoded,
          width: w,
          height: h,
          sizeBytes: estimateBase64Bytes(encoded),
        };
      }
    }
    currentScale *= 0.75;
  }

  const fallback = canvas.toDataURL('image/jpeg', 0.2);
  return {
    dataUrl: fallback,
    width: canvas.width,
    height: canvas.height,
    sizeBytes: estimateBase64Bytes(fallback),
  };
}
