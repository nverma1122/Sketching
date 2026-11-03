import { useState } from 'react';
import type { Go } from '../App';
import { QuestionCard } from '../components/QuestionCard';
import { Quiz, type QuizItem } from '../components/Quiz';
import { Results } from '../components/Results';
import { BANK, BY_ID, topicKey } from '../lib/bank';
import { pick } from '../lib/select';
import { getState, saveTest, topicMastered, useStore } from '../lib/store';
import type { Question } from '../lib/types';
import { toTest } from './Practice';

export function Mistakes({ go }: { go: Go }) {
  const mistakes = useStore((s) => s.mistakes);
  const state = useStore((s) => s);
  const [tab, setTab] = useState<'active' | 'cleared' | 'topics'>('active');
  const [open, setOpen] = useState<string | null>(null);
  const [run, setRun] = useState<{ qs: Question[]; title: string } | null>(null);
  const [res, setRes] = useState<{ items: QuizItem[]; seconds: number; title: string } | null>(null);

  const entries = Object.entries(mistakes).filter(([id]) => BY_ID[id]);
  const active = entries.filter(([, m]) => !m.cleared).sort((a, b) => b[1].wrong - a[1].wrong || a[1].lastAt - b[1].lastAt);
  const cleared = entries.filter(([, m]) => m.cleared);
  const topics: Record<string, { mistakes: number; active: number }> = {};
  for (const [id, m] of entries) {
    const k = topicKey(BY_ID[id]);
    const t = (topics[k] ||= { mistakes: 0, active: 0 });
    t.mistakes += m.wrong;
    if (!m.cleared) t.active++;
  }
  const weakTopics = Object.entries(topics).filter(([k, v]) => v.active > 0 || !topicMastered(state, k)).map(([k]) => k);

  if (res)
    return (
      <Results
        title={res.title}
        items={res.items}
        seconds={res.seconds}
        actions={<button className="btn" onClick={() => setRes(null)}>Back to Mistake Master</button>}
      />
    );
  if (run)
    return (
      <Quiz
        mode="mistakes"
        title={run.title}
        hints
        onQuit={() => {}}
        next={(h) => run.qs[h.length] ?? null}
        onFinish={(items, x) => {
          if (items.length) saveTest(toTest('mistakes', run.title, items, x.seconds));
          setRun(null);
          setRes({ items, seconds: x.seconds, title: run.title });
        }}
      />
    );

  const retry = () => {
    // oldest-touched first, so the question you just got wrong is not served straight back
    const qs = active.slice().sort((a, b) => a[1].lastAt - b[1].lastAt).slice(0, 10).map(([id]) => BY_ID[id]);
    setRun({ qs, title: '🔁 Retry my mistakes' });
  };
  const fresh = () => {
    const mistaken = new Set(entries.map(([id]) => id));
    const pool = BANK.filter((q) => weakTopics.includes(topicKey(q)) && !mistaken.has(q.id));
    setRun({ qs: pick(pool, 10, getState()), title: '🆕 New questions on my weak topics' });
  };
  const freshCount = BANK.filter((q) => weakTopics.includes(topicKey(q)) && !mistakes[q.id]).length;

  return (
    <div className="page">
      <header className="phead">
        <h1>🔁 Mistake Master</h1>
        <p>
          Every wrong answer lands here automatically. A mistake is <b>cleared</b> only after you answer it correctly twice, at least ten minutes apart. A <b>topic</b> counts as mastered only when you get ≥ 6 of
          your last 8 answers right across at least 4 different questions, including an Advanced or Olympiad one — so you cannot master a topic by remembering one answer.
        </p>
      </header>
      <div className="kpis">
        <div className="kpi bad"><div className="kv">{active.length}</div><div className="kl">Active mistakes</div></div>
        <div className="kpi good"><div className="kv">{cleared.length}</div><div className="kl">Cleared</div></div>
        <div className="kpi"><div className="kv">{weakTopics.length}</div><div className="kl">Topics to strengthen</div></div>
      </div>
      <div className="actions left">
        <button className="btn" disabled={!active.length} onClick={retry}>Retry my mistakes ({Math.min(10, active.length)})</button>
        <button className="btn" disabled={!freshCount} onClick={fresh}>New questions on the same topics ({Math.min(10, freshCount)})</button>
      </div>
      <div className="seg">
        <button className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>Active ({active.length})</button>
        <button className={tab === 'cleared' ? 'on' : ''} onClick={() => setTab('cleared')}>Cleared ({cleared.length})</button>
        <button className={tab === 'topics' ? 'on' : ''} onClick={() => setTab('topics')}>By topic</button>
      </div>
      {tab !== 'topics' && (
        <div className="card">
          {(tab === 'active' ? active : cleared).length === 0 && (
            <p className="dim">{tab === 'active' ? 'No active mistakes. Wrong answers from any mode will appear here.' : 'Nothing cleared yet.'}</p>
          )}
          <div className="review">
            {(tab === 'active' ? active : cleared).map(([id, m]) => {
              const q = BY_ID[id];
              return (
                <div key={id} className={`rrow ${m.cleared ? 'ok' : 'bad'}`}>
                  <button className="rhead" onClick={() => setOpen(open === id ? null : id)}>
                    <span className="rmark">{m.cleared ? '✓' : '✗'}</span>
                    <span className="rq">
                      <span className="dim small">{q.subject} · {q.topic}</span>
                      <br />
                      {q.q.length > 120 ? q.q.slice(0, 120) + '…' : q.q}
                    </span>
                    <span className="small">wrong ×{m.wrong} · right ×{m.right}</span>
                  </button>
                  {open === id && (
                    <div className="rbody">
                      <p className="small dim">Your last wrong answer is shown in red.</p>
                      <QuestionCard q={q} selected={m.lastGiven} reveal />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {tab === 'topics' && (
        <div className="card">
          {Object.keys(topics).length === 0 && <p className="dim">No mistakes recorded yet.</p>}
          {Object.entries(topics)
            .sort((a, b) => b[1].mistakes - a[1].mistakes)
            .map(([k, v]) => {
              const [subject, topic] = k.split('::');
              const mastered = topicMastered(state, k);
              return (
                <div key={k} className="testrow">
                  <span>{subject} · <b>{topic}</b></span>
                  <span className="small">{v.mistakes} wrong answer(s) · {v.active} active</span>
                  <span className={mastered ? 'goodtxt' : 'badtxt'}>{mastered ? 'Mastered' : 'Not yet mastered'}</span>
                  <button className="btn sm ghost" onClick={() => go(`practice/topic/${encodeURIComponent(k)}`)}>Practise</button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
