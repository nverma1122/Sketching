import type { Item, Level, Medium } from '../data/pictures';
import { LEVELS, levelInfo, mediumLabel } from '../data/pictures';

export interface Choice {
  level: Level;
  /** undefined = any medium */
  medium?: Medium;
}

export interface Pick {
  picture: Item;
  /** Explains a substitution when nothing matched exactly. */
  note?: string;
}

const LEVEL_ORDER = LEVELS.map((l) => l.key);

/** Pictures without a medium (photos, own pictures saved for any medium) suit every medium. */
const fitsMedium = (p: Item, medium?: Medium) => !medium || !p.medium || p.medium === medium;

/**
 * Pick a picture for the choice, avoiding the current one and recent ones.
 * Canva pictures, photos and own pictures are equally likely when all match,
 * so a large photo pool doesn't crowd out the others. If nothing matches,
 * keep the length and change the medium; then try the nearest length.
 */
export function pickPicture(all: Item[], choice: Choice, recent: string[], rng: () => number = Math.random): Pick | null {
  if (all.length === 0) return null;
  const fresh = (list: Item[]) => {
    // Avoid the most recent half of the matching pool (always excluding the current picture).
    const keep = Math.max(1, Math.floor(list.length / 2));
    const avoid = new Set(recent.slice(0, Math.min(recent.length, list.length - 1, keep)));
    const out = list.filter((p) => !avoid.has(p.id));
    return out.length ? out : list;
  };
  const choose = (list: Item[]) => {
    // Each kind (Canva, photo, own) is equally likely, whatever its size;
    // skip a kind whose only fresh option is the picture just shown.
    const kinds = [...new Set(list.map((p) => p.kind))];
    const usable = kinds.filter((k) => fresh(list.filter((p) => p.kind === k)).some((p) => p.id !== recent[0]));
    const from = usable.length ? usable : kinds;
    const kind = from[Math.floor(rng() * from.length)];
    const pool = fresh(list.filter((p) => p.kind === kind));
    return pool[Math.floor(rng() * pool.length)];
  };

  const exact = all.filter((p) => p.level === choice.level && fitsMedium(p, choice.medium));
  if (exact.length) return { picture: choose(exact) };

  const sameLevel = all.filter((p) => p.level === choice.level);
  if (sameLevel.length) {
    const picture = choose(sameLevel);
    const m = picture.medium ? mediumLabel(picture.medium).toLowerCase() : 'another medium';
    return {
      picture,
      note: `No ${mediumLabel(choice.medium!).toLowerCase()} pictures at this length right now — here is one in ${m}.`,
    };
  }

  const i = LEVEL_ORDER.indexOf(choice.level);
  const byDistance = [...LEVEL_ORDER].sort((a, b) => Math.abs(LEVEL_ORDER.indexOf(a) - i) - Math.abs(LEVEL_ORDER.indexOf(b) - i));
  for (const l of byDistance) {
    const list = all.filter((p) => p.level === l && fitsMedium(p, choice.medium));
    if (list.length) {
      const picture = choose(list);
      return {
        picture,
        note: `No ${levelInfo(choice.level).label.toLowerCase()} pictures available right now — here is a ${levelInfo(picture.level).label.toLowerCase()} one (${levelInfo(picture.level).time}).`,
      };
    }
  }
  return null;
}

export const pushRecent = (recent: string[], id: string, max = 60) => [id, ...recent.filter((r) => r !== id)].slice(0, max);
