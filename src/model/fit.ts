import { computeBody, type BodyGeometry } from '../geometry/body';
import { bottomLayout, topLayout } from '../geometry/garment';
import type { BodyMeasurements } from './body';
import { SIZE_LABELS, TEMPLATES, type Garment, type GarmentMeasurements, type GarmentType, type SizeLabel } from './garments';

export type Verdict = 'small' | 'tight' | 'good' | 'loose' | 'over';

export const VERDICT_LABEL: Record<Verdict, string> = {
  small: '작음',
  tight: '꼭 맞음',
  good: '적당',
  loose: '여유',
  over: '과함',
};

export interface FitItem {
  key: string;
  label: string;
  /** Body-side value (cm) and garment-side value (cm) being compared, if numeric. */
  body?: number;
  garment?: number;
  verdict: Verdict;
  text: string;
}

export interface FitReport {
  items: FitItem[];
  level: 'ok' | 'warn' | 'bad';
  summary: string;
}

type Texts = Record<Verdict, string>;
type Thresholds = [number, number, number, number];

const round = (n: number) => Math.round(n * 10) / 10;

function grade(diff: number, [a, b, c, d]: Thresholds): Verdict {
  if (diff < a) return 'small';
  if (diff < b) return 'tight';
  if (diff < c) return 'good';
  if (diff < d) return 'loose';
  return 'over';
}

/** Compares a garment value with the body value it has to go around (or along). */
function compare(key: string, label: string, body: number, garment: number, t: Thresholds, texts: Texts): FitItem {
  const verdict = grade(garment - body, t);
  return { key, label, body: round(body), garment: round(garment), verdict, text: texts[verdict] };
}

function analyzeTop(b: BodyGeometry, m: GarmentMeasurements, type: GarmentType): FitItem[] {
  const L = topLayout(b, m);
  const items: FitItem[] = [
    compare('shoulder', '어깨너비', b.m.shoulderWidth, m.shoulder, [-2, 0, 3, 7], {
      small: '어깨가 좁아 끼어요',
      tight: '어깨가 꼭 맞아요',
      good: '어깨선이 잘 맞아요',
      loose: '어깨선이 살짝 내려와요',
      over: '드롭숄더 — 어깨선이 팔까지 내려와요',
    }),
    compare('chest', '가슴둘레', b.m.chest, m.chest * 2, [0, 6, 14, 24], {
      small: '가슴이 작아 당겨요',
      tight: '몸에 붙는 슬림핏',
      good: '적당한 레귤러핏',
      loose: '여유 있는 루즈핏',
      over: '크게 떨어지는 오버핏',
    }),
    compare('hem', '밑단둘레', b.torsoCircAt(L.hemY), m.hem * 2, [0, 4, 12, 22], {
      small: '밑단이 작아 말려 올라가요',
      tight: '밑단이 몸에 붙어요',
      good: '밑단이 자연스럽게 떨어져요',
      loose: '밑단에 여유가 있어요',
      over: '밑단이 크게 퍼져요',
    }),
  ];

  const { y } = b;
  const lengthItem = (verdict: Verdict, text: string): FitItem => ({
    key: 'length',
    label: '총장',
    body: round(y.hip - y.hps),
    garment: m.length,
    verdict,
    text,
  });
  if (L.hemY < y.waist - 8) items.push(lengthItem('small', '너무 짧아 배가 드러나요'));
  else if (L.hemY < y.waist + 1) items.push(lengthItem('tight', '크롭 기장 — 허리선 위에서 끝나요'));
  else if (L.hemY < y.hip) items.push(lengthItem('good', '엉덩이 위에서 끝나는 기장'));
  else if (L.hemY < y.crotch + 6) items.push(lengthItem('good', '엉덩이를 덮는 기장'));
  else if (L.hemY < y.crotch + 18) items.push(lengthItem('loose', '엉덩이 아래로 내려오는 롱 기장'));
  else items.push(lengthItem('over', '허벅지까지 덮는 아주 긴 기장'));

  const armLen = b.arm.length;
  if (type === 'longsleeve') {
    items.push(
      compare('sleeveLength', '소매길이(어깨끝 기준)', armLen, L.sleeveEnd, [-6, -2, 2.5, 6], {
        small: '소매가 많이 짧아요',
        tight: '소매가 약간 짧아요 (손목 위)',
        good: '소매가 손목에 딱 맞아요',
        loose: '소매가 손등을 살짝 덮어요',
        over: '소매가 손을 덮을 만큼 길어요',
      }),
    );
  } else {
    const elbow = armLen * 0.45;
    const end = L.sleeveEnd;
    const sleeveItem = (verdict: Verdict, text: string): FitItem => ({
      key: 'sleeveLength',
      label: '소매길이(어깨끝 기준)',
      body: round(elbow),
      garment: round(end),
      verdict,
      text,
    });
    if (end < 3) items.push(sleeveItem('tight', '소매가 거의 없는 캡소매'));
    else if (end < elbow - 2) items.push(sleeveItem('good', '일반 반팔 기장'));
    else if (end < elbow + 4) items.push(sleeveItem('loose', '팔꿈치까지 오는 긴 반팔'));
    else items.push(sleeveItem('over', '팔꿈치 아래로 내려와요'));
  }

  items.push(
    compare('sleeveWidth', '소매통(팔뚝)', b.m.upperArm, m.sleeveWidth * 2, [0, 4, 12, 20], {
      small: '팔뚝이 끼어요',
      tight: '팔에 붙는 소매',
      good: '편안한 소매통',
      loose: '넉넉한 소매통',
      over: '아주 넓은 소매통',
    }),
  );
  return items;
}

