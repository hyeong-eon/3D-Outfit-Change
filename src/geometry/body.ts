import type { BodyMeasurements } from '../model/body';
import { interp, lerp, mirrored, mirrorX, p, smooth, type P, type Pt } from './math';

/** Front view sees ~90% of the back-measured shoulder width. */
export const SHOULDER_VISIBLE = 0.9;
const ARM_ANGLE = (12 * Math.PI) / 180;

/**
 * Visible front width of a body (or garment) cross-section, modelled as an
 * ellipse with depth = width * depthRatio. Perimeter ≈ π(a + b).
 */
export function frontWidth(circ: number, depthRatio: number): number {
  return (2 * circ) / (Math.PI * (1 + depthRatio));
}

export interface ArmGeometry {
  length: number;
  handLength: number;
  origin: Pt;
  dir: Pt;
  normal: Pt;
  pointAt(d: number): Pt;
  circAt(d: number): number;
  halfAt(d: number): number;
  /** Point on the right arm's outer (side = 1) or inner (side = -1) edge, `half` from the axis. */
  edgeAt(d: number, side: 1 | -1, half?: number): Pt;
}

export interface LegGeometry {
  centerAt(y: number): number;
  circAt(y: number): number;
  halfAt(y: number): number;
  outerAt(y: number): number;
  innerAt(y: number): number;
}

export interface BodyGeometry {
  m: BodyMeasurements;
  y: {
    hps: number;
    shoulder: number;
    armpit: number;
    chest: number;
    waist: number;
    hip: number;
    crotch: number;
    thigh: number;
    midThigh: number;
    knee: number;
    calf: number;
    ankle: number;
    floor: number;
  };
  half: { neck: number; shoulder: number; armpit: number; chest: number; waist: number; hip: number };
  head: { cx: number; cy: number; rx: number; ry: number };
  arm: ArmGeometry;
  leg: LegGeometry;
  torsoCircAt(y: number): number;
  torsoHalfAt(y: number): number;
  torsoRatioAt(y: number): number;
}

/**
 * Converts measurements to a front-view skeleton in cm. y grows downward from the
 * top of the head; x is measured from the body's centre line (right side positive).
 */
