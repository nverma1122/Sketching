import { useSyncExternalStore } from 'react';
import { BY_ID, topicKey } from './bank';
import type { Question } from './types';

// All progress lives in one LocalStorage record. Every change is saved immediately,
// so progress survives refreshes and browser restarts.

export type Mode = 'practice' | 'lesson' | 'iq' | 'daily' | 'survival' | 'speed' | 'exam' | 'mistakes';

export interface Attempt {
  q: string; // question id
  t: number; // timestamp
  ok: boolean;
  ms: number;
  mode: Mode;
  hints: number;
  xp: number;
}

export interface MistakeRec {
  wrong: number; // times answered wrong (ever)
  right: number; // times answered right after first mistake
  streak: number; // consecutive right answers since the last wrong one
  lastGiven: number;
  firstAt: number;
  lastAt: number;
  cleared: boolean; // two consecutive correct answers on separate sessions
}

export interface TestResult {
  id: string;
  kind: string; // practice | mvpp | vvm | olympiad | daily | survival | speed | iq | mistakes
  title: string;
  at: number;
  score: number;
  max: number;
  correct: number;
  wrong: number;
  skipped: number;
  timeSec: number;
  items: { q: string; given: number | null; ok: boolean | null; ms: number }[];
}

export interface DailyRec {
  qids: string[];
  answers: (number | null)[];
  done: boolean;
  correct: number;
}

export interface State {
  v: 1;
  xp: number;
  attempts: Attempt[];
  mistakes: Record<string, MistakeRec>;
  lessonsDone: string[];
  tests: TestResult[];
  bests: { survival: number; survivalQ: number; speed60: number; speed120: number };
  daily: Record<string, DailyRec>;
  badges: Record<string, number>;
  exam?: unknown; // in-progress exam (autosave)
  created: number;
}

const KEY = 'science-iq.progress.v1';

const fresh = (): State => ({
  v: 1,
  xp: 0,
  attempts: [],
  mistakes: {},
  lessonsDone: [],
  tests: [],
  bests: { survival: 0, survivalQ: 0, speed60: 0, speed120: 0 },
  daily: {},
  badges: {},
  created: Date.now(),
});

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    return { ...fresh(), ...s, bests: { ...fresh().bests, ...s.bests } };
  } catch {
    return fresh();
  }
}

let state: State = load();
const subs = new Set<() => void>();
let saveError = '';

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveError = '';
  } catch (e) {
    saveError = 'Progress could not be saved (storage full or blocked).';
    console.error(e);
  }
  subs.forEach((f) => f());
}

export function update(fn: (s: State) => State | void) {
  const draft = structuredClone(state);
  const r = fn(draft);
  state = r ?? draft;
  emit();
}

export const getState = () => state;
export const getSaveError = () => saveError;
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => sel(state),
  );
}

// ------------------------------------------------------------------ XP rules
// Correct answers earn 5 / 10 / 20 XP (Foundation / Advanced / Olympiad). Each hint used
// removes 40 % of that. Wrong answers earn nothing, and so do correct answers given in under
// 2 s on questions that need ≥ 30 s (indistinguishable from a blind guess).
export const XP_BY_LEVEL = [0, 5, 10, 20];

export function xpFor(q: Question, ok: boolean, ms: number, hints: number) {
  if (!ok) return 0;
  if (q.time >= 30 && ms < 2000) return 0;
  return Math.max(1, Math.round(XP_BY_LEVEL[q.level] * Math.pow(0.6, hints)));
}

