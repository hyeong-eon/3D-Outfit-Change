import { useId, useMemo } from 'react';
import { computeBody, skinPaths, type BodyGeometry } from '../geometry/body';
import { shapeGarment, topLayout, type GarmentPart, type GarmentShape } from '../geometry/garment';
import { p, smooth } from '../geometry/math';
import { shadeColor } from '../lib/image';
import type { BodyMeasurements } from '../model/body';
import type { FitReport, Verdict } from '../model/fit';
import { TEMPLATES, type Garment } from '../model/garments';

export const VERDICT_COLOR: Record<Verdict, string> = {
  small: '#e5484d',
  tight: '#f5a524',
  good: '#30a46c',
  loose: '#3e8ed0',
  over: '#8e4ec6',
};

// Matte display-mannequin finish
const SKIN = '#f7f5f1';
const SKIN_SHADE = '#b8b1a7';

interface Props {
  body: BodyMeasurements;
  top: Garment | null;
  bottom: Garment | null;
  tuck: boolean;
  heatmap: boolean;
  guides: boolean;
  reports: { top?: FitReport; bottom?: FitReport };
}

export function Avatar2D({ body, top, bottom, tuck, heatmap, guides, reports }: Props) {
  const uid = useId().replace(/:/g, '');
  const b = useMemo(() => computeBody(body), [body]);
  // Under a top, the bare arm starts just inside the sleeve end so it never covers the shirt.
  const armFrom = top
    ? (() => {
        const L = topLayout(b, top.measurements);
        return Math.max(Math.max(L.drop, -2) + 1, L.sleeveEnd - 2);
      })()
    : 0;
  const skin = useMemo(() => skinPaths(b, armFrom), [b, armFrom]);
  const topShape = useMemo(() => (top ? shapeGarment(b, top) : null), [b, top]);
  const bottomShape = useMemo(() => (bottom ? shapeGarment(b, bottom) : null), [b, bottom]);
  const H = body.height;

  const topMain = top && topShape && <GarmentLayer id={`${uid}-tm`} shape={topShape} garment={top} kinds={['main']} details />;
  const bottomLayer = bottom && bottomShape && (
    <GarmentLayer id={`${uid}-b`} shape={bottomShape} garment={bottom} kinds={['main', 'trim']} details />
  );

  return (
    <svg className="avatar" viewBox={`-48 -4 96 ${H + 8}`} role="img" aria-label="착장 미리보기">
      <defs>
        <linearGradient id="shade-x" x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.24" />
          <stop offset="0.2" stopColor="#000" stopOpacity="0" />
          <stop offset="0.8" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.24" />
        </linearGradient>
        <linearGradient id="shade-y" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000" stopOpacity="0.1" />
        </linearGradient>
        <radialGradient id="sheen" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="base-top" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#8d8780" />
          <stop offset="1" stopColor="#5f5a54" />
        </linearGradient>
      </defs>

      <Base b={b} />
      {guides && <Guides b={b} />}

      {skin.feet.map((d, i) => (
        <path key={`f${i}`} d={d} fill={SKIN} />
      
      ))}
      {skin.footEdges.map((d, i) => (
        <path key={`fe${i}`} d={d} fill="none" stroke={SKIN_SHADE} strokeWidth={0.2} />
      ))}
      <path d={skin.torso} fill={SKIN} stroke={SKIN_SHADE} strokeWidth={0.2} />
      <path d={skin.torso} fill="url(#shade-x)" opacity={0.5} />
      <Head b={b} />

      {tuck ? (
        <>
          {topMain}
          {bottomLayer}
        </>
      ) : (
        <>
          {bottomLayer}
          {topMain}
        </>
      )}

      {/* Arms hang in front of the torso, sleeves on top of the arms */}
      {skin.hands.map((d, i) => (
        <path key={`h${i}`} d={d} fill={SKIN} stroke={SKIN_SHADE} strokeWidth={0.2} />
      ))}
      {skin.arms.map((d, i) => (
        <path key={`a${i}`} d={d} fill={SKIN} />
      ))}
      {skin.armEdges.map((d, i) => (
        <path key={`e${i}`} d={d} fill="none" stroke={SKIN_SHADE} strokeWidth={0.2} />
      ))}
      {top && topShape && <GarmentLayer id={`${uid}-ts`} shape={topShape} garment={top} kinds={['sleeve', 'trim']} />}

      {heatmap && bottomShape && reports.bottom && <HeatLayer id={`${uid}-hb`} shape={bottomShape} report={reports.bottom} />}
      {heatmap && topShape && reports.top && <HeatLayer id={`${uid}-ht`} shape={topShape} report={reports.top} />}
    </svg>
  );
}

