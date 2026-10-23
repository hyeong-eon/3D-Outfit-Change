import { useEffect, useState } from 'react';

const PREFIX = 'fitting-room:';

/** useState backed by localStorage. Storage failures (quota, private mode) are non-fatal. */
export function usePersistentState<T>(key: string, initial: T, revive: (stored: unknown) => T = (v) => v as T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? initial : revive(JSON.parse(raw));
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (err) {
      console.warn(`"${key}" 저장 실패`, err);
    }
  }, [key, value]);
  return [value, setValue] as const;
}
