import { useState } from 'react';
import type { Go } from '../App';
import { Quiz, type QuizItem } from '../components/Quiz';
import { LESSONS, type Lesson } from '../data/lessons';
import { filterBank } from '../lib/bank';
import { addXp, getState, topicMastered, update, useStore } from '../lib/store';
import { SUBJECTS, SUBJECT_ICON } from '../lib/types';

export const LESSON_XP = 25;

export function Learning({ go, arg }: { go: Go; arg: string }) {
  const done = useStore((s) => s.lessonsDone);
  const lesson = LESSONS.find((l) => l.id === arg);
  if (lesson) return <LessonView l={lesson} go={go} />;
  return (
    <div className="page">
      <header className="phead">
        <h1>📘 My Learning</h1>
        <p>Short lessons that teach the idea, show it in daily life, clear up common misconceptions and work through examples. Finish each with a knowledge check, then jump straight into practice.</p>
      </header>
      <p className="dim">{done.length}/{LESSONS.length} lessons completed</p>
      {SUBJECTS.map((s) => {
        const ls = LESSONS.filter((l) => l.subject === s);
        if (!ls.length) return null;
        return (
          <div key={s}>
            <h3 className="subhead">{SUBJECT_ICON[s]} {s}</h3>
            <div className="grid-sections">
              {ls.map((l) => (
                <a key={l.id} href={`#/learn/${l.id}`} className={`card section ${done.includes(l.id) ? 'done' : ''}`}>
                  <b>{l.title}</b>
                  <span className="small dim">{l.intro.slice(0, 90)}…</span>
                  <span className="small">{done.includes(l.id) ? '✓ Completed' : 'Not started'}{topicMastered(getState(), `${l.subject}::${l.topic}`) ? ' · topic mastered' : ''}</span>
                </a>
              ))}
            </div>
          </div>
        );
      })}
      <button className="btn ghost" onClick={() => go('practice')}>Go to Practice Arena</button>
    </div>
  );
}

function LessonView({ l, go }: { l: Lesson; go: Go }) {
  const [check, setCheck] = useState<'off' | 'run' | QuizItem[]>('off');
  const done = useStore((s) => s.lessonsDone.includes(l.id));
  const key = `${l.subject}::${l.topic}`;
  // knowledge check: three Foundation/Advanced questions from this topic, least-seen first
  const pool = filterBank({ subjects: [l.subject], topics: [l.topic], levels: [1, 2] });
  const [qs] = useState(() => {
    const seen = new Set(getState().attempts.map((a) => a.q));
    return [...pool].sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)) || a.level - b.level).slice(0, 3);
  });

  if (check === 'run')
    return (
      <Quiz
        mode="lesson"
        title={`Knowledge check · ${l.title}`}
        hints
        next={(h) => qs[h.length] ?? null}
        onFinish={(items) => {
          if (!getState().lessonsDone.includes(l.id) && items.length === qs.length) {
            update((s) => { s.lessonsDone.push(l.id); });
            addXp(LESSON_XP);
          }
          setCheck(items);
        }}
      />
    );

  return (
    <div className="page lesson">
      <a href="#/learn" className="dim small">← All lessons</a>
      <header className="phead">
        <div className="dim small">{SUBJECT_ICON[l.subject]} {l.subject} · {l.topic}</div>
        <h1>{l.title}</h1>
        <p>{l.intro}</p>
      </header>
      {Array.isArray(check) && (
        <div className="card goodbox">
          <b>Knowledge check: {check.filter((i) => i.ok).length}/{check.length} correct.</b> {check.every((i) => i.ok) ? 'Excellent — try harder questions on this topic.' : 'Review the misconceptions above, then practise.'}
          {done && <span> Lesson completed (+{LESSON_XP} XP awarded once).</span>}
        </div>
      )}
      <section className="card">
        <h3>The principle</h3>
        <p>{l.principle}</p>
      </section>
      <div className="grid2">
        <section className="card">
          <h3>Key definitions</h3>
          <dl className="defs">
            {l.definitions.map(([t, d]) => (
              <div key={t}><dt>{t}</dt><dd>{d}</dd></div>
            ))}
          </dl>
        </section>
        {l.formulas.length > 0 && (
          <section className="card">
            <h3>Formulas</h3>
            {l.formulas.map(([f, m]) => (
              <div key={f} className="formula"><code>{f}</code>{m && <span className="dim small"> — {m}</span>}</div>
            ))}
          </section>
        )}
      </div>
      <section className="card">
        <h3>In everyday life</h3>
        <ul className="plain">{l.examples.map((e) => <li key={e}>{e}</li>)}</ul>
      </section>
      <section className="card warnbox">
        <h3>Common misconceptions</h3>
        <ul className="plain">{l.misconceptions.map((e) => <li key={e}>{e}</li>)}</ul>
      </section>
      <section className="card">
        <h3>Worked examples</h3>
        {l.worked.map((w, i) => <Worked key={i} n={i + 1} w={w} />)}
      </section>
      <div className="actions">
        {qs.length > 0 && <button className="btn" onClick={() => setCheck('run')}>{Array.isArray(check) ? 'Retake knowledge check' : `Knowledge check (${qs.length} questions)`}</button>}
        <button className="btn ghost" onClick={() => go(`practice/topic/${encodeURIComponent(key)}`)}>Practise this topic →</button>
      </div>
    </div>
  );
}

function Worked({ n, w }: { n: number; w: Lesson['worked'][number] }) {
  const [shown, setShown] = useState(0);
  return (
    <div className="worked">
      <p><b>Example {n}.</b> {w.q}</p>
      <ol>{w.steps.slice(0, shown).map((s) => <li key={s}>{s}</li>)}</ol>
      {shown < w.steps.length ? (
        <button className="btn sm ghost" onClick={() => setShown(shown + 1)}>{shown ? 'Next step' : 'Show solution step by step'}</button>
      ) : (
        <span className="small goodtxt">✓ Solved</span>
      )}
    </div>
  );
}
