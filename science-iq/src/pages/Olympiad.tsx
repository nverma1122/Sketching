import { useEffect, useState } from 'react';
import type { Go } from '../App';
import { QuestionCard } from '../components/QuestionCard';
import { Bar, fmt, Results } from '../components/Results';
import { BY_ID, filterBank } from '../lib/bank';
import { pick } from '../lib/select';
import { getState, recordAnswer, saveTest, update, useStore } from '../lib/store';
import type { Level, Subject, Track } from '../lib/types';

interface ExamDef {
  id: 'mvpp' | 'vvm' | 'olympiad';
  title: string;
  label: string;
  minutes: number;
  marks: { right: number; wrong: number };
  slices: { subject: Subject; count: number; track?: Track; levels?: Level[] }[];
  facts: string[]; // verified official facts
  practice: string[]; // what this practice version does differently
}

// Official facts were checked against the sources listed in README.md (MVPP circular of
// 08/09/2026; vvm.org.in syllabus pages). Everything else is labelled as practice design.
const EXAMS: ExamDef[] = [
  {
    id: 'mvpp',
    title: 'MVPP Challenge',
    label: 'Mukhyamantri Vigyan Pratibha Pariksha — practice simulation',
    minutes: 40,
    marks: { right: 1, wrong: 0 },
    slices: [
      { subject: 'Physics', count: 10, track: 'MVPP' },
      { subject: 'Chemistry', count: 10, track: 'MVPP' },
      { subject: 'Biology', count: 10, track: 'MVPP' },
      { subject: 'Scientific Reasoning', count: 10, track: 'MVPP' },
    ],
    facts: [
      'Official (DoE Delhi circular, 08/09/2026): two papers — Mental Ability Test (MAT) and Scholastic Aptitude Test (SAT) — each 100 questions, 100 marks, 100 minutes; no negative marking. Exam date 21/11/2026 (tentative).',
      'The SAT also covers Mathematics and Social Science (Civics, History, Economics, Geography), which this science app does not include. No official subject-wise split is published.',
    ],
    practice: ['This practice set: 40 questions in 40 minutes (the official pace of 1 minute per question), 1 mark each, no negative marking; Physics, Chemistry, Biology and reasoning, 10 each.'],
  },
  {
    id: 'vvm',
    title: 'VVM Challenge',
    label: 'Vidyarthi Vigyan Manthan — Section B style practice',
    minutes: 48,
    marks: { right: 4, wrong: -1 },
    slices: [
      { subject: 'Physics', count: 12, track: 'VVM' },
      { subject: 'Chemistry', count: 12, track: 'VVM' },
      { subject: 'Biology', count: 12, track: 'VVM' },
      { subject: 'Scientific Reasoning', count: 12, track: 'VVM' },
    ],
    facts: [
      'Official (vvm.org.in, 2026-27): Level-I has 100 MCQs in 90 minutes. Section A (30 min): 40 questions on Indian Contributions to Science and life stories (Class IX: Asima Chatterjee). Section B (60 min): 12 each of Physics, Chemistry, Mathematics, Biology and Logic & Reasoning.',
      'The VVM syllabus page gives 4 marks per question with −1 for a wrong answer in Section B; another VVM page says 1 mark each. Check the current rules on vvm.org.in.',
    ],
    practice: ['This practice set mirrors Section B without Mathematics: 48 questions in 48 minutes (Section B pace), +4 / −1, Physics, Chemistry, Biology and reasoning (12 each), from VVM 2026-27 Class IX syllabus topics. Section A is not simulated.'],
  },
  {
    id: 'olympiad',
    title: 'General Science Olympiad',
    label: 'Mixed-subject olympiad practice (not an official paper)',
    minutes: 45,
    marks: { right: 4, wrong: -1 },
    slices: [
      { subject: 'Physics', count: 5, levels: [2, 3] },
      { subject: 'Chemistry', count: 5, levels: [2, 3] },
      { subject: 'Biology', count: 5, levels: [2, 3] },
      { subject: 'Space Science', count: 5, levels: [2, 3] },
      { subject: 'Environment & Technology', count: 5, levels: [2, 3] },
      { subject: 'Scientific Reasoning', count: 5, levels: [2, 3] },
    ],
    facts: [],
    practice: ['30 Advanced and Olympiad questions across all six areas, 45 minutes, +4 / −1 to discourage guessing.'],
  },
];

interface ExamState {
  def: ExamDef['id'];
  qids: string[];
  answers: (number | null)[];
  marked: boolean[];
  timeMs: number[];
  cur: number;
  startAt: number;
  endAt: number;
}

