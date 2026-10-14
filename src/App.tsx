import { useCallback, useEffect, useRef, useState } from 'react';
import { CANVA, LEVELS, MEDIA, levelInfo, mediumLabel, type Item, type Level, type Medium } from './data/pictures';
import { ART_SUBJECTS } from './data/artQueries';
import { PHOTO_QUERIES } from './data/photoQueries';
import { searchArtworks, type ArtPlace } from './lib/artworks';
import { searchPhotos } from './lib/commons';
import { searchOpenverse } from './lib/openverse';
import { deleteMine, listMine, prepareImage, putMine, toItem, type MineRecord } from './lib/mine';
import { pickPicture, pushRecent } from './lib/pick';

// ---------------------------------------------------------------------------
// Small persistent preferences (per device). Storage may be unavailable.

const KEY = 'qcs.v4';
interface Saved {
  level: Level;
  medium: Medium | 'any';
  recent: string[];
  current?: Item;
}
const DEFAULTS: Saved = { level: 'quick', medium: 'any', recent: [] };

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}
function save(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: preferences last for this visit only */
  }
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

const shuffle = <T,>(list: T[]) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const emptyPools = (): Record<Level, Item[]> => ({
  quick: [],
  short: [],
  long: [],
  deep: [],
});

type Search = { kind: 'photo'; source: 'commons' | 'openverse'; query: string } | { kind: 'art'; place: ArtPlace; medium: Medium; subject: string };

const MEDIUM_KEYS = MEDIA.map((m) => m.key);

/**
 * What to search next for a length and medium. A chosen medium searches only
 * artworks in that medium (museum collections first, then sketchbooks). "Any"
 * mixes artworks in every medium with photos, two artworks to each photo.
 */
const searchesFor = (level: Level, medium: Medium | 'any'): Search[] => {
  const subjects = shuffle(ART_SUBJECTS[level]);
  if (medium !== 'any') {
    return subjects.flatMap((subject): Search[] => [
      { kind: 'art', place: 'museum', medium, subject },
      { kind: 'art', place: 'sketchbook', medium, subject },
    ]);
  }
  const photos = shuffle(PHOTO_QUERIES[level]);
  const out: Search[] = [];
  subjects.forEach((subject, i) => {
    const m = MEDIUM_KEYS[Math.floor(Math.random() * MEDIUM_KEYS.length)];
    out.push({ kind: 'art', place: i % 2 ? 'sketchbook' : 'museum', medium: m, subject });
    if (i % 2 && photos.length) out.push({ kind: 'photo', source: i % 4 === 1 ? 'commons' : 'openverse', query: photos.pop()! });
  });
  return [...out, ...photos.map((query, i): Search => ({ kind: 'photo', source: i % 2 ? 'commons' : 'openverse', query }))];
};

const runSearch = (q: Search, level: Level) =>
  q.kind === 'art' ? searchArtworks(q.place, q.medium, q.subject, level) : (q.source === 'commons' ? searchPhotos : searchOpenverse)(q.query, level);

// ---------------------------------------------------------------------------

