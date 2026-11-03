import type { Mistake } from './types';
import { DAY } from './util';

// Spaced repetition for Mistake Master.
// Stage n means n successful spaced revisions. The next revision is due INTERVALS[stage] days
// after the last review. A wrong answer at any stage resets to stage 0 (due in 1 day).
// A mistake is "mastered" after MASTER_STAGE consecutive successful spaced revisions (1, 3, 7 days),
// so one lucky correct answer never removes it. Mastered items keep coming back at 14 and 30 days
// as maintenance ("previously mastered"); failing one un-masters it.

export const INTERVALS = [1, 3, 7, 14, 30];
export const MASTER_STAGE = 3;

export function recordWrong(prev: Mistake | undefined, qid: string, given: Mistake['lastGiven'], timeMs: number, now = Date.now()): Mistake {
  if (!prev) {
    return {
      qid,
      firstWrong: now,
      lastWrong: now,
      timesWrong: 1,
      lastGiven: given,
      lastTimeMs: timeMs,
      stage: 0,
      due: now + INTERVALS[0] * DAY,
      mastered: false,
      history: [{ at: now, correct: false }],
    };
  }
  return {
    ...prev,
    lastWrong: now,
    timesWrong: prev.timesWrong + 1,
    lastGiven: given,
    lastTimeMs: timeMs,
    stage: 0,
    due: now + INTERVALS[0] * DAY,
    mastered: false,
    masteredAt: undefined,
    lastReviewed: now,
    history: [...prev.history, { at: now, correct: false }].slice(-30),
  };
}

/**
 * A correct answer on a mistaken question. Only counts as a spaced success if the item was due
 * (answering it again five minutes later proves little); early correct answers are logged but do
 * not advance the stage.
 */
export function recordRight(prev: Mistake, now = Date.now()): Mistake {
  const wasDue = now >= prev.due - 2 * 3600_000; // 2 h grace
  const history = [...prev.history, { at: now, correct: true }].slice(-30);
  if (!wasDue) return { ...prev, history, lastReviewed: now };
  const stage = prev.stage + 1;
  const mastered = stage >= MASTER_STAGE;
  return {
    ...prev,
    stage,
    mastered,
    masteredAt: mastered && !prev.mastered ? now : prev.masteredAt,
    due: now + INTERVALS[Math.min(stage, INTERVALS.length - 1)] * DAY,
    lastReviewed: now,
    history,
  };
}

export const isDue = (m: Mistake, now = Date.now()) => now >= m.due;

export type MistakeCategory = 'all' | 'recent' | 'repeated' | 'mastered' | 'due';

export function categorise(ms: Mistake[], cat: MistakeCategory, now = Date.now()): Mistake[] {
  switch (cat) {
    case 'all':
      return ms.filter((m) => !m.mastered).sort((a, b) => b.lastWrong - a.lastWrong);
    case 'recent':
      return ms.filter((m) => !m.mastered && now - m.lastWrong < 7 * DAY).sort((a, b) => b.lastWrong - a.lastWrong);
    case 'repeated':
      return ms.filter((m) => m.timesWrong >= 2).sort((a, b) => b.timesWrong - a.timesWrong);
    case 'mastered':
      return ms.filter((m) => m.mastered).sort((a, b) => (b.masteredAt ?? 0) - (a.masteredAt ?? 0));
    case 'due':
      return ms.filter((m) => isDue(m, now)).sort((a, b) => a.due - b.due);
  }
}