export function Olympiad({ go, arg }: { go: Go; arg: string }) {
  const saved = useStore((s) => s.exam as ExamState | undefined);
  const [report, setReport] = useState<string | null>(null);
  if (report) return <Report id={report} go={go} />;
  if (saved && arg === 'run') return <Exam st={saved} onDone={(id) => { setReport(id); }} />;

  const start = (d: ExamDef) => {
    const used = new Set<string>();
    const qids: string[] = [];
    for (const sl of d.slices) {
      let pool = filterBank({ subjects: [sl.subject], tracks: sl.track ? [sl.track] : undefined, levels: sl.levels }).filter((q) => !used.has(q.id));
      let got = pick(pool, sl.count, getState());
      if (got.length < sl.count) {
        // not enough tagged questions: fill from the same subject (any track)
        pool = filterBank({ subjects: [sl.subject], levels: sl.levels }).filter((q) => !used.has(q.id) && !got.includes(q));
        got = [...got, ...pick(pool, sl.count - got.length, getState())];
      }
      got.forEach((q) => { used.add(q.id); qids.push(q.id); });
    }
    const now = Date.now();
    update((s) => {
      s.exam = { def: d.id, qids, answers: qids.map(() => null), marked: qids.map(() => false), timeMs: qids.map(() => 0), cur: 0, startAt: now, endAt: now + d.minutes * 60_000 } satisfies ExamState;
    });
    go('olympiad/run');
  };

  const tests = useStore((s) => s.tests.filter((t) => ['mvpp', 'vvm', 'olympiad'].includes(t.kind)).slice(-6).reverse());
  return (
    <div className="page">
      <header className="phead">
        <h1>🏆 Olympiad Challenge</h1>
        <p>Timed, exam-style tests. No hints and no explanations until you submit. Answers save automatically — if you close the page, the test resumes with the clock still running.</p>
      </header>
      {saved && (
        <div className="card warnbox">
          <b>A test is in progress.</b>
          <div className="actions left">
            <button className="btn" onClick={() => go('olympiad/run')}>Resume test</button>
          </div>
        </div>
      )}
      <div className="grid3">
        {EXAMS.map((d) => (
          <div key={d.id} className="card exam">
            <h3>{d.title}</h3>
            <div className="dim small">{d.label}</div>
            <div className="examfacts">
              <span className="chip">{d.slices.reduce((s, x) => s + x.count, 0)} questions</span>
              <span className="chip">{d.minutes} min</span>
              <span className="chip">+{d.marks.right}{d.marks.wrong ? ` / ${d.marks.wrong}` : ' · no negative'}</span>
            </div>
            {d.facts.map((f) => <p key={f} className="small fact">✔ {f}</p>)}
            {d.practice.map((f) => <p key={f} className="small">◇ {f}</p>)}
            <button className="btn" disabled={!!saved} onClick={() => start(d)}>Start {d.title}</button>
          </div>
        ))}
      </div>
      {tests.length > 0 && (
        <div className="card">
          <h3>Recent results</h3>
          {tests.map((t) => (
            <div key={t.id} className="testrow" onClick={() => setReport(t.id)} role="button">
              <span>{t.title}</span>
              <span className="dim">{new Date(t.at).toLocaleDateString()}</span>
              <b>{t.score}/{t.max}</b>
              <span>{Math.round((Math.max(0, t.score) / t.max) * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Exam({ st, onDone }: { st: ExamState; onDone: (id: string) => void }) {
  const def = EXAMS.find((e) => e.id === st.def)!;
  const [now, setNow] = useState(Date.now());
  const [confirm, setConfirm] = useState(false);
  const [enteredAt, setEnteredAt] = useState(Date.now());
  const left = Math.max(0, (st.endAt - now) / 1000);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => {
      clearInterval(t);
      window.removeEventListener('beforeunload', warn);
    };
  }, []);

  // time on the current question is banked whenever the student moves away
  const bank = (s: ExamState) => {
    const ms = Date.now() - enteredAt;
    s.timeMs[s.cur] += ms;
    setEnteredAt(Date.now());
  };
  const set = (fn: (s: ExamState) => void) => update((s) => { fn(s.exam as ExamState); });
  const goto = (i: number) => set((s) => { bank(s); s.cur = i; });

  const submit = () => {
    const s = structuredClone(getState().exam as ExamState);
    s.timeMs[s.cur] += Date.now() - enteredAt;
    let score = 0;
    const items = s.qids.map((qid, i) => {
      const q = BY_ID[qid];
      const g = s.answers[i];
      const ok = g === null ? null : g === q.answer;
      if (ok === true) score += def.marks.right;
      if (ok === false) score += def.marks.wrong;
      if (g !== null) recordAnswer(q, g, s.timeMs[i], 'exam', 0, 0);
      return { q: qid, given: g, ok, ms: s.timeMs[i] };
    });
    // exam XP: 40 for finishing + 1 XP per mark (no XP for negative totals)
    const correct = items.filter((i) => i.ok).length;
    const id = `${def.id}-${Date.now()}`;
    saveTest({ id, kind: def.id, title: def.title, at: Date.now(), score, max: s.qids.length * def.marks.right, correct, wrong: items.filter((i) => i.ok === false).length, skipped: items.filter((i) => i.ok === null).length, timeSec: Math.round((Math.min(Date.now(), s.endAt) - s.startAt) / 1000), items });
    update((x) => {
      x.xp += 40 + Math.max(0, score);
      delete x.exam;
    });
    onDone(id);
  };

  useEffect(() => {
    if (left === 0) submit();
  }, [left === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = BY_ID[st.qids[st.cur]];
  const answered = st.answers.filter((a) => a !== null).length;
  return (
    <div className="exam-run">
      <div className="quizbar sticky">
        <div className="qtitle">{def.title}</div>
        <div className="stats">
          <span className="chip">{answered}/{st.qids.length} answered</span>
          <span className={`timer big ${left < 300 ? 'warn' : ''}`}>⏱ {fmt(left)}</span>
          <button className="btn sm" onClick={() => setConfirm(true)}>Submit</button>
        </div>
      </div>
      <div className="examgrid">
        <div>
          <QuestionCard q={q} number={`Q${st.cur + 1}`} selected={st.answers[st.cur]} onSelect={(i) => set((s) => { s.answers[s.cur] = i; })} />
          <div className="actions">
            <button className="btn ghost" disabled={st.cur === 0} onClick={() => goto(st.cur - 1)}>← Previous</button>
            <button className="btn ghost" onClick={() => set((s) => { s.answers[s.cur] = null; })}>Clear answer</button>
            <button className={`btn ghost ${st.marked[st.cur] ? 'markon' : ''}`} onClick={() => set((s) => { s.marked[s.cur] = !s.marked[s.cur]; })}>
              {st.marked[st.cur] ? '★ Marked for review' : '☆ Mark for review'}
            </button>
            <button className="btn" disabled={st.cur === st.qids.length - 1} onClick={() => goto(st.cur + 1)}>Next →</button>
          </div>
        </div>
        <div className="card palette">
          <h4>Questions</h4>
          <div className="pal">
            {st.qids.map((_, i) => (
              <button key={i} className={`pb ${st.answers[i] !== null ? 'ans' : ''} ${st.marked[i] ? 'mk' : ''} ${i === st.cur ? 'cur' : ''}`} onClick={() => goto(i)} aria-label={`Question ${i + 1}`}>
                {i + 1}
              </button>
            ))}
          </div>
          <div className="legend small">
            <span><i className="pb ans" /> answered</span>
            <span><i className="pb mk" /> marked</span>
            <span><i className="pb" /> not answered</span>
          </div>
        </div>
      </div>
      {confirm && (
        <div className="modal">
          <div className="card">
            <h3>Submit the test?</h3>
            <p>
              {answered} of {st.qids.length} answered, {st.marked.filter(Boolean).length} marked for review, {fmt(left)} left.
            </p>
            <div className="actions">
              <button className="btn ghost" onClick={() => setConfirm(false)}>Keep working</button>
              <button className="btn" onClick={submit}>Submit now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Report({ id, go }: { id: string; go: Go }) {
  const t = useStore((s) => s.tests.find((x) => x.id === id));
  if (!t) return <div className="card">Result not found.</div>;
  const subj: Record<string, { n: number; c: number }> = {};
  const slow = t.items.filter((i) => i.ms > BY_ID[i.q].time * 2000);
  for (const i of t.items) {
    const s = (subj[BY_ID[i.q].subject] ||= { n: 0, c: 0 });
    s.n++;
    if (i.ok) s.c++;
  }
  const guesses = t.items.filter((i) => i.ok === false && i.ms < BY_ID[i.q].time * 200);
  return (
    <Results
      title={`${t.title} — report`}
      items={t.items}
      seconds={t.timeSec}
      scoreLine={`${t.score}/${t.max} (${Math.round((Math.max(0, t.score) / t.max) * 100)}%)`}
      extra={
        <div className="grid2">
          <div className="card">
            <h3>Subject-wise</h3>
            {Object.entries(subj).map(([k, v]) => <Bar key={k} label={k} value={(v.c / v.n) * 100} right={`${v.c}/${v.n}`} />)}
          </div>
          <div className="card">
            <h3>Test-taking analysis</h3>
            <ul className="plain">
              <li>{slow.length ? `${slow.length} question(s) took more than twice their estimated time.` : 'No question took more than twice its estimated time.'}</li>
              <li>{guesses.length ? `${guesses.length} wrong answer(s) were given in under a fifth of the estimated time — likely guesses. ${t.kind !== 'mvpp' ? 'With negative marking they cost marks.' : ''}` : 'No signs of blind guessing.'}</li>
              <li>{t.skipped ? `${t.skipped} left unanswered${t.kind === 'mvpp' ? ' — there is no negative marking in MVPP, so attempt every question.' : '.'}` : 'Every question attempted.'}</li>
              <li>Wrong answers have been added to Mistake Master.</li>
            </ul>
          </div>
        </div>
      }
      actions={
        <>
          <button className="btn" onClick={() => go('mistakes')}>Practise my mistakes</button>
          <button className="btn ghost" onClick={() => go(location.hash.includes('run') ? 'olympiad' : 'olympiad/list')}>Back to Olympiad Challenge</button>
        </>
      }
    />
  );
}
