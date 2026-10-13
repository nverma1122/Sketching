import { useMemo, useState } from 'react';
import { PROMPTS } from '../data/prompts';
import { CATEGORIES, DIFFICULTY_LABEL, MEDIA, TIMES, categoryLabel, mediumShort, rangeLabel } from '../data/taxonomy';
import type { Category, Medium, SketchPrompt, TimeKey } from '../data/types';
import { Illustration } from '../components/Illustration';
import { Icon } from '../components/Icons';
import { EmptyState, useToast } from '../components/ui';
import { useStore } from '../lib/store';
import { fitsTime } from '../lib/selector';
import { navigate } from '../lib/router';

const PAGE = 24;
const isMedium = (v: string | null): v is Medium => !!v && MEDIA.some((m) => m.key === v);

export function Explore({ initialMedium }: { initialMedium: string | null }) {
  const store = useStore();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [medium, setMedium] = useState<Medium | ''>(isMedium(initialMedium) ? initialMedium : '');
  const [time, setTime] = useState<TimeKey | ''>('');
  const [difficulty, setDifficulty] = useState<'' | '1' | '2' | '3'>('');
  const [limit, setLimit] = useState(PAGE);

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return PROMPTS.filter((p) => {
      if (category && !p.categories.includes(category)) return false;
      if (medium && !p.media.includes(medium)) return false;
      if (time && !fitsTime(p, time, 'exact')) return false;
      if (difficulty && p.difficulty !== Number(difficulty)) return false;
      if (terms.length) {
        const hay = [p.title, p.description, ...p.tags, ...p.categories.map(categoryLabel)].join(' ').toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [q, category, medium, time, difficulty]);

  const reset = () => {
    setQ('');
    setCategory('');
    setMedium('');
    setTime('');
    setDifficulty('');
    setLimit(PAGE);
  };
  const anyFilter = q || category || medium || time || difficulty;

  const open = (p: SketchPrompt) => {
    const t: TimeKey = time && fitsTime(p, time, 'exact') ? time : p.time[0] === '5' && p.time[1] !== '5' ? '10' : p.time[0];
    const m: Medium = medium && p.media.includes(medium) ? medium : p.media[0];
    store.open(p.id, t, m);
    navigate('/idea');
  };

  const toggleSave = (p: SketchPrompt) => {
    if (store.isSaved(p.id)) {
      store.unsaveIdea(p.id);
      toast({ message: `Removed “${p.title}” from saved ideas.`, tone: 'info' });
    } else {
      const t: TimeKey = time && fitsTime(p, time, 'exact') ? time : p.time[0];
      store.saveIdea(p.id, t, medium && p.media.includes(medium) ? medium : p.media[0]);
      toast({ message: `Saved “${p.title}” for later.`, tone: 'info' });
    }
  };

  return (
    <div className="explore page">
      <header className="page-head">
        <h1>Explore ideas</h1>
        <p className="muted">
          Browse the whole collection of {PROMPTS.length} ideas — or let the{' '}
          <a href="#/find">idea finder</a> choose one for you.
        </p>
      </header>

      <div className="filters" role="search">
        <label className="search">
          <Icon name="search" size={18} />
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Search titles and keywords" aria-label="Search ideas" />
        </label>
        <div className="filter-row">
          <label className="filter">
            <span>Subject</span>
            <select value={category} onChange={(e) => { setCategory(e.target.value as Category | ''); setLimit(PAGE); }}>
              <option value="">All subjects</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.short}
                </option>
              ))}
            </select>
          </label>
          <label className="filter">
            <span>Medium</span>
            <select value={medium} onChange={(e) => { setMedium(e.target.value as Medium | ''); setLimit(PAGE); }}>
              <option value="">All media</option>
              {MEDIA.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.short}
                </option>
              ))}
            </select>
          </label>
          <label className="filter">
            <span>Duration</span>
            <select value={time} onChange={(e) => { setTime(e.target.value as TimeKey | ''); setLimit(PAGE); }}>
              <option value="">Any length</option>
              {TIMES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="filter">
            <span>Difficulty</span>
            <select value={difficulty} onChange={(e) => { setDifficulty(e.target.value as '' | '1' | '2' | '3'); setLimit(PAGE); }}>
              <option value="">Any</option>
              <option value="1">Gentle</option>
              <option value="2">Moderate</option>
              <option value="3">Involved</option>
            </select>
          </label>
        </div>
        <p className="small muted results-count" aria-live="polite">
          {results.length} {results.length === 1 ? 'idea' : 'ideas'}
          {anyFilter && (
            <>
              {' · '}
              <button className="btn-link" onClick={reset}>
                Clear filters
              </button>
            </>
          )}
        </p>
      </div>

      {results.length === 0 ? (
        <EmptyState title="Nothing matches all of those" action={<button className="btn btn-quiet" onClick={reset}>Clear filters</button>}>
          Try removing a filter or searching for a simpler word, like “door” or “tree”.
        </EmptyState>
      ) : (
        <>
          <ul className="idea-grid">
            {results.slice(0, limit).map((p) => {
              const saved = store.isSaved(p.id);
              return (
                <li key={p.id} className="idea-card">
                  <button className="idea-open" onClick={() => open(p)}>
                    <span className="idea-art">
                      <Illustration id={p.reference} decorative />
                    </span>
                    <span className="idea-title">{p.title}</span>
                    <span className="idea-meta">
                      {mediumShort(p.media[0])} · {rangeLabel(p.time)} · {DIFFICULTY_LABEL[p.difficulty]}
                    </span>
                  </button>
                  <button className={`idea-save ${saved ? 'on' : ''}`} onClick={() => toggleSave(p)} aria-pressed={saved} aria-label={saved ? `Remove ${p.title} from saved ideas` : `Save ${p.title} for later`}>
                    <Icon name={saved ? 'bookmarkFilled' : 'bookmark'} size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
          {results.length > limit && (
            <div className="more">
              <button className="btn btn-quiet" onClick={() => setLimit((l) => l + PAGE)}>
                Show more ideas
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
