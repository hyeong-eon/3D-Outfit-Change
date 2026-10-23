export type Sex = 'male' | 'female';

/** All values in cm. These are the inputs that change how clothes fit. */
export interface BodyMeasurements {
  sex: Sex;
  height: number;
  neck: number;
  shoulderWidth: number;
  chest: number;
  waist: number;
  hip: number;
  torsoLength: number;
  armLength: number;
  upperArm: number;
  wrist: number;
  inseam: number;
  thigh: number;
  calf: number;
  ankle: number;
}

export type BodyKey = Exclude<keyof BodyMeasurements, 'sex'>;

export interface FieldDef<K extends string = string> {
  key: K;
  label: string;
  hint: string;
  min: number;
  max: number;
}

export const BODY_FIELDS: Record<BodyKey, FieldDef<BodyKey>> = {
  height: { key: 'height', label: '키', hint: '맨발로 섰을 때 머리끝~바닥', min: 130, max: 210 },
  neck: { key: 'neck', label: '목둘레', hint: '목 아래쪽(목젖 아래) 둘레', min: 26, max: 50 },
  shoulderWidth: { key: 'shoulderWidth', label: '어깨너비', hint: '등 쪽에서 잰 어깨끝점~어깨끝점 길이', min: 30, max: 60 },
  chest: { key: 'chest', label: '가슴둘레', hint: '가슴의 가장 두꺼운 부분 둘레', min: 65, max: 150 },
  waist: { key: 'waist', label: '허리둘레', hint: '허리의 가장 가는 부분 둘레', min: 50, max: 150 },
  torsoLength: { key: 'torsoLength', label: '상체길이', hint: '목옆점(어깨 시작)~허리선 길이', min: 30, max: 60 },
  armLength: { key: 'armLength', label: '팔길이', hint: '어깨끝점~손목뼈 길이', min: 40, max: 75 },
  upperArm: { key: 'upperArm', label: '팔뚝둘레', hint: '위팔의 가장 두꺼운 부분 둘레', min: 18, max: 50 },
  wrist: { key: 'wrist', label: '손목둘레', hint: '손목뼈 위 둘레', min: 12, max: 22 },
  hip: { key: 'hip', label: '엉덩이둘레', hint: '엉덩이의 가장 튀어나온 부분 둘레', min: 70, max: 150 },
  inseam: { key: 'inseam', label: '다리길이', hint: '가랑이~바닥 길이 (안쪽 다리길이)', min: 55, max: 100 },
  thigh: { key: 'thigh', label: '허벅지둘레', hint: '가랑이 바로 아래 허벅지 둘레', min: 35, max: 85 },
  calf: { key: 'calf', label: '종아리둘레', hint: '종아리의 가장 두꺼운 부분 둘레', min: 25, max: 55 },
  ankle: { key: 'ankle', label: '발목둘레', hint: '복사뼈 위 가장 가는 부분 둘레', min: 16, max: 32 },
};

export const BODY_GROUPS: { title: string; keys: BodyKey[] }[] = [
  { title: '기본', keys: ['height'] },
  { title: '상체', keys: ['neck', 'shoulderWidth', 'chest', 'waist', 'torsoLength'] },
  { title: '팔', keys: ['armLength', 'upperArm', 'wrist'] },
  { title: '하체', keys: ['hip', 'inseam', 'thigh', 'calf', 'ankle'] },
];

/** Rough 20–30대 averages (Size Korea), used as starting points. */
export const BODY_PRESETS: Record<Sex, BodyMeasurements> = {
  male: {
    sex: 'male',
    height: 174,
    neck: 38,
    shoulderWidth: 45,
    chest: 95,
    waist: 81,
    hip: 95,
    torsoLength: 43,
    armLength: 58,
    upperArm: 30,
    wrist: 16.5,
    inseam: 78,
    thigh: 55,
    calf: 37,
    ankle: 22,
  },
  female: {
    sex: 'female',
    height: 161,
    neck: 32,
    shoulderWidth: 39,
    chest: 85,
    waist: 68,
    hip: 92,
    torsoLength: 38,
    armLength: 53,
    upperArm: 26,
    wrist: 15,
    inseam: 72,
    thigh: 53,
    calf: 34,
    ankle: 20,
  },
};
