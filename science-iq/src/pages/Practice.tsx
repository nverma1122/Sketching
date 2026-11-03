import { useMemo, useState } from 'react';
import type { Go } from '../App';
import { Quiz, type QuizItem } from '../components/Quiz';
import { Results } from '../components/Results';
import { BANK, filterBank, topicsOf } from '../lib/bank';
import { pick } from '../lib/select';
import { getState, saveTest, update, useStore } from '../lib/store';
import { LEVEL_NAME, SUBJECTS, SUBJECT_ICON, type Level, type Question, type Subject } from '../lib/types';

interface Setup {
  subject: Subject | '';
  topic: string;
  level: Level | 0;
  count: number;
  timed: boolean;
}

export function Practice({ go, arg }: { go: Go; arg: string }) {
  if (arg === 'survival') return <Survival go={go} />;
  if (arg === 'speed60') return <Speed go={go} seconds={60} />;
  if (arg === 'speed120') return <Speed go={go} seconds={120} />;
  return <CustomPractice go={go} preset={arg.startsWith('topic/') ? decodeURIComponent(arg.slice(6)) : ''} />;
}

function CustomPractice({ go, preset }: { go: Go; preset: string }) {
  const [ps, pt] = preset ? preset.split('::') : ['', ''];
  const [setup, setSetup] = useState<Setup>({ subject: (ps as Subject) || '', topic: pt || '', level: 0, count: 10, timed: false });
  const [run, setRun] = useState<Question[] | null>(null);
  const [res, setRes] = useState<{ items: QuizItem[]; seconds: number } | null>(null);
  const bests = useStore((s) => s.bests);
  const pool = useMemo(
    () => filterBank({ subjects: setup.subject ? [setup.subject] : undefined, topics: setup.topic ? [setup.topic] : undefined, levels: setup.level ? [setup.level] : undefined }),
    [setup.subject, setup.topic, setup.level],
  );

  if (res)
    return (
      <Results
        title="Practice complete"
        items={res.items}
        seconds={res.seconds}
        actions={
          <>
            <button className="btn" onClick={() => { setRes(null); setRun(pick(pool, setup.count, getState())); }}>
              New set, same settings
            </button>
            <button className="btn ghost" onClick={() => { setRes(null); setRun(null); }}>
              Change settings
            </button>
            <button className="btn ghost" onClick={() => go('mistakes')}>
              Mistake Master
            </button>
          </>
        }
      />
    );

  if (run)
    return (
      <Quiz
        mode="practice"
        title={`Practice · ${setup.subject || 'All subjects'}${setup.topic ? ' · ' + setup.topic : ''}`}
        hints
        perQuestionFactor={setup.timed ? 1.5 : undefined}
        next={(h) => run[h.length] ?? null}
        onQuit={() => {}}
        onFinish={(items, x) => {
          if (items.length) saveTest(toTest('practice', 'Practice', items, x.seconds));
          setRes({ items, seconds: x.seconds });
        }}
      />
    );

  return (
    <div className="page">
      <header className="phead">
        <h1>🎯 Practice Arena</h1>
        <p>Choose what to practise. You get immediate feedback, progressive hints and a full explanation after every answer.</p>
      </header>
      <div className="card">
        <h3>Custom practice</h3>
        <label className="lbl">Subject</label>
        <div className="seg wrap">
          <button className={!setup.subject ? 'on' : ''} onClick={() => setSetup({ ...setup, subject: '', topic: '' })}>All</button>
          {SUBJECTS.map((s) => (
            <button key={s} className={setup.subject === s ? 'on' : ''} onClick={() => setSetup({ ...setup, subject: s, topic: '' })}>
              {SUBJECT_ICON[s]} {s}
            </button>
          ))}
        </div>
        <label className="lbl">Topic</label>
        <select value={setup.topic} onChange={(e) => setSetup({ ...setup, topic: e.target.value })}>
          <option value="">All topics</option>
          {topicsOf(setup.subject || undefined).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <label className="lbl">Difficulty</label>
        <div className="seg">
          <button className={!setup.level ? 'on' : ''} onClick={() => setSetup({ ...setup, level: 0 })}>Mixed</button>
          {([1, 2, 3] as Level[]).map((l) => (
            <button key={l} className={setup.level === l ? 'on' : ''} onClick={() => setSetup({ ...setup, level: l })}>{LEVEL_NAME[l]}</button>
          ))}
        </div>
        <label className="lbl">Number of questions</label>
        <div className="seg">
          {[5, 10, 15, 20].map((n) => (
            <button key={n} className={setup.count === n ? 'on' : ''} onClick={() => setSetup({ ...setup, count: n })}>{n}</button>
          ))}
        </div>
        <label className="lbl">Timing</label>
        <div className="seg">
          <button className={!setup.timed ? 'on' : ''} onClick={() => setSetup({ ...setup, timed: false })}>Untimed</button>
          <button className={setup.timed ? 'on' : ''} onClick={() => setSetup({ ...setup, timed: true })}>Timed (1.5 × estimated time per question)</button>
        </div>
        <div className="actions">
          <span className="dim">{pool.length} questions match{pool.length < setup.count ? ` — the set will have ${pool.length}` : ''}.</span>
          <button className="btn" disabled={!pool.length} onClick={() => setRun(pick(pool, setup.count, getState()))}>Start practice →</button>
        </div>
      </div>
      <div className="grid2">
        <div className="card mode" onClick={() => go('practice/survival')} role="button" tabIndex={0}>
          <h3>❤ Survival Mode</h3>
          <p>Three lives. Questions get harder as you go: Foundation → Advanced → Olympiad. Streaks multiply your points.</p>
          <div className="dim">Best: {bests.survival} points · {bests.survivalQ} correct</div>
        </div>
        <div className="card mode">
          <h3>⚡ Speed Challenge</h3>
          <p>As many as you can before the clock runs out. +10 for a correct answer, −5 for a wrong one, so blind guessing does not pay.</p>
          <div className="actions left">
            <button className="btn" onClick={() => go('practice/speed60')}>60 seconds</button>
            <button className="btn" onClick={() => go('practice/speed120')}>120 seconds</button>
          </div>
          <div className="dim">Best: {bests.speed60} correct (60 s) · {bests.speed120} correct (120 s)</div>
        </div>
      </div>
    </div>
  );
}

export function toTest(kind: string, title: string, items: QuizItem[], seconds: number, score?: number, max?: number) {
  const correct = items.filter((i) => i.ok).length;
  const wrong = items.filter((i) => !i.ok && i.given !== null).length;
  return {
    id: `${kind}-${Date.now()}`,
    kind,
    title,
    at: Date.now(),
    score: score ?? correct,
    max: max ?? items.length,
    correct,
    wrong,
    skipped: items.length - correct - wrong,
    timeSec: seconds,
    items: items.map((i) => ({ q: i.q, given: i.given, ok: i.ok, ms: i.ms })),
  };
}

// ------------------------------------------------------------------ Survival

function survivalLevel(n: number): Level {
  return n < 5 ? 1 : n < 12 ? 2 : 3;
}

function Survival({ go }: { go: Go }) {
  const [res, setRes] = useState<{ items: QuizItem[]; seconds: number; score: number; best: boolean } | null>(null);
  const [key, setKey] = useState(0);
  const best = useStore((s) => s.bests);
  if (res)
    return (
      <Results
        title={res.best ? '🏅 New Survival personal best!' : 'Survival run over'}
        items={res.items}
        seconds={res.seconds}
        scoreLine={`${res.score} pts`}
        extra={<div className="card"><b>{res.items.filter((i) => i.ok).length}</b> correct · reached <b>{LEVEL_NAME[survivalLevel(res.items.length - 1)]}</b> level · personal best <b>{best.survival}</b> pts</div>}
        actions={
          <>
            <button className="btn" onClick={() => { setRes(null); setKey(key + 1); }}>Play again</button>
            <button className="btn ghost" onClick={() => go('practice')}>Back to Practice Arena</button>
          </>
        }
      />
    );
  const used = new Set<string>();
  return (
    <Quiz
      key={key}
      mode="survival"
      title="❤ Survival Mode"
      lives={3}
      next={(h) => {
        const lvl = survivalLevel(h.length);
        h.forEach((i) => used.add(i.q));
        let pool = filterBank({ levels: [lvl] }).filter((q) => !used.has(q.id));
        if (!pool.length) pool = BANK.filter((q) => !used.has(q.id));
        return pick(pool, 1, getState())[0] ?? null;
      }}
      score={(q, ok, h) => {
        if (!ok) return 0;
        let streak = 0;
        for (let i = h.length - 1; i >= 0 && h[i].ok; i--) streak++;
        const mult = 1 + Math.min(4, Math.floor((streak + 1) / 3)) * 0.5; // ×1, ×1.5 … ×3
        return Math.round(q.level * 10 * mult);
      }}
      onFinish={(items, x) => {
        const correct = items.filter((i) => i.ok).length;
        const isBest = x.score > getState().bests.survival;
        update((s) => {
          s.bests.survival = Math.max(s.bests.survival, x.score);
          s.bests.survivalQ = Math.max(s.bests.survivalQ, correct);
        });
        if (items.length) saveTest(toTest('survival', 'Survival Mode', items, x.seconds, x.score, 0));
        setRes({ items, seconds: x.seconds, score: x.score, best: isBest && x.score > 0 });
      }}
    />
  );
}

// ------------------------------------------------------------------ Speed

function Speed({ go, seconds }: { go: Go; seconds: number }) {
  const [res, setRes] = useState<{ items: QuizItem[]; seconds: number; score: number; best: boolean } | null>(null);
  const [key, setKey] = useState(0);
  const bestKey = seconds === 60 ? 'speed60' : 'speed120';
  if (res)
    return (
      <Results
        title={res.best ? `⚡ New ${seconds}-second record!` : `${seconds}-second Speed Challenge`}
        items={res.items}
        seconds={res.seconds}
        scoreLine={`${res.score} pts`}
        extra={<div className="card">Scoring: +10 per correct answer, −5 per wrong answer. Personal best: <b>{getState().bests[bestKey]}</b> correct.</div>}
        actions={
          <>
            <button className="btn" onClick={() => { setRes(null); setKey(key + 1); }}>Try again</button>
            <button className="btn ghost" onClick={() => go('practice')}>Back</button>
          </>
        }
      />
    );
  const used = new Set<string>();
  const pool = filterBank({ levels: [1, 2], maxTime: 60 });
  return (
    <Quiz
      key={key}
      mode="speed"
      title={`⚡ Speed Challenge · ${seconds} s`}
      totalSeconds={seconds}
      quickFeedback
      next={(h) => {
        h.forEach((i) => used.add(i.q));
        return pick(pool.filter((q) => !used.has(q.id)), 1, getState())[0] ?? null;
      }}
      score={(_q, ok) => (ok ? 10 : -5)}
      onFinish={(items, x) => {
        const correct = items.filter((i) => i.ok).length;
        const isBest = correct > getState().bests[bestKey];
        update((s) => {
          s.bests[bestKey] = Math.max(s.bests[bestKey], correct);
        });
        if (items.length) saveTest(toTest(bestKey, `Speed ${seconds} s`, items, x.seconds, x.score, 0));
        setRes({ items, seconds: x.seconds, score: x.score, best: isBest && correct > 0 });
      }}
    />
  );
}
