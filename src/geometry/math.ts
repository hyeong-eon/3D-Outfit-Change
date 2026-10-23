export interface Pt {
  x: number;
  y: number;
}

/** Outline point; `c` marks a sharp corner (no smoothing through it). */
export interface P extends Pt {
  c?: boolean;
}

export const p = (x: number, y: number, c = false): P => ({ x, y, c });
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const linspace = (a: number, b: number, n: number) =>
  Array.from({ length: n }, (_, i) => (n === 1 ? a : lerp(a, b, i / (n - 1))));

/** Piecewise-linear lookup; stops must be sorted by x. Clamps outside the range. */
export function interp(stops: [number, number][], x: number): number {
  if (x <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [x1, y1] = stops[i];
    if (x <= x1) {
      const [x0, y0] = stops[i - 1];
      return x1 === x0 ? y1 : lerp(y0, y1, (x - x0) / (x1 - x0));
    }
  }
  return stops[stops.length - 1][1];
}

const f = (n: number) => Math.round(n * 100) / 100;

/** Catmull-Rom spline through the points, emitted as cubic Béziers. */
export function smooth(points: P[], closed = true): string {
  const n = points.length;
  if (n < 2) return '';
  const get = (i: number) => (closed ? points[(i + n) % n] : points[clamp(i, 0, n - 1)]);
  const tangent = (i: number): Pt => {
    if (get(i).c || (!closed && (i === 0 || i === n - 1))) return { x: 0, y: 0 };
    const a = get(i - 1);
    const b = get(i + 1);
    return { x: (b.x - a.x) / 6, y: (b.y - a.y) / 6 };
  };
  let d = `M${f(points[0].x)},${f(points[0].y)}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = get(i);
    const b = get(i + 1);
    const ta = tangent(i);
    const tb = tangent(i + 1);
    d += ` C${f(a.x + ta.x)},${f(a.y + ta.y)} ${f(b.x - tb.x)},${f(b.y - tb.y)} ${f(b.x)},${f(b.y)}`;
  }
  return closed ? `${d} Z` : d;
}

export const mirrorX = (pts: P[]): P[] => pts.map((q) => ({ ...q, x: -q.x }));

/**
 * Builds a symmetric closed outline from its right half. The half must start and
 * end on the centre line (x = 0), listed top to bottom.
 */
export function mirrored(right: P[]): string {
  const left = mirrorX(right.slice(1, -1)).reverse();
  return smooth([...right, ...left], true);
}

export const polygon = (pts: Pt[]) => `M${pts.map((q) => `${f(q.x)},${f(q.y)}`).join(' L')} Z`;
export const rect = (x0: number, y0: number, x1: number, y1: number) => polygon([
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
]);
export const line = (pts: Pt[]) => smooth(pts, false);
