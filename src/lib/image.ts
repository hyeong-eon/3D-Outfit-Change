export interface ProcessedPhoto {
  dataUrl: string;
  width: number;
  height: number;
  /** Dominant fabric colour, used under the photo and on parts the photo doesn't cover. */
  color: string;
}

const MAX_SIDE = 640;
const BG_TOLERANCE = 40;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 읽을 수 없어요'));
    img.src = src;
  });
}

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/**
 * Downscales a garment photo, removes a plain background by flood-filling from the
 * edges, crops to the garment and picks its dominant colour. Runs fully in the browser.
 */
export async function processGarmentPhoto(file: File, removeBackground: boolean): Promise<ProcessedPhoto> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const s = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * s));
    const h = Math.max(1, Math.round(img.height * s));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, w, h);
    const image = ctx.getImageData(0, 0, w, h);
    const px = image.data;

    if (removeBackground) removeEdgeBackground(px, w, h);

    // Crop to visible pixels
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (px[(y * w + x) * 4 + 3] > 0) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    if (x1 < 0) throw new Error('사진에서 옷을 찾지 못했어요. 배경 제거를 끄고 다시 올려 보세요.');
    ctx.putImageData(image, 0, 0);

    const cw = x1 - x0 + 1;
    const ch = y1 - y0 + 1;
    const out = document.createElement('canvas');
    out.width = cw;
    out.height = ch;
    out.getContext('2d')!.drawImage(canvas, x0, y0, cw, ch, 0, 0, cw, ch);

    return {
      dataUrl: removeBackground ? out.toDataURL('image/png') : out.toDataURL('image/jpeg', 0.88),
      width: cw,
      height: ch,
      color: dominantColor(px, w, x0, y0, x1, y1),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function removeEdgeBackground(px: Uint8ClampedArray, w: number, h: number) {
  // Background colour = average of the border pixels
  let r = 0, g = 0, b = 0, n = 0;
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    r += px[i];
    g += px[i + 1];
    b += px[i + 2];
    n++;
  };
  for (let x = 0; x < w; x++) {
    sample(x, 0);
    sample(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    sample(0, y);
    sample(w - 1, y);
  }
  r /= n;
  g /= n;
  b /= n;

  const isBg = (i: number) => {
    const dr = px[i * 4] - r, dg = px[i * 4 + 1] - g, db = px[i * 4 + 2] - b;
    return dr * dr + dg * dg + db * db < BG_TOLERANCE * BG_TOLERANCE;
  };
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (i: number) => {
    if (!seen[i] && isBg(i)) {
      seen[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  let removed = 0;
  while (stack.length) {
    const i = stack.pop()!;
    removed++;
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < w * (h - 1)) push(i + w);
  }
  // If almost everything matched, the photo has no plain background: keep it as is.
  if (removed > w * h * 0.95) return;
  for (let i = 0; i < w * h; i++) if (seen[i]) px[i * 4 + 3] = 0;
}

function dominantColor(px: Uint8ClampedArray, w: number, x0: number, y0: number, x1: number, y1: number): string {
  const bins = new Map<number, [number, number, number, number]>();
  for (let y = y0; y <= y1; y += 2)
    for (let x = x0; x <= x1; x += 2) {
      const i = (y * w + x) * 4;
      if (px[i + 3] === 0) continue;
      const key = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
      const bin = bins.get(key) ?? [0, 0, 0, 0];
      bin[0] += px[i];
      bin[1] += px[i + 1];
      bin[2] += px[i + 2];
      bin[3]++;
      bins.set(key, bin);
    }
  let best: [number, number, number, number] = [154, 165, 177, 1];
  for (const bin of bins.values()) if (bin[3] > best[3]) best = bin;
  return hex(best[0] / best[3], best[1] / best[3], best[2] / best[3]);
}

/** Mixes a #rrggbb colour toward black (amount < 0) or white (amount > 0). */
export function shadeColor(color: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  const mix = (v: number) => v + (target - v) * t;
  return hex(mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255));
}
