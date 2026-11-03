import type { Attempt, Difficulty, Skill } from './types';
import { DAY } from './util';

// Adaptive learning engine.
//
// Mastery of a group (subject, chapter, topic, format, …) is a recency- and difficulty-weighted
// accuracy, smoothed towards 50 % by a prior worth PRIOR_N attempts so that two lucky answers
// never declare a topic "mastered". A topic is only classified once it has MIN_ATTEMPTS answers.
// Slow-but-correct work is discounted slightly (median time > 1.6× budget).
//
// It separately tracks UNDERSTANDING (recall, concept questions) and APPLICATION (application,
// numerical, reasoning, experimental, unfamiliar, integrated) so it can say "understands Newton's
// laws but struggles to apply them to unfamiliar situations".

export const MIN_ATTEMPTS = 8;
const PRIOR_N = 4;
const HALF_LIFE_DAYS = 21;

export const UNDERSTANDING: Skill[] = ['recall', 'concept'];
export const isApplication = (s: Skill) => !UNDERSTANDING.includes(s);

export type Band = 'none' | 'red' | 'orange' | 'yellow' | 'green' | 'blue';
export const BAND_LABEL: Record<Band, string> = {
  none: 'Not enough data',
  red: 'Needs serious attention',
  orange: 'Developing',
  yellow: 'Moderate',
  green: 'Strong',
  blue: 'Mastered',
};

export const STAGES = ['Foundation', 'Conceptual Understanding', 'Application', 'Advanced Reasoning', 'Olympiad Mastery'];

export interface Mastery {
  n: number;
  correct: number;
  accuracy: number; // raw %
  score: number; // smoothed, weighted 0–100
  band: Band;
  level: number; // highest difficulty handled reliably (0–5)
  target: Difficulty; // next difficulty to practise
  stage: string;
  medianTimeRatio: number;
  understanding?: { n: number; acc: number };
  application?: { n: number; acc: number };
  hardCorrect: number; // correct at difficulty ≥ 3
}

