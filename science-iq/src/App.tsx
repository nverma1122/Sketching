import { useEffect, useState } from 'react';
import { badgeListeners, BADGES, levelOf, useStore } from './lib/store';
import { Dashboard } from './pages/Dashboard';
import { Learning } from './pages/Learning';
import { Practice } from './pages/Practice';
import { Olympiad } from './pages/Olympiad';
import { ScienceIQ } from './pages/ScienceIQ';
import { Mistakes } from './pages/Mistakes';
import { Daily } from './pages/Daily';
import { Progress } from './pages/Progress';

export const NAV = [
  { path: 'home', label: 'Dashboard', icon: '◎' },
  { path: 'learn', label: 'My Learning', icon: '📘' },
  { path: 'practice', label: 'Practice Arena', icon: '🎯' },
  { path: 'olympiad', label: 'Olympiad Challenge', icon: '🏆' },
  { path: 'iq', label: 'Science IQ', icon: '🧠' },
  { path: 'mistakes', label: 'Mistake Master', icon: '🔁' },
  { path: 'daily', label: 'Daily Mission', icon: '📅' },
  { path: 'progress', label: 'My Progress', icon: '📈' },
];

export type Go = (path: string) => void;

const readHash = () => location.hash.replace(/^#\/?/, '') || 'home';

export default function App() {
  const [route, setRoute] = useState(readHash);
  const xp = useStore((s) => s.xp);
  const [toast, setToast] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const f = () => {
      setRoute(readHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', f);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const b = (id: string) => {
      setToast(id);
      setTimeout(() => setToast(null), 4000);
    };
    badgeListeners.add(b);
    return () => {
      window.removeEventListener('hashchange', f);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      badgeListeners.delete(b);
    };
  }, []);

  const go: Go = (p) => {
    location.hash = '/' + p;
  };
  const [base, ...rest] = route.split('/');
  const arg = rest.join('/');
  const lv = levelOf(xp);
  const badge = toast ? BADGES.find((b) => b.id === toast) : null;

  return (
    <div className="shell">
      <aside className="nav">
        <a className="brand" href="#/home">
          <span className="logo">⚛</span>
          <span>
            <b>SCIENCE IQ</b>
            <small>Think Beyond the Textbook</small>
          </span>
        </a>
        <nav>
          {NAV.map((n) => (
            <a key={n.path} href={`#/${n.path}`} className={base === n.path ? 'active' : ''}>
              <span className="ni">{n.icon}</span>
              <span className="nl">{n.label}</span>
            </a>
          ))}
        </nav>
        <div className="navfoot">
          <div className="lvmini">
            Lv {lv.n} · {lv.name}
          </div>
          <div className="xpbar">
            <div style={{ width: `${lv.progress * 100}%` }} />
          </div>
          <div className="dim small">
            {xp} XP {!online && '· offline'}
          </div>
        </div>
      </aside>
      <main className="main" key={route}>
        {base === 'home' && <Dashboard go={go} />}
        {base === 'learn' && <Learning go={go} arg={arg} />}
        {base === 'practice' && <Practice go={go} arg={arg} />}
        {base === 'olympiad' && <Olympiad go={go} arg={arg} />}
        {base === 'iq' && <ScienceIQ go={go} />}
        {base === 'mistakes' && <Mistakes go={go} />}
        {base === 'daily' && <Daily go={go} />}
        {base === 'progress' && <Progress go={go} />}
        {!NAV.some((n) => n.path === base) && <Dashboard go={go} />}
      </main>
      {badge && (
        <div className="toast" role="status">
          <span className="ticon">{badge.icon}</span>
          <div>
            <b>Badge unlocked: {badge.name}</b>
            <div className="small">{badge.desc}</div>
          </div>
        </div>
      )}
    </div>
  );
}
