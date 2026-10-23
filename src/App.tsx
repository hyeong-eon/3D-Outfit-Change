import { useMemo, useState } from 'react';
import { Avatar2D } from './components/Avatar2D';
import { BodyPanel } from './components/BodyPanel';
import { ClosetPanel } from './components/ClosetPanel';
import { FitPanel } from './components/FitPanel';
import { GarmentPanel } from './components/GarmentPanel';
import { computeBody } from './geometry/body';
import { usePersistentState } from './lib/storage';
import { BODY_PRESETS, type BodyMeasurements } from './model/body';
import { analyzeGarment } from './model/fit';
import { makeGarment, TEMPLATES, type Garment } from './model/garments';

type Tab = 'body' | 'top' | 'bottom' | 'closet';
const TABS: [Tab, string][] = [
  ['body', '신체 치수'],
  ['top', '상의'],
  ['bottom', '하의'],
  ['closet', '옷장'],
];

const reviveBody = (v: unknown): BodyMeasurements => {
  const stored = (v ?? {}) as Partial<BodyMeasurements>;
  const sex = stored.sex === 'female' ? 'female' : 'male';
  return { ...BODY_PRESETS[sex], ...stored, sex };
};
const reviveGarment = (v: unknown): Garment | null => {
  const g = v as Garment | null;
  return g && g.type in TEMPLATES ? { ...g, measurements: { ...TEMPLATES[g.type].sizes.M, ...g.measurements } } : null;
};

export default function App() {
  const [body, setBody] = usePersistentState('body', BODY_PRESETS.male, reviveBody);
  const [top, setTop] = usePersistentState<Garment | null>('top', makeGarment('tshirt', 'M', '#3b5b8c'), reviveGarment);
  const [bottom, setBottom] = usePersistentState<Garment | null>('bottom', makeGarment('pants', 'L', '#c4b08a'), reviveGarment);
  const [closet, setCloset] = usePersistentState<Garment[]>('closet', [], (v) => (Array.isArray(v) ? v.map(reviveGarment).filter((g): g is Garment => !!g) : []));
  const [tab, setTab] = useState<Tab>('body');
  const [tuck, setTuck] = useState(false);
  const [heatmap, setHeatmap] = useState(false);
  const [guides, setGuides] = useState(false);

  const geometry = useMemo(() => computeBody(body), [body]);
  const reports = useMemo(
    () => ({ top: top ? analyzeGarment(geometry, top) : undefined, bottom: bottom ? analyzeGarment(geometry, bottom) : undefined }),
    [geometry, top, bottom],
  );
  const entries = [
    ...(top && reports.top ? [{ slotLabel: '상의', garment: top, report: reports.top }] : []),
    ...(bottom && reports.bottom ? [{ slotLabel: '하의', garment: bottom, report: reports.bottom }] : []),
  ];

  const save = (g: Garment) => {
    // Re-saving a garment that is already in the closet updates it in place.
    setCloset((c) => (c.some((x) => x.id === g.id) ? c.map((x) => (x.id === g.id ? g : x)) : [g, ...c]));
  };
  const wear = (g: Garment) => {
    (TEMPLATES[g.type].slot === 'top' ? setTop : setBottom)(g);
    setTab(TEMPLATES[g.type].slot);
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>가상 피팅룸</h1>
        <span className="tag">2D 프로토타입</span>
      </header>

      <main className="layout">
        <aside className="panel">
          <nav className="tabs" role="tablist">
            {TABS.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                {label}
                {id === 'closet' && closet.length > 0 && <span className="count">{closet.length}</span>}
              </button>
            ))}
          </nav>
          {tab === 'body' && <BodyPanel body={body} onChange={setBody} />}
          {tab === 'top' && <GarmentPanel slot="top" garment={top} body={body} onChange={setTop} onSave={save} />}
          {tab === 'bottom' && <GarmentPanel slot="bottom" garment={bottom} body={body} onChange={setBottom} onSave={save} />}
          {tab === 'closet' && (
            <ClosetPanel closet={closet} wornIds={[top?.id, bottom?.id].filter((id): id is string => !!id)} onWear={wear} onDelete={(id) => setCloset((c) => c.filter((g) => g.id !== id))} />
          )}
        </aside>

        <section className="stage">
          <div className="toolbar">
            <label className="check">
              <input type="checkbox" checked={tuck} onChange={(e) => setTuck(e.target.checked)} disabled={!top || !bottom} />
              상의 넣어 입기
            </label>
            <label className="check">
              <input type="checkbox" checked={heatmap} onChange={(e) => setHeatmap(e.target.checked)} />
              핏 히트맵
            </label>
            <label className="check">
              <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} />
              치수 가이드
            </label>
          </div>
          <Avatar2D body={body} top={top} bottom={bottom} tuck={tuck} heatmap={heatmap} guides={guides} reports={reports} />
        </section>

        <aside className="panel">
          <h2 className="panel-title">핏 분석</h2>
          <FitPanel entries={entries} />
        </aside>
      </main>
    </div>
  );
}
