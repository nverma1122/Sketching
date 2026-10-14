// Week-long localStorage cache for photo search results (shared by sources).
import type { Item } from '../data/pictures';

const CACHE_KEY = 'qcs.photos.v2';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const CACHE_MAX = 160;

type Cache = Record<string, { at: number; items: Item[] }>;

const read = (): Cache => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Cache;
  } catch {
    return {};
  }
};

export function cached(key: string): Item[] | undefined {
  const hit = read()[key];
  return hit && Date.now() - hit.at < CACHE_TTL ? hit.items : undefined;
}

export function remember(key: string, items: Item[]) {
  try {
    const c = { ...read(), [key]: { at: Date.now(), items } };
    const keys = Object.keys(c).sort((a, b) => c[b].at - c[a].at);
    for (const k of keys.slice(CACHE_MAX)) delete c[k];
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* storage full or blocked: skip caching */
  }
}
