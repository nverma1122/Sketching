import { LEVEL_NAME, SUBJECT_ICON, TYPE_NAME, type Question } from '../lib/types';

const L = 'ABCD';

interface Props {
  q: Question;
  selected: number | null;
  onSelect?: (i: number) => void;
  /** After answering: show right/wrong colouring + explanation. */
  reveal?: boolean;
  hintsShown?: number;
  number?: string;
}

export function QuestionCard({ q, selected, onSelect, reveal, hintsShown = 0, number }: Props) {
  return (
    <div className="qcard" data-qid={q.id}>
      <div className="qmeta">
        {number && <span className="chip strong">{number}</span>}
        <span className="chip">
          {SUBJECT_ICON[q.subject]} {q.subject}
        </span>
        <span className="chip">{q.topic}</span>
        <span className={`chip lvl${q.level}`}>{LEVEL_NAME[q.level]}</span>
        <span className="chip dim">{TYPE_NAME[q.type]}</span>
        <span className="chip dim">~{q.time >= 60 ? `${Math.round(q.time / 60)} min` : `${q.time} s`}</span>
      </div>
      <p className="qtext">{q.q}</p>
      {q.table && (
        <div className="tablewrap">
          <table className="data">
            <thead>
              <tr>{q.table.head.map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {q.table.rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="options" role="radiogroup">
        {q.options.map((o, i) => {
          let cls = 'opt';
          if (selected === i) cls += ' sel';
          if (reveal && i === q.answer) cls += ' right';
          if (reveal && selected === i && i !== q.answer) cls += ' wrong';
          return (
            <button key={i} className={cls} role="radio" aria-checked={selected === i} disabled={reveal || !onSelect} onClick={() => onSelect?.(i)}>
              <span className="optl">{L[i]}</span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>
      {hintsShown > 0 && !reveal && (
        <div className="hints">
          {q.hints.slice(0, hintsShown).map((h, i) => (
            <div key={i} className="hint">
              <b>Hint {i + 1}:</b> {h}
            </div>
          ))}
        </div>
      )}
      {reveal && <Explanation q={q} selected={selected} />}
    </div>
  );
}

export function Explanation({ q, selected }: { q: Question; selected: number | null }) {
  const ok = selected === q.answer;
  return (
    <div className={`explain ${ok ? 'ok' : 'bad'}`}>
      <div className="verdict">{selected === null ? '⏱ Not answered' : ok ? '✓ Correct' : '✗ Not quite'}</div>
      <p>
        <b>Answer: {L[q.answer]}.</b> {q.explanation}
      </p>
      {q.misconception && (
        <p className="miscon">
          <b>Common trap:</b> {q.misconception}
        </p>
      )}
    </div>
  );
}
