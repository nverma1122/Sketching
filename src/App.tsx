import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LEVELS, MEDIA, PICTURES, levelInfo, mediumLabel, pictureSrc, type Level, type Medium } from './data/pictures';
import { pickPicture, pushRecent, type Pick } from './lib/pick';

// ---------------------------------------------------------------------------
// Small persistent preferences (per device). Storage may be unavailable.

const KEY = 'qcs.v3';
interface Saved {
  level: Level;
  medium: Medium | 'any';
  recent: string[];
  current?: string;
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

// ---------------------------------------------------------------------------

export function App() {
  const [state, setState] = useState<Saved>(load);
  const [note, setNote] = useState<string | undefined>();
  const [zoom, setZoom] = useState(false);

  useEffect(() => save(state), [state]);

  const picture = useMemo(() => PICTURES.find((p) => p.id === state.current), [state.current]);

  const choose = useCallback((level: Level, medium: Medium | 'any', recent: string[]) => {
    const res: Pick | null = pickPicture(PICTURES, { level, medium: medium === 'any' ? undefined : medium }, recent);
    setNote(res?.note);
    setState((s) => ({ ...s, level, medium, current: res?.picture.id, recent: res ? pushRecent(recent, res.picture.id) : recent }));
  }, []);

  // First visit, or the remembered picture no longer exists.
  useEffect(() => {
    if (!picture) choose(state.level, state.medium, state.recent);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setLevel = (level: Level) => choose(level, state.medium, state.recent);
  const setMedium = (medium: Medium | 'any') => choose(state.level, medium, state.recent);
  const another = () => choose(state.level, state.medium, state.recent);

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
              <button key={l.key} type="button" className={state.level === l.key ? 'on' : ''} aria-pressed={state.level === l.key} onClick={() => setLevel(l.key)}>
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
              <button key={m.key} type="button" className={state.medium === m.key ? 'on' : ''} aria-pressed={state.medium === m.key} onClick={() => setMedium(m.key)}>
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      {picture ? (
        <main className="card">
          <button className="pic" onClick={() => setZoom(true)} aria-label="View picture full screen">
            <img src={pictureSrc(picture)} alt={`${picture.title} — ${mediumLabel(picture.medium)}`} width={picture.w} height={picture.h} />
          </button>
          <div className="meta">
            <h2>{picture.title}</h2>
            <p>
              {mediumLabel(picture.medium)} · {levelInfo(picture.level).label} ({levelInfo(picture.level).time})
            </p>
            {note && <p className="note">{note}</p>}
          </div>
          <div className="actions">
            <button className="btn primary" onClick={another}>
              Another one
            </button>
          </div>
          <Timer key={picture.id + picture.level} minutes={levelInfo(picture.level).minutes} />
        </main>
      ) : (
        <main className="card empty">
          <p>No pictures yet.</p>
        </main>
      )}

      {zoom && picture && (
        <div className="zoom" role="dialog" aria-label={picture.title} onClick={() => setZoom(false)}>
          <img src={pictureSrc(picture)} alt={picture.title} />
          <button className="btn close" onClick={() => setZoom(false)}>
            Close
          </button>
        </div>
      )}

      <footer className="foot">Pictures generated in Canva for this app.</footer>
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
