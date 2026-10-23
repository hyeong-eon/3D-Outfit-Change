import { useState } from 'react';
import { processGarmentPhoto } from '../lib/image';
import type { BodyMeasurements } from '../model/body';
import { recommendSize } from '../model/fit';
import { makeGarment, SIZE_LABELS, TEMPLATES, TEMPLATES_BY_SLOT, type Garment, type GarmentImage, type GarmentSlot } from '../model/garments';
import { NumberField } from './NumberField';

interface Props {
  slot: GarmentSlot;
  garment: Garment | null;
  body: BodyMeasurements;
  onChange: (garment: Garment | null) => void;
  onSave: (garment: Garment) => void;
}

export function GarmentPanel({ slot, garment, body, onChange, onSave }: Props) {
  const [removeBg, setRemoveBg] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const template = garment ? TEMPLATES[garment.type] : null;
  const recommended = garment ? recommendSize(body, garment.type) : null;
  const update = (patch: Partial<Garment>) => garment && onChange({ ...garment, ...patch });
  const updateImage = (patch: Partial<GarmentImage>) =>
    garment?.design.image && update({ design: { ...garment.design, image: { ...garment.design.image, ...patch } } });

  async function onPhoto(file: File | undefined) {
    if (!file || !garment) return;
    setBusy(true);
    setError(null);
    try {
      const photo = await processGarmentPhoto(file, removeBg);
      update({
        design: {
          color: photo.color,
          image: { dataUrl: photo.dataUrl, width: photo.width, height: photo.height, mode: 'fit', scale: 1, offsetX: 0, offsetY: 0 },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel-body">
      <fieldset>
        <legend>옷 종류</legend>
        <div className="chips">
          {TEMPLATES_BY_SLOT[slot].map((type) => (
            <button
              key={type}
              className={garment?.type === type ? 'chip on' : 'chip'}
              onClick={() => {
                const size = garment && garment.size !== 'custom' ? garment.size : recommendSize(body, type);
                onChange({ ...makeGarment(type, size), design: garment?.design ?? { color: slot === 'top' ? '#3b5b8c' : '#c4b08a' } });
              }}
            >
              {TEMPLATES[type].label}
            </button>
          ))}
          <button className={garment ? 'chip' : 'chip on'} onClick={() => onChange(null)}>
            안 입음
          </button>
        </div>
      </fieldset>

      {garment && template && (
        <>
          <fieldset>
            <legend>사이즈</legend>
            <div className="chips">
              {SIZE_LABELS.map((size) => (
                <button key={size} className={garment.size === size ? 'chip on' : 'chip'} onClick={() => update({ size, measurements: { ...template.sizes[size] } })}>
                  {size}
                  {size === recommended && <span className="badge">추천</span>}
                </button>
              ))}
              {garment.size === 'custom' && <span className="chip on static">직접 입력</span>}
            </div>
            <p className="note">사이즈표의 실측값(단면 = 펼쳐서 잰 폭)을 입력하세요.</p>
            {template.fields.map((f) => (
              <NumberField
                key={f.key}
                label={f.label}
                hint={f.hint}
                min={f.min}
                max={f.max}
                value={garment.measurements[f.key]}
                onChange={(v) => update({ size: 'custom', measurements: { ...garment.measurements, [f.key]: v } })}
              />
            ))}
          </fieldset>

          <fieldset>
            <legend>디자인</legend>
            <label className="row">
              <span>옷 이름</span>
              <input type="text" value={garment.name} onChange={(e) => update({ name: e.target.value })} />
            </label>
            <label className="row">
              <span>기본 색상</span>
              <input type="color" value={garment.design.color} onChange={(e) => update({ design: { ...garment.design, color: e.target.value } })} />
            </label>

            <div className="upload">
              <label className="button">
                {busy ? '처리 중…' : garment.design.image ? '사진 바꾸기' : '옷 사진 올리기'}
                <input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => onPhoto(e.target.files?.[0])} />
              </label>
              <label className="check">
                <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} />
                단색 배경 자동 제거
              </label>
            </div>
            <p className="note">옷만 나온 정면 사진(바닥에 펼친 사진)이 가장 잘 맞아요. 사진은 브라우저 안에서만 처리돼요.</p>
            {error && <p className="error">{error}</p>}

            {garment.design.image && (
              <div className="photo-controls">
                <img src={garment.design.image.dataUrl} alt="업로드한 옷 사진" />
                <div className="segmented">
                  <button className={garment.design.image.mode === 'fit' ? 'on' : ''} onClick={() => updateImage({ mode: 'fit' })}>
                    앞판에 맞추기
                  </button>
                  <button className={garment.design.image.mode === 'tile' ? 'on' : ''} onClick={() => updateImage({ mode: 'tile' })}>
                    원단 패턴
                  </button>
                </div>
                <Slider label="크기" min={0.3} max={3} step={0.05} value={garment.design.image.scale} onChange={(scale) => updateImage({ scale })} />
                <Slider label="좌우 위치" min={-20} max={20} step={0.5} value={garment.design.image.offsetX} onChange={(offsetX) => updateImage({ offsetX })} />
                <Slider label="상하 위치" min={-30} max={30} step={0.5} value={garment.design.image.offsetY} onChange={(offsetY) => updateImage({ offsetY })} />
                <button className="ghost" onClick={() => update({ design: { color: garment.design.color } })}>
                  사진 지우기
                </button>
              </div>
            )}
          </fieldset>

          <button
            className="primary"
            onClick={() => {
              onSave(garment);
              setSaved(true);
              setTimeout(() => setSaved(false), 1500);
            }}
          >
            {saved ? '옷장에 저장했어요' : '옷장에 저장'}
          </button>
        </>
      )}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
