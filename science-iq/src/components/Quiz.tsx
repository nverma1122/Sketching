import { useEffect, useRef, useState } from 'react';
import { BY_ID } from '../lib/bank';
import { recordAnswer, type Mode } from '../lib/store';
import type { Question } from '../lib/types';
import { QuestionCard } from './QuestionCard';

export interface QuizItem {
  q: string;
  given: number | null;
  ok: boolean;
  ms: number;
  hints: number;
  xp: number;
}

export interface QuizConfig {
  mode: Mode;
  title: string;
  /** Return the next question, or null to finish. Called with the answers so far. */
  next: (history: QuizItem[]) => Question | null;
  hints?: boolean;
  /** Countdown per question (timed practice): uses each question's estimated time × factor. */
  perQuestionFactor?: number;
  /** Whole-run countdown in seconds (speed challenge). */
  totalSeconds?: number;
  lives?: number;
  /** Auto-advance after a short flash instead of showing the explanation (speed mode). */
  quickFeedback?: boolean;
  /** Custom per-answer score (speed / survival). */
  score?: (q: Question, ok: boolean, history: QuizItem[]) => number;
  onFinish: (items: QuizItem[], extra: { score: number; seconds: number }) => void;
  onAnswer?: (item: QuizItem) => void;
  onQuit?: () => void;
}

export function Quiz(c: QuizConfig) {
  const [items, setItems] = useState<QuizItem[]>([]);
  const [q, setQ] = useState<Question | null>(() => c.next([]));
  const [sel, setSel] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hints, setHints] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(c.lives ?? 0);
  const started = useRef(Date.now());
  const qStart = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  const finished = useRef(false);
  const lastXp = useRef(0);

  const finish = (list: QuizItem[], sc = score) => {
    if (finished.current) return;
    finished.current = true;
    c.onFinish(list, { score: sc, seconds: Math.round((Date.now() - started.current) / 1000) });
  };

  useEffect(() => {
    if (!q && !finished.current) finish(items);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const totalLeft = c.totalSeconds ? Math.max(0, c.totalSeconds - (now - started.current) / 1000) : null;
  const qLimit = c.perQuestionFactor && q ? Math.round(q.time * c.perQuestionFactor) : null;
  const qLeft = qLimit !== null ? Math.max(0, qLimit - (now - qStart.current) / 1000) : null;

  // whole-run timer ran out
  useEffect(() => {
    if (totalLeft === 0 && !finished.current) finish(items);
  }, [totalLeft]); // eslint-disable-line react-hooks/exhaustive-deps
  // per-question timer ran out → counts as unanswered
  useEffect(() => {
    if (qLeft === 0 && !revealed && q) submit(null);
  }, [qLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!q) return <div className="card">Loading…</div>;

  function submit(given: number | null) {
    if (!q || revealed) return;
    const ms = Date.now() - qStart.current;
    const ok = given === q.answer;
    const hist = items;
    const custom = c.score ? c.score(q, ok, hist) : undefined;
    const xp = given === null ? (recordUnanswered(q, ms, c.mode), 0) : recordAnswer(q, given, ms, c.mode, hints);
    lastXp.current = xp;
    const it: QuizItem = { q: q.id, given, ok, ms, hints, xp };
    const list = [...hist, it];
    c.onAnswer?.(it);
    setItems(list);
    setRevealed(true);
    const sc = score + (custom ?? (ok ? 1 : 0));
    setScore(sc);
    let l = lives;
    if (c.lives && !ok) {
      l = lives - 1;
      setLives(l);
    }
    if (c.quickFeedback) setTimeout(() => advance(list, l, sc), 650);
  }

  function advance(list = items, l = lives, sc = score) {
    if (c.lives && l <= 0) return finish(list, sc);
    if (totalLeft === 0) return finish(list, sc);
    const n = c.next(list);
    setSel(null);
    setRevealed(false);
    setHints(0);
    qStart.current = Date.now();
    if (!n) finish(list, sc);
    else setQ(n);
  }

  const correctSoFar = items.filter((i) => i.ok).length;
  return (
    <div className="quiz">
      <div className="quizbar">
        <div className="qtitle">{c.title}</div>
        <div className="stats">
          {c.lives ? <span className="lives" aria-label={`${lives} lives`}>{'❤'.repeat(Math.max(0, lives))}<span className="dim">{'♡'.repeat(Math.max(0, (c.lives ?? 0) - lives))}</span></span> : null}
          <span className="chip">Q {items.length + (revealed ? 0 : 1)}</span>
          <span className="chip">✓ {correctSoFar}</span>
          {c.score && <span className="chip strong">Score {score}</span>}
          {totalLeft !== null && <span className={`timer ${totalLeft < 10 ? 'warn' : ''}`}>⏱ {Math.ceil(totalLeft)} s</span>}
          {qLeft !== null && !revealed && <span className={`timer ${qLeft < 10 ? 'warn' : ''}`}>⏱ {Math.ceil(qLeft)} s</span>}
          {c.onQuit && (
            <button className="btn ghost sm" onClick={() => finish(items)}>
              End
            </button>
          )}
        </div>
      </div>
      {totalLeft !== null && <div className="tbar"><div style={{ width: `${(totalLeft / c.totalSeconds!) * 100}%` }} /></div>}
      <QuestionCard q={q} selected={sel} onSelect={revealed ? undefined : (i) => (c.quickFeedback ? (setSel(i), submit(i)) : setSel(i))} reveal={revealed && !c.quickFeedback} hintsShown={hints} />
      {revealed && c.quickFeedback && <div className={`flash ${items[items.length - 1]?.ok ? 'ok' : 'bad'}`}>{items[items.length - 1]?.ok ? '✓' : '✗'}</div>}
      {!c.quickFeedback && (
        <div className="actions">
          {!revealed ? (
            <>
              {c.hints && q.hints.length > 0 && (
                <button className="btn ghost" disabled={hints >= q.hints.length} onClick={() => setHints(hints + 1)}>
                  💡 Hint {hints < q.hints.length ? `(${hints + 1}/${q.hints.length})` : '— none left'}
                </button>
              )}
              <button className="btn" disabled={sel === null} onClick={() => submit(sel)}>
                Check answer
              </button>
            </>
          ) : (
            <>
              <span className="xpgain">{lastXp.current ? `+${lastXp.current} XP` : items[items.length - 1]?.ok ? '+0 XP (too fast to be reasoned)' : ''}</span>
              <button className="btn" onClick={() => advance()} autoFocus>
                {c.lives && lives <= 0 ? 'See results' : 'Continue →'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// A timed-out question is logged as a wrong attempt (it shows in accuracy) but is not
// added to Mistake Master, since no wrong idea was expressed.
function recordUnanswered(q: Question, ms: number, mode: Mode) {
  recordAnswer(q, null, ms, mode, 0, 0);
}

export const questionsOf = (items: QuizItem[]) => items.map((i) => BY_ID[i.q]);
