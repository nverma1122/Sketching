import { useState } from 'react';
import type { Go } from '../App';
import { Quiz, type QuizItem } from '../components/Quiz';
import { Results } from '../components/Results';
import { BY_ID, filterBank } from '../lib/bank';
import { hash, pick, rng } from '../lib/select';
import { addXp, dayKey, getState, saveTest, streakOf, update, useStore, type State } from '../lib/store';
import type { Level, Subject } from '../lib/types';
import { toTest } from './Practice';

// Ten questions from different subjects, the same all day, never reusing a question from the
// previous seven missions. Levels: 3 Foundation, 4 Advanced, 3 Olympiad.
const PLAN: [Subject, Level][] = [
  ['Physics', 1], ['Chemistry', 1], ['Biology', 1],
  ['Space Science', 2], ['Environment & Technology', 2], ['Physics', 2], ['Biology', 2],
  ['Chemistry', 3], ['Scientific Reasoning', 3], ['Physics', 3],
];

export const DAILY_XP = 50;

export function missionFor(s: State, day = dayKey()): string[] {
  if (s.daily[day]) return s.daily[day].qids;
  const recent = new Set(Object.entries(s.daily).filter(([d]) => d !== day).sort().slice(-7).flatMap(([, r]) => r.qids));
  const r = rng(hash(day + s.created));
  const used = new Set<string>();
  const out: string[] = [];
  for (const [subj, lvl] of PLAN) {
    let pool = filterBank({ subjects: [subj], levels: [lvl] }).filter((q) => !recent.has(q.id) && !used.has(q.id));
    if (!pool.length) pool = filterBank({ subjects: [subj] }).filter((q) => !used.has(q.id));
    const q = pick(pool, 1, s, { rand: r })[0];
    if (q) {
      used.add(q.id);
      out.push(q.id);
    }
  }
  return out;
}

export function Daily({ go }: { go: Go }) {
  const day = dayKey();
  const rec = useStore((s) => s.daily[day]);
  const streak = useStore((s) => streakOf(s));
  // index of the first unanswered question when this run started (fixed for the whole run)
  const [startAt, setStartAt] = useState<number | null>(null);
  const running = startAt !== null;
  const setRunning = (on: boolean) => setStartAt(on ? (getState().daily[day]?.answers.length ?? 0) : null);
  const [res, setRes] = useState<{ items: QuizItem[]; seconds: number } | null>(null);
  const history = useStore((s) => Object.entries(s.daily).sort().reverse().slice(0, 7));

  const start = () => {
    if (!rec) update((s) => { s.daily[day] = { qids: missionFor(s, day), answers: [], done: false, correct: 0 }; });
    setRunning(true);
  };

  if (res) {
    const r = getState().daily[day];
    return (
      <Results
        title="📅 Daily Mission complete"
        items={res.items}
        seconds={res.seconds}
        extra={<div className="card">+{DAILY_XP} XP mission bonus{r?.correct === 10 ? ' · flawless!' : ''} · come back tomorrow for a new mission.</div>}
        actions={<button className="btn" onClick={() => go('home')}>Dashboard</button>}
      />
    );
  }

  if (running) {
    const r = getState().daily[day];
    const remaining = r.qids.slice(startAt!);
    const t0 = Date.now();
    return (
      <Quiz
        mode="daily"
        title={`📅 Daily Mission · ${startAt ? `resumed at ${startAt + 1}/10` : day}`}
        hints
        next={(h) => (remaining[h.length] ? BY_ID[remaining[h.length]] : null)}
        onAnswer={(it) => update((s) => {
          const d = s.daily[day];
          d.answers.push(it.given);
          if (it.ok) d.correct++;
        })}
        onFinish={(items, x) => {
          const d = getState().daily[day];
          if (d.answers.length >= d.qids.length && !d.done) {
            update((s) => { s.daily[day].done = true; });
            addXp(DAILY_XP);
            const all = d.qids.map((qid, i) => ({ q: qid, given: d.answers[i], ok: d.answers[i] === BY_ID[qid].answer, ms: items.find((it) => it.q === qid)?.ms ?? 0, hints: 0, xp: 0 }));
            saveTest(toTest('daily', `Daily Mission ${day}`, all, Math.round((Date.now() - t0) / 1000)));
            setRes({ items: all, seconds: x.seconds });
          }
          setRunning(false);
        }}
      />
    );
  }

  return (
    <div className="page">
      <header className="phead">
        <h1>📅 Daily Mission</h1>
        <p>Ten questions across all six areas, from Foundation to Olympiad. New every day. Completing it earns {DAILY_XP} XP and keeps your streak alive.</p>
      </header>
      <div className="card hero">
        <div>
          <h2>{rec?.done ? 'Mission accomplished ✓' : rec ? `In progress — ${rec.answers.length}/10 answered` : "Today's mission is ready"}</h2>
          <p className="dim">🔥 Current streak: {streak} day{streak === 1 ? '' : 's'} (days with at least 5 answers)</p>
          {rec?.done ? <p>You scored {rec.correct}/10. A fresh mission unlocks tomorrow.</p> : <button className="btn" onClick={start}>{rec ? 'Continue mission' : 'Start mission'} →</button>}
        </div>
      </div>
      {history.length > 0 && (
        <div className="card">
          <h3>Last 7 missions</h3>
          {history.map(([d, r]) => (
            <div key={d} className="testrow">
              <span>{d}</span>
              <span>{r.done ? `${r.correct}/10` : `${r.answers.length}/10 answered`}</span>
              <span className={r.done ? 'goodtxt' : 'dim'}>{r.done ? 'Complete' : 'Unfinished'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