export function computeBody(m: BodyMeasurements): BodyGeometry {
  const H = m.height;
  const female = m.sex === 'female';
  const headH = H * (female ? 0.136 : 0.132);

  const hps = H * 0.18;
  const shoulder = hps + 3.5;
  // Torso length is taped over the chest; its vertical drop is ~90% of that.
  const waist = hps + m.torsoLength * 0.9;
  const crotch = Math.max(H - m.inseam, waist + 12);
  const torso = waist - hps;
  const ankle = H * 0.955;
  const thigh = crotch + 3;
  const knee = lerp(crotch, ankle, 0.5);
  const y = {
    hps,
    shoulder,
    armpit: hps + torso * 0.42,
    chest: hps + torso * 0.55,
    waist,
    hip: lerp(waist, crotch, 0.62),
    crotch,
    thigh,
    midThigh: lerp(thigh, knee, 0.5),
    knee,
    calf: lerp(knee, ankle, 0.3),
    ankle,
    floor: H,
  };

  const r = { chest: female ? 0.76 : 0.72, waist: 0.78, hip: female ? 0.8 : 0.78 };
  const chestHalf = frontWidth(m.chest, r.chest) / 2;
  const half = {
    neck: frontWidth(m.neck, 0.95) / 2,
    shoulder: Math.max((m.shoulderWidth * SHOULDER_VISIBLE) / 2, chestHalf + 1),
    armpit: chestHalf * 0.97,
    chest: chestHalf,
    waist: frontWidth(m.waist, r.waist) / 2,
    hip: frontWidth(m.hip, r.hip) / 2,
  };

  // Legs
  const legCircStops: [number, number][] = [
    [crotch, m.thigh * 1.03],
    [thigh, m.thigh],
    [y.midThigh, lerp(m.thigh, m.calf, 0.4)],
    [knee, m.calf * 0.98],
    [y.calf, m.calf],
    [ankle, m.ankle],
    [H, m.ankle * 1.2],
  ];
  const legCircAt = (yy: number) => interp(legCircStops, yy);
  const legHalfAt = (yy: number) => frontWidth(legCircAt(yy), 0.92) / 2;
  const thighHalf = legHalfAt(thigh);
  // Relaxed stance: a small gap between the thighs, feet a little apart, each leg a
  // straight line so the outline has no kinks.
  const cxT = Math.max(thighHalf + 0.6, half.hip - thighHalf);
  const cxA = cxT + H * 0.02;
  const legCenterStops: [number, number][] = [
    [crotch, cxT],
    [thigh, cxT],
    [H, cxA],
  ];
  const leg: LegGeometry = {
    centerAt: (yy) => interp(legCenterStops, yy),
    circAt: legCircAt,
    halfAt: legHalfAt,
    outerAt: (yy) => interp(legCenterStops, yy) + legHalfAt(yy),
    innerAt: (yy) => Math.max(0.25, interp(legCenterStops, yy) - legHalfAt(yy)),
  };

  // Torso
  const torsoCircStops: [number, number][] = [
    [hps, m.chest * 0.92],
    [y.armpit, m.chest * 0.98],
    [y.chest, m.chest],
    [waist, m.waist],
    [y.hip, m.hip],
    [crotch, m.hip * 0.97],
    [crotch + 20, m.hip * 0.9],
  ];
  const torsoHalfStops: [number, number][] = [
    [y.armpit, half.armpit],
    [y.chest, half.chest],
    [waist, half.waist],
    [y.hip, half.hip],
    [crotch, Math.max(half.hip * 0.98, leg.outerAt(crotch))],
    ...(['thigh', 'midThigh', 'knee', 'calf', 'ankle', 'floor'] as const).map(
      (k): [number, number] => [y[k], leg.outerAt(y[k])],
    ),
  ];
  const torsoRatioStops: [number, number][] = [
    [y.chest, r.chest],
    [waist, r.waist],
    [y.hip, r.hip],
  ];

  // Right arm, hanging slightly away from the body
  const L = m.armLength;
  const upperArmHalf = frontWidth(m.upperArm, 0.95) / 2;
  // Arms hang at the sides: the inner edge meets the torso at the armpit instead of
  // overlapping the chest (which reads as rolled-forward shoulders).
  const origin = {
    x: Math.max(half.shoulder - upperArmHalf * 0.25, half.armpit + upperArmHalf - 1.5),
    y: shoulder + upperArmHalf * 0.5,
  };
  const dir = { x: Math.sin(ARM_ANGLE), y: Math.cos(ARM_ANGLE) };
  const normal = { x: Math.cos(ARM_ANGLE), y: -Math.sin(ARM_ANGLE) };
  const armCircStops: [number, number][] = [
    [0, m.upperArm * 1.08],
    [0.18 * L, m.upperArm],
    [0.45 * L, lerp(m.upperArm, m.wrist, 0.3)],
    [0.55 * L, lerp(m.upperArm, m.wrist, 0.25)],
    [L, m.wrist],
  ];
  const armRatioStops: [number, number][] = [
    [0.5 * L, 0.95],
    [L, 0.7],
  ];
  const pointAt = (d: number): Pt => ({ x: origin.x + dir.x * d, y: origin.y + dir.y * d });
  const arm: ArmGeometry = {
    length: L,
    handLength: H * 0.1,
    origin,
    dir,
    normal,
    pointAt,
    circAt: (d) => interp(armCircStops, d),
    halfAt: (d) => frontWidth(interp(armCircStops, d), interp(armRatioStops, d)) / 2,
    edgeAt(d, side, half) {
      const c = pointAt(d);
      const h = half ?? this.halfAt(d);
      return { x: c.x + normal.x * h * side, y: c.y + normal.y * h * side };
    },
  };

  return {
    m,
    y,
    half,
    head: { cx: 0, cy: headH * 0.5, rx: headH * 0.39, ry: headH * 0.5 },
    arm,
    leg,
    torsoCircAt: (yy) => interp(torsoCircStops, yy),
    torsoHalfAt: (yy) => interp(torsoHalfStops, yy),
    torsoRatioAt: (yy) => interp(torsoRatioStops, yy),
  };
}

export interface SkinPaths {
  torso: string;
  /** Arm fills (no outline) and their visible edges, drawn separately so the arm's top blends into the shoulder. */
  arms: string[];
  armEdges: string[];
  hands: string[];
  feet: string[];
  /** Visible foot outline (sides and sole); the top blends into the leg. */
  footEdges: string[];
}

/**
 * Right arm. With `from` > 0 the arm starts there, tucked under a sleeve; otherwise
 * its top follows the shoulder line into a rounded deltoid.
 */
