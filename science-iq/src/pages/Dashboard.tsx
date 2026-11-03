import type { Go } from '../App';
import { Ring } from '../components/Results';
import { BANK } from '../lib/bank';
import { recommend } from '../lib/recommend';
import { BADGES, dayKey, levelOf, streakOf, useStore } from '../lib/store';

const SECTIONS = [
  { path: 'learn', icon: '📘', title: 'My Learning', desc: 'Concise lessons with worked examples and a knowledge check.' },
  { path: 'practice', icon: '🎯', title: 'Practice Arena', desc: 'Choose subject, topic and level. Survival and Speed modes.' },
  { path: 'olympiad', icon: '🏆', title: 'Olympiad Challenge', desc: 'Timed MVPP, VVM and Olympiad-style tests with reports.' },
  { path: 'iq', icon: '🧠', title: 'Science IQ', desc: 'Unfamiliar problems that test understanding, not memory.' },
  { path: 'mistakes', icon: '🔁', title: 'Mistake Master', desc: 'Every wrong answer, explained — until you have mastered it.' },
  { path: 'daily', icon: '📅', title: 'Daily Mission', desc: 'Ten fresh questions across all subjects, every day.' },
  { path: 'progress', icon: '📈', title: 'My Progress', desc: 'Accuracy, weak topics, test history and recommendations.' },
];

export function Dashboard({ go }: { go: Go }) {
  const s = useStore((x) => x);
  const lv = levelOf(s.xp);
  const streak = streakOf(s);
  const answered = s.attempts.length;
  const acc = answered ? Math.round((s.attempts.filter((a) => a.ok).length / answered) * 100) : 0;
  const today = s.daily[dayKey()];
  const rec = recommend(s);
  const active = Object.values(s.mistakes).filter((m) => !m.cleared).length;
  return (
    <div className="page">
      <header className="hero card">
        <Ring value={lv.progress} size={132} label={`Lv ${lv.n}`} sub={lv.name} />
        <div className="herotext">
          <div className="dim small">SCIENCE IQ · Think Beyond the Textbook</div>
          <h1>{answered ? 'Welcome back, scientist.' : 'Welcome, scientist.'}</h1>
          <p>
            <b>{s.xp} XP</b>
            {lv.next !== undefined && <span className="dim"> · {lv.next - s.xp} XP to {lv.nextName}</span>}
          </p>
          <div className="herostats">
            <span>🔥 {streak}-day streak</span>
            <span>✓ {acc}% accuracy</span>
            <span>📝 {answered} answered</span>
            <span>❤ Survival best {s.bests.survival}</span>
          </div>
        </div>
      </header>
      <div className="grid2">
        <div className="card next" onClick={() => go(rec.next.path)} role="button" tabIndex={0}>
          <div className="dim small">RECOMMENDED NEXT</div>
          <h3>{rec.next.label} →</h3>
          <p className="small">{rec.next.why}</p>
        </div>
        <div className="card next" onClick={() => go('daily')} role="button" tabIndex={0}>
          <div className="dim small">DAILY MISSION · {dayKey()}</div>
          <h3>{today?.done ? `Done ✓ — ${today.correct}/10` : today ? `${today.answers.length}/10 answered — continue →` : 'Ready — 10 questions →'}</h3>
          <div className="xpbar"><div style={{ width: `${((today?.answers.length ?? 0) / 10) * 100}%` }} /></div>
        </div>
      </div>
      <div className="grid-sections">
        {SECTIONS.map((x) => (
          <a key={x.path} className="card section" href={`#/${x.path}`}>
            <span className="sicon">{x.icon}</span>
            <b>{x.title}</b>
            <span className="small dim">{x.desc}</span>
            {x.path === 'mistakes' && active > 0 && <span className="badge-count">{active}</span>}
          </a>
        ))}
      </div>
      <div className="card">
        <h3>Achievements</h3>
        <div className="badges">
          {BADGES.map((b) => (
            <div key={b.id} className={`bdg ${s.badges[b.id] ? 'got' : ''}`} title={b.desc}>
              <span className="bi">{b.icon}</span>
              <span className="bn">{b.name}</span>
              <span className="bd">{s.badges[b.id] ? `Earned ${new Date(s.badges[b.id]).toLocaleDateString()}` : b.desc}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="dim small center">{BANK.length} verified questions · works offline · progress saved on this device only</p>
    </div>
  );
}
