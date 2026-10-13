import { useMemo, useState } from 'react';
import { PROMPTS, getPrompt } from '../data/prompts';
import { MEDIA, TIME_ORDER, levelLabel, mediumShort, timeLabel } from '../data/taxonomy';
import type { Criteria, Medium, TimeKey } from '../data/types';
import { SceneGuide } from '../components/SceneGuide';
import { Icon } from '../components/Icons';
import { useObjectUrl, useToast } from '../components/ui';
import { useStore } from '../lib/store';
import { href, navigate } from '../lib/router';
import { todaysPrompt } from '../lib/selector';
import { hashString } from '../lib/random';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const MEDIUM_SWATCH: Record<Medium, string> = {
  ink: 'var(--ink)',
  'ink-wash': 'var(--dusty-blue)',
  watercolour: 'var(--terracotta)',
  pencil: 'var(--ink-faint)',
  hatching: 'var(--sage)',
};

export function usePreferredMedium(): Medium | undefined {
  const { prefs, sessions } = useStore();
  return useMemo(() => {
    if (prefs.lastCriteria.medium) return prefs.lastCriteria.medium;
    const counts = new Map<Medium, number>();
    sessions.forEach((s) => counts.set(s.medium, (counts.get(s.medium) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [prefs.lastCriteria.medium, sessions]);
}

export function Home() {
  const store = useStore();
  const toast = useToast();
  const preferred = usePreferredMedium();
  const [quickOpen, setQuickOpen] = useState(false);

  const level = store.prefs.level;
  const today = useMemo(() => todaysPrompt(PROMPTS, todayKey(), hashString, level), [level]);
  // Today's scene keeps its richness; the time only changes the approach.
  const todayTime: TimeKey = store.prefs.lastCriteria.time ?? '20';
  const hero = getPrompt('bk-02') ?? PROMPTS[0];

  const go = (criteria: Criteria) => {
    const s = store.find(criteria);
    if (s) navigate('/idea');
    else toast({ message: 'No ideas are available right now.', tone: 'error' });
  };

  const surprise = () => go({ time: store.prefs.lastCriteria.time ?? '10' });

  const quick = (kind: 'easy' | 'interesting' | 'surprise') => {
    if (kind === 'easy') go({ time: '10', energy: 'low', level: 'relaxed', medium: preferred });
    else if (kind === 'interesting') go({ time: '40', energy: 'focus', level: level === 'relaxed' ? 'intermediate' : 'detailed', medium: Math.random() < 0.5 ? preferred : undefined });
    else go({ time: TIME_ORDER[Math.floor(Math.random() * TIME_ORDER.length)] });
  };

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-text">
          <p className="hand hero-welcome">A little corner of the day, just for drawing.</p>
          <h1 className="hero-title">Quiet Corners Studio</h1>
          <p className="hero-sub">Find a little corner of the day to draw.</p>
          <div className="hero-actions">
            <a href={href('/find')} className="btn btn-primary btn-large">
              <Icon name="pencil" /> Find me something to sketch
            </a>
            <div className="hero-secondary">
              <button className="btn btn-quiet" onClick={surprise}>
                <Icon name="shuffle" size={18} /> Surprise me
              </button>
              <button className="btn btn-quiet" onClick={() => setQuickOpen((o) => !o)} aria-expanded={quickOpen} aria-controls="quick-chooser">
                <Icon name="feather" size={18} /> I don't know what to draw
              </button>
            </div>
            {quickOpen && (
              <div id="quick-chooser" className="quick-chooser" role="group" aria-label="Choose how adventurous">
                <button className="quick-option" onClick={() => quick('easy')}>
                  <strong>Give me something easy.</strong>
                  <span>Ten minutes, a relaxed study — still a real street scene.</span>
                </button>
                <button className="quick-option" onClick={() => quick('interesting')}>
                  <strong>Give me something interesting.</strong>
                  <span>30–45 minutes, a richer, more detailed scene.</span>
                </button>
                <button className="quick-option" onClick={() => quick('surprise')}>
                  <strong>Surprise me completely.</strong>
                  <span>Any subject, any medium, any length.</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <SceneGuide spec={hero.guide} seed={hero.id} decorative />
          <span className="hand hero-art-note">the bookshop on the corner</span>
        </div>
      </section>

      <div className="home-grid">
        <section className="card today-card" aria-labelledby="today-h">
          <p className="eyebrow" id="today-h">Today’s sketch idea</p>
          <button className="today-body" onClick={() => { store.open(today.id, todayTime, today.media[0]); navigate('/idea'); }}>
            <div className="today-art">
              <SceneGuide spec={today.guide} seed={today.id} decorative />
            </div>
            <div>
              <h2 className="card-title">{today.title}</h2>
              <p className="meta">
                {timeLabel(todayTime)} · {mediumShort(today.media[0])} · {levelLabel(today.level)}
              </p>
              <span className="link-arrow">
                Open this idea <Icon name="arrowRight" size={16} />
              </span>
            </div>
          </button>
        </section>

        <ContinueCard />

        <section className="card" aria-labelledby="styles-h">
          <p className="eyebrow" id="styles-h">Explore drawing styles</p>
          <ul className="style-list">
            {MEDIA.map((m) => (
              <li key={m.key}>
                <a href={href(`/explore?medium=${m.key}`)} className="style-item">
                  <span className="swatch" style={{ background: MEDIUM_SWATCH[m.key] }} aria-hidden="true" />
                  <span>
                    <strong>{m.label}</strong>
                    <span className="style-blurb">{m.blurb}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <SketchbookCard />
      </div>
    </div>
  );
}

function ContinueCard() {
  const { active, current, saved } = useStore();
  let body;
  if (active) {
    const p = getPrompt(active.suggestion.promptId);
    body = p && (
      <a href={href('/session')} className="continue-link">
        <span className="continue-kind">Sketch in progress</span>
        <strong>{p.title}</strong>
        <span className="link-arrow">
          Return to your sketch <Icon name="arrowRight" size={16} />
        </span>
      </a>
    );
  } else if (current) {
    const p = getPrompt(current.promptId);
    body = p && (
      <a href={href('/idea')} className="continue-link">
        <span className="continue-kind">Your last idea</span>
        <strong>{p.title}</strong>
        <span className="meta">
          {timeLabel(current.time)} · {mediumShort(current.medium)}
        </span>
        <span className="link-arrow">
          Back to it <Icon name="arrowRight" size={16} />
        </span>
      </a>
    );
  } else if (saved[0]) {
    const p = getPrompt(saved[0].promptId);
    body = p && (
      <a href={href('/sketchbook/saved')} className="continue-link">
        <span className="continue-kind">Saved for later</span>
        <strong>{p.title}</strong>
        <span className="link-arrow">
          See saved ideas <Icon name="arrowRight" size={16} />
        </span>
      </a>
    );
  }
  return (
    <section className="card" aria-labelledby="continue-h">
      <p className="eyebrow" id="continue-h">Continue where you left off</p>
      {body ?? <p className="muted">Nothing in progress yet. Your next idea will wait for you here.</p>}
    </section>
  );
}

function SketchbookCard() {
  const { saved, sessions, artworks } = useStore();
  const latest = artworks[0];
  const url = useObjectUrl(latest?.thumb ?? latest?.image);
  return (
    <section className="card sketchbook-card" aria-labelledby="book-h">
      <p className="eyebrow" id="book-h">My sketchbook</p>
      <a href={href('/sketchbook')} className="book-link">
        {url ? <img src={url} alt={`Your latest artwork: ${latest.title}`} className="book-thumb" /> : <div className="book-thumb book-thumb-empty" aria-hidden="true"><Icon name="book" size={28} /></div>}
        <ul className="book-counts">
          <li>
            <strong>{saved.length}</strong> saved {saved.length === 1 ? 'idea' : 'ideas'}
          </li>
          <li>
            <strong>{sessions.length}</strong> {sessions.length === 1 ? 'session' : 'sessions'}
          </li>
          <li>
            <strong>{artworks.length}</strong> {artworks.length === 1 ? 'artwork' : 'artworks'}
          </li>
        </ul>
      </a>
    </section>
  );
}
