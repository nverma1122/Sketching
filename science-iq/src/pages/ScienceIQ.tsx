import { useMemo, useState } from 'react';
import type { Go } from '../App';
import { Quiz, type QuizItem } from '../components/Quiz';
import { Results } from '../components/Results';
import { BY_ID, filterBank } from '../lib/bank';
import { pick } from '../lib/select';
import { getState, saveTest, useStore } from '../lib/store';
import { SUBJECTS, SUBJECT_ICON, TYPE_NAME, type QType, type Subject } from '../lib/types';
import { toTest } from './Practice';

const KINDS: { id: string; label: string; types: QType[] }[] = [
  { id: 'all', label: 'All challenges', types: [] },
  { id: 'concept', label: 'Conceptual', types: ['mcq', 'reasoning', 'assertion-reason', 'statement'] },
  { id: 'num', label: 'Numerical', types: ['numerical'] },
  { id: 'whatif', label: 'What-if', types: ['what-if', 'application'] },
  { id: 'exp', label: 'Experimental', types: ['experiment', 'data'] },
  { id: 'inter', label: 'Interdisciplinary', types: ['interdisciplinary'] },
];

export function ScienceIQ({ go }: { go: Go }) {
  const [subject, setSubject] = useState<Subject | ''>('');
  const [kind, setKind] = useState('all');
  const [running, setRunning] = useState(false);
  const [res, setRes] = useState<{ items: QuizItem[]; seconds: number } | null>(null);
  const iqAttempts = useStore((s) => s.attempts.filter((a) => a.mode === 'iq'));
  const pool = useMemo(() => {
    const types = KINDS.find((k) => k.id === kind)!.types;
    return filterBank({ iq: true, subjects: subject ? [subject] : undefined }).filter((q) => !types.length || types.includes(q.type));
  }, [subject, kind]);

  if (res)
    return (
      <Results
        title="Science IQ session"
        items={res.items}
        seconds={res.seconds}
        extra={<IqProfile items={res.items} />}
        actions={
          <>
            <button className="btn" onClick={() => { setRes(null); setRunning(true); }}>More challenges</button>
            <button className="btn ghost" onClick={() => { setRes(null); setRunning(false); }}>Change filters</button>
          </>
        }
      />
    );

  if (running) {
    const used = new Set<string>();
    return (
      <Quiz
        mode="iq"
        title="🧠 Science IQ — unfamiliar problems"
        hints
        onQuit={() => {}}
        next={(h) => {
          h.forEach((i) => used.add(i.q));
          if (h.length >= 10) return null;
          return pick(pool.filter((q) => !used.has(q.id)), 1, getState())[0] ?? null;
        }}
        onFinish={(items, x) => {
          if (items.length) saveTest(toTest('iq', 'Science IQ', items, x.seconds));
          setRunning(false);
          setRes({ items, seconds: x.seconds });
        }}
      />
    );
  }

  const solved = iqAttempts.filter((a) => a.ok).length;
  const noHint = iqAttempts.filter((a) => a.ok && a.hints === 0).length;
  return (
    <div className="page">
      <header className="phead">
        <h1>🧠 Science IQ</h1>
        <p>
          Unfamiliar situations you have never seen in a textbook. Each one can be solved with a principle you already know — the challenge is recognising which one. Use hints only when stuck: each hint
          reduces the XP for that problem by 40%.
        </p>
      </header>
      <div className="kpis">
        <div className="kpi"><div className="kv">{iqAttempts.length}</div><div className="kl">Attempted</div></div>
        <div className="kpi good"><div className="kv">{solved}</div><div className="kl">Solved</div></div>
        <div className="kpi"><div className="kv">{noHint}</div><div className="kl">Solved without hints</div></div>
        <div className="kpi"><div className="kv">{pool.length}</div><div className="kl">Problems available</div></div>
      </div>
      <div className="card">
        <label className="lbl">Area</label>
        <div className="seg wrap">
          <button className={!subject ? 'on' : ''} onClick={() => setSubject('')}>All</button>
          {SUBJECTS.map((s) => (
            <button key={s} className={subject === s ? 'on' : ''} onClick={() => setSubject(s)}>{SUBJECT_ICON[s]} {s}</button>
          ))}
        </div>
        <label className="lbl">Challenge type</label>
        <div className="seg wrap">
          {KINDS.map((k) => (
            <button key={k.id} className={kind === k.id ? 'on' : ''} onClick={() => setKind(k.id)}>{k.label}</button>
          ))}
        </div>
        <div className="actions">
          <span className="dim">Sessions are 10 problems; you can stop at any time.</span>
          <button className="btn" disabled={!pool.length} onClick={() => setRunning(true)}>Start thinking →</button>
        </div>
      </div>
      <div className="card">
        <h3>How Science IQ is different</h3>
        <ul className="plain">
          <li>Problems are set on other planets, in unusual liquids, in hypothetical experiments — so recall alone will not answer them.</li>
          <li>After each answer, the explanation names the underlying principle and shows how it applies.</li>
          <li>Your results here are tracked separately, so you can see whether you understand science or only remember it.</li>
        </ul>
        <button className="btn ghost" onClick={() => go('progress')}>See my progress</button>
      </div>
    </div>
  );
}

function IqProfile({ items }: { items: QuizItem[] }) {
  const byType: Record<string, { n: number; c: number }> = {};
  for (const it of items) {
    const q = BY_ID[it.q];
    const k = TYPE_NAME[q.type];
    const v = (byType[k] ||= { n: 0, c: 0 });
    v.n++;
    if (it.ok) v.c++;
  }
  const hintsUsed = items.reduce((s, i) => s + i.hints, 0);
  return (
    <div className="card">
      <h3>Thinking profile</h3>
      <ul className="plain">
        {Object.entries(byType).map(([k, v]) => (
          <li key={k}>{k}: {v.c}/{v.n}</li>
        ))}
        <li>Hints used: {hintsUsed}</li>
      </ul>
    </div>
  );
}
