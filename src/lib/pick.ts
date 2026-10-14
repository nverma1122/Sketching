import type { Item, Level, Medium } from "../data/pictures";
import { LEVELS, levelInfo, mediumLabel } from "../data/pictures";

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

/** Photos suit any medium; Canva pictures must match the chosen one. */
const fitsMedium = (p: Item, medium?: Medium) =>
  !medium || p.kind === "photo" || p.medium === medium;

/**
 * Pick a picture for the choice, avoiding the current one and recent ones.
 * When both Canva pictures and photos match, each kind is equally likely, so
 * a large photo pool doesn't crowd out the Canva pictures. If nothing matches,
 * keep the length and change the medium; then try the nearest length.
 */
export function pickPicture(
  all: Item[],
  choice: Choice,
  recent: string[],
  rng: () => number = Math.random,
): Pick | null {
  if (all.length === 0) return null;
  const fresh = (list: Item[]) => {
    // Avoid the most recent half of the matching pool (always excluding the current picture).
    const keep = Math.max(1, Math.floor(list.length / 2));
    const avoid = new Set(
      recent.slice(0, Math.min(recent.length, list.length - 1, keep)),
    );
    const out = list.filter((p) => !avoid.has(p.id));
    return out.length ? out : list;
  };
  const choose = (list: Item[]) => {
    const canva = list.filter((p) => p.kind === "canva");
    const photos = list.filter((p) => p.kind === "photo");
    let pool = list;
    if (canva.length && photos.length) {
      const preferred = rng() < 0.5 ? canva : photos;
      const other = preferred === canva ? photos : canva;
      pool = fresh(preferred).some((p) => p.id !== recent[0])
        ? preferred
        : other;
    }
    pool = fresh(pool);
    return pool[Math.floor(rng() * pool.length)];
  };

  const exact = all.filter(
    (p) => p.level === choice.level && fitsMedium(p, choice.medium),
  );
  if (exact.length) return { picture: choose(exact) };

  const sameLevel = all.filter((p) => p.level === choice.level);
  if (sameLevel.length) {
    const picture = choose(sameLevel);
    const m = picture.medium
      ? mediumLabel(picture.medium).toLowerCase()
      : "another medium";
    return {
      picture,
      note: `No ${mediumLabel(choice.medium!).toLowerCase()} pictures at this length right now — here is one in ${m}.`,
    };
  }

  const i = LEVEL_ORDER.indexOf(choice.level);
  const byDistance = [...LEVEL_ORDER].sort(
    (a, b) =>
      Math.abs(LEVEL_ORDER.indexOf(a) - i) -
      Math.abs(LEVEL_ORDER.indexOf(b) - i),
  );
  for (const l of byDistance) {
    const list = all.filter(
      (p) => p.level === l && fitsMedium(p, choice.medium),
    );
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

export const pushRecent = (recent: string[], id: string, max = 60) =>
  [id, ...recent.filter((r) => r !== id)].slice(0, max);
