import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  ArtworkRecord,
  ArtworkWithImage,
  Criteria,
  Level,
  Medium,
  SessionRecord,
  Suggestion,
  TimeKey,
} from '../data/types';
import { PROMPTS } from '../data/prompts';
import { pushRecent, selectPrompt } from './selector';
import { MAX_SIMPLIFY, approachFor } from './plan';
import { readLocal, writeLocal, clearLocal, localStorageAvailable } from './storage/local';
import { idbDelete, idbGetAll, idbPut, idbClearAll, initIdb, idbIsPersistent, idbGet } from './storage/idb';
import { createThumbnail, validateImage } from './images';

export type Theme = 'system' | 'light' | 'dark';

export interface Prefs {
  theme: Theme;
  lastCriteria: Criteria;
  level: Level;
  /** Load reference photos from Wikimedia Commons. */
  onlinePhotos: boolean;
}

export interface SavedIdea {
  promptId: string;
  time: TimeKey;
  medium: Medium;
  savedAt: number;
}

export interface ActiveSession {
  suggestion: Suggestion;
  startedAt: number;
  /** Accumulated timer time, excluding the currently running stretch. */
  elapsedMs: number;
  /** When the timer was last started; null when paused or never started. */
  runningSince: number | null;
}

export interface ReferencePhoto {
  promptId: string;
  image: Blob;
  name: string;
  addedAt: number;
}

export type NewArtwork = Omit<ArtworkRecord, 'id' | 'createdAt' | 'fileName' | 'mimeType'>;

const DEFAULT_PREFS: Prefs = { theme: 'system', lastCriteria: { time: '10' }, level: 'intermediate', onlinePhotos: true };

/** Levels from earlier versions of the app. */
const OLD_LEVELS: Record<string, Level> = { developing: 'relaxed', experienced: 'intermediate', advanced: 'intermediate' };

