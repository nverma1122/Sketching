import type { Attempt, ErrorKind, Question } from './types';

export type Given = number | number[] | null | undefined;

/** Is the given response correct for this question? */
export function isCorrect(q: Question, given: Given): boolean {
  if (given === null || given === undefined) return false;
  const a = q.answer;
  switch (a.kind) {
    case 'single':
      return given === a.index;
    case 'multi': {
      if (!Array.isArray(given)) return false;
      const g = [...new Set(given)].sort((x, y) => x - y);
      const t = [...a.indices].sort((x, y) => x - y);
      return g.length === t.length && g.every((v, i) => v === t[i]);
    }
    case 'numeric': {
      if (typeof given !== 'number' || !Number.isFinite(given)) return false;
      return Math.abs(given - a.value) <= a.tolerance + 1e-9;
    }
    case 'order':
      return Array.isArray(given) && given.length === a.order.length && given.every((v, i) => v === a.order[i]);
  }
}

/**
 * Diagnose why an answer was wrong.
 *  1. answered in under 20% of the estimated time on a question that needs ≥ 30 s → guess
 *  2. the chosen distractor carries a trap tag → that error kind
 *  3. numeric answer off by a power of ten → unit; close but outside tolerance → calculation
 *  4. far over 2.5× the time budget → time-management
 *  5. otherwise → concept
 */
export function diagnose(q: Question, given: Given, timeMs: number): Attempt['error'] {
  const est = q.time * 1000;
  if (given !== null && given !== undefined && est >= 30_000 && timeMs < est * 0.2) return 'guess';
  if (q.answer.kind === 'single' && typeof given === 'number' && q.traps?.[given]) return q.traps[given] as ErrorKind;
  if (q.answer.kind === 'numeric' && typeof given === 'number' && q.answer.value !== 0) {
    const ratio = given / q.answer.value;
    const lg = Math.log10(Math.abs(ratio));
    if (ratio > 0 && Math.abs(lg - Math.round(lg)) < 0.02 && Math.round(lg) !== 0) return 'unit';
    if (Math.abs(ratio - 1) < 0.15) return 'calculation';
  }
  if (timeMs > est * 2.5) return 'time';
  return 'concept';
}

/** Human-readable correct answer, for review screens. */
export function answerText(q: Question): string {
  const a = q.answer;
  const L = (i: number) => String.fromCharCode(65 + i);
  switch (a.kind) {
    case 'single':
      return `${L(a.index)}. ${q.options?.[a.index] ?? ''}`;
    case 'multi':
      return a.indices.map((i) => `${L(i)}. ${q.options?.[i] ?? ''}`).join('; ');
    case 'numeric':
      return `${a.value}${a.unit ? ' ' + a.unit : ''}`;
    case 'order':
      return a.order.map((i) => q.options?.[i] ?? String(i)).join(' → ');
  }
}

export function givenText(q: Question, given: Given): string {
  if (given === null || given === undefined) return '— (not answered)';
  const L = (i: number) => String.fromCharCode(65 + i);
  if (q.answer.kind === 'numeric') return String(given);
  if (q.answer.kind === 'order' && Array.isArray(given)) return given.map((i) => q.options?.[i] ?? i).join(' → ');
  if (Array.isArray(given)) return given.map((i) => `${L(i)}. ${q.options?.[i] ?? ''}`).join('; ') || '—';
  return `${L(given)}. ${q.options?.[given] ?? ''}`;
}