function GarmentLayer({ id, shape, garment, kinds, details = false }: { id: string; shape: GarmentShape; garment: Garment; kinds: GarmentPart['kind'][]; details?: boolean }) {
  const parts = shape.parts.filter((part) => kinds.includes(part.kind));
  const { color, image } = garment.design;
  const outline = shadeColor(color, -0.4);
  const box = shape.mainBox;

  // "fit" photos cover the front panel only; sleeves keep the fabric colour.
  const photoParts = image?.mode === 'fit' ? parts.filter((part) => part.kind !== 'sleeve') : [];
  const tile = image?.mode === 'tile' ? { w: 14 * image.scale, h: (14 * image.scale * image.height) / image.width } : null;
  const fit = image && photoParts.length
    ? (() => {
        const w = box.w * TEMPLATES[garment.type].photoSpan * image.scale;
        return { w, h: (w * image.height) / image.width, x: box.x + box.w / 2 - w / 2 + image.offsetX, y: box.y - 0.5 + image.offsetY };
      })()
    : null;

  return (
    <g>
      <defs>
        {image && tile && (
          <pattern id={`${id}-pat`} patternUnits="userSpaceOnUse" x={image.offsetX} y={image.offsetY} width={tile.w} height={tile.h}>
            <image href={image.dataUrl} width={tile.w} height={tile.h} preserveAspectRatio="xMidYMid slice" />
          </pattern>
        )}
        {fit && (
          <clipPath id={`${id}-clip`}>
            {photoParts.map((part, i) => (
              <path key={i} d={part.d} />
            ))}
          </clipPath>
        )}
      </defs>
      {parts.map((part, i) => (
        <path key={`base${i}`} d={part.d} fill={color} />
      ))}
      {tile && parts.map((part, i) => <path key={`tile${i}`} d={part.d} fill={`url(#${id}-pat)`} />)}
      {image && fit && (
        <image href={image.dataUrl} x={fit.x} y={fit.y} width={fit.w} height={fit.h} preserveAspectRatio="none" clipPath={`url(#${id}-clip)`} />
      )}
      {parts.map((part, i) => (
        <g key={`shade${i}`}>
          <path d={part.d} fill="url(#shade-x)" />
          <path d={part.d} fill="url(#shade-y)" />
          {part.kind === 'trim' && <path d={part.d} fill="#000" opacity={0.08} />}
          <path d={part.d} fill="none" stroke={outline} strokeWidth={0.25} strokeLinejoin="round" />
        </g>
      ))}
      {details &&
        shape.details.map((detail, i) =>
          detail.style === 'fold' ? (
            <path key={`d${i}`} d={detail.d} fill="none" stroke="#000" strokeOpacity={0.16} strokeWidth={0.35} strokeLinecap="round" />
          ) : detail.style === 'seam' ? (
            <path key={`d${i}`} d={detail.d} fill="none" stroke={outline} strokeOpacity={0.7} strokeWidth={0.2} strokeDasharray="0.7 0.45" />
          ) : (
            <path key={`d${i}`} d={detail.d} fill="none" stroke={outline} strokeOpacity={0.35} strokeWidth={1.2} strokeLinecap="round" />
          ),
        )}
    </g>
  );
}

function HeatLayer({ id, shape, report }: { id: string; shape: GarmentShape; report: FitReport }) {
  const verdicts = new Map(report.items.map((item) => [item.key, item.verdict]));
  const main = shape.parts.filter((part) => part.kind === 'main');
  return (
    <g>
      <defs>
        <clipPath id={`${id}-main`}>
          {main.map((part, i) => (
            <path key={i} d={part.d} />
          ))}
        </clipPath>
        <clipPath id={`${id}-all`}>
          {shape.parts.map((part, i) => (
            <path key={i} d={part.d} />
          ))}
        </clipPath>
      </defs>
      {shape.bands.map((band, i) => {
        const verdict = verdicts.get(band.key);
        return verdict ? (
          <path key={i} d={band.d} fill={VERDICT_COLOR[verdict]} opacity={0.55} clipPath={`url(#${id}-${band.clip})`} />
        ) : null;
      })}
    </g>
  );
}

