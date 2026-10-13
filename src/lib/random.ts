export type Rng = () => number;

/** Small deterministic PRNG (mulberry32) — used for "today's idea" and in tests. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Weighted random choice. Items with weight <= 0 are never chosen. */
export function weightedPick<T>(items: T[], weight: (item: T) => number, rng: Rng): T | undefined {
  let total = 0;
  const weights = items.map((it) => {
    const w = Math.max(0, weight(it));
    total += w;
    return w;
  });
  if (total <= 0) return undefined;
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

export const pickOne = <T,>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)];
