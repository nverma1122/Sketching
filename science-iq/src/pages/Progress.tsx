import { useRef, useState } from 'react';
import type { Go } from '../App';
import { Bar, Kpi } from '../components/Results';
import { BY_ID } from '../lib/bank';
import { recommend } from '../lib/recommend';
import { BADGES, dayKey, exportJson, importJson, levelOf, resetAll, streakOf, topicStats, useStore } from '../lib/store';
import { SUBJECTS, SUBJECT_ICON } from '../lib/types';

export function Progress({ go }: { go: Go }) {
  const s = useStore((x) => x);
  const [confirmReset, setConfirmReset] = useState('');
  const [msg, setMsg] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const lv = levelOf(s.xp);
  const n = s.attempts.length;
  const correct = s.attempts.filter((a) => a.ok).length;
  const rec = recommend(s);
  const weak = topicStats(s).filter((t) => t.n >= 4 && t.acc < 60).sort((a, b) => a.acc - b.acc);

  // last 14 days accuracy
  const days = Array.from({ length: 14 }, (_, i) => dayKey(Date.now() - (13 - i) * 86_400_000));
  const perDay = days.map((d) => {
    const xs = s.attempts.filter((a) => dayKey(a.t) === d);
    return { d, n: xs.length, acc: xs.length ? Math.round((xs.filter((a) => a.ok).length / xs.length) * 100) : null };
  });
  const maxN = Math.max(1, ...perDay.map((p) => p.n));
  // improvement: first 30 answers vs last 30 answers
  const first = s.attempts.slice(0, 30);
  const last = s.attempts.slice(-30);
  const accOf = (xs: typeof first) => (xs.length ? Math.round((xs.filter((a) => a.ok).length / xs.length) * 100) : 0);
  const tests = s.tests.slice(-10).reverse();

  return (
    <div className="page">
      <header className="phead">
        <h1>📈 My Progress</h1>
        <p>Everything here is calculated from your own answers on this device.</p>
      </header>
      <div className="kpis">
        <Kpi label="Questions attempted" value={String(n)} />
        <Kpi label="Overall accuracy" value={`${n ? Math.round((correct / n) * 100) : 0}%`} />
        <Kpi label="XP" value={String(s.xp)} />
        <Kpi label="Level" value={`${lv.n}`} hint={lv.name} />
        <Kpi label="Daily streak" value={`${streakOf(s)} 🔥`} />
        <Kpi label="Survival best" value={String(s.bests.survival)} hint={`${s.bests.survivalQ} correct`} />
        <Kpi label="Speed best" value={`${s.bests.speed60} / ${s.bests.speed120}`} hint="correct in 60 s / 120 s" />
      </div>

      <div className="grid3">
        <div className="card">
          <h3>1 · Revise these</h3>
          {rec.revise.length ? rec.revise.map((r) => (
            <div key={r.key} className="recrow">
              <span>{r.label}<br /><span className="dim small">{r.detail}</span></span>
              <button className="btn sm ghost" onClick={() => go(`practice/topic/${encodeURIComponent(r.key)}`)}>Practise</button>
            </div>
          )) : <p className="dim small">No topic is below 60% yet (topics need at least 4 answers before they are judged).</p>}
        </div>
        <div className="card">
          <h3>2 · Going well</h3>
          {rec.strong.length ? rec.strong.map((r) => (
            <div key={r.key} className="recrow"><span>{r.label}<br /><span className="dim small">{r.detail}</span></span></div>
          )) : <p className="dim small">Topics with ≥ 80% over at least 4 answers will appear here.</p>}
        </div>
        <div className="card next" onClick={() => go(rec.next.path)} role="button" tabIndex={0}>
          <h3>3 · Do this next</h3>
          <b>{rec.next.label} →</b>
          <p className="small dim">{rec.next.why}</p>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Subject-wise accuracy</h3>
          {SUBJECTS.map((sub) => {
            const xs = s.attempts.filter((a) => BY_ID[a.q]?.subject === sub);
            const c = xs.filter((a) => a.ok).length;
            return <Bar key={sub} label={`${SUBJECT_ICON[sub]} ${sub}`} value={xs.length ? (c / xs.length) * 100 : 0} right={xs.length ? `${Math.round((c / xs.length) * 100)}% · ${xs.length}` : '—'} />;
          })}
        </div>
        <div className="card">
          <h3>Improvement over time</h3>
          <div className="daychart" aria-label="Answers and accuracy, last 14 days">
            {perDay.map((p) => (
              <div key={p.d} className="dcol" title={`${p.d}: ${p.n} answers${p.acc !== null ? `, ${p.acc}%` : ''}`}>
                <div className="dacc">{p.acc !== null ? `${p.acc}` : ''}</div>
                <div className="dbar" style={{ height: `${(p.n / maxN) * 100}%` }} />
                <div className="dlab">{p.d.slice(8)}</div>
              </div>
            ))}
          </div>
          <p className="small dim">Bars: answers per day (last 14 days). Numbers: accuracy %.</p>
          {n >= 40 ? (
            <p>
              First 30 answers: <b>{accOf(first)}%</b> → latest 30: <b>{accOf(last)}%</b> ({accOf(last) - accOf(first) >= 0 ? '+' : ''}{accOf(last) - accOf(first)} points)
            </p>
          ) : (
            <p className="dim small">Improvement is shown once you have answered 40 questions.</p>
          )}
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Topic-wise weaknesses</h3>
          {weak.length ? weak.map((t) => <Bar key={t.key} label={`${t.subject} · ${t.topic}`} value={t.acc} right={`${t.acc}% · ${t.n}`} color="var(--bad)" />) : <p className="dim small">None detected yet.</p>}
        </div>
        <div className="card">
          <h3>Recent tests & sessions</h3>
          {tests.length ? tests.map((t) => (
            <div key={t.id} className="testrow">
              <span>{t.title}</span>
              <span className="dim small">{new Date(t.at).toLocaleString()}</span>
              <b>{t.max ? `${t.score}/${t.max}` : `${t.score} pts`}</b>
              <span className="small">{t.correct}✓ {t.wrong}✗</span>
            </div>
          )) : <p className="dim small">No completed sessions yet.</p>}
        </div>
      </div>

      <div className="card">
        <h3>Badges ({Object.keys(s.badges).length}/{BADGES.length})</h3>
        <div className="badges">
          {BADGES.map((b) => (
            <div key={b.id} className={`bdg ${s.badges[b.id] ? 'got' : ''}`}>
              <span className="bi">{b.icon}</span>
              <span className="bn">{b.name}</span>
              <span className="bd">{b.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Your data</h3>
        <p className="small dim">Progress is stored only in this browser (LocalStorage). Export a copy to keep a backup or move to another device.</p>
        <div className="actions left">
          <button className="btn" onClick={exportJson}>⬇ Export progress (JSON)</button>
          <button className="btn ghost" onClick={() => file.current?.click()}>⬆ Import progress</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const err = importJson(await f.text());
            setMsg(err ?? 'Progress imported.');
            e.target.value = '';
          }} />
          <button className="btn danger" onClick={() => setConfirmReset('ask')}>Reset all progress</button>
        </div>
        {msg && <p className="small">{msg}</p>}
        {confirmReset && (
          <div className="warnbox">
            <p><b>This permanently deletes all XP, badges, answers, mistakes and test results on this device.</b> Type RESET to confirm.</p>
            <input value={confirmReset === 'ask' ? '' : confirmReset} onChange={(e) => setConfirmReset(e.target.value || 'ask')} placeholder="RESET" aria-label="Type RESET to confirm" />
            <div className="actions left">
              <button className="btn ghost" onClick={() => setConfirmReset('')}>Cancel</button>
              <button className="btn danger" disabled={confirmReset !== 'RESET'} onClick={() => { resetAll(); setConfirmReset(''); setMsg('All progress has been reset.'); }}>Delete everything</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
