import { describe, expect, it } from 'vitest';
import { computeBody, skinPaths } from '../geometry/body';
import { shapeGarment } from '../geometry/garment';
import { BODY_PRESETS, type BodyMeasurements } from './body';
import { analyzeGarment, recommendSize } from './fit';
import { makeGarment, SIZE_LABELS, TEMPLATES, type GarmentType } from './garments';

const male = BODY_PRESETS.male;
const female = BODY_PRESETS.female;
const verdicts = (body: BodyMeasurements, type: GarmentType, measurements: Record<string, number>) =>
  Object.fromEntries(analyzeGarment(computeBody(body), { type, measurements }).items.map((i) => [i.key, i.verdict]));

describe('body geometry', () => {
  it.each([male, female])('has landmarks in head-to-toe order (%s)', (body) => {
    const { y } = computeBody(body);
    const order = [y.hps, y.shoulder, y.armpit, y.chest, y.waist, y.hip, y.crotch, y.thigh, y.knee, y.calf, y.ankle, y.floor];
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('keeps landmarks ordered even for contradictory input', () => {
    const { y } = computeBody({ ...male, inseam: 100, torsoLength: 60 });
    expect(y.crotch).toBeGreaterThan(y.hip);
    expect(y.hip).toBeGreaterThan(y.waist);
  });

  it('widens with circumference', () => {
    expect(computeBody({ ...male, waist: 100 }).half.waist).toBeGreaterThan(computeBody(male).half.waist);
  });
});

describe('garment shapes', () => {
  const types = Object.keys(TEMPLATES) as GarmentType[];
  it.each(types.flatMap((t) => SIZE_LABELS.map((s) => [t, s] as const)))('%s %s renders finite paths', (type, size) => {
    for (const body of [male, female, { ...male, height: 150, inseam: 60 }]) {
      const b = computeBody(body);
      const shape = shapeGarment(b, makeGarment(type, size));
      const all = [...shape.parts.map((p) => p.d), ...shape.details.map((d) => d.d), ...shape.bands.map((d) => d.d)].join(' ');
      expect(all).not.toMatch(/NaN|Infinity/);
      expect(Number.isFinite(shape.mainBox.w) && shape.mainBox.w > 0).toBe(true);
    }
  });

  it('renders finite skin paths', () => {
    const s = skinPaths(computeBody(female), 3);
    expect([s.torso, ...s.arms, ...s.armEdges, ...s.hands].join(' ')).not.toMatch(/NaN|Infinity/);
  });
});

describe('fit analysis', () => {
  it('flags a garment smaller than the body', () => {
    const v = verdicts({ ...male, chest: 110 }, 'tshirt', TEMPLATES.tshirt.sizes.S);
    expect(v.chest).toBe('small');
  });

  it('reads an XL tee on an average man as oversized', () => {
    const v = verdicts(male, 'tshirt', { ...TEMPLATES.tshirt.sizes.XL, chest: 66, shoulder: 58 });
    expect(v.chest).toBe('over');
    expect(v.shoulder).toBe('over');
  });

  it('judges sleeve length against arm length', () => {
    const long = { ...TEMPLATES.longsleeve.sizes.M, shoulder: male.shoulderWidth };
    expect(verdicts(male, 'longsleeve', { ...long, sleeveLength: male.armLength }).sleeveLength).toBe('good');
    expect(verdicts(male, 'longsleeve', { ...long, sleeveLength: male.armLength - 10 }).sleeveLength).toBe('small');
    expect(verdicts(male, 'longsleeve', { ...long, sleeveLength: male.armLength + 10 }).sleeveLength).toBe('over');
  });

  it('judges trouser length against the ankle', () => {
    const b = computeBody(male);
    const base = TEMPLATES.pants.sizes.L;
    // Garment length that ends exactly at the ankle for this body
    const toAnkle = (() => {
      const items = analyzeGarment(b, { type: 'pants', measurements: base }).items;
      return items.find((i) => i.key === 'length')!.body!;
    })();
    expect(verdicts(male, 'pants', { ...base, length: toAnkle }).length).toBe('good');
    expect(verdicts(male, 'pants', { ...base, length: toAnkle + 15 }).length).toBe('over');
    expect(verdicts(male, 'pants', { ...base, length: toAnkle - 15 }).length).toBe('small');
  });

  it('flags a waist that will not close', () => {
    expect(verdicts({ ...male, waist: 95 }, 'pants', TEMPLATES.pants.sizes.M).waist).toBe('small');
  });

  it('summarises the worst problem', () => {
    const report = analyzeGarment(computeBody({ ...male, chest: 120 }), { type: 'tshirt', measurements: TEMPLATES.tshirt.sizes.S });
    expect(report.level).toBe('bad');
    expect(report.summary).toContain('가슴둘레');
  });
});

describe('size recommendation', () => {
  it('goes up a size for a bigger body', () => {
    const order = SIZE_LABELS;
    const small = order.indexOf(recommendSize({ ...male, chest: 88, waist: 72, hip: 88, shoulderWidth: 42 }, 'tshirt'));
    const big = order.indexOf(recommendSize({ ...male, chest: 108, waist: 95, hip: 104, shoulderWidth: 49 }, 'tshirt'));
    expect(big).toBeGreaterThan(small);
  });

  it('never recommends a size that is too small when a larger one fits', () => {
    const body = { ...male, waist: 86 };
    const size = recommendSize(body, 'pants');
    expect(verdicts(body, 'pants', TEMPLATES.pants.sizes[size]).waist).not.toBe('small');
  });
});
