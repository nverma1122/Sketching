import type { Category, Criteria, Energy, Medium, SketchPrompt, TimeKey } from '../data/types';
import { RELATED_CATEGORIES, TIME_ORDER, categoryShort, mediumShort, timeLabel } from '../data/taxonomy';
import { type Rng, weightedPick } from './random';

/**
 * Prompt selection with anti-repetition.
 *
 * Order of operations:
 *  1. Always exclude the current prompt (and anything in `exclude`).
 *  2. Try the user's exact choices, skipping recently viewed prompts.
 *  3. If nothing is left, relax the least important filter first:
 *       energy → time (neighbouring lengths) → subject (related subjects)
 *  4. If every idea that still fits has been seen recently, allow older views
 *     again (least recently seen first) rather than dropping subject or medium.
 *  5. Only then drop the subject entirely, and finally the medium.
 * Each relaxation is reported back as a plain-language note.
 */

export const RECENT_LIMIT = 40;
/** Never re-show these many most recent prompts, even after history is relaxed. */
const HARD_RECENT = 6;
const ATTEMPT_COOLDOWN_MS = 21 * 24 * 60 * 60 * 1000;

export interface SelectionContext {
  /** Recently shown prompt IDs, most recent first. */
  recent: string[];
  /** promptId → timestamp of the last session that used it. */
  attempted: Record<string, number>;
  /** Saved prompt IDs. */
  saved: string[];
  /** IDs that must not be returned (e.g. the prompt currently on screen). */
  exclude?: string[];
  now?: number;
  rng: Rng;
}

export interface SelectionResult {
  prompt: SketchPrompt;
  time: TimeKey;
  medium: Medium;
  broadened: string[];
  exact: boolean;
}

interface Level {
  energy: boolean;
  time: 'exact' | 'near' | 'any';
  category: 'exact' | 'related' | 'any';
  medium: boolean;
}

const LEVELS: Level[] = [
  { energy: true, time: 'exact', category: 'exact', medium: true },
  { energy: false, time: 'exact', category: 'exact', medium: true },
  { energy: false, time: 'near', category: 'exact', medium: true },
  { energy: false, time: 'near', category: 'related', medium: true },
];
const DRASTIC_LEVELS: Level[] = [
  { energy: false, time: 'near', category: 'any', medium: true },
  { energy: false, time: 'any', category: 'any', medium: false },
];

const timeIndex = (t: TimeKey) => TIME_ORDER.indexOf(t);

export function fitsTime(p: SketchPrompt, t: TimeKey, mode: Level['time']): boolean {
  if (mode === 'any') return true;
  const lo = timeIndex(p.time[0]);
  const hi = timeIndex(p.time[1]);
  const i = timeIndex(t);
  return mode === 'exact' ? i >= lo && i <= hi : i >= lo - 1 && i <= hi + 1;
}

function fitsCategory(p: SketchPrompt, c: Category, mode: Level['category']): boolean {
  if (mode === 'any') return true;
  if (p.categories.includes(c)) return true;
  return mode === 'related' && RELATED_CATEGORIES[c].some((r) => p.categories.includes(r));
}

function matches(p: SketchPrompt, c: Criteria, lvl: Level): boolean {
  if (c.time && !fitsTime(p, c.time, lvl.time)) return false;
  if (c.category && !fitsCategory(p, c.category, lvl.category)) return false;
  if (c.medium && lvl.medium && !p.media.includes(c.medium)) return false;
  if (c.energy && lvl.energy && p.energy !== c.energy) return false;
  return true;
}

const ENERGY_ORDER: Energy[] = ['low', 'explore', 'focus'];

function baseWeight(p: SketchPrompt, c: Criteria, ctx: SelectionContext): number {
  const now = ctx.now ?? Date.now();
  let w = 1;
  if (c.medium && p.media[0] === c.medium) w *= 1.4;
  if (c.energy) {
    const d = Math.abs(ENERGY_ORDER.indexOf(p.energy) - ENERGY_ORDER.indexOf(c.energy));
    w *= d === 0 ? 2 : d === 1 ? 1 : 0.4;
  }
  const last = ctx.attempted[p.id];
  if (last && now - last < ATTEMPT_COOLDOWN_MS) w *= 0.3;
  if (ctx.saved.includes(p.id)) w *= 0.6;
  return w;
}