function rightArm(b: BodyGeometry, from = 0): { fill: P[]; outer: P[]; inner: P[] } {
  const { arm, half, y } = b;
  const start = from > 0 ? from : arm.length * 0.06;
  const ds = [start, ...[0.18, 0.32, 0.45, 0.58, 0.8, 1].map((t) => t * arm.length).filter((d) => d > start + 1)];
  const outer = ds.map((d) => arm.edgeAt(d, 1)).map((q) => p(q.x, q.y));
  const innerDs = [...ds].reverse();
  const inner = innerDs.map((d) => arm.edgeAt(d, -1)).map((q) => p(q.x, q.y));
  // Only the part of the inner edge below the armpit is visible
  const armpitD = (y.armpit - arm.origin.y) / arm.dir.y;
  const innerVisible = inner.filter((_, i) => innerDs[i] >= Math.max(from, armpitD) - 1);
  if (from > 0) {
    outer[0].c = true;
    inner[inner.length - 1].c = true;
    return { fill: [...outer, ...inner], outer, inner: innerVisible };
  }
  const shoulder = [p(half.shoulder - 2.5, y.shoulder - 0.1), p(arm.origin.x + arm.halfAt(0) * 0.45, y.shoulder + 0.7)];
  return { fill: [...shoulder, ...outer, ...inner], outer: [shoulder[1], ...outer], inner: innerVisible };
}

function rightHandPoints(b: BodyGeometry): P[] {
  const { arm } = b;
  const k = b.m.height / 170;
  const wrist = arm.pointAt(arm.length);
  const wristHalf = arm.halfAt(arm.length);
  const len = arm.handLength;
  // Relaxed mannequin hand: widens past the wrist, rounded fingertips, slight thumb bulge.
  const local: [number, number][] = [
    [-1.5, wristHalf],
    [len * 0.2, wristHalf + 0.6 * k],
    [len * 0.45, 3.4 * k],
    [len * 0.72, 3.1 * k],
    [len * 0.92, 2.1 * k],
    [len, 0],
    [len * 0.92, -2 * k],
    [len * 0.68, -3 * k],
    [len * 0.35, -3.6 * k],
    [len * 0.12, -wristHalf - 0.4 * k],
    [-1.5, -wristHalf],
  ];
  return local.map(([u, v]) =>
    p(wrist.x + arm.dir.x * u + arm.normal.x * v, wrist.y + arm.dir.y * u + arm.normal.y * v),
  );
}

export function skinPaths(b: BodyGeometry, armFrom = 0): SkinPaths {
  const { y, half, leg } = b;
  const floorY = y.floor - 3;
  const right: P[] = [
    p(0, y.hps - 0.5, true),
    p(half.neck, y.hps - 0.5),
    p(lerp(half.neck, half.shoulder, 0.5), y.hps + 1.6),
    p(half.shoulder, y.shoulder + 0.6),
    p(half.shoulder + 0.2, y.shoulder + 3.5),
    p(half.armpit + 0.2, y.armpit + 1),
    p(half.chest, y.chest),
    p(half.waist, y.waist),
    p(half.hip, y.hip),
    p(leg.outerAt(y.thigh), y.thigh),
    p(leg.outerAt(y.midThigh), y.midThigh),
    p(leg.outerAt(y.knee), y.knee),
    p(leg.outerAt(y.calf), y.calf),
    p(leg.outerAt(y.ankle), y.ankle),
    p(leg.outerAt(floorY), floorY),
    p(leg.centerAt(floorY), floorY + 0.9),
    p(leg.innerAt(floorY), floorY),
    p(leg.innerAt(y.ankle), y.ankle),
    p(leg.innerAt(y.calf), y.calf),
    p(leg.innerAt(y.knee), y.knee),
    p(leg.innerAt(y.midThigh), y.midThigh),
    p(leg.innerAt(y.thigh), y.thigh),
    p(0, y.crotch, true),
  ];
  const arm = rightArm(b, armFrom);
  const hand = rightHandPoints(b);
  const k = b.m.height / 170;
  // Front view of a foot, tucked under the rounded end of the leg: only the part
  // below the leg shows, widening a little toward the toes.
  const cl = leg.centerAt(floorY);
  const c = cl + 0.5;
  const th = leg.halfAt(floorY - 2) - 0.6;
  const fh = Math.max(leg.halfAt(floorY) + 0.8, 4.4 * k);
  const footFill = [
    p(cl - th, floorY - 2),
    p(cl - th, floorY),
    p(c - fh * 0.95, y.floor - 1.5),
    p(c - fh * 0.7, y.floor - 0.35),
    p(c, y.floor),
    p(c + fh * 0.75, y.floor - 0.35),
    p(c + fh, y.floor - 1.5),
    p(cl + th, floorY),
    p(cl + th, floorY - 2),
  ];
  const footEdge = footFill.slice(1, -1);
  return {
    torso: mirrored(right),
    arms: [smooth(arm.fill), smooth(mirrorX(arm.fill))],
    armEdges: [arm.outer, arm.inner].flatMap((edge) => [smooth(edge, false), smooth(mirrorX(edge), false)]),
    hands: [smooth(hand), smooth(mirrorX(hand))],
    feet: [smooth(footFill), smooth(mirrorX(footFill))],
    footEdges: [smooth(footEdge, false), smooth(mirrorX(footEdge), false)],
  };
}
