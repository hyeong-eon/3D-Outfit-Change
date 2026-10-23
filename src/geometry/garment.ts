import type { Garment, GarmentMeasurements, GarmentType } from '../model/garments';
import { frontWidth, SHOULDER_VISIBLE, type BodyGeometry } from './body';
import { clamp, interp, lerp, line, linspace, mirrored, mirrorX, p, rect, smooth, type P, type Pt } from './math';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GarmentPart {
  d: string;
  kind: 'main' | 'sleeve' | 'trim';
}

export interface Detail {
  d: string;
  style: 'fold' | 'seam' | 'rib';
}

/** Region of the garment tinted by the fit heatmap; `key` matches a FitItem key. */
export interface Band {
  key: string;
  d: string;
  clip: 'main' | 'all';
}

export interface GarmentShape {
  parts: GarmentPart[];
  mainBox: Box;
  details: Detail[];
  bands: Band[];
}

/**
 * Half the visible width of a garment worn over a body section. Tight garments
 * stretch to the body; loose ones flatten out and hang wider.
 */
export function wornHalf(garmentCirc: number, bodyCirc: number, depthRatio: number): number {
  const bodyHalf = frontWidth(bodyCirc, depthRatio) / 2;
  const ease = garmentCirc - bodyCirc;
  if (ease <= 0) return bodyHalf + 0.15;
  const r = lerp(depthRatio, 0.35, Math.min(1, ease / 30));
  return Math.max(bodyHalf + 0.25, frontWidth(garmentCirc, r) / 2);
}

function waistbandHalf(b: BodyGeometry, y: number, garmentCirc: number): number {
  const ease = garmentCirc - b.torsoCircAt(y);
  const base = b.torsoHalfAt(y);
  return ease <= 0 ? base + 0.15 : base + 0.2 + Math.min(ease, 10) * 0.08;
}