const WAIST_TEXTS: Texts = {
  small: '허리가 작아 잠기지 않아요',
  tight: '허리가 딱 맞아요',
  good: '허리가 편하게 맞아요',
  loose: '허리가 남아요 (벨트 권장)',
  over: '허리가 너무 커요',
};

function analyzeBottom(b: BodyGeometry, m: GarmentMeasurements, type: GarmentType): FitItem[] {
  const L = bottomLayout(b, type, m);
  const { y } = b;
  const items: FitItem[] = [
    compare('waist', '허리둘레', b.torsoCircAt(L.wbY), m.waist * 2, [-1.5, 0.5, 4, 8], WAIST_TEXTS),
    compare('hip', '엉덩이둘레', b.torsoCircAt(L.hipY), m.hip * 2, type === 'skirt' ? [0, 3, 8, 16] : [0, 4, 10, 18], {
      small: '엉덩이가 작아 끼어요',
      tight: '엉덩이 라인이 드러나요',
      good: '엉덩이가 편하게 맞아요',
      loose: '엉덩이에 여유가 있어요',
      over: '엉덩이가 많이 남아요',
    }),
  ];

  if (type === 'skirt') {
    const toKnee = y.knee - L.wbY;
    const diff = m.length - toKnee;
    const skirtItem = (verdict: Verdict, text: string): FitItem => ({ key: 'length', label: '총장', body: round(toKnee), garment: m.length, verdict, text });
    if (diff < -20) items.push(skirtItem('tight', '미니 기장'));
    else if (diff < -4) items.push(skirtItem('good', '무릎 위 기장'));
    else if (diff < 4) items.push(skirtItem('good', '무릎 기장'));
    else if (diff < 18) items.push(skirtItem('good', '미디 기장'));
    else items.push(skirtItem('loose', '롱 기장'));

    items.push(
      compare('hem', '밑단(엉덩이 대비)', m.hip * 2, m.hem * 2, [-6, 0, 12, 30], {
        small: '펜슬 라인 — 걸음이 불편할 수 있어요',
        tight: 'H라인 스커트',
        good: 'A라인 스커트',
        loose: '플레어 스커트',
        over: '풍성한 서큘러 스커트',
      }),
    );
    return items;
  }

  items.push(
    compare('thigh', '허벅지둘레', b.leg.circAt(L.thighY), m.thigh * 2, [0, 3, 10, 18], {
      small: '허벅지가 끼어요',
      tight: '스키니하게 붙어요',
      good: '슬림~레귤러 핏',
      loose: '여유 있는 레귤러 핏',
      over: '와이드 핏',
    }),
    compare('rise', '밑위', y.crotch + 1.5 - y.waist, m.rise, [-10, -4, 3, 8], {
      small: '밑위가 매우 짧아요',
      tight: '골반에 걸치는 로우라이즈',
      good: '허리선에 맞는 밑위',
      loose: '밑위가 길어요 (하이웨이스트)',
      over: '밑위가 너무 길어 처져요',
    }),
  );

  if (type === 'pants') {
    items.push(
      compare('length', '총장(발목 기준)', y.ankle - L.wbY, m.length, [-12, -4, 2, 6], {
        small: '많이 짧아요 (7~8부 기장)',
        tight: '발목 위 기장 (9부)',
        good: '발목에 딱 맞는 기장',
        loose: '밑단이 살짝 쌓여요',
        over: '바닥에 끌릴 만큼 길어요',
      }),
    );
    const hemC = m.hem * 2;
    const hemItem = (verdict: Verdict, text: string): FitItem => ({ key: 'hem', label: '밑단(종아리 대비)', body: b.m.calf, garment: round(hemC), verdict, text });
    if (hemC < b.m.ankle * 1.45) items.push(hemItem('small', '밑단이 좁아 발이 안 들어갈 수 있어요'));
    else
      items.push(
        compare('hem', '밑단(종아리 대비)', b.m.calf, hemC, [-Infinity, -4, 6, 16], {
          small: '',
          tight: '스키니/테이퍼드 밑단',
          good: '슬림 스트레이트 밑단',
          loose: '와이드 밑단',
          over: '아주 와이드한 밑단',
        }),
      );
  } else {
    const diff = L.lengthEnd - y.knee;
    const shortsItem = (verdict: Verdict, text: string): FitItem => ({ key: 'length', label: '총장(무릎 기준)', body: round(y.knee - L.wbY), garment: m.length, verdict, text });
    if (diff < -20) items.push(shortsItem('tight', '아주 짧은 기장'));
    else if (diff < -5) items.push(shortsItem('good', '무릎 위 기장'));
    else if (diff < 5) items.push(shortsItem('good', '무릎 기장'));
    else items.push(shortsItem('loose', '무릎 아래 기장'));
    items.push(
      compare('hem', '밑단둘레', b.leg.circAt(L.hemY), m.hem * 2, [0, 4, 14, 24], {
        small: '밑단이 허벅지에 끼어요',
        tight: '밑단이 다리에 붙어요',
        good: '밑단이 적당히 떨어져요',
        loose: '밑단이 넓어요',
        over: '밑단이 아주 넓어요',
      }),
    );
  }
  return items;
}

