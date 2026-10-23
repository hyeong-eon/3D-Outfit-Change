import { useEffect, useState } from 'react';

interface Props {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

/** Slider + number input in cm. The text box accepts partial typing and only commits values in range. */
export function NumberField({ label, hint, value, min, max, step = 0.5, onChange }: Props) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  return (
    <label className="field">
      <span className="field-label">
        {label}
        <small>{hint}</small>
      </span>
      <span className="field-inputs">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value !== '' && n >= min && n <= max) onChange(n);
          }}
          onBlur={() => setText(String(value))}
        />
        <span className="unit">cm</span>
      </span>
    </label>
  );
}