function boxOf(pts: Pt[]): Box {
  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

const both = (d: (sign: 1 | -1) => string) => [d(1), d(-1)];

/** The same open line on both sides of the body. */
const pair = (pts: P[], style: Detail['style'] = 'fold'): Detail[] => [
  { d: line(pts), style },
  { d: line(mirrorX(pts)), style },
];

// ---------------------------------------------------------------------------
// Tops

export interface TopLayout {
  /** How far the shoulder seam sits past the body's shoulder point (cm, along the arm). */
  drop: number;
  hpsY: number;
  hemY: number;
  armholeY: number;
  /** Sleeve end measured along the arm from the shoulder point. */
  sleeveEnd: number;
}

export function topLayout(b: BodyGeometry, m: GarmentMeasurements): TopLayout {
  const drop = (m.shoulder - b.m.shoulderWidth) / 2;
  return {
    drop,
    hpsY: b.y.hps - 0.4,
    hemY: b.y.hps + m.length,
    armholeY: Math.max(b.y.armpit + 1.2, b.y.hps + m.sleeveWidth + Math.max(0, drop) * 0.5),
    sleeveEnd: drop + m.sleeveLength,
  };
}

function shapeTop(b: BodyGeometry, m: GarmentMeasurements, type: GarmentType): GarmentShape {
  const L = topLayout(b, m);
  const { arm } = b;
  const neckX = b.half.neck + 1.3;
  const neckDepth = 7.5;

  const seam: P =
    L.drop >= 0
      ? { ...arm.edgeAt(L.drop, 1), c: true }
      : p(b.half.shoulder + L.drop * SHOULDER_VISIBLE, b.y.shoulder + 0.6, true);

  // Side seam, from armpit to hem. A garment hangs straight down unless the body
  // or the pattern pushes it outward.
  const n = 8;
  const side: P[] = [];
  let prevHalf = Infinity;
  let prevG = m.chest * 2;
  for (let i = 0; i <= n; i++) {
    const yy = lerp(L.armholeY, L.hemY, i / n);
    const G = lerp(m.chest * 2, m.hem * 2, i / n);
    let h = wornHalf(G, b.torsoCircAt(yy), b.torsoRatioAt(yy));
    if (i > 0) h = Math.min(h, prevHalf + Math.max(0, G - prevG) / Math.PI);
    h = Math.max(h, b.torsoHalfAt(yy) + 0.3);
    side.push(p(h, yy, i === 0 || i === n));
    prevHalf = h;
    prevG = G;
  }
  const armpit = side[0];
  const sideX = (yy: number) => interp(side.map((q): [number, number] => [q.y, q.x]), yy);
  const hem = side[n];

  const right: P[] = [
    p(0, L.hpsY + neckDepth),
    p(neckX * 0.65, L.hpsY + neckDepth * 0.72),
    p(neckX, L.hpsY, true),
    p(lerp(neckX, seam.x, 0.5), lerp(L.hpsY, seam.y, 0.3) - 0.3),
    ...(L.drop > 1 ? [p(b.half.shoulder + 0.4, b.y.shoulder + 0.5)] : []),
    seam,
    p(lerp(seam.x, armpit.x, 0.45) + 0.6, lerp(seam.y, armpit.y, 0.55)),
    ...side,
    p(hem.x * 0.5, L.hemY + 0.3),
    p(0, L.hemY + 0.4),
  ];
  const main = mirrored(right);

  // Right sleeve, measured along the arm from the shoulder point.
  const dStart = Math.max(L.drop, -2);
  const dEnd = Math.max(L.sleeveEnd, dStart + 2);
  const topHalf = wornHalf(m.sleeveWidth * 2, arm.circAt(Math.max(dStart, 0) + 3), 0.95);
  const endHalf = wornHalf(m.sleeveOpening * 2, arm.circAt(dEnd), 0.85);
  const sleeveHalf = (d: number) =>
    Math.max(arm.halfAt(clamp(d, 0, arm.length)) + 0.3, lerp(topHalf, endHalf, clamp((d - dStart) / (dEnd - dStart), 0, 1)));
  // A tube around the arm; its top edge, drawn over the body panel, reads as the armhole seam.
  const ds = linspace(dStart, dEnd, 5);
  const capTop = arm.pointAt(dStart - 2.2);
  const sleevePts: P[] = [
    seam,
    ...ds.slice(1).map((d, i) => ({ ...arm.edgeAt(d, 1, sleeveHalf(d)), c: i === ds.length - 2 })),
    ...[...ds].reverse().map((d, i) => {
      const q = arm.edgeAt(d, -1, sleeveHalf(d));
      // Near the armhole the sleeve joins the body panel at its side seam, not over the chest.
      return p(q.y < L.armholeY + 4 ? Math.max(q.x, sideX(q.y) - 0.6) : q.x, q.y, i === 0);
    }),
    p(lerp(capTop.x, seam.x, 0.25), capTop.y),
  ];
  const sleeveSlice = (d0: number, d1: number) => {
    const a = clamp(d0, dStart, dEnd);
    const z = clamp(d1, dStart, dEnd);
    return [
      arm.edgeAt(a, 1, sleeveHalf(a) + 0.2),
      arm.edgeAt(z, 1, sleeveHalf(z) + 0.2),
      arm.edgeAt(z, -1, sleeveHalf(z) + 0.2),
      arm.edgeAt(a, -1, sleeveHalf(a) + 0.2),
    ].map((q) => p(q.x, q.y, true));
  };

  const parts: GarmentPart[] = [
    { d: smooth(sleevePts), kind: 'sleeve' },
    { d: smooth(mirrorX(sleevePts)), kind: 'sleeve' },
  ];
  const details: Detail[] = [];
  if (type === 'longsleeve') {
    const cuff = sleeveSlice(dEnd - 4, dEnd);
    parts.push({ d: smooth(cuff), kind: 'trim' }, { d: smooth(mirrorX(cuff)), kind: 'trim' });
    // Elbow creases
    const elbow = arm.length * 0.45;
    const crease = [arm.edgeAt(elbow - 1, -1, sleeveHalf(elbow) * 0.7), arm.edgeAt(elbow + 1, 1, sleeveHalf(elbow) * 0.4)];
    details.push(...pair(crease.map((q) => p(q.x, q.y))));
  }
  parts.push({ d: main, kind: 'main' });

  // Neck rib
  const rib: P[] = [p(-neckX, L.hpsY), p(-neckX * 0.65, L.hpsY + neckDepth * 0.72), p(0, L.hpsY + neckDepth), p(neckX * 0.65, L.hpsY + neckDepth * 0.72), p(neckX, L.hpsY)];
  details.push({ d: line(rib), style: 'rib' });

  // Drape folds where there is room to hang
  const chestEase = m.chest * 2 - b.m.chest;
  if (chestEase > 10) {
    const k = Math.min(1, (chestEase - 10) / 20);
    const fold = [p(armpit.x - 1, armpit.y + 2), p(armpit.x - 3 - 3 * k, armpit.y + 9 + 6 * k)];
    details.push(...pair(fold));
  }
  if (L.drop > 3) {
    const fold = [arm.edgeAt(L.drop + 2, -1, sleeveHalf(L.drop + 2) * 0.6), arm.edgeAt(L.drop + 6, 1, sleeveHalf(L.drop + 6) * 0.2)];
    details.push(...pair(fold));
  }

  const shoulderBand = (s: 1 | -1) => {
    const pts = [p(neckX, L.hpsY - 1.2), p(seam.x + 1.2, seam.y - 1.5), p(seam.x - 0.5, seam.y + 3), p(neckX, L.hpsY + 3)];
    return smooth(s === 1 ? pts : mirrorX(pts));
  };
  const sleeveTop = sleeveSlice(dStart, dStart + Math.min(10, (dEnd - dStart) * 0.6));
  const sleeveEndSlice = sleeveSlice(dEnd - 4, dEnd + 0.5);
  const bands: Band[] = [
    ...both(shoulderBand).map((d) => ({ key: 'shoulder', d, clip: 'all' as const })),
    { key: 'chest', d: rect(-60, L.armholeY, 60, L.armholeY + 7), clip: 'main' },
    { key: 'hem', d: rect(-60, L.hemY - 7, 60, L.hemY + 1), clip: 'main' },
    ...[sleeveTop, mirrorX(sleeveTop)].map((pts) => ({ key: 'sleeveWidth', d: smooth(pts), clip: 'all' as const })),
    ...[sleeveEndSlice, mirrorX(sleeveEndSlice)].map((pts) => ({ key: 'sleeveLength', d: smooth(pts), clip: 'all' as const })),
  ];

  return { parts, mainBox: boxOf([...right, ...mirrorX(right)]), details, bands };
}

// ---------------------------------------------------------------------------
// Bottoms

export interface BottomLayout {
  wbY: number;
  hipY: number;
  crotchY: number;
  thighY: number;
  hemY: number;
  /** Where the hem would end if the floor didn't stop it. */
  lengthEnd: number;
  /** Fabric that piles up at the ankle (cm). */
  stack: number;
}

export function bottomLayout(b: BodyGeometry, type: GarmentType, m: GarmentMeasurements): BottomLayout {
  if (type === 'skirt') {
    const wbY = b.y.waist + 1.5;
    const lengthEnd = wbY + m.length;
    const hemY = Math.min(lengthEnd, b.y.floor - 0.4);
    return { wbY, hipY: Math.max(b.y.hip, wbY + 5), crotchY: b.y.crotch, thighY: b.y.thigh, hemY, lengthEnd, stack: 0 };
  }
  // Trousers sit where their rise lets them: a short rise rides low on the hips.
  const wbY = clamp(b.y.crotch + 1.5 - m.rise, b.y.waist - 5, b.y.hip - 3);
  const crotchY = Math.max(wbY + m.rise, b.y.crotch + 0.4);
  const thighY = crotchY + 2.5;
  const lengthEnd = Math.max(wbY + m.length, thighY + 2);
  const hemY = Math.min(lengthEnd, b.y.floor - 0.4);
  return { wbY, hipY: Math.max(b.y.hip, wbY + 4), crotchY, thighY, hemY, lengthEnd, stack: lengthEnd - hemY };
}

function shapeBottom(b: BodyGeometry, m: GarmentMeasurements, type: GarmentType): GarmentShape {
  const L = bottomLayout(b, type, m);
  const wbHalf = waistbandHalf(b, L.wbY, m.waist * 2);
  const hipHalf = Math.max(wbHalf, wornHalf(m.hip * 2, b.torsoCircAt(L.hipY), b.torsoRatioAt(L.hipY)));
  const bandH = 3.5;
  const details: Detail[] = [];
  let right: P[];

  if (type === 'skirt') {
    const legsHalf = L.hemY > b.y.crotch ? b.leg.outerAt(L.hemY) : b.torsoHalfAt(L.hemY);
    const hemHalf = Math.max(legsHalf + 0.5, m.hem * 0.46, L.hemY > L.hipY ? 0 : hipHalf);
    right = [
      p(0, L.wbY),
      p(wbHalf, L.wbY, true),
      p(hipHalf, L.hipY),
      p(lerp(hipHalf, hemHalf, 0.5), lerp(L.hipY, L.hemY, 0.5)),
      p(hemHalf, L.hemY, true),
      p(hemHalf * 0.5, L.hemY + 0.4),
      p(0, L.hemY + 0.5),
    ];
    if (hemHalf > hipHalf + 3) {
      for (const t of [0.3, 0.65]) {
        const fold = [p(hipHalf * t, L.hipY + 2), p(hemHalf * (t + 0.08), L.hemY - 1)];
        details.push(...pair(fold));
      }
    }
  } else {
    const ys = linspace(L.thighY, L.hemY, 7);
    const hemG = m.hem * 2 + Math.min(L.stack, 10) * 0.6;
    let prevH = Infinity;
    let prevG = m.thigh * 2;
    const legs = ys.map((yy, i) => {
      const G = lerp(m.thigh * 2, hemG, i / (ys.length - 1));
      let h = wornHalf(G, b.leg.circAt(yy), 0.92);
      if (i > 0) h = Math.min(h, prevH + Math.max(0, G - prevG) / Math.PI);
      h = Math.max(h, b.leg.halfAt(yy) + 0.3);
      prevH = h;
      prevG = G;
      const c = b.leg.centerAt(yy);
      return { y: yy, outer: c + h, inner: Math.max(0.2, c - h) };
    });
    legs[0].outer = Math.max(legs[0].outer, hipHalf * 0.98);
    const last = legs.length - 1;
    right = [
      p(0, L.wbY),
      p(wbHalf, L.wbY, true),
      p(hipHalf, L.hipY),
      ...legs.map((l, i) => p(l.outer, l.y, i === last)),
      ...[...legs].reverse().map((l, i) => p(l.inner, l.y, i === 0)),
      p(0, L.crotchY, true),
    ];
    // Fly, pockets, centre crease
    details.push({ d: line([p(0.4, L.wbY + bandH), p(0.6, L.crotchY - 6), p(3, L.crotchY - 4.5), p(0.2, L.crotchY - 1.5)]), style: 'seam' });
    const pocket = [p(wbHalf - 5.5, L.wbY + bandH), p(lerp(wbHalf, hipHalf, 0.6) - 1.5, L.wbY + 10), p(lerp(wbHalf, hipHalf, 0.8), L.wbY + 13)];
    details.push(...pair(pocket, 'seam'));
    if (type === 'pants') {
      const kneeY = b.y.knee;
      const k = legs.find((l) => l.y >= kneeY) ?? legs[last];
      const kneeFold = [p(k.inner + 1, kneeY - 2), p(lerp(k.inner, k.outer, 0.55), kneeY), p(k.outer - 1.5, kneeY - 1)];
      details.push(...pair(kneeFold));
    }
    if (L.stack > 0.5) {
      const l = legs[last];
      const count = Math.min(4, Math.ceil(L.stack / 2.5));
      for (let i = 0; i < count; i++) {
        const yy = L.hemY - 1.5 - i * 2.4;
        const zig = [p(l.inner + 0.5, yy), p(lerp(l.inner, l.outer, 0.4), yy - 1), p(lerp(l.inner, l.outer, 0.7), yy + 0.4), p(l.outer - 0.4, yy - 0.6)];
        details.push(...pair(zig));
      }
    }
  }

  const side = (yy: number) => (yy <= L.hipY ? lerp(wbHalf, hipHalf, (yy - L.wbY) / (L.hipY - L.wbY)) : hipHalf);
  const band = [p(-wbHalf, L.wbY, true), p(wbHalf, L.wbY, true), p(side(L.wbY + bandH), L.wbY + bandH, true), p(-side(L.wbY + bandH), L.wbY + bandH, true)];
  const parts: GarmentPart[] = [
    { d: mirrored(right), kind: 'main' },
    { d: smooth(band), kind: 'trim' },
  ];

  const bands: Band[] = [
    { key: 'waist', d: rect(-60, L.wbY - 0.5, 60, L.wbY + 4.5), clip: 'all' },
    { key: 'hip', d: rect(-60, L.hipY - 3, 60, L.hipY + 3), clip: 'all' },
    { key: 'hem', d: rect(-60, L.hemY - 5, 60, L.hemY + 1), clip: 'all' },
  ];
  if (type !== 'skirt') bands.push({ key: 'thigh', d: rect(-60, L.thighY, 60, L.thighY + 8), clip: 'all' });

  return { parts, mainBox: boxOf([...right, ...mirrorX(right)]), details, bands };
}

export function shapeGarment(b: BodyGeometry, g: Garment): GarmentShape {
  return g.type === 'tshirt' || g.type === 'longsleeve'
    ? shapeTop(b, g.measurements, g.type)
    : shapeBottom(b, g.measurements, g.type);
}
