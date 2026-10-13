import type { Category, Criteria, Level, Medium, SketchPrompt, TimeKey } from '../data/types';
import { RELATED_CATEGORIES, categoryShort, levelLabel, mediumShort } from '../data/taxonomy';
import { richnessTotal } from '../data/prompts/define';
import { type Rng, weightedPick } from './random';

/**
 * Scene selection with anti-repetition.
 *
 * Session length is deliberately *not* a filter: every scene in the library
 * has an approach for every length (a 5-minute session becomes a focused
 * study of one part of the scene). That way a short session never pushes you
 * towards a simpler subject.
 *
 * Order of operations:
 *  1. Always exclude the current scene (and anything in `exclude`).
 *  2. Try the requested sketching level, medium and subject, skipping recently
 *     viewed scenes.
 *  3. If nothing is left, relax the subject (related subjects, then any) —
 *     the level matters more than the subject.
 *  4. If every scene at the level has been seen recently, allow older views
 *     (least recently seen first) rather than changing level.
 *  5. Only then move to a neighbouring level, then any level, and finally
 *     ignore the medium.
 * Each relaxation is reported as a plain-language note.
 */

export const RECENT_LIMIT = 40;
/** Never re-show these many most recent scenes, even after history is relaxed. */
const HARD_RECENT = 6;
const ATTEMPT_COOLDOWN_MS = 21 * 24 * 60 * 60 * 1000;

export interface SelectionContext {
  /** Recently shown scene IDs, most recent first. */
  recent: string[];
  /** sceneId → timestamp of the last session that used it. */
  attempted: Record<string, number>;
  /** Saved scene IDs. */
  saved: string[];
  /** IDs that must not be returned (e.g. the scene currently on screen). */
  exclude?: string[];
  /** The saved sketching level. `criteria.level` overrides it. */
  level?: Level;
  now?: number;
  rng: Rng;
}

export interface SelectionResult {
  prompt: SketchPrompt;
  time: TimeKey;
  medium: Medium;
  level: Level;
  broadened: string[];
  exact: boolean;
}

interface Relax {
  category: 'exact' | 'related' | 'any';
  level: 'exact' | 'near' | 'any';
  medium: boolean;
}

const PRIMARY: Relax[] = [
  { category: 'exact', level: 'exact', medium: true },
  { category: 'related', level: 'exact', medium: true },
  { category: 'any', level: 'exact', medium: true },
];
const LAST_RESORT: Relax[] = [
  { category: 'related', level: 'near', medium: true },
  { category: 'any', level: 'near', medium: true },
  { category: 'any', level: 'any', medium: true },
  { category: 'any', level: 'any', medium: false },
];

/** Neighbouring levels, the preferred one first. */
export const NEAR_LEVELS: Record<Level, Level[]> = {
  relaxed: ['intermediate'],
  intermediate: ['detailed', 'relaxed'],
  detailed: ['intermediate'],
};

export const DEFAULT_LEVEL: Level = 'intermediate';
export const DEFAULT_TIME: TimeKey = '10';

function fitsCategory(p: SketchPrompt, c: Category, mode: Relax['category']): boolean {
  if (mode === 'any') return true;
  if (p.categories.includes(c)) return true;
  return mode === 'related' && RELATED_CATEGORIES[c].some((r) => p.categories.includes(r));
}

function fitsLevel(p: SketchPrompt, l: Level, mode: Relax['level']): boolean {
  if (mode === 'any' || p.level === l) return true;
  return mode === 'near' && NEAR_LEVELS[l].includes(p.level);
}

function matches(p: SketchPrompt, c: Criteria, level: Level, r: Relax): boolean {
  if (c.category && !fitsCategory(p, c.category, r.category)) return false;
  if (!fitsLevel(p, level, r.level)) return false;
  if (c.medium && r.medium && !p.media.includes(c.medium)) return false;
  return true;
}

function baseWeight(p: SketchPrompt, c: Criteria, level: Level, ctx: SelectionContext): number {
  const now = ctx.now ?? Date.now();
  const total = richnessTotal(p.richness);
  let w = 1;
  if (p.level === level) w *= 1.5;
  else if (NEAR_LEVELS[level][0] === p.level) w *= 1.1;
  if (c.medium && p.media[0] === c.medium) w *= 1.3;
  // Energy shades the choice within the level; it never filters.
  if (c.energy === 'low') w *= (16 - total) / 8;
  if (c.energy === 'focus') w *= total / 9;
  const last = ctx.attempted[p.id];
  if (last && now - last < ATTEMPT_COOLDOWN_MS) w *= 0.3;
  if (ctx.saved.includes(p.id)) w *= 0.6;
  return w;
}

