// Small, synchronous key/value persistence for preferences and lightweight
// state. Falls back to memory if localStorage is unavailable (private mode,
// blocked site data), so the app keeps working for the current visit.

const PREFIX = 'qcs.';
const memory = new Map<string, string>();

let available = (() => {
  try {
    const k = '__qcs_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
})();

export const localStorageAvailable = () => available;

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = available ? window.localStorage.getItem(PREFIX + key) : memory.get(PREFIX + key) ?? null;
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T): void {
  const raw = JSON.stringify(value);
  if (available) {
    try {
      window.localStorage.setItem(PREFIX + key, raw);
      return;
    } catch {
      // Quota or access error: keep the value in memory for this visit.
      available = false;
    }
  }
  memory.set(PREFIX + key, raw);
}

export function removeLocal(key: string): void {
  try {
    if (available) window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
  memory.delete(PREFIX + key);
}

export function clearLocal(): void {
  try {
    if (available) {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => window.localStorage.removeItem(k));
    }
  } catch {
    /* ignore */
  }
  memory.clear();
}
