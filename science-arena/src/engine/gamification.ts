import type { Attempt, Difficulty, Mistake, SessionRecord, SubjectId } from './types';
import { DAY, dayKey } from './util';

// XP rewards genuine learning: harder questions pay more, guesses pay nothing, hints cost XP,
// and nothing is awarded for opening the app. Improvement over a personal best earns a bonus.

export const LEVELS = [
  { name: 'Science Explorer', xp: 0 },
  { name: 'Curious Mind', xp: 300 },
  { name: 'Concept Builder', xp: 800 },
  { name: 'Scientific Thinker', xp: 1600 },
  { name: 'Knowledge Seeker', xp: 2800 },
  { name: 'Science Challenger', xp: 4500 },
  { name: 'Advanced Scholar', xp: 7000 },
  { name: 'Olympiad Contender', xp: 10500 },
  { name: 'Science Champion', xp: 15000 },
  { name: 'Master of Science', xp: 21000 },
];

export function levelOf(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  return {
    index: i + 1,
    name: cur.name,
    xpInto: xp - cur.xp,
    xpForNext: next ? next.xp - cur.xp : 0,
    progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1,
    nextName: next?.name,
  };
}

export const XP_RULES = {
  correctBase: [0, 4, 6, 9, 13, 18] as number[], // by difficulty 1..5
  lesson: 25,
  dailyMission: 60,
  weeklyChallenge: 120,
  mockExamBase: 80,
  mistakeRevisedCorrect: 6,
  mistakeMastered: 20,
  bossDefeated: 75,
  personalBest: 30,
};

/** XP for one answer. Wrong answers and guesses earn 0; each hint used removes 30 %. */
export function answerXp(correct: boolean, d: Difficulty, error?: Attempt['error'], hintsUsed = 0): number {
  if (!correct || error === 'guess') return 0;
  return Math.max(1, Math.round(XP_RULES.correctBase[d] * Math.pow(0.7, hintsUsed)));
}

// ------------------------------------------------------------------ badges

export interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

export const BADGES: BadgeDef[] = [
  { id: 'physics-pro', name: 'Physics Pro', icon: '⚛', desc: '60 correct Physics answers with ≥ 75% accuracy, 15 of them Advanced or harder.' },
  { id: 'chem-wizard', name: 'Chemistry Wizard', icon: '⚗', desc: '60 correct Chemistry answers with ≥ 75% accuracy, 15 of them Advanced or harder.' },
  { id: 'bio-expert', name: 'Biology Expert', icon: '🧬', desc: '60 correct Biology answers with ≥ 75% accuracy, 15 of them Advanced or harder.' },
  { id: 'space-explorer', name: 'Space Explorer', icon: '🪐', desc: '30 correct Space Science answers with ≥ 75% accuracy.' },
  { id: 'speed-demon', name: 'Speed Demon', icon: '⚡', desc: 'Score 120+ in a 60-second Speed Arena run with ≥ 80% accuracy.' },
  { id: 'accuracy-master', name: 'Accuracy Master', icon: '🎯', desc: '25 correct answers in a row (any mode).' },
  { id: 'mistake-crusher', name: 'Mistake Crusher', icon: '🔨', desc: 'Master 10 mistakes through spaced revision.' },
  { id: 'streak-7', name: 'Seven-Day Streak', icon: '🔥', desc: 'Practise genuinely (≥ 10 answers) on 7 consecutive days.' },
  { id: 'perfect-score', name: 'Perfect Score', icon: '💯', desc: 'Full marks in a test of at least 20 questions.' },
  { id: 'boss-slayer', name: 'Boss Slayer', icon: '🐉', desc: 'Defeat 3 different chapter bosses.' },
  { id: 'vvm-warrior', name: 'VVM Warrior', icon: '🛡', desc: 'Complete a full VVM Level-I simulation scoring ≥ 60%.' },
  { id: 'mvpp-champion', name: 'MVPP Champion', icon: '🏆', desc: 'Score ≥ 70% in both MVPP papers (MAT and SAT simulations).' },
  { id: 'deep-thinker', name: 'Deep Thinker', icon: '🧠', desc: 'Solve 10 Science IQ unfamiliar problems without hints.' },
  { id: 'survivor', name: 'Survivor', icon: '❤', desc: 'Reach level 8 in Survival Mode.' },
];