function describe(c: Criteria, level: Level, picked: SketchPrompt, r: Relax, viaRecent: boolean): string[] {
  const notes: string[] = [];
  if (c.category && r.category === 'related' && !picked.categories.includes(c.category))
    notes.push(`the subject, to something close to ${categoryShort(c.category).toLowerCase()}`);
  if (c.category && r.category === 'any' && !picked.categories.includes(c.category))
    notes.push(`the subject — there were no fresh ${categoryShort(c.category).toLowerCase()} scenes left at this level`);
  if (picked.level !== level)
    notes.push(
      `the sketching level — this scene is rated ${levelLabel(picked.level).toLowerCase()} rather than ${levelLabel(level).toLowerCase()}`,
    );
  if (c.medium && !r.medium && !picked.media.includes(c.medium))
    notes.push(`the medium — nothing fresh suited ${mediumShort(c.medium).toLowerCase()}, so this uses the scene's own medium`);
  if (viaRecent) notes.push('your recent history — you have seen every matching scene lately, so this one is from a little while ago');
  return notes;
}

function resolveMedium(p: SketchPrompt, c: Criteria, rng: Rng): Medium {
  if (c.medium && p.media.includes(c.medium)) return c.medium;
  if (c.medium && p.media.length === 0) return c.medium;
  return weightedPick(p.media, (m) => (m === p.media[0] ? 2 : 1), rng) ?? p.media[0];
}

export function selectPrompt(library: SketchPrompt[], criteria: Criteria, ctx: SelectionContext): SelectionResult | null {
  const level = criteria.level ?? ctx.level ?? DEFAULT_LEVEL;
  const excluded = new Set(ctx.exclude ?? []);
  const recentSet = new Set(ctx.recent.slice(0, RECENT_LIMIT));
  const hardRecent = new Set(ctx.recent.slice(0, HARD_RECENT));
  const pool = library.filter((p) => !excluded.has(p.id));

  const finish = (prompt: SketchPrompt, r: Relax, viaRecent: boolean): SelectionResult => {
    const broadened = describe(criteria, level, prompt, r, viaRecent);
    return {
      prompt,
      time: criteria.time ?? DEFAULT_TIME,
      medium: resolveMedium(prompt, criteria, ctx.rng),
      level,
      broadened,
      exact: broadened.length === 0,
    };
  };

  const tryAll = (steps: Relax[], allowRecent: boolean) => {
    for (const r of steps) {
      const candidates = pool.filter(
        (p) => matches(p, criteria, level, r) && (allowRecent ? !hardRecent.has(p.id) : !recentSet.has(p.id)),
      );
      if (candidates.length === 0) continue;
      const pick = weightedPick(
        candidates,
        (p) => {
          let w = baseWeight(p, criteria, level, ctx);
          if (allowRecent) {
            // Prefer the ones seen longest ago.
            const idx = ctx.recent.indexOf(p.id);
            if (idx >= 0) w *= ((idx + 1) / ctx.recent.length) ** 2;
          }
          return w;
        },
        ctx.rng,
      );
      if (pick) return finish(pick, r, allowRecent && recentSet.has(pick.id));
    }
    return null;
  };

  return (
    tryAll(PRIMARY, false) ??
    tryAll(PRIMARY, true) ??
    tryAll(LAST_RESORT, false) ??
    tryAll(LAST_RESORT, true) ??
    (pool.length ? finish(pool[Math.floor(ctx.rng() * pool.length)], LAST_RESORT[3], false) : null)
  );
}

/** Add a scene to the front of the rolling history. */
export function pushRecent(recent: string[], id: string): string[] {
  return [id, ...recent.filter((r) => r !== id)].slice(0, RECENT_LIMIT);
}

/** Deterministic "today's scene": the same all day, a different one tomorrow, at your level. */
export function todaysPrompt(library: SketchPrompt[], dateKey: string, hash: (s: string) => number, level: Level = DEFAULT_LEVEL) {
  const pool = library.filter((p) => p.level === level);
  const from = pool.length ? pool : library;
  return from[hash(dateKey) % from.length];
}
