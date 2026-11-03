import type { Difficulty, ExamTag, Format, QStat, Question, SubjectId } from './types';
import { DAY } from './util';

// Anti-repetition question picker.
//
// Every candidate gets a weight:
//   unseen                      → 1.3
//   seen, last answer wrong     → 0.5   (mistakes mainly return via Mistake Master instead)
//   seen, answered correctly    → 0.6 × 0.35^correctStreak  (fades the more often it is right)
// multiplied by a recency factor (shown < 1 day ago ×0.03, < 3 days ×0.25, < 7 days ×0.6),
// and — when a target difficulty is given — by exp(−0.9·|d − target|).
// Items are then drawn by weighted sampling without replacement, never two from the same
// `family` (numeric/scenario variants of one idea) and never an id already in `exclude`.

export interface Filter {
  subjects?: SubjectId[];
  chapters?: string[];
  topics?: string[];
  exams?: ExamTag[];
  formats?: Format[];
  minDifficulty?: Difficulty;
  maxDifficulty?: Difficulty;
  skills?: Question['skill'][];
  maxTime?: number;
  sampleOnly?: boolean;
  /** Exclude generated practice items (exams use only authored questions where possible). */
  authoredOnly?: boolean;
}

export function applyFilter(bank: Question[], f: Filter): Question[] {
  return bank.filter(
    (q) =>
      q.status === 'verified' &&
      (!f.subjects?.length || f.subjects.includes(q.subject)) &&
      (!f.chapters?.length || f.chapters.includes(q.chapter)) &&
      (!f.topics?.length || f.topics.includes(q.topic)) &&
      (!f.exams?.length || q.exams.some((e) => f.exams!.includes(e))) &&
      (!f.formats?.length || f.formats.includes(q.format)) &&
      (!f.skills?.length || f.skills.includes(q.skill)) &&
      (!f.minDifficulty || q.difficulty >= f.minDifficulty) &&
      (!f.maxDifficulty || q.difficulty <= f.maxDifficulty) &&
      (!f.maxTime || q.time <= f.maxTime) &&
      (!f.sampleOnly || q.sample) &&
      (!f.authoredOnly || !q.generated),
  );
}

export interface PickOptions {
  count: number;
  stats: Record<string, QStat>;
  now?: number;
  targetDifficulty?: number;
  exclude?: Set<string>;
  excludeFamilies?: Set<string>;
  rand?: () => number;
}

export function weightOf(q: Question, st: QStat | undefined, now: number, target?: number): number {
  let w: number;
  if (!st || st.seen === 0) w = 1.3;
  else if (st.correctStreak === 0 && st.wrong > 0) w = 0.5;
  else w = 0.6 * Math.pow(0.35, st.correctStreak);
  if (st?.lastSeen) {
    const age = now - st.lastSeen;
    if (age < DAY) w *= 0.03;
    else if (age < 3 * DAY) w *= 0.25;
    else if (age < 7 * DAY) w *= 0.6;
  }
  if (target !== undefined) w *= Math.exp(-0.9 * Math.abs(q.difficulty - target));
  return w;
}

export const familyOf = (q: Question) => q.family || q.id;

export function pickQuestions(pool: Question[], o: PickOptions): Question[] {
  const now = o.now ?? Date.now();
  const rand = o.rand ?? Math.random;
  const exclude = o.exclude ?? new Set<string>();
  const fams = new Set(o.excludeFamilies ?? []);
  let cands = pool.filter((q) => !exclude.has(q.id) && !fams.has(familyOf(q)));
  const out: Question[] = [];
  const weights = new Map(cands.map((q) => [q.id, weightOf(q, o.stats[q.id], now, o.targetDifficulty)]));
  while (out.length < o.count && cands.length) {
    const total = cands.reduce((s, q) => s + weights.get(q.id)!, 0);
    let r = rand() * total;
    let idx = 0;
    for (; idx < cands.length - 1; idx++) {
      r -= weights.get(cands[idx].id)!;
      if (r <= 0) break;
    }
    const q = cands[idx];
    out.push(q);
    const f = familyOf(q);
    cands = cands.filter((c) => familyOf(c) !== f);
  }
  return out;
}

/** Pick one more question (endless / survival / adaptive flows). */
export function pickOne(pool: Question[], o: Omit<PickOptions, 'count'>): Question | undefined {
  return pickQuestions(pool, { ...o, count: 1 })[0];
}