function median(xs: number[]) {
  if (!xs.length) return 1;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** est: estimated solving time lookup (qid → seconds) for the speed factor. */
export function mastery(attempts: Attempt[], est: (qid: string) => number, now = Date.now()): Mastery {
  const at = attempts.filter((a) => !a.skipped);
  const n = at.length;
  const correct = at.filter((a) => a.correct).length;
  let num = 0;
  let den = 0;
  for (const a of at) {
    const w = Math.pow(0.5, (now - a.at) / DAY / HALF_LIFE_DAYS) * (0.6 + 0.2 * a.difficulty);
    num += w * (a.correct ? 1 : 0);
    den += w;
  }
  const meanW = n ? den / n : 1;
  const smoothed = (num + 0.5 * PRIOR_N * meanW) / (den + PRIOR_N * meanW);
  const ratios = at.filter((a) => a.correct).map((a) => a.timeMs / 1000 / Math.max(10, est(a.qid)));
  const mtr = median(ratios);
  const speedAdj = mtr > 1.6 ? Math.max(0.85, 1 - (mtr - 1.6) * 0.1) : 1;
  const score = Math.round(smoothed * speedAdj * 100);

  // level: highest difficulty d with ≥ 4 recent attempts at d and ≥ 70 % accuracy there
  let level = 0;
  for (let d = 1; d <= 5; d++) {
    const atD = at.filter((a) => a.difficulty === d).slice(-12);
    if (atD.length >= 4 && atD.filter((a) => a.correct).length / atD.length >= 0.7) level = d;
  }
  const lowLevel = at.filter((a) => a.difficulty <= 2);
  const startTarget = lowLevel.length >= 4 && lowLevel.filter((a) => a.correct).length / lowLevel.length < 0.5 ? 1 : 2;
  const target = Math.min(5, Math.max(level + 1, startTarget)) as Difficulty;
  const hardCorrect = at.filter((a) => a.correct && a.difficulty >= 3).length;

  let band: Band = 'none';
  if (n >= MIN_ATTEMPTS) {
    if (score >= 85 && hardCorrect >= 4) band = 'blue';
    else if (score >= 70) band = 'green';
    else if (score >= 55) band = 'yellow';
    else if (score >= 40) band = 'orange';
    else band = 'red';
  }
  const u = at.filter((a) => UNDERSTANDING.includes(a.skill));
  const p = at.filter((a) => isApplication(a.skill));
  const acc = (xs: Attempt[]) => (xs.length ? Math.round((xs.filter((a) => a.correct).length / xs.length) * 100) : 0);
  return {
    n,
    correct,
    accuracy: acc(at),
    score: n ? score : 0,
    band,
    level,
    target,
    stage: STAGES[Math.max(0, Math.min(4, level - 1))],
    medianTimeRatio: Math.round(mtr * 100) / 100,
    understanding: u.length ? { n: u.length, acc: acc(u) } : undefined,
    application: p.length ? { n: p.length, acc: acc(p) } : undefined,
    hardCorrect,
  };
}

export function masteryBy(attempts: Attempt[], key: (a: Attempt) => string, est: (qid: string) => number, now = Date.now()): Record<string, Mastery> {
  const groups: Record<string, Attempt[]> = {};
  for (const a of attempts) (groups[key(a)] ||= []).push(a);
  const out: Record<string, Mastery> = {};
  for (const [k, v] of Object.entries(groups)) out[k] = mastery(v.sort((x, y) => x.at - y.at), est, now);
  return out;
}

export interface Weakness {
  kind: 'low-mastery' | 'application-gap' | 'slow' | 'deteriorating' | 'format';
  key: string; // topic key "chapter::topic" or format
  label: string;
  detail: string;
  severity: number; // higher = more urgent
}

const topicKey = (a: Attempt) => `${a.chapter}::${a.topic}`;

/** Specific, evidence-based weaknesses. Nothing is reported without ≥ MIN_ATTEMPTS answers. */
export function findWeaknesses(attempts: Attempt[], est: (qid: string) => number, now = Date.now()): Weakness[] {
  const out: Weakness[] = [];
  const byTopic: Record<string, Attempt[]> = {};
  for (const a of attempts) if (!a.skipped) (byTopic[topicKey(a)] ||= []).push(a);
  for (const [k, xs] of Object.entries(byTopic)) {
    xs.sort((a, b) => a.at - b.at);
    const m = mastery(xs, est, now);
    const topic = k.split('::')[1];
    if (m.n >= MIN_ATTEMPTS && m.score < 60)
      out.push({ kind: 'low-mastery', key: k, label: topic, detail: `Mastery ${m.score}/100 over ${m.n} answers (${m.accuracy}% correct).`, severity: 100 - m.score });
    if (m.understanding && m.application && m.understanding.n >= 4 && m.application.n >= 4 && m.understanding.acc - m.application.acc >= 20)
      out.push({
        kind: 'application-gap',
        key: k,
        label: topic,
        detail: `Understands the idea (${m.understanding.acc}% on concept questions) but struggles to apply it (${m.application.acc}% on application/numerical/unfamiliar questions).`,
        severity: m.understanding.acc - m.application.acc,
      });
    if (m.n >= MIN_ATTEMPTS && m.accuracy >= 70 && m.medianTimeRatio > 1.6)
      out.push({ kind: 'slow', key: k, label: topic, detail: `Accurate but slow: median ${m.medianTimeRatio}× the time budget.`, severity: 25 });
    if (xs.length >= 16) {
      const last = xs.slice(-8);
      const prev = xs.slice(-16, -8);
      const la = last.filter((a) => a.correct).length / 8;
      const pa = prev.filter((a) => a.correct).length / 8;
      if (pa - la >= 0.25)
        out.push({ kind: 'deteriorating', key: k, label: topic, detail: `Accuracy fell from ${Math.round(pa * 100)}% to ${Math.round(la * 100)}% over the last 16 answers.`, severity: Math.round((pa - la) * 100) });
    }
  }
  const byFormat: Record<string, Attempt[]> = {};
  for (const a of attempts) if (!a.skipped) (byFormat[a.format] ||= []).push(a);
  const overall = attempts.length ? attempts.filter((a) => a.correct).length / attempts.length : 0;
  for (const [f, xs] of Object.entries(byFormat)) {
    if (xs.length < MIN_ATTEMPTS) continue;
    const acc = xs.filter((a) => a.correct).length / xs.length;
    if (overall - acc >= 0.2)
      out.push({ kind: 'format', key: f, label: `${f} questions`, detail: `${Math.round(acc * 100)}% on ${f} questions vs ${Math.round(overall * 100)}% overall.`, severity: Math.round((overall - acc) * 100) });
  }
  return out.sort((a, b) => b.severity - a.severity);
}

/** Endless/adaptive staircase: move difficulty by the last 4 answers, never on one answer alone. */
export function staircase(current: number, recent: boolean[]): number {
  const last = recent.slice(-4);
  if (last.length < 3) return current;
  const acc = last.filter(Boolean).length / last.length;
  if (acc >= 0.75) return Math.min(5, current + 1);
  if (acc <= 0.25) return Math.max(1, current - 1);
  return current;
}