/** Record one answer: attempts log, XP, and the Mistake Master collection. Returns XP earned. */
export function recordAnswer(q: Question, given: number | null, ms: number, mode: Mode, hints = 0, xpOverride?: number): number {
  const ok = given === q.answer;
  const xp = xpOverride ?? xpFor(q, ok, ms, hints);
  update((s) => {
    const now = Date.now();
    s.attempts.push({ q: q.id, t: now, ok, ms: Math.round(ms), mode, hints, xp });
    if (s.attempts.length > 8000) s.attempts = s.attempts.slice(-8000);
    s.xp += xp;
    const m = s.mistakes[q.id];
    if (!ok && given !== null) {
      s.mistakes[q.id] = {
        wrong: (m?.wrong ?? 0) + 1,
        right: m?.right ?? 0,
        streak: 0,
        lastGiven: given,
        firstAt: m?.firstAt ?? now,
        lastAt: now,
        cleared: false,
      };
    } else if (ok && m) {
      // a correct answer within 10 minutes of the previous one does not count towards clearing
      const spaced = now - m.lastAt > 10 * 60_000;
      const streak = spaced ? m.streak + 1 : m.streak;
      s.mistakes[q.id] = { ...m, right: m.right + 1, streak, lastAt: now, cleared: m.cleared || streak >= 2 };
    }
  });
  checkBadges();
  return xp;
}

export function addXp(n: number) {
  update((s) => {
    s.xp += n;
  });
  checkBadges();
}

export function saveTest(t: TestResult) {
  update((s) => {
    s.tests.push(t);
    if (s.tests.length > 300) s.tests = s.tests.slice(-300);
  });
  checkBadges();
}

export function resetAll() {
  state = fresh();
  emit();
}