function describeBroadening(c: Criteria, lvl: Level, viaRecent: boolean): string[] {
  const notes: string[] = [];
  if (c.energy && !lvl.energy) notes.push('your energy level — this one may be a little easier or harder than you asked');
  if (c.time && lvl.time === 'near') notes.push(`the time — this idea usually suits a neighbouring length, so the plan is adapted to ${timeLabel(c.time)}`);
  if (c.time && lvl.time === 'any') notes.push('the time — the plan is still adapted to your chosen length');
  if (c.category && lvl.category === 'related') notes.push(`the subject, to something close to ${categoryShort(c.category).toLowerCase()}`);
  if (c.category && lvl.category === 'any') notes.push(`the subject — there were no fresh ${categoryShort(c.category).toLowerCase()} ideas left`);
  if (c.medium && !lvl.medium) notes.push(`the medium — nothing fresh suited ${mediumShort(c.medium).toLowerCase()}, so this uses the idea's own medium`);
  if (viaRecent) notes.push('your recent history — you have seen every matching idea lately, so this one is from a little while ago');
  return notes;
}

function resolveMedium(p: SketchPrompt, c: Criteria, lvl: Level, rng: Rng): Medium {
  if (c.medium && (lvl.medium ? true : p.media.includes(c.medium))) return c.medium;
  return weightedPick(p.media, (m) => (m === p.media[0] ? 2 : 1), rng) ?? p.media[0];
}

function resolveTime(p: SketchPrompt, c: Criteria, rng: Rng): TimeKey {
  if (c.time) return c.time;
  const lo = timeIndex(p.time[0]);
  const hi = timeIndex(p.time[1]);
  return TIME_ORDER[lo + Math.floor(rng() * (hi - lo + 1))];
}

export function selectPrompt(
  library: SketchPrompt[],
  criteria: Criteria,
  ctx: SelectionContext,
): SelectionResult | null {
  const excluded = new Set(ctx.exclude ?? []);
  const recentSet = new Set(ctx.recent.slice(0, RECENT_LIMIT));
  const hardRecent = new Set(ctx.recent.slice(0, HARD_RECENT));
  const pool = library.filter((p) => !excluded.has(p.id));

  const finish = (prompt: SketchPrompt, lvl: Level, viaRecent: boolean): SelectionResult => {
    const broadened = describeBroadening(criteria, lvl, viaRecent);
    return {
      prompt,
      time: resolveTime(prompt, criteria, ctx.rng),
      medium: resolveMedium(prompt, criteria, lvl, ctx.rng),
      broadened,
      exact: broadened.length === 0,
    };
  };

  const tryLevels = (levels: Level[], allowRecent: boolean) => {
    for (const lvl of levels) {
      const candidates = pool.filter(
        (p) => matches(p, criteria, lvl) && (allowRecent ? !hardRecent.has(p.id) : !recentSet.has(p.id)),
      );
      if (candidates.length === 0) continue;
      const pick = weightedPick(
        candidates,
        (p) => {
          let w = baseWeight(p, criteria, ctx);
          if (allowRecent) {
            // Prefer the ones seen longest ago.
            const idx = ctx.recent.indexOf(p.id);
            if (idx >= 0) w *= ((idx + 1) / ctx.recent.length) ** 2;
          }
          return w;
        },
        ctx.rng,
      );
      if (pick) return finish(pick, lvl, allowRecent && recentSet.has(pick.id));
    }
    return null;
  };

  return (
    tryLevels(LEVELS, false) ??
    tryLevels(LEVELS, true) ??
    tryLevels(DRASTIC_LEVELS, false) ??
    tryLevels(DRASTIC_LEVELS, true) ??
    (pool.length ? finish(pool[Math.floor(ctx.rng() * pool.length)], DRASTIC_LEVELS[1], false) : null)
  );
}

/** Add a prompt to the front of the rolling history. */
export function pushRecent(recent: string[], id: string): string[] {
  return [id, ...recent.filter((r) => r !== id)].slice(0, RECENT_LIMIT);
}

/** Deterministic "today's idea": the same idea all day, a different one tomorrow. */
export function todaysPrompt(library: SketchPrompt[], dateKey: string, hash: (s: string) => number) {
  const gentle = library.filter((p) => p.difficulty <= 2 && timeIndex(p.time[0]) <= 2);
  return gentle[hash(dateKey) % gentle.length];
}
