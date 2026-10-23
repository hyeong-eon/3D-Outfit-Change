import { VERDICT_LABEL, type FitReport } from '../model/fit';
import { TEMPLATES, type Garment } from '../model/garments';
import { VERDICT_COLOR } from './Avatar2D';

interface Props {
  entries: { slotLabel: string; garment: Garment; report: FitReport }[];
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function FitPanel({ entries }: Props) {
  if (!entries.length) return <p className="empty">옷을 입히면 부위별 핏 분석이 여기에 나와요.</p>;
  return (
    <div className="fit">
      {entries.map(({ slotLabel, garment, report }) => (
        <section key={slotLabel} className="fit-card">
          <header>
            <h3>
              {slotLabel} · {garment.name}
            </h3>
            <small>
              {garment.name !== TEMPLATES[garment.type].label && `${TEMPLATES[garment.type].label} · `}
              {garment.size === 'custom' ? '직접 입력한 치수' : `${garment.size} 사이즈`}
            </small>
          </header>
          <p className={`summary ${report.level}`}>{report.summary}</p>
          <ul>
            {report.items.map((item) => (
              <li key={item.key}>
                <span className="verdict" style={{ background: VERDICT_COLOR[item.verdict] }}>
                  {VERDICT_LABEL[item.verdict]}
                </span>
                <span className="fit-text">
                  <strong>{item.label}</strong>
                  {item.text}
                  {item.body !== undefined && item.garment !== undefined && (
                    <small>
                      신체 {fmt(item.body)} · 옷 {fmt(item.garment)}
                      {item.key !== 'length' && item.key !== 'sleeveLength' && ` (${item.garment - item.body >= 0 ? '+' : ''}${fmt(Math.round((item.garment - item.body) * 10) / 10)})`}
                    </small>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="legend">
        {(Object.keys(VERDICT_LABEL) as (keyof typeof VERDICT_LABEL)[]).map((v) => (
          <span key={v}>
            <i style={{ background: VERDICT_COLOR[v] }} />
            {VERDICT_LABEL[v]}
          </span>
        ))}
      </div>
    </div>
  );
}
