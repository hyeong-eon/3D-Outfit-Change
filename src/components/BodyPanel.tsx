import { BODY_FIELDS, BODY_GROUPS, BODY_PRESETS, type BodyMeasurements, type Sex } from '../model/body';
import { NumberField } from './NumberField';

interface Props {
  body: BodyMeasurements;
  onChange: (body: BodyMeasurements) => void;
}

export function BodyPanel({ body, onChange }: Props) {
  return (
    <div className="panel-body">
      <div className="row">
        <div className="segmented" role="radiogroup" aria-label="체형 기준">
          {(['male', 'female'] as Sex[]).map((sex) => (
            <button key={sex} role="radio" aria-checked={body.sex === sex} className={body.sex === sex ? 'on' : ''} onClick={() => onChange({ ...body, sex })}>
              {sex === 'male' ? '남성 체형' : '여성 체형'}
            </button>
          ))}
        </div>
        <button className="ghost" onClick={() => onChange(BODY_PRESETS[body.sex])}>
          평균값으로
        </button>
      </div>
      {BODY_GROUPS.map((group) => (
        <fieldset key={group.title}>
          <legend>{group.title}</legend>
          {group.keys.map((key) => {
            const f = BODY_FIELDS[key];
            return <NumberField key={key} label={f.label} hint={f.hint} min={f.min} max={f.max} value={body[key]} onChange={(v) => onChange({ ...body, [key]: v })} />;
          })}
        </fieldset>
      ))}
    </div>
  );
}
