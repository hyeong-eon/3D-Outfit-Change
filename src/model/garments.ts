import type { FieldDef } from './body';

export type GarmentType = 'tshirt' | 'longsleeve' | 'pants' | 'shorts' | 'skirt';
export type GarmentSlot = 'top' | 'bottom';
export type SizeLabel = 'S' | 'M' | 'L' | 'XL';
export const SIZE_LABELS: SizeLabel[] = ['S', 'M', 'L', 'XL'];

/** Shopping-mall style size chart: "단면" values are flat widths (half the circumference). */
export interface TopMeasurements {
  length: number;
  shoulder: number;
  chest: number;
  hem: number;
  sleeveLength: number;
  sleeveWidth: number;
  sleeveOpening: number;
}

export interface PantsMeasurements {
  length: number;
  waist: number;
  hip: number;
  thigh: number;
  rise: number;
  hem: number;
}

export interface SkirtMeasurements {
  length: number;
  waist: number;
  hip: number;
  hem: number;
}

export type GarmentMeasurements = Record<string, number>;

export interface GarmentImage {
  dataUrl: string;
  width: number;
  height: number;
  /** fit: one photo stretched over the front panel. tile: repeated as a fabric pattern. */
  mode: 'fit' | 'tile';
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface GarmentDesign {
  color: string;
  image?: GarmentImage;
}

export interface Garment {
  id: string;
  name: string;
  type: GarmentType;
  size: SizeLabel | 'custom';
  measurements: GarmentMeasurements;
  design: GarmentDesign;
}

export interface GarmentTemplate {
  type: GarmentType;
  slot: GarmentSlot;
  label: string;
  fields: FieldDef[];
  sizes: Record<SizeLabel, GarmentMeasurements>;
  /** How much wider than the front panel a typical flat-lay photo is (sleeves included). */
  photoSpan: number;
}

const TOP_FIELDS: FieldDef[] = [
  { key: 'length', label: '총장', hint: '목옆(어깨 시작점)~밑단', min: 30, max: 110 },
  { key: 'shoulder', label: '어깨너비', hint: '어깨 솔기 끝~끝', min: 30, max: 75 },
  { key: 'chest', label: '가슴단면', hint: '펼쳐서 겨드랑이 아래 좌우 폭', min: 35, max: 85 },
  { key: 'hem', label: '밑단단면', hint: '펼쳐서 밑단 좌우 폭', min: 30, max: 90 },
  { key: 'sleeveLength', label: '소매길이', hint: '어깨 솔기~소매 끝', min: 3, max: 85 },
  { key: 'sleeveWidth', label: '소매통단면', hint: '겨드랑이 쪽 소매 폭', min: 12, max: 35 },
  { key: 'sleeveOpening', label: '소매단면', hint: '소매 끝 폭', min: 7, max: 30 },
];

const PANTS_FIELDS: FieldDef[] = [
  { key: 'length', label: '총장', hint: '허리 위~밑단 (바깥 솔기)', min: 25, max: 125 },
  { key: 'waist', label: '허리단면', hint: '펼쳐서 허리 좌우 폭', min: 25, max: 65 },
  { key: 'hip', label: '엉덩이단면', hint: '펼쳐서 엉덩이 좌우 폭', min: 35, max: 75 },
  { key: 'thigh', label: '허벅지단면', hint: '가랑이 바로 아래 다리 폭', min: 20, max: 50 },
  { key: 'rise', label: '밑위', hint: '허리 위~가랑이 솔기', min: 18, max: 42 },
  { key: 'hem', label: '밑단단면', hint: '바짓단 폭', min: 12, max: 50 },
];

const SKIRT_FIELDS: FieldDef[] = [
  { key: 'length', label: '총장', hint: '허리 위~밑단', min: 30, max: 110 },
  { key: 'waist', label: '허리단면', hint: '펼쳐서 허리 좌우 폭', min: 25, max: 65 },
  { key: 'hip', label: '엉덩이단면', hint: '펼쳐서 엉덩이 좌우 폭', min: 35, max: 80 },
  { key: 'hem', label: '밑단단면', hint: '펼쳐서 밑단 좌우 폭', min: 30, max: 120 },
];

const top = (length: number, shoulder: number, chest: number, hem: number, sleeveLength: number, sleeveWidth: number, sleeveOpening: number): GarmentMeasurements =>
  ({ length, shoulder, chest, hem, sleeveLength, sleeveWidth, sleeveOpening }) satisfies TopMeasurements;
const pants = (length: number, waist: number, hip: number, thigh: number, rise: number, hem: number): GarmentMeasurements =>
  ({ length, waist, hip, thigh, rise, hem }) satisfies PantsMeasurements;
const skirt = (length: number, waist: number, hip: number, hem: number): GarmentMeasurements =>
  ({ length, waist, hip, hem }) satisfies SkirtMeasurements;

export const TEMPLATES: Record<GarmentType, GarmentTemplate> = {
  tshirt: {
    type: 'tshirt',
    slot: 'top',
    label: '반팔 티셔츠',
    fields: TOP_FIELDS,
    photoSpan: 1.6,
    sizes: {
      S: top(68, 44, 50.5, 48.5, 20, 19, 16.5),
      M: top(70, 46, 53, 51, 21, 20, 17.5),
      L: top(72, 48, 55.5, 53.5, 22, 21, 18.5),
      XL: top(74, 50, 58, 56, 23, 22, 19.5),
    },
  },
  longsleeve: {
    type: 'longsleeve',
    slot: 'top',
    label: '긴팔 티셔츠',
    fields: TOP_FIELDS,
    photoSpan: 1.35,
    sizes: {
      S: top(68, 44, 50.5, 48, 60, 19, 9.5),
      M: top(70, 46, 53, 50, 61, 20, 10),
      L: top(72, 48, 55.5, 52.5, 62, 21, 10.5),
      XL: top(74, 50, 58, 55, 63, 22, 11),
    },
  },
  pants: {
    type: 'pants',
    slot: 'bottom',
    label: '긴바지',
    fields: PANTS_FIELDS,
    photoSpan: 1,
    sizes: {
      S: pants(98, 38, 49, 30, 26, 18),
      M: pants(100, 40, 51, 31, 27, 19),
      L: pants(102, 42, 53, 32.5, 28, 20),
      XL: pants(104, 44.5, 55.5, 34, 29, 21),
    },
  },
  shorts: {
    type: 'shorts',
    slot: 'bottom',
    label: '반바지',
    fields: PANTS_FIELDS,
    photoSpan: 1,
    sizes: {
      S: pants(46, 38, 51, 32, 27, 28),
      M: pants(48, 40, 53, 33, 28, 29),
      L: pants(50, 42, 55, 34.5, 29, 30.5),
      XL: pants(52, 44.5, 57.5, 36, 30, 32),
    },
  },
  skirt: {
    type: 'skirt',
    slot: 'bottom',
    label: '스커트',
    fields: SKIRT_FIELDS,
    photoSpan: 1,
    sizes: {
      S: skirt(58, 33, 46, 56),
      M: skirt(60, 35, 48, 58),
      L: skirt(62, 37, 50, 60),
      XL: skirt(64, 39.5, 52.5, 62.5),
    },
  },
};

export const TEMPLATES_BY_SLOT: Record<GarmentSlot, GarmentType[]> = {
  top: ['tshirt', 'longsleeve'],
  bottom: ['pants', 'shorts', 'skirt'],
};

export function makeGarment(type: GarmentType, size: SizeLabel = 'M', color = '#9aa5b1'): Garment {
  return {
    id: crypto.randomUUID(),
    name: TEMPLATES[type].label,
    type,
    size,
    measurements: { ...TEMPLATES[type].sizes[size] },
    design: { color },
  };
}
