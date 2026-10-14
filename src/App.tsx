import { useCallback, useEffect, useRef, useState } from "react";
import {
  CANVA,
  LEVELS,
  MEDIA,
  levelInfo,
  mediumLabel,
  type Item,
  type Level,
  type Medium,
} from "./data/pictures";
import { PHOTO_QUERIES } from "./data/photoQueries";
import { searchPhotos } from "./lib/commons";
import { pickPicture, pushRecent } from "./lib/pick";

// ---------------------------------------------------------------------------
// Small persistent preferences (per device). Storage may be unavailable.

const KEY = "qcs.v4";
interface Saved {
  level: Level;
  medium: Medium | "any";
  recent: string[];
  current?: Item;
}
const DEFAULTS: Saved = { level: "quick", medium: "any", recent: [] };

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
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
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

// ---------------------------------------------------------------------------

export function App() {
  const [state, setState] = useState<Saved>(load);
  const [note, setNote] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(false);

  // Wikimedia Commons photos found so far, per length. Each "Another one"
  // searches one more phrase (cached for a week) so the pool keeps growing.
  const photos = useRef(emptyPools());
  const queue = useRef<Record<Level, string[]>>({
    quick: shuffle(PHOTO_QUERIES.quick),
    short: shuffle(PHOTO_QUERIES.short),
    long: shuffle(PHOTO_QUERIES.long),
    deep: shuffle(PHOTO_QUERIES.deep),
  });
  const broken = useRef(new Set<string>());
  const request = useRef(0);

  useEffect(() => save(state), [state]);

  const loadMore = useCallback(async (level: Level) => {
    const q = queue.current[level].shift();
    if (!q) return false;
    try {
      const found = await searchPhotos(q, level);
      const have = new Set(photos.current[level].map((p) => p.id));
      photos.current[level] = [
        ...photos.current[level],
        ...found.filter((p) => !have.has(p.id)),
      ];
      return true;
    } catch (e) {
      queue.current[level].push(q); // try this phrase again later
      throw e;
    }
  }, []);

  const pool = () =>
    [...CANVA, ...Object.values(photos.current).flat()].filter(
      (p) => !broken.current.has(p.id),
    );

  const choose = useCallback(
    async (level: Level, medium: Medium | "any", recent: string[]) => {
      const id = ++request.current;
      const want = { level, medium: medium === "any" ? undefined : medium };
      setState((s) => ({ ...s, level, medium }));

      let res = pickPicture(pool(), want, recent);
      let failed = false;
      if (!res || res.note) {
        // Nothing for this length yet: wait for photos (a couple of phrases at most).
        setLoading(true);
        for (let tries = 0; tries < 3 && (!res || res.note); tries++) {
          try {
            if (!(await loadMore(level))) break;
          } catch {
            failed = true;
            break;
          }
          res = pickPicture(pool(), want, recent);
        }
        if (id !== request.current) return;
        setLoading(false);
      } else {
        // Grow the photo pool quietly in the background.
        loadMore(level).catch(() => {});
      }
      if (id !== request.current) return;
      setNote(
        res?.note && failed
          ? `Couldn’t reach Wikimedia Commons. ${res.note}`
          : res?.note,
      );
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

  // First visit, or nothing remembered.
  useEffect(() => {
    if (!state.current) void choose(state.level, state.medium, state.recent);
    else loadMore(state.level).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const picture = state.current;
  const setLevel = (level: Level) =>
    void choose(level, state.medium, state.recent);
  const setMedium = (medium: Medium | "any") =>
    void choose(state.level, medium, state.recent);
  const another = () => void choose(state.level, state.medium, state.recent);
  const onBroken = () => {
    if (!picture) return;
    broken.current.add(picture.id);
    another();
  };

  const kindLabel = (p: Item) =>
    p.kind === "photo"
      ? state.medium === "any"
        ? "Photo · any medium"
        : `Photo · sketch it in ${mediumLabel(state.medium).toLowerCase()}`
      : mediumLabel(p.medium!);

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
                className={state.level === l.key ? "on" : ""}
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
            {[{ key: "any" as const, label: "Any" }, ...MEDIA].map((m) => (
              <button
                key={m.key}
                type="button"
                className={state.medium === m.key ? "on" : ""}
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
        <main className={`card ${loading ? "busy" : ""}`} aria-busy={loading}>
          <button
            className="pic"
            onClick={() => setZoom(true)}
            aria-label="View picture full screen"
          >
            <img
              key={picture.id}
              src={picture.src}
              alt={picture.title}
              width={picture.w}
              height={picture.h}
              onError={onBroken}
              referrerPolicy="no-referrer"
            />
          </button>
          <div className="meta">
            <h2>{picture.title}</h2>
            <p>
              {kindLabel(picture)} · {levelInfo(picture.level).label} (
              {levelInfo(picture.level).time})
            </p>
            {picture.credit && (
              <p className="credit">
                Photo: {picture.credit.artist} ·{" "}
                {picture.credit.licenseUrl ? (
                  <a
                    href={picture.credit.licenseUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {picture.credit.license}
                  </a>
                ) : (
                  picture.credit.license
                )}{" "}
                ·{" "}
                <a href={picture.credit.page} target="_blank" rel="noreferrer">
                  Wikimedia Commons
                </a>
              </p>
            )}
            {loading && <p className="note">Finding photos…</p>}
            {!loading && note && <p className="note">{note}</p>}
          </div>
          <div className="actions">
            <button
              className="btn primary"
              onClick={another}
              disabled={loading}
            >
              Another one
            </button>
          </div>
          <Timer
            key={picture.id + state.level}
            minutes={levelInfo(state.level).minutes}
          />
        </main>
      ) : (
        <main className="card empty">
          <p>
            {loading
              ? "Finding photos…"
              : "No pictures available right now. Check your connection and try again."}
          </p>
          {!loading && (
            <button className="btn primary" onClick={another}>
              Try again
            </button>
          )}
        </main>
      )}

      {zoom && picture && (
        <div
          className="zoom"
          role="dialog"
          aria-label={picture.title}
          onClick={() => setZoom(false)}
        >
          <img
            src={picture.large}
            alt={picture.title}
            referrerPolicy="no-referrer"
          />
          <button className="btn close" onClick={() => setZoom(false)}>
            Close
          </button>
        </div>
      )}

      <footer className="foot">
        Pictures generated in Canva for this app · photos from Wikimedia
        Commons, credited under each photo.
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------

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
    <div className={`timer ${done ? "done" : ""}`} aria-live="polite">
      <span className="clock">{done ? "Time’s up" : fmt(left)}</span>
      <div className="timer-btns">
        {running ? (
          <button className="btn" onClick={() => setRunning(false)}>
            Pause
          </button>
        ) : (
          <button className="btn" onClick={start}>
            {left === total ? "Start timer" : done ? "Again" : "Resume"}
          </button>
        )}
        {left !== total && !running && (
          <button className="btn quiet" onClick={() => setLeft(total)}>
            Reset
          </button>
        )}
      </div>
      {done && (
        <p className="small">
          Keep going if you like — the timer is only a guide.
        </p>
      )}
    </div>
  );
}