export function exportJson() {
  const blob = new Blob([JSON.stringify({ app: 'SCIENCE IQ', exportedAt: new Date().toISOString(), progress: state }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `science-iq-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function importJson(text: string): string | null {
  try {
    const data = JSON.parse(text);
    const p = data.progress ?? data;
    if (p?.v !== 1 || !Array.isArray(p.attempts)) return 'This file is not a SCIENCE IQ progress export.';
    state = { ...fresh(), ...p };
    emit();
    return null;
  } catch {
    return 'Could not read the file.';
  }
}

// ------------------------------------------------------------------ derived stats

export const dayKey = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Days in a row (ending today, or yesterday if today has no practice yet) with ≥ 5 answers. */
export function streakOf(s: State): number {
  const per: Record<string, number> = {};
  for (const a of s.attempts) per[dayKey(a.t)] = (per[dayKey(a.t)] ?? 0) + 1;
  let n = 0;
  let t = Date.now();
  if ((per[dayKey(t)] ?? 0) < 5) t -= 86_400_000;
  while ((per[dayKey(t)] ?? 0) >= 5) {
    n++;
    t -= 86_400_000;
  }
  return n;
}

/**
 * A topic counts as mastered only with consistent evidence across several different questions:
 * of the last 8 answers in the topic, ≥ 6 correct, covering ≥ 4 distinct questions,
 * including at least one Advanced or Olympiad question answered correctly.
 */
export function topicMastered(s: State, key: string): boolean {
  const xs = s.attempts.filter((a) => BY_ID[a.q] && topicKey(BY_ID[a.q]) === key).slice(-8);
  if (xs.length < 6) return false;
  const distinct = new Set(xs.map((a) => a.q)).size;
  const ok = xs.filter((a) => a.ok).length;
  const hard = xs.some((a) => a.ok && BY_ID[a.q].level >= 2);
  return ok >= 6 && distinct >= 4 && hard;
}

export interface TopicStat {
  key: string;
  subject: string;
  topic: string;
  n: number;
  correct: number;
  acc: number;
}

export function topicStats(s: State): TopicStat[] {
  const m: Record<string, TopicStat> = {};
  for (const a of s.attempts) {
    const q = BY_ID[a.q];
    if (!q) continue;
    const k = topicKey(q);
    const t = (m[k] ||= { key: k, subject: q.subject, topic: q.topic, n: 0, correct: 0, acc: 0 });
    t.n++;
    if (a.ok) t.correct++;
  }
  return Object.values(m).map((t) => ({ ...t, acc: Math.round((t.correct / t.n) * 100) }));
}

// ------------------------------------------------------------------ levels & badges

export const LEVELS = [
  ['Science Explorer', 0],
  ['Curious Mind', 150],
  ['Concept Builder', 400],
  ['Scientific Thinker', 800],
  ['Knowledge Seeker', 1400],
  ['Science Challenger', 2200],
  ['Advanced Scholar', 3300],
  ['Olympiad Contender', 4700],
  ['Science Master', 6500],
  ['Science Champion', 9000],
] as const;

export function levelOf(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][1]) i++;
  const next = LEVELS[i + 1];
  return { n: i + 1, name: LEVELS[i][0], base: LEVELS[i][1], next: next?.[1], nextName: next?.[0], progress: next ? (xp - LEVELS[i][1]) / (next[1] - LEVELS[i][1]) : 1 };
}

export const BADGES = [
  { id: 'physics', icon: '⚛', name: 'Physics Pro', desc: '30 correct Physics answers at ≥ 70% accuracy' },
  { id: 'chemistry', icon: '⚗', name: 'Chemistry Master', desc: '30 correct Chemistry answers at ≥ 70% accuracy' },
  { id: 'biology', icon: '🧬', name: 'Biology Explorer', desc: '30 correct Biology answers at ≥ 70% accuracy' },
  { id: 'space', icon: '🪐', name: 'Space Enthusiast', desc: '15 correct Space Science answers at ≥ 70% accuracy' },
  { id: 'perfect', icon: '💯', name: 'Perfect Ten', desc: 'All correct in a quiz or test of at least 10 questions' },
  { id: 'speed', icon: '⚡', name: 'Speed Thinker', desc: '12+ correct in a 60-second Speed Challenge' },
  { id: 'streak7', icon: '🔥', name: 'Seven-Day Streak', desc: 'Practise (≥ 5 answers) seven days in a row' },
  { id: 'crusher', icon: '🔨', name: 'Mistake Crusher', desc: 'Clear 10 mistakes (two spaced correct answers each)' },
  { id: 'olympiad', icon: '🏆', name: 'Olympiad Challenger', desc: 'Score ≥ 60% in an Olympiad Challenge test' },
  { id: 'thinker', icon: '🧠', name: 'Deep Thinker', desc: '10 Science IQ problems solved without hints' },
  { id: 'survivor', icon: '❤', name: 'Survivor', desc: 'Answer 15 questions correctly in one Survival run' },
] as const;

function subjectBadge(s: State, subject: string, need: number) {
  const xs = s.attempts.filter((a) => BY_ID[a.q]?.subject === subject);
  const c = xs.filter((a) => a.ok).length;
  return c >= need && c / xs.length >= 0.7;
}

export function checkBadges() {
  const s = state;
  const earned: string[] = [];
  if (subjectBadge(s, 'Physics', 30)) earned.push('physics');
  if (subjectBadge(s, 'Chemistry', 30)) earned.push('chemistry');
  if (subjectBadge(s, 'Biology', 30)) earned.push('biology');
  if (subjectBadge(s, 'Space Science', 15)) earned.push('space');
  if (s.tests.some((t) => t.items.length >= 10 && t.correct === t.items.length)) earned.push('perfect');
  if (s.bests.speed60 >= 12 && s.tests.some((t) => t.kind === 'speed60' && t.correct >= 12)) earned.push('speed');
  if (streakOf(s) >= 7) earned.push('streak7');
  if (Object.values(s.mistakes).filter((m) => m.cleared).length >= 10) earned.push('crusher');
  if (s.tests.some((t) => ['mvpp', 'vvm', 'olympiad'].includes(t.kind) && t.max > 0 && t.score / t.max >= 0.6)) earned.push('olympiad');
  if (s.attempts.filter((a) => a.mode === 'iq' && a.ok && a.hints === 0).length >= 10) earned.push('thinker');
  if (s.bests.survivalQ >= 15) earned.push('survivor');
  const missing = earned.filter((b) => !s.badges[b]);
  if (missing.length) {
    state = { ...s, badges: { ...s.badges, ...Object.fromEntries(missing.map((b) => [b, Date.now()])) } };
    emit();
    missing.forEach((b) => toastBadge(b));
  }
}

// tiny event channel so the UI can celebrate new badges
export const badgeListeners = new Set<(id: string) => void>();
function toastBadge(id: string) {
  badgeListeners.forEach((f) => f(id));
}
