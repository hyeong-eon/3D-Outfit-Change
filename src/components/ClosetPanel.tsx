import { TEMPLATES, type Garment } from '../model/garments';

interface Props {
  closet: Garment[];
  wornIds: string[];
  onWear: (garment: Garment) => void;
  onDelete: (id: string) => void;
}

export function ClosetPanel({ closet, wornIds, onWear, onDelete }: Props) {
  if (!closet.length) return <p className="empty">아직 저장한 옷이 없어요. 상의/하의 탭에서 옷을 만든 뒤 “옷장에 저장”을 누르세요.</p>;
  return (
    <ul className="closet">
      {closet.map((g) => (
        <li key={g.id}>
          <span className="swatch" style={{ background: g.design.color }}>
            {g.design.image && <img src={g.design.image.dataUrl} alt="" />}
          </span>
          <span className="closet-name">
            {g.name}
            <small>
              {TEMPLATES[g.type].label} · {g.size === 'custom' ? '직접 입력' : g.size}
            </small>
          </span>
          <button className="ghost" disabled={wornIds.includes(g.id)} onClick={() => onWear(g)}>
            {wornIds.includes(g.id) ? '입는 중' : '입기'}
          </button>
          <button className="ghost danger" aria-label={`${g.name} 삭제`} onClick={() => onDelete(g.id)}>
            삭제
          </button>
        </li>
      ))}
    </ul>
  );
}
