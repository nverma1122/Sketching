import type { ReactNode } from 'react';
import { getPrompt } from '../data/prompts';
import { useStore } from '../lib/store';
import { href, type Route } from '../lib/router';
import { CornerMark, Icon, type IconName } from './Icons';

const NAV: { to: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { to: '/', label: 'Home', icon: 'home', match: (p) => p === '/' },
  { to: '/find', label: 'Find', icon: 'pencil', match: (p) => p === '/find' || p === '/idea' },
  { to: '/explore', label: 'Explore', icon: 'grid', match: (p) => p.startsWith('/explore') },
  { to: '/sketchbook', label: 'Sketchbook', icon: 'book', match: (p) => p.startsWith('/sketchbook') },
];

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const { active, persistent, ready, loadError } = useStore();
  const inSession = route.path === '/session';
  const activeTitle = active ? getPrompt(active.suggestion.promptId)?.title : undefined;

  return (
    <div className={`app ${inSession ? 'app-session' : ''}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {!inSession && (
        <header className="site-header">
          <a href={href('/')} className="brand" aria-label="Quiet Corners Studio — home">
            <CornerMark />
            <span className="brand-name">Quiet Corners Studio</span>
          </a>
          <nav className="top-nav" aria-label="Main">
            {NAV.map((n) => (
              <a key={n.to} href={href(n.to)} aria-current={n.match(route.path) ? 'page' : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
          <a href={href('/settings')} className="icon-btn header-settings" aria-label="Settings and privacy" aria-current={route.path === '/settings' ? 'page' : undefined}>
            <Icon name="settings" />
          </a>
        </header>
      )}

      {ready && (!persistent || loadError) && !inSession && (
        <div className="notice notice-warn" role="alert">
          <Icon name="info" size={18} />
          <span>
            {loadError ??
              'This browser is not allowing the app to store data (perhaps a private window). Everything works, but nothing will be kept after you close the page.'}
          </span>
        </div>
      )}

      <main id="main" className="main" tabIndex={-1}>
        {children}
      </main>

      {active && !inSession && (
        <a href={href('/session')} className="session-pill">
          <Icon name="pencil" size={16} />
          <span>
            Return to your sketch<span className="session-pill-title">{activeTitle ? ` · ${activeTitle}` : ''}</span>
          </span>
        </a>
      )}

      {!inSession && (
        <nav className="bottom-nav" aria-label="Main">
          {NAV.map((n) => (
            <a key={n.to} href={href(n.to)} aria-current={n.match(route.path) ? 'page' : undefined}>
              <Icon name={n.icon} size={22} />
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