function summarize(items: FitItem[]): FitReport {
  const small = items.filter((i) => i.verdict === 'small');
  const over = items.filter((i) => i.verdict === 'over');
  if (small.length)
    return { items, level: 'bad', summary: `${small.map((i) => i.label.replace(/\(.*\)/, '')).join(', ')} 부분이 작아요. 한 치수 큰 사이즈를 권장해요.` };
  if (over.length)
    return { items, level: 'warn', summary: `${over.map((i) => i.label.replace(/\(.*\)/, '')).join(', ')} 부분이 많이 커요. 의도한 오버핏이 아니라면 한 치수 작게 고려해 보세요.` };
  return { items, level: 'ok', summary: '전체적으로 잘 맞아요.' };
}

export function analyzeGarment(b: BodyGeometry, g: Pick<Garment, 'type' | 'measurements'>): FitReport {
  const slot = TEMPLATES[g.type].slot;
  return summarize(slot === 'top' ? analyzeTop(b, g.measurements, g.type) : analyzeBottom(b, g.measurements, g.type));
}

const PENALTY: Record<Verdict, number> = { small: 100, over: 10, tight: 2, loose: 1, good: 0 };

/** Picks the template size that fits this body best. */
export function recommendSize(body: BodyMeasurements, type: GarmentType): SizeLabel {
  const b = computeBody(body);
  const score = (size: SizeLabel) =>
    analyzeGarment(b, { type, measurements: TEMPLATES[type].sizes[size] }).items.reduce((s, i) => s + PENALTY[i.verdict], 0);
  return SIZE_LABELS.reduce((best, size) => (score(size) < score(best) ? size : best));
}
