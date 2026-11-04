import type { State } from './store';
import type { Question } from './types';

// Anti-repetition picker: unseen questions first; questions answered correctly fade
// (×0.3 per correct answer); anything shown in the last hour is almost never repeated.

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export function shuffle<T>(xs: T[], r = Math.random) {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function exposure(s: State) {
  const m: Record<string, { seen: number; right: number; last: number; lastOk: boolean }> = {};
  for (const a of s.attempts) {
    const e = (m[a.q] ||= { seen: 0, right: 0, last: 0, lastOk: false });
    e.seen++;
    if (a.ok) e.right++;
    e.last = a.t;
    e.lastOk = a.ok;
  }
  return m;
}

/**
 * No-repeat picker. Questions this device has never shown come first, in random order. Only when
 * every matching question has been seen does it reuse any, starting with the one seen longest
 * ago. (Mistake Master's "Retry my mistakes" repeats questions on purpose and does not use this.)
 */
export function pick(pool: Question[], count: number, s: State, opts: { exclude?: Set<string>; rand?: () => number } = {}): Question[] {
  const ex = exposure(s);
  const r = opts.rand ?? Math.random;
  const cands = pool.filter((q) => !opts.exclude?.has(q.id));
  const unseen = shuffle(cands.filter((q) => !ex[q.id]), r);
  const seen = cands
    .filter((q) => ex[q.id])
    .map((q) => ({ q, k: ex[q.id].last + r() * 1000 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.q);
  return [...unseen, ...seen].slice(0, count);
}

export const unseenCount = (pool: Question[], s: State) => {
  const ex = exposure(s);
  return pool.filter((q) => !ex[q.id]).length;
};
