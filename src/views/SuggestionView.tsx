import { useEffect, useRef } from 'react';
import { getPrompt } from '../data/prompts';
import { DIFFICULTY_LABEL, categoryShort, mediumLabel, timeLabel } from '../data/taxonomy';
import { pigmentColour } from '../data/pigments';
import { ReferencePanel } from '../components/ReferencePanel';
import { Icon } from '../components/Icons';
import { EmptyState, useToast } from '../components/ui';
import { useStore } from '../lib/store';
import { buildSuggestion } from '../lib/plan';
import { href, navigate } from '../lib/router';

export function SuggestionView() {
  const store = useStore();
  const toast = useToast();
  const { current } = store;
  const prompt = current ? getPrompt(current.promptId) : undefined;
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the new title whenever the idea changes (helps screen readers and keyboard users).
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [current?.promptId, current?.createdAt]);

  if (!current || !prompt) {
    return (
      <div className="page-narrow">
        <EmptyState
          title="No idea chosen yet"
          action={
            <a className="btn btn-primary" href={href('/find')}>
              Find me something to sketch
            </a>
          }
        >
          Answer a few quick questions and an idea will appear here.
        </EmptyState>
      </div>
    );
  }

  const built = buildSuggestion(prompt, current, store.prefs.level);
  const saved = store.isSaved(prompt.id);
  const sessionHere = store.active?.suggestion.promptId === prompt.id;

  const another = () => {
    const s = store.another();
    if (!s) toast({ message: 'There are no other ideas to show right now.', tone: 'error' });
  };

  const simpler = () => {
    if (!store.simplify()) toast({ message: 'This is already as simple as it gets — try just the first step.', tone: 'info' });
  };

  const toggleSave = () => {
    if (saved) {
      store.unsaveIdea(prompt.id);
      toast({ message: 'Removed from saved ideas.', tone: 'info' });
    } else {
      store.saveIdea(prompt.id, current.time, current.medium);
      toast({ message: 'Saved for later in your sketchbook.', tone: 'info' });
    }
  };

  const start = () => {
    store.startSession(current);
    navigate('/session');
  };

  return (
    <article className="suggestion">
      <div className="suggestion-grid">
        <header className="sug-head">
          <p className="eyebrow">{built.simplified ? 'A simpler version' : 'Your sketch idea'}</p>
          <h1 ref={headingRef} tabIndex={-1} className="sug-title">
            {prompt.title}
          </h1>
          <ul className="chips" aria-label="Details">
            <li className="chip chip-time">
              <Icon name="clock" size={14} /> {timeLabel(built.time)}
            </li>
            <li className="chip chip-medium">{mediumLabel(built.medium)}</li>
            <li className="chip">{DIFFICULTY_LABEL[prompt.difficulty]}</li>
            {prompt.categories.slice(0, 2).map((c) => (
              <li key={c} className="chip chip-soft">
                {categoryShort(c)}
              </li>
            ))}
          </ul>
          <p className="sug-description">{prompt.description}</p>

          {current.broadened.length > 0 && (
            <div className="notice notice-soft" role="note">
              <Icon name="info" size={18} />
              <div>
                <strong>No exact match for every choice, so I broadened:</strong>
                <ul>
                  {current.broadened.map((b) => (
                    <li key={b}>{b}.</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {built.focus && (
            <div className="focus-note">
              <span className="hand">Just this:</span> {built.focus}
            </div>
          )}
        </header>

        <div className="sug-ref">
          <ReferencePanel prompt={prompt} />
        </div>

        <div className="sug-body">
          <section className="sug-section">
            <h2>Composition</h2>
            <ul className="guide-list">
              {built.composition.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>

          <section className="sug-section">
            <h2>A gentle plan for {timeLabel(built.time).toLowerCase()}</h2>
            <ol className="plan">
              {built.plan.map((s) => (
                <li key={s.label}>
                  <span className="plan-label">{s.label}</span>
                  <span className="plan-text">{s.text}</span>
                </li>
              ))}
            </ol>
            <p className="small muted">These timings are only a guide. If a step takes longer, let it.</p>
          </section>

          <section className="sug-section">
            <h2>{mediumLabel(built.medium)}</h2>
            {built.mediumNote && <p className="medium-note">{built.mediumNote}</p>}
            <ul className="guide-list">
              {built.mediumGuidance.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
            {prompt.palette && (built.medium === 'watercolour' || built.medium === 'ink-wash') && (
              <div className="palette">
                <span className="small muted">A restrained palette:</span>
                <ul>
                  {prompt.palette.map((p) => (
                    <li key={p}>
                      <span className="pigment" style={{ background: pigmentColour(p) }} aria-hidden="true" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="constraint-card">
            <h2 className="eyebrow">One constraint</h2>
            <p>{built.constraint}</p>
          </section>

          <p className="closing hand">{built.closing}</p>
        </div>
      </div>

      <div className="action-bar" role="group" aria-label="Actions">
        <button className="btn btn-primary" onClick={start}>
          <Icon name="pencil" size={18} /> {sessionHere ? 'Continue sketching' : 'Start sketching'}
        </button>
        <button className="btn btn-quiet" onClick={another} aria-label="Give me another idea">
          <Icon name="shuffle" size={18} /> <span className="lbl-long">Give me another idea</span><span className="lbl-short">Another</span>
        </button>
        <button className="btn btn-quiet" onClick={simpler} aria-label="Make it simpler">
          <Icon name="simpler" size={18} /> <span className="lbl-long">Make it simpler</span><span className="lbl-short">Simpler</span>
        </button>
        <button className="btn btn-quiet" onClick={toggleSave} aria-pressed={saved} aria-label="Save for later">
          <Icon name={saved ? 'bookmarkFilled' : 'bookmark'} size={18} /> <span className="lbl-long">{saved ? 'Saved' : 'Save for later'}</span><span className="lbl-short">{saved ? 'Saved' : 'Save'}</span>
        </button>
        <a className="btn btn-quiet" href={href('/find')} aria-label="Back to my choices">
          <Icon name="arrowLeft" size={18} /> <span className="lbl-long">Back to my choices</span><span className="lbl-short">Choices</span>
        </a>
      </div>
    </article>
  );
}