/** Featureless mannequin head: the face never changes, only the body follows the measurements. */
function Head({ b }: { b: BodyGeometry }) {
  const { cx, cy, rx, ry } = b.head;
  const neckTop = cy + ry * 0.5;
  // Egg shape: full crown, narrower jaw
  const head = `M${cx},${cy - ry} C${rx * 0.58},${cy - ry} ${rx},${cy - ry * 0.55} ${rx},${cy - ry * 0.05}
    C${rx},${cy + ry * 0.5} ${rx * 0.55},${cy + ry} ${cx},${cy + ry}
    C${-rx * 0.55},${cy + ry} ${-rx},${cy + ry * 0.5} ${-rx},${cy - ry * 0.05}
    C${-rx},${cy - ry * 0.55} ${-rx * 0.58},${cy - ry} ${cx},${cy - ry} Z`;
  const neckW = b.half.neck * 0.85;
  // Neck flares into the trapezius instead of a hard-edged cylinder.
  const neckSide = (s: 1 | -1) => [
    p(s * neckW, neckTop),
    p(s * neckW * 0.96, b.y.hps - 4),
    p(s * neckW * 1.25, b.y.hps - 1),
    p(s * neckW * 1.9, b.y.hps + 0.6),
  ];
  const neck = smooth([...neckSide(-1).reverse(), ...neckSide(1)]);
  return (
    <g>
      <path d={neck} fill={SKIN} />
      {([-1, 1] as const).map((s) => (
        <path key={s} d={smooth(neckSide(s), false)} fill="none" stroke={SKIN_SHADE} strokeWidth={0.2} />
      ))}
      <ellipse cx={0} cy={cy + ry * 0.95} rx={neckW * 0.9} ry={1.2} fill={SKIN_SHADE} opacity={0.35} />
      <path d={head} fill={SKIN} stroke={SKIN_SHADE} strokeWidth={0.2} />
      <path d={head} fill="url(#sheen)" />
    </g>
  );
}

/** Round display base under the feet. */
function Base({ b }: { b: BodyGeometry }) {
  const y = b.m.height;
  return (
    <g>
      <ellipse cx={0} cy={y + 1.6} rx={17} ry={2.6} fill="#4c4843" />
      <ellipse cx={0} cy={y + 0.4} rx={17} ry={2.6} fill="url(#base-top)" />
    </g>
  );
}

function Guides({ b }: { b: BodyGeometry }) {
  const H = b.m.height;
  const marks: [string, number][] = [
    ['가슴', b.y.chest],
    ['허리', b.y.waist],
    ['엉덩이', b.y.hip],
    ['가랑이', b.y.crotch],
    ['무릎', b.y.knee],
  ];
  return (
    <g className="guides" fontSize={2.4}>
      <line x1={-44} y1={0} x2={-44} y2={H} stroke="currentColor" strokeWidth={0.2} />
      {Array.from({ length: Math.floor(H / 10) + 1 }, (_, i) => (
        <g key={i}>
          <line x1={-44} x2={i % 5 === 0 ? -42 : -43} y1={H - i * 10} y2={H - i * 10} stroke="currentColor" strokeWidth={0.2} />
          {i % 5 === 0 && i > 0 && (
            <text x={-41.5} y={H - i * 10 + 0.8} fill="currentColor">
              {i * 10}
            </text>
          )}
        </g>
      ))}
      <text x={-44} y={-1} fill="currentColor" textAnchor="middle">
        {H}cm
      </text>
      {marks.map(([label, yy]) => (
        <g key={label}>
          <line x1={-34} x2={34} y1={yy} y2={yy} stroke="currentColor" strokeWidth={0.15} strokeDasharray="1 0.8" />
          <text x={35} y={yy + 0.8} fill="currentColor">
            {label}
          </text>
        </g>
      ))}
    </g>
  );
}
