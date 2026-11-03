import type { Question } from './types';

// Duplicate & near-variant detection.
// A question whose stem only differs in numbers, or whose options are merely re-ordered, is NOT a
// new question. We normalise the stem (lower-case, numbers → #, strip punctuation), then compare
// word-trigram Jaccard similarity. ≥ 0.85 → duplicate; ≥ 0.6 → same-family variant (allowed, but
// grouped so it never appears twice in a session and is counted once in bank statistics).

const STOP = new Set(['the', 'a', 'an', 'of', 'is', 'to', 'and', 'in', 'on', 'for', 'which', 'what', 'its', 'it', 'be', 'by', 'with', 'are', 'that', 'this']);

export function normaliseStem(s: string): string {
  return s
    .toLowerCase()
    .replace(/\$[^$]*\$/g, (m) => m.replace(/[0-9]+(\.[0-9]+)?/g, '#'))
    .replace(/[0-9]+(\.[0-9]+)?/g, '#')
    .replace(/[^a-z#\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .join(' ');
}

function shingles(s: string): Set<string> {
  const w = s.split(' ');
  const out = new Set<string>();
  if (w.length < 3) {
    out.add(s);
    return out;
  }
  for (let i = 0; i + 2 < w.length; i++) out.add(w[i] + ' ' + w[i + 1] + ' ' + w[i + 2]);
  return out;
}

export function similarity(a: string, b: string): number {
  const A = shingles(normaliseStem(a));
  const B = shingles(normaliseStem(b));
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const uni = A.size + B.size - inter;
  return uni ? inter / uni : 0;
}

export interface DupHit {
  id: string;
  score: number;
  kind: 'duplicate' | 'variant';
}

/** Compare a candidate against a bank. Options are compared as a set (order-independent). */
export function findDuplicates(cand: Pick<Question, 'stem' | 'options' | 'id'>, bank: Pick<Question, 'stem' | 'options' | 'id'>[]): DupHit[] {
  const hits: DupHit[] = [];
  const optKey = (o?: string[]) => (o ? [...o].map((x) => x.toLowerCase().trim()).sort().join('|') : '');
  const ck = optKey(cand.options);
  for (const q of bank) {
    if (q.id === cand.id) continue;
    let s = similarity(cand.stem, q.stem);
    if (ck && ck === optKey(q.options)) s = Math.max(s, 0.9); // same option set, re-ordered
    if (s >= 0.85) hits.push({ id: q.id, score: s, kind: 'duplicate' });
    else if (s >= 0.6) hits.push({ id: q.id, score: s, kind: 'variant' });
  }
  return hits.sort((a, b) => b.score - a.score);
}
