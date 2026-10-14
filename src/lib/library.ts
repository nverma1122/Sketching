import type { SketchPrompt } from '../data/types';

/** An image in the personal reference library (stored in IndexedDB, never uploaded). */
export interface LibraryItem {
  id: string;
  title: string;
  tags: string[];
  /** Scenes the user linked this image to explicitly. */
  promptIds: string[];
  image: Blob;
  thumb?: Blob;
  fileName: string;
  addedAt: number;
}

const STOP = new Set(['the', 'and', 'with', 'from', 'for', 'under', 'into', 'its', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'by', 'old', 'small']);

export const words = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/[\s-]+/)
    .map((w) => w.replace(/s$/, ''))
    .filter((w) => w.length >= 3 && !STOP.has(w));

/** How well a library image matches a scene: explicit links first, then shared words. */
export function libraryScore(item: Pick<LibraryItem, 'title' | 'tags' | 'promptIds'>, p: SketchPrompt): number {
  if (item.promptIds.includes(p.id)) return 100;
  const mine = new Set(words([item.title, ...item.tags].join(' ')));
  if (mine.size === 0) return 0;
  const scene = new Set(words([p.title, ...p.tags].join(' ')));
  let n = 0;
  for (const w of mine) if (scene.has(w)) n++;
  return n;
}

export function libraryFor<T extends Pick<LibraryItem, 'title' | 'tags' | 'promptIds'>>(items: T[], p: SketchPrompt): T[] {
  return items
    .map((it) => ({ it, s: libraryScore(it, p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.it);
}

export const parseTags = (s: string) =>
  s
    .split(/[,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
