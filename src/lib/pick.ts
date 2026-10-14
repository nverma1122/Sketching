import type { Level, Medium, Picture } from '../data/pictures';
import { LEVELS, levelInfo, mediumLabel } from '../data/pictures';

export interface Choice {
  level: Level;
  /** undefined = any medium */
  medium?: Medium;
}

export interface Pick {
  picture: Picture;
  /** Explains a substitution when nothing matched exactly. */
  note?: string;
}

const LEVEL_ORDER = LEVELS.map((l) => l.key);

/**
 * Pick a picture for the choice, avoiding the current one and recent ones.
 * If nothing matches, keep the length and change the medium; then try the
 * nearest length.
 */
export function pickPicture(all: Picture[], choice: Choice, recent: string[], rng: () => number = Math.random): Pick | null {
  if (all.length === 0) return null;
  const fresh = (list: Picture[]) => {
    // Avoid the most recent half of the matching pool (always excluding the current picture).
    const keep = Math.max(1, Math.floor(list.length / 2));
    const avoid = new Set(recent.slice(0, Math.min(recent.length, list.length - 1, keep)));
    const out = list.filter((p) => !avoid.has(p.id));
    return out.length ? out : list;
  };
  const choose = (list: Picture[]) => {
    const pool = fresh(list);
    return pool[Math.floor(rng() * pool.length)];
  };

  const exact = all.filter((p) => p.level === choice.level && (!choice.medium || p.medium === choice.medium));
  if (exact.length) return { picture: choose(exact) };

  const sameLevel = all.filter((p) => p.level === choice.level);
  if (sameLevel.length) {
    const picture = choose(sameLevel);
    return { picture, note: `No ${mediumLabel(choice.medium!).toLowerCase()} pictures at this length yet — here is one in ${mediumLabel(picture.medium).toLowerCase()}.` };
  }

  const i = LEVEL_ORDER.indexOf(choice.level);
  const byDistance = [...LEVEL_ORDER].sort((a, b) => Math.abs(LEVEL_ORDER.indexOf(a) - i) - Math.abs(LEVEL_ORDER.indexOf(b) - i));
  for (const l of byDistance) {
    const list = all.filter((p) => p.level === l && (!choice.medium || p.medium === choice.medium));
    const any = list.length ? list : all.filter((p) => p.level === l);
    if (any.length) {
      const picture = choose(any);
      return { picture, note: `No ${levelInfo(choice.level).label.toLowerCase()} pictures yet — here is a ${levelInfo(picture.level).label.toLowerCase()} one (${levelInfo(picture.level).time}).` };
    }
  }
  return null;
}

export const pushRecent = (recent: string[], id: string, max = 40) => [id, ...recent.filter((r) => r !== id)].slice(0, max);
