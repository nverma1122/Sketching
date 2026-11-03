import { useState } from 'react';
import { BY_ID } from '../lib/bank';
import { Explanation, QuestionCard } from './QuestionCard';

export interface ResultItem {
  q: string;
  given: number | null;
  ok: boolean | null;
  ms: number;
}

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/** Score, accuracy, time, correct / incorrect, topics to revise and a full answer review. */
export function Results({ title, items, seconds, scoreLine, extra, actions }: { title: string; items: ResultItem[]; seconds: number; scoreLine?: string; extra?: React.ReactNode; actions?: React.ReactNode }) {
  const correct = items.filter((i) => i.ok === true).length;
  const wrong = items.filter((i) => i.ok === false && i.given !== null).length;
  const skipped = items.length - correct - wrong;
  const answered = correct + wrong;
  const acc = answered ? Math.round((correct / answered) * 100) : 0;
  const topics: Record<string, { n: number; c: number }> = {};
  for (const i of items) {
    const q = BY_ID[i.q];
    const t = (topics[`${q.subject} · ${q.topic}`] ||= { n: 0, c: 0 });
    t.n++;
    if (i.ok) t.c++;
  }
  const revise = Object.entries(topics).filter(([, v]) => v.c / v.n < 0.6).map(([k]) => k);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="results">
      <h2>{title}</h2>
      <div className="kpis">
        <Kpi label="Score" value={scoreLine ?? `${correct}/${items.length}`} />
        <Kpi label="Accuracy" value={`${acc}%`} hint={`of ${answered} answered`} />
        <Kpi label="Time" value={fmt(seconds)} hint={items.length ? `${Math.round(seconds / items.length)} s / question` : ''} />
        <Kpi label="Correct" value={String(correct)} good />
        <Kpi label="Incorrect" value={String(wrong)} bad />
        {skipped > 0 && <Kpi label="Unanswered" value={String(skipped)} />}
      </div>
      {extra}
      <div className="card">
        <h3>Topics requiring revision</h3>
        {revise.length ? (
          <ul className="taglist">{revise.map((t) => <li key={t}>{t}</li>)}</ul>
        ) : (
          <p className="dim">No topic below 60% in this set. {wrong ? 'Your mistakes are saved in Mistake Master.' : ''}</p>
        )}
      </div>
      {actions && <div className="actions">{actions}</div>}
      <div className="card">
        <h3>Answer review</h3>
        <div className="review">
          {items.map((it, n) => {
            const q = BY_ID[it.q];
            const k = `${n}`;
            return (
              <div key={k} className={`rrow ${it.ok ? 'ok' : it.given === null ? 'skip' : 'bad'}`}>
                <button className="rhead" onClick={() => setOpen(open === k ? null : k)}>
                  <span className="rnum">{n + 1}</span>
                  <span className="rmark">{it.ok ? '✓' : it.given === null ? '–' : '✗'}</span>
                  <span className="rq">{q.q.length > 110 ? q.q.slice(0, 110) + '…' : q.q}</span>
                  <span className="dim">{Math.round(it.ms / 1000)} s</span>
                </button>
                {open === k && (
                  <div className="rbody">
                    <QuestionCard q={q} selected={it.given} reveal />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Kpi({ label, value, hint, good, bad }: { label: string; value: string; hint?: string; good?: boolean; bad?: boolean }) {
  return (
    <div className={`kpi ${good ? 'good' : ''} ${bad ? 'bad' : ''}`}>
      <div className="kv">{value}</div>
      <div className="kl">{label}</div>
      {hint && <div className="kh">{hint}</div>}
    </div>
  );
}

export function Ring({ value, size = 120, label, sub }: { value: number; size?: number; label: string; sub?: string }) {
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ring-c">
        <div className="ring-l">{label}</div>
        {sub && <div className="ring-s">{sub}</div>}
      </div>
    </div>
  );
}

export function Bar({ label, value, right, color }: { label: string; value: number; right?: string; color?: string }) {
  return (
    <div className="barrow">
      <div className="barl">{label}</div>
      <div className="bart">
        <div className="barf" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
      </div>
      <div className="barr">{right ?? `${Math.round(value)}%`}</div>
    </div>
  );
}

export { Explanation };