export function App() {
  const [state, setState] = useState<Saved>(load);
  const [note, setNote] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(false);

  const [mine, setMine] = useState<Item[]>([]);
  const [adding, setAdding] = useState(false);
  const [ready, setReady] = useState(false);

  // Artworks and photos found so far, per length. Each "Another one" makes
  // one more search (cached for a week) for the current length and medium,
  // so the pool keeps growing.
  const found = useRef(emptyPools());
  const queues = useRef(new Map<string, Search[]>());
  const mineRef = useRef<Item[]>([]);
  const broken = useRef(new Set<string>());
  const request = useRef(0);

  useEffect(() => save(state), [state]);

  const loadMore = useCallback(async (level: Level, medium: Medium | 'any') => {
    const key = `${level}|${medium}`;
    if (!queues.current.has(key)) queues.current.set(key, searchesFor(level, medium));
    const queue = queues.current.get(key)!;
    const q = queue.shift();
    if (!q) return false;
    try {
      const items = await runSearch(q, level);
      const have = new Set(found.current[level].map((p) => p.id));
      found.current[level] = [...found.current[level], ...items.filter((p) => !have.has(p.id))];
      return true;
    } catch (e) {
      queue.push(q); // try this search again later
      throw e;
    }
  }, []);

  const pool = () => [...CANVA, ...mineRef.current, ...Object.values(found.current).flat()].filter((p) => !broken.current.has(p.id));

  const choose = useCallback(
    async (level: Level, medium: Medium | 'any', recent: string[]) => {
      const id = ++request.current;
      const want = { level, medium: medium === 'any' ? undefined : medium };
      setState((s) => ({ ...s, level, medium }));

      let res = pickPicture(pool(), want, recent);
      let failed = false;
      if (!res || res.note) {
        // Nothing for this length yet: wait for photos (a few phrases at most).
        setLoading(true);
        let errors = 0;
        for (let tries = 0; tries < 4 && (!res || res.note); tries++) {
          try {
            if (!(await loadMore(level, medium))) break;
          } catch {
            errors++;
          }
          res = pickPicture(pool(), want, recent);
        }
        failed = errors > 0 && (!res || !!res.note);
        if (id !== request.current) return;
        setLoading(false);
      } else {
        // Grow the photo pool quietly in the background.
        loadMore(level, medium).catch(() => {});
      }
      if (id !== request.current) return;
      setNote(res?.note && failed ? `Couldn’t reach the photo libraries. ${res.note}` : res?.note);
      setState((s) => ({
        ...s,
        level,
        medium,
        current: res?.picture,
        recent: res ? pushRecent(recent, res.picture.id) : recent,
      }));
    },
    [loadMore],
  );

  // Own pictures live in IndexedDB; their display URLs are made per visit.
  const urls = useRef(new Map<string, string>());
  const setMineItems = (items: Item[]) => {
    mineRef.current = items;
    setMine(items);
  };
  const addRecord = (r: MineRecord) => {
    const url = URL.createObjectURL(r.blob);
    urls.current.set(r.id, url);
    return toItem(r, url);
  };

  useEffect(() => {
    let first = !state.current;
    listMine()
      .then((records) => {
        const items = records.sort((a, b) => a.added - b.added).map(addRecord);
        setMineItems(items);
        // A remembered own picture needs its fresh URL (or is gone).
        if (state.current?.kind === 'mine') {
          const again = items.find((i) => i.id === state.current!.id);
          if (again) setState((s) => ({ ...s, current: again }));
          else first = true;
        }
      })
      .catch(() => {
        if (state.current?.kind === 'mine') first = true;
      })
      .finally(() => {
        setReady(true);
        if (first) void choose(state.level, state.medium, state.recent);
        else loadMore(state.level, state.medium).catch(() => {});
      });
    const map = urls.current;
    return () => map.forEach((u) => URL.revokeObjectURL(u));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMine = async (r: MineRecord) => {
    await putMine(r);
    navigator.storage?.persist?.().catch(() => {});
    const item = addRecord(r);
    setMineItems([...mineRef.current, item]);
    setAdding(false);
    setNote(undefined);
    setState((s) => ({ ...s, level: r.level, current: item, recent: pushRecent(s.recent, item.id) }));
  };

  const removeMine = async (item: Item) => {
    if (!window.confirm(`Remove “${item.title}” from your pictures on this device?`)) return;
    await deleteMine(item.id).catch(() => {});
    const url = urls.current.get(item.id);
    if (url) URL.revokeObjectURL(url);
    urls.current.delete(item.id);
    setMineItems(mineRef.current.filter((i) => i.id !== item.id));
    another();
  };

  // Until own pictures load, a remembered one has no valid URL yet.
  const picture = state.current?.kind === 'mine' && !mine.some((m) => m.id === state.current!.id) ? undefined : state.current;
  const setLevel = (level: Level) => void choose(level, state.medium, state.recent);
  const setMedium = (medium: Medium | 'any') => void choose(state.level, medium, state.recent);
  const another = () => void choose(state.level, state.medium, state.recent);
  const onBroken = () => {
    if (!picture) return;
    broken.current.add(picture.id);
    another();
  };

  const kindLabel = (p: Item) => {
    const what = p.kind === 'mine' ? 'My picture' : p.kind === 'photo' ? 'Photo' : p.kind === 'art' ? 'Artwork' : '';
    if (p.medium) return what ? `${what} · ${mediumLabel(p.medium)}` : mediumLabel(p.medium);
    return state.medium === 'any' ? `${what} · any medium` : `${what} · sketch it in ${mediumLabel(state.medium).toLowerCase()}`;
  };

  return (
    <div className="app">
      <header className="top">
        <h1>Quiet Corners Studio</h1>
        <p className="tag">Pick a time and a medium. Sketch the picture.</p>
      </header>

      <section className="controls" aria-label="Choose">
        <fieldset className="seg">
          <legend>How long?</legend>
          <div className="seg-row seg-4">
            {LEVELS.map((l) => (
              <button
                key={l.key}
                type="button"
                className={state.level === l.key ? 'on' : ''}
                aria-pressed={state.level === l.key}
                onClick={() => setLevel(l.key)}
              >
                <strong>{l.label}</strong>
                <span>{l.time}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="seg">
          <legend>Medium</legend>
          <div className="seg-row chips">
            {[{ key: 'any' as const, label: 'Any' }, ...MEDIA].map((m) => (
              <button
                key={m.key}
                type="button"
                className={state.medium === m.key ? 'on' : ''}
                aria-pressed={state.medium === m.key}
                onClick={() => setMedium(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      {picture ? (
        <main className={`card ${loading ? 'busy' : ''}`} aria-busy={loading}>
          <button className="pic" onClick={() => setZoom(true)} aria-label="View picture full screen">
            <img
              key={picture.id}
              src={picture.src}
              alt={picture.title}
              width={picture.w || undefined}
              height={picture.h || undefined}
              onError={onBroken}
              referrerPolicy="no-referrer"
            />
          </button>
          <div className="meta">
            <h2>{picture.title}</h2>
            <p>
              {kindLabel(picture)} · {levelInfo(picture.level).label} ({levelInfo(picture.level).time})
            </p>
            {picture.credit && (
              <p className="credit">
                {picture.kind === 'art' ? 'By' : 'Photo:'} {picture.credit.artist} ·{' '}
                {picture.credit.licenseUrl ? (
                  <a href={picture.credit.licenseUrl} target="_blank" rel="noreferrer">
                    {picture.credit.license}
                  </a>
                ) : (
                  picture.credit.license
                )}{' '}
                ·{' '}
                <a href={picture.credit.page} target="_blank" rel="noreferrer">
                  {picture.credit.source}
                </a>
              </p>
            )}
            {loading && <p className="note">Finding photos…</p>}
            {!loading && note && <p className="note">{note}</p>}
          </div>
          <div className="actions">
            <button className="btn primary" onClick={another} disabled={loading}>
              Another one
            </button>
            {picture.kind === 'mine' && (
              <button className="btn quiet" onClick={() => void removeMine(picture)}>
                Remove
              </button>
            )}
          </div>
          <Timer key={picture.id + state.level} minutes={levelInfo(state.level).minutes} />
        </main>
      ) : (
        <main className="card empty">
          <p>{loading || !ready ? 'Finding pictures…' : 'No pictures available right now. Check your connection and try again.'}</p>
          {!loading && ready && (
            <button className="btn primary" onClick={another}>
              Try again
            </button>
          )}
        </main>
      )}

      {zoom && picture && (
        <div className="zoom" role="dialog" aria-label={picture.title} onClick={() => setZoom(false)}>
          <img src={picture.large} alt={picture.title} referrerPolicy="no-referrer" />
          <button className="btn close" onClick={() => setZoom(false)}>
            Close
          </button>
        </div>
      )}

      <section className="mine">
        <button className="btn" onClick={() => setAdding(true)}>
          + Add my own picture
        </button>
        <p className="small">
          {mine.length ? `You have ${mine.length} picture${mine.length === 1 ? '' : 's'} saved` : 'Your own photos or screenshots'} — kept only on this device,
          never uploaded. They come up alongside the other pictures.
        </p>
      </section>

      {adding && <AddPicture level={state.level} medium={state.medium} onSave={saveMine} onCancel={() => setAdding(false)} />}

      <footer className="foot">
        Pictures generated in Canva for this app · artworks and photos from Openverse and Wikimedia Commons, credited under each one.
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------

function AddPicture({
  level: startLevel,
  medium: startMedium,
  onSave,
  onCancel,
}: {
  level: Level;
  medium: Medium | 'any';
  onSave: (r: MineRecord) => Promise<void>;
  onCancel: () => void;
}) {
  const [file, setFile] = useState<File | undefined>();
  const [preview, setPreview] = useState<string | undefined>();
  const [level, setLevel] = useState<Level>(startLevel);
  const [medium, setMedium] = useState<Medium | 'any'>(startMedium);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (f?: File) => {
    setError(undefined);
    setFile(f);
    if (f && !title)
      setTitle(
        f.name
          .replace(/\.[a-z0-9]+$/i, '')
          .replace(/[_-]+/g, ' ')
          .slice(0, 80),
      );
  };

  const save = async () => {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    try {
      const { blob, w, h } = await prepareImage(file);
      await onSave({
        id: `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        level,
        medium: medium === 'any' ? undefined : medium,
        title: title.trim() || 'My picture',
        blob,
        w,
        h,
        added: Date.now(),
      });
    } catch (e) {
      setError((e as Error).message || 'That picture could not be saved.');
      setBusy(false);
    }
  };

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Add my own picture">
      <div className="sheet-body">
        <h2>Add my own picture</h2>
        <label className="file">
          <input type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0])} />
          {preview ? <img src={preview} alt="Chosen picture" /> : <span>Choose a picture or take a photo</span>}
        </label>
        <label className="field">
          <span>Name</span>
          <input type="text" value={title} maxLength={80} placeholder="e.g. Corner tea stall" onChange={(e) => setTitle(e.target.value)} />
        </label>
        <fieldset className="seg">
          <legend>How long would it take?</legend>
          <div className="seg-row seg-4">
            {LEVELS.map((l) => (
              <button key={l.key} type="button" className={level === l.key ? 'on' : ''} aria-pressed={level === l.key} onClick={() => setLevel(l.key)}>
                <strong>{l.label}</strong>
                <span>{l.time}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="seg">
          <legend>Medium</legend>
          <div className="seg-row chips">
            {[{ key: 'any' as const, label: 'Any' }, ...MEDIA].map((m) => (
              <button key={m.key} type="button" className={medium === m.key ? 'on' : ''} aria-pressed={medium === m.key} onClick={() => setMedium(m.key)}>
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="small">Saved only in this browser on this device. It is never uploaded or added to the public site.</p>
        {error && <p className="note">{error}</p>}
        <div className="actions">
          <button className="btn primary" onClick={() => void save()} disabled={!file || busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button className="btn quiet" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Timer({ minutes }: { minutes: number }) {
  const total = minutes * 60_000;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const end = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const ms = end.current - Date.now();
      setLeft(ms);
      if (ms <= 0) setRunning(false);
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  const start = () => {
    end.current = Date.now() + (left > 0 ? left : total);
    if (left <= 0) setLeft(total);
    setRunning(true);
  };
  const done = left <= 0;

  return (
    <div className={`timer ${done ? 'done' : ''}`} aria-live="polite">
      <span className="clock">{done ? 'Time’s up' : fmt(left)}</span>
      <div className="timer-btns">
        {running ? (
          <button className="btn" onClick={() => setRunning(false)}>
            Pause
          </button>
        ) : (
          <button className="btn" onClick={start}>
            {left === total ? 'Start timer' : done ? 'Again' : 'Resume'}
          </button>
        )}
        {left !== total && !running && (
          <button className="btn quiet" onClick={() => setLeft(total)}>
            Reset
          </button>
        )}
      </div>
      {done && <p className="small">Keep going if you like — the timer is only a guide.</p>}
    </div>
  );
}
