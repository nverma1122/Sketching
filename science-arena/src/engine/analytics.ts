import { CHAPTERS } from '../content/curriculum';
import { EXAMS } from '../content/exams';
import { mastery } from './adaptive';
import type { Attempt, ExamResult } from './types';
import { dayKey, pct } from './util';

// Readiness indicators — INTERNAL preparation estimates, never predictions of exam results.

export interface Readiness {
  total: number;
  parts: { name: string; value: number; weight: number; note: string }[];
}

const W = { coverage: 0.2, mastery: 0.25, mock: 0.2, accuracy: 0.1, consistency: 0.1, advanced: 0.15 };

export function readiness(track: 'MVPP' | 'VVM', attempts: Attempt[], exams: ExamResult[], est: (qid: string) => number, now = Date.now()): Readiness {
  const chapters = CHAPTERS.filter((c) => c.exams.includes(track));
  const rel = attempts.filter((a) => a.exams.includes(track) || chapters.some((c) => c.id === a.chapter));
  const topics = chapters.flatMap((c) => c.topics.map((t) => `${c.id}::${t}`));
  const touched = new Set(rel.map((a) => `${a.chapter}::${a.topic}`));
  const covered = topics.filter((t) => {
    const n = rel.filter((a) => `${a.chapter}::${a.topic}` === t).length;
    return n >= 3 && touched.has(t);
  }).length;
  const coverage = pct(covered, topics.length);
  const chMastery = chapters.map((c) => {
    const xs = rel.filter((a) => a.chapter === c.id).sort((a, b) => a.at - b.at);
    return xs.length ? mastery(xs, est, now).score : 0;
  });
  const masteryAvg = Math.round(chMastery.reduce((s, x) => s + x, 0) / Math.max(1, chMastery.length));
  const trackExamIds = new Set(EXAMS.filter((e) => e.track === track).map((e) => e.id));
  const mocks = exams.filter((e) => trackExamIds.has(e.examId)).sort((a, b) => b.endedAt - a.endedAt).slice(0, 3);
  const mock = mocks.length ? Math.round(mocks.reduce((s, e) => s + Math.max(0, pct(e.score, e.maxScore)), 0) / mocks.length) : 0;
  const accuracy = pct(rel.filter((a) => a.correct).length, rel.filter((a) => !a.skipped).length);
  const byDay: Record<string, Attempt[]> = {};
  for (const a of rel) (byDay[dayKey(a.at)] ||= []).push(a);
  const days = Object.keys(byDay).sort().slice(-10);
  let consistency = 0;
  if (days.length >= 3) {
    const accs = days.map((d) => byDay[d].filter((a) => a.correct).length / byDay[d].length);
    const mean = accs.reduce((s, x) => s + x, 0) / accs.length;
    const sd = Math.sqrt(accs.reduce((s, x) => s + (x - mean) ** 2, 0) / accs.length);
    const regularity = Math.min(1, days.length / 10);
    consistency = Math.round(Math.max(0, 1 - sd * 2) * regularity * 100);
  }
  const hard = rel.filter((a) => a.difficulty >= 3 && !a.skipped);
  const advanced = hard.length >= 5 ? pct(hard.filter((a) => a.correct).length, hard.length) : 0;
  const parts = [
    { name: 'Syllabus coverage', value: coverage, weight: W.coverage, note: `${covered}/${topics.length} topics practised (≥ 3 answers each)` },
    { name: 'Topic mastery', value: masteryAvg, weight: W.mastery, note: `average chapter mastery across ${chapters.length} ${track} chapters` },
    { name: 'Mock-test performance', value: mock, weight: W.mock, note: mocks.length ? `average of last ${mocks.length} ${track} mock(s)` : `no ${track} mock taken yet` },
    { name: 'Accuracy', value: accuracy, weight: W.accuracy, note: `${rel.length} ${track}-relevant answers` },
    { name: 'Consistency', value: consistency, weight: W.consistency, note: days.length >= 3 ? `steadiness of daily accuracy over ${days.length} active days` : 'needs ≥ 3 active days' },
    { name: 'Advanced questions', value: advanced, weight: W.advanced, note: hard.length >= 5 ? `${hard.length} Advanced+ answers` : 'needs ≥ 5 Advanced+ answers' },
  ];
  return { total: Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0)), parts };
}

export interface DailyPoint {
  day: string;
  answered: number;
  correct: number;
  accuracy: number;
  minutes: number;
}

export function dailySeries(attempts: Attempt[], days = 30, now = Date.now()): DailyPoint[] {
  const out: DailyPoint[] = [];
  const by: Record<string, Attempt[]> = {};
  for (const a of attempts) (by[dayKey(a.at)] ||= []).push(a);
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(now - i * 86_400_000);
    const xs = by[k] || [];
    const c = xs.filter((a) => a.correct).length;
    out.push({ day: k.slice(5), answered: xs.length, correct: c, accuracy: xs.length ? pct(c, xs.length) : NaN, minutes: Math.round(xs.reduce((s, a) => s + a.timeMs, 0) / 60000) });
  }
  return out;
}