export interface BadgeContext {
  attempts: Attempt[];
  sessions: SessionRecord[];
  mistakes: Mistake[];
  exams: { examId: string; score: number; maxScore: number; count: number }[];
}

function subjectBadge(at: Attempt[], s: SubjectId, need: number, needHard: number) {
  const xs = at.filter((a) => a.subject === s && !a.skipped);
  const c = xs.filter((a) => a.correct);
  return c.length >= need && c.length / xs.length >= 0.75 && c.filter((a) => a.difficulty >= 3).length >= needHard;
}

export function longestCorrectRun(at: Attempt[]): number {
  let best = 0;
  let cur = 0;
  for (const a of [...at].sort((x, y) => x.at - y.at)) {
    if (a.skipped) continue;
    cur = a.correct ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}

/** Day streak: consecutive days (ending today or yesterday) with ≥ 10 answers. */
export function dayStreak(at: Attempt[], now = Date.now()): { current: number; best: number } {
  const counts: Record<string, number> = {};
  for (const a of at) counts[dayKey(a.at)] = (counts[dayKey(a.at)] || 0) + 1;
  const ok = (t: number) => (counts[dayKey(t)] || 0) >= 10;
  let current = 0;
  let t = now;
  if (!ok(t)) t -= DAY; // today not done yet — streak still alive from yesterday
  while (ok(t)) {
    current++;
    t -= DAY;
  }
  const days = Object.keys(counts).filter((k) => counts[k] >= 10).sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of days) {
    const [y, m, d] = k.split('-').map(Number);
    const tt = new Date(y, m - 1, d).getTime();
    run = prev !== null && Math.round((tt - prev) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = tt;
  }
  return { current, best: Math.max(best, current) };
}

export function earnedBadges(c: BadgeContext): string[] {
  const out: string[] = [];
  const at = c.attempts;
  if (subjectBadge(at, 'physics', 60, 15)) out.push('physics-pro');
  if (subjectBadge(at, 'chemistry', 60, 15)) out.push('chem-wizard');
  if (subjectBadge(at, 'biology', 60, 15)) out.push('bio-expert');
  if (subjectBadge(at, 'space', 30, 0)) out.push('space-explorer');
  if (c.sessions.some((s) => s.mode === 'speed' && s.meta?.duration === 60 && s.score >= 120 && s.correct / Math.max(1, s.correct + s.wrong) >= 0.8)) out.push('speed-demon');
  if (longestCorrectRun(at) >= 25) out.push('accuracy-master');
  if (c.mistakes.filter((m) => m.mastered).length >= 10) out.push('mistake-crusher');
  if (dayStreak(at).best >= 7) out.push('streak-7');
  if (c.exams.some((e) => e.count >= 20 && e.score === e.maxScore) || c.sessions.some((s) => (s.correct + s.wrong + s.skipped) >= 20 && s.wrong === 0 && s.skipped === 0 && s.correct >= 20 && s.mode !== 'speed'))
    out.push('perfect-score');
  const bosses = new Set(c.sessions.filter((s) => s.mode === 'boss' && s.meta?.won).map((s) => s.meta?.chapter));
  if (bosses.size >= 3) out.push('boss-slayer');
  if (c.exams.some((e) => e.examId === 'vvm-level1' && e.score / e.maxScore >= 0.6)) out.push('vvm-warrior');
  const best = (id: string) => Math.max(0, ...c.exams.filter((e) => e.examId === id).map((e) => e.score / e.maxScore));
  if (best('mvpp-mat') >= 0.7 && best('mvpp-sat') >= 0.7) out.push('mvpp-champion');
  if (at.filter((a) => a.mode === 'iq' && a.correct && !a.hintsUsed).length >= 10) out.push('deep-thinker');
  if (c.sessions.some((s) => s.mode === 'survival' && Number(s.meta?.level) >= 8)) out.push('survivor');
  return out;
}