function migratePrefs(p: Prefs): Prefs {
  const level = (OLD_LEVELS[p.level] ?? p.level) as Level;
  const ok = level === 'relaxed' || level === 'intermediate' || level === 'detailed';
  return { ...p, level: ok ? level : DEFAULT_PREFS.level };
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function useLocalState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readLocal(key, fallback));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    writeLocal(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

function useStoreValue() {
  const [storedPrefs, setPrefsState] = useLocalState<Prefs>('prefs', DEFAULT_PREFS);
  // Older saved preferences may lack newer fields.
  const prefs = useMemo(() => migratePrefs({ ...DEFAULT_PREFS, ...storedPrefs }), [storedPrefs]);
  const [recent, setRecent] = useLocalState<string[]>('recent', []);
  const [saved, setSaved] = useLocalState<SavedIdea[]>('saved', []);
  const [attempted, setAttempted] = useLocalState<Record<string, number>>('attempted', {});
  const [current, setCurrent] = useLocalState<Suggestion | null>('current', null);
  const [active, setActive] = useLocalState<ActiveSession | null>('active', null);

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [artworks, setArtworks] = useState<ArtworkWithImage[]>([]);
  const [ready, setReady] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initIdb();
        const [s, a] = await Promise.all([idbGetAll<SessionRecord>('sessions'), idbGetAll<ArtworkWithImage>('artworks')]);
        if (cancelled) return;
        setSessions(s.sort((x, y) => y.endedAt - x.endedAt));
        setArtworks(a.sort((x, y) => (y.date === x.date ? y.createdAt - x.createdAt : y.date.localeCompare(x.date))));
      } catch {
        if (!cancelled) setLoadError('Your sketchbook could not be loaded from this browser’s storage.');
      } finally {
        if (!cancelled) {
          setPersistent(idbIsPersistent() && localStorageAvailable());
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPrefs = useCallback((p: Partial<Prefs>) => setPrefsState((old) => ({ ...DEFAULT_PREFS, ...old, ...p })), [setPrefsState]);

  // ----- Suggestions -----------------------------------------------------

  const savedIds = useMemo(() => saved.map((s) => s.promptId), [saved]);

  const show = useCallback(
    (s: Suggestion) => {
      setCurrent(s);
      setRecent((r) => pushRecent(r, s.promptId));
    },
    [setCurrent, setRecent],
  );

  /** Find a suggestion for the criteria. Returns null only if the library is empty. */
  const find = useCallback(
    (criteria: Criteria, opts: { exclude?: string[]; remember?: boolean } = {}): Suggestion | null => {
      const res = selectPrompt(PROMPTS, criteria, {
        recent,
        attempted,
        saved: savedIds,
        exclude: opts.exclude,
        level: prefs.level,
        rng: Math.random,
      });
      if (!res) return null;
      const s: Suggestion = {
        promptId: res.prompt.id,
        time: res.time,
        medium: res.medium,
        simplified: 0,
        criteria,
        broadened: res.broadened,
        createdAt: Date.now(),
      };
      if (opts.remember) setPrefs({ lastCriteria: criteria });
      show(s);
      return s;
    },
    [recent, attempted, savedIds, show, setPrefs, prefs.level],
  );

  const another = useCallback(() => {
    if (!current) return null;
    return find(current.criteria, { exclude: [current.promptId] });
  }, [current, find]);

  const simplify = useCallback(() => {
    // Already a focused study: there is nothing lighter that keeps the scene.
    if (!current || current.simplified >= MAX_SIMPLIFY || approachFor(current.time, current.simplified) === 'study') return false;
    setCurrent({ ...current, simplified: current.simplified + 1 });
    return true;
  }, [current, setCurrent]);

  /** Open a specific prompt (from the explorer, saved ideas or today's idea). */
  const open = useCallback(
    (promptId: string, time: TimeKey, medium: Medium) => {
      show({
        promptId,
        time,
        medium,
        simplified: 0,
        criteria: { time, medium },
        broadened: [],
        createdAt: Date.now(),
      });
    },
    [show],
  );

  // ----- Saved ideas -----------------------------------------------------

  const isSaved = useCallback((promptId: string) => savedIds.includes(promptId), [savedIds]);

  const saveIdea = useCallback(
    (promptId: string, time: TimeKey, medium: Medium) =>
      setSaved((list) => [{ promptId, time, medium, savedAt: Date.now() }, ...list.filter((s) => s.promptId !== promptId)]),
    [setSaved],
  );

  const unsaveIdea = useCallback((promptId: string) => setSaved((list) => list.filter((s) => s.promptId !== promptId)), [setSaved]);

  const restoreSaved = useCallback((idea: SavedIdea) => setSaved((list) => [idea, ...list.filter((s) => s.promptId !== idea.promptId)].sort((a, b) => b.savedAt - a.savedAt)), [setSaved]);

  // ----- Sessions --------------------------------------------------------

  const startSession = useCallback(
    (s: Suggestion) => {
      setActive((a) => (a && a.suggestion.promptId === s.promptId ? { ...a, suggestion: s } : { suggestion: s, startedAt: Date.now(), elapsedMs: 0, runningSince: null }));
    },
    [setActive],
  );

  const updateActive = useCallback((patch: Partial<ActiveSession>) => setActive((a) => (a ? { ...a, ...patch } : a)), [setActive]);

  const discardSession = useCallback(() => setActive(null), [setActive]);

  const recordSession = useCallback(
    async (rec: Omit<SessionRecord, 'id'>) => {
      const full: SessionRecord = { ...rec, id: uid() };
      await idbPut('sessions', full);
      setSessions((list) => [full, ...list]);
      setAttempted((m) => ({ ...m, [rec.promptId]: rec.endedAt }));
      setActive(null);
      return full;
    },
    [setAttempted, setActive],
  );

  const deleteSession = useCallback(async (id: string) => {
    await idbDelete('sessions', id);
    setSessions((list) => list.filter((s) => s.id !== id));
  }, []);

  // ----- Artwork ---------------------------------------------------------

  const addArtwork = useCallback(async (file: File, meta: NewArtwork) => {
    validateImage(file);
    const thumb = await createThumbnail(file);
    const rec: ArtworkWithImage = {
      ...meta,
      id: uid(),
      createdAt: Date.now(),
      fileName: file.name || 'sketch',
      mimeType: file.type,
      image: file,
      thumb,
    };
    await idbPut('artworks', rec);
    setArtworks((list) => [rec, ...list].sort((x, y) => (y.date === x.date ? y.createdAt - x.createdAt : y.date.localeCompare(x.date))));
    return rec;
  }, []);

  const updateArtwork = useCallback(async (id: string, meta: NewArtwork) => {
    const existing = await idbGet<ArtworkWithImage>('artworks', id);
    if (!existing) return;
    const rec = { ...existing, ...meta };
    await idbPut('artworks', rec);
    setArtworks((list) => list.map((a) => (a.id === id ? rec : a)));
  }, []);

  const deleteArtwork = useCallback(async (id: string) => {
    await idbDelete('artworks', id);
    setArtworks((list) => list.filter((a) => a.id !== id));
  }, []);

  // ----- Reference photos ------------------------------------------------

  const getReference = useCallback((promptId: string) => idbGet<ReferencePhoto>('references', promptId), []);

  const setReference = useCallback(async (promptId: string, file: File) => {
    validateImage(file);
    const rec: ReferencePhoto = { promptId, image: file, name: file.name, addedAt: Date.now() };
    await idbPut('references', rec);
    return rec;
  }, []);

  const removeReference = useCallback((promptId: string) => idbDelete('references', promptId), []);

  // ----- Housekeeping ----------------------------------------------------

  const clearHistory = useCallback(() => {
    setRecent([]);
    setAttempted({});
  }, [setRecent, setAttempted]);

  const eraseAll = useCallback(async () => {
    await idbClearAll();
    clearLocal();
    setPrefsState(DEFAULT_PREFS);
    setRecent([]);
    setSaved([]);
    setAttempted({});
    setCurrent(null);
    setActive(null);
    setSessions([]);
    setArtworks([]);
  }, [setPrefsState, setRecent, setSaved, setAttempted, setCurrent, setActive]);

  return {
    ready,
    persistent,
    loadError,
    prefs,
    setPrefs,
    recent,
    saved,
    attempted,
    current,
    find,
    another,
    simplify,
    open,
    isSaved,
    saveIdea,
    unsaveIdea,
    restoreSaved,
    active,
    startSession,
    updateActive,
    discardSession,
    recordSession,
    sessions,
    deleteSession,
    artworks,
    addArtwork,
    updateArtwork,
    deleteArtwork,
    getReference,
    setReference,
    removeReference,
    clearHistory,
    eraseAll,
  };
}

export type Store = ReturnType<typeof useStoreValue>;

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
