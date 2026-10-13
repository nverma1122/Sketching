import { useEffect, useRef, useState } from 'react';
import { getPrompt } from '../data/prompts';
import { mediumLabel, timeLabel, timeMinutes } from '../data/taxonomy';
import type { Outcome } from '../data/types';
import { ReferencePanel } from '../components/ReferencePanel';
import { Icon } from '../components/Icons';
import { ChoiceGroup, ConfirmDialog, Dialog, EmptyState, useToast } from '../components/ui';
import { useStore } from '../lib/store';
import { APPROACH_LABEL, buildSuggestion } from '../lib/plan';
import { href, navigate } from '../lib/router';

const fmt = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function SessionView() {
  const store = useStore();
  const toast = useToast();
  const { active } = store;
  const prompt = active ? getPrompt(active.suggestion.promptId) : undefined;
  const [now, setNow] = useState(Date.now());
  const [hideInstructions, setHideInstructions] = useState(false);
  const [dismissedOvertime, setDismissedOvertime] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const running = !!active?.runningSince;
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  if (!active || !prompt) {
    return (
      <div className="page-narrow session-empty">
        <EmptyState
          title="No sketch in progress"
          action={
            <a className="btn btn-primary" href={href('/find')}>
              Find me something to sketch
            </a>
          }
        >
          Choose an idea first, then press “Start sketching”.
        </EmptyState>
      </div>
    );
  }

  const built = buildSuggestion(prompt, active.suggestion, store.prefs.level);
  const plannedMs = timeMinutes(built.time) * 60_000;
  const elapsed = active.elapsedMs + (active.runningSince ? now - active.runningSince : 0);
  const started = elapsed > 0 || running;
  const overtime = elapsed >= plannedMs;

  const startTimer = () => {
    setNow(Date.now());
    store.updateActive({ runningSince: Date.now() });
  };
  const pauseTimer = () => store.updateActive({ elapsedMs: elapsed, runningSince: null });
  const resetTimer = () => {
    store.updateActive({ elapsedMs: 0, runningSince: null });
    setDismissedOvertime(false);
  };

  return (
    <div className="session">
      <header className="session-head">
        <a href={href('/idea')} className="btn btn-quiet btn-small">
          <Icon name="arrowLeft" size={16} /> Full prompt
        </a>
        <button className="btn btn-quiet btn-small" onClick={() => setHideInstructions((h) => !h)} aria-pressed={hideInstructions}>
          <Icon name={hideInstructions ? 'eye' : 'eyeOff'} size={16} /> {hideInstructions ? 'Show instructions' : 'Hide instructions'}
        </button>
      </header>

      <div className={`session-grid ${hideInstructions ? 'is-minimal' : ''}`}>
        <div className="session-info">
          <p className="eyebrow">Sketching now</p>
          <h1 className="session-title">{prompt.title}</h1>
          <p className="meta">
            {mediumLabel(built.medium)} · suggested {timeLabel(built.time).toLowerCase()}
          </p>

          <section className="timer" aria-label="Optional timer">
            <div className="timer-face">
              <span className="timer-time" aria-live="off">
                {fmt(elapsed)}
              </span>
              <span className="timer-of">of about {timeMinutes(built.time)} min</span>
            </div>
            <div className="timer-track" aria-hidden="true">
              <div className="timer-fill" style={{ width: `${Math.min(100, (elapsed / plannedMs) * 100)}%` }} />
            </div>
            <div className="timer-controls">
              {running ? (
                <button className="btn btn-quiet btn-small" onClick={pauseTimer}>
                  <Icon name="pause" size={16} /> Pause
                </button>
              ) : (
                <button className="btn btn-quiet btn-small" onClick={startTimer}>
                  <Icon name="play" size={16} /> {started ? 'Resume timer' : 'Start timer'}
                </button>
              )}
              <button className="btn btn-quiet btn-small" onClick={resetTimer} disabled={!started}>
                <Icon name="reset" size={16} /> Reset
              </button>
            </div>
            {!started && <p className="small muted">The timer is optional — sketch without it if you prefer.</p>}
            {overtime && !dismissedOvertime && (
              <div className="overtime" role="status">
                <p>Your suggested {timeMinutes(built.time)} minutes have passed. Keep drawing as long as you like.</p>
                <div className="overtime-actions">
                  <button className="btn btn-small btn-quiet" onClick={() => setDismissedOvertime(true)}>
                    Keep drawing
                  </button>
                  <button className="btn btn-small btn-primary" onClick={() => { pauseTimer(); setFinishing(true); }}>
                    I’m done
                  </button>
                </div>
              </div>
            )}
          </section>

          {!hideInstructions && (
            <section className="session-plan">
              <p className="focus-note">
                <span className="hand">{APPROACH_LABEL[built.approach]}:</span> {built.approachSummary}
              </p>
              <ol className="plan plan-compact">
                {built.plan.map((s) => (
                  <li key={s.label}>
                    <span className="plan-label">{s.label}</span>
                    <span className="plan-text">{s.text}</span>
                  </li>
                ))}
              </ol>
              <p className="constraint-inline">
                <strong>Constraint:</strong> {built.constraint}
              </p>
            </section>
          )}

          <div className="session-end">
            <button className="btn btn-primary" onClick={() => { if (running) pauseTimer(); setFinishing(true); }}>
              <Icon name="check" size={18} /> Finish this sketch
            </button>
            <button className="btn btn-link" onClick={() => setConfirmDiscard(true)}>
              Leave without recording
            </button>
          </div>
        </div>

        <div className="session-ref">
          <ReferencePanel prompt={prompt} focus={built.focusRegion} compact />
        </div>
      </div>

      <FinishDialog
        open={finishing}
        onClose={() => setFinishing(false)}
        onSave={async ({ note, outcome, photo }) => {
          try {
            const rec = await store.recordSession({
              promptId: prompt.id,
              title: prompt.title,
              medium: built.medium,
              plannedTime: built.time,
              timedSeconds: Math.round(elapsed / 1000),
              startedAt: active.startedAt,
              endedAt: Date.now(),
              outcome,
              note,
            });
            if (photo) {
              try {
                await store.addArtwork(photo, {
                  title: prompt.title,
                  date: todayIso(),
                  medium: built.medium,
                  tags: prompt.tags.slice(0, 3),
                  note,
                  promptId: prompt.id,
                });
              } catch (e) {
                toast({ message: `Session saved, but the photo could not be added: ${(e as Error).message}`, tone: 'error' });
              }
            }
            setFinishing(false);
            toast({ message: 'Recorded in your sketchbook.', tone: 'info' });
            navigate('/sketchbook/sessions');
            return rec;
          } catch (e) {
            toast({ message: (e as Error).message || 'The session could not be saved.', tone: 'error' });
          }
        }}
      />

      <ConfirmDialog
        open={confirmDiscard}
        title="Leave without recording?"
        message="This sketch won’t be added to your sessions. The idea itself stays available."
        confirmLabel="Leave"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          store.discardSession();
          setConfirmDiscard(false);
          navigate('/idea');
        }}
      />
    </div>
  );
}

function FinishDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (v: { note: string; outcome: Outcome; photo?: File }) => Promise<unknown>;
}) {
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<Outcome>('completed');
  const [photo, setPhoto] = useState<File | undefined>();
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={open} onClose={onClose} title="Finish this sketch">
      <form
        className="finish-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          await onSave({ note: note.trim(), outcome, photo });
          setSaving(false);
        }}
      >
        <label className="field">
          <span className="field-label">What would you like to remember about this sketch?</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder="Optional — a thought, a discovery, the weather…" />
        </label>

        <ChoiceGroup<Outcome>
          name="outcome"
          legend="How did it go?"
          columns={3}
          value={outcome}
          onChange={setOutcome}
          options={[
            { value: 'completed', label: 'Completed it' },
            { value: 'partial', label: 'Partly attempted' },
            { value: 'explored', label: 'Simply explored' },
          ]}
        />

        <div className="field">
          <span className="field-label">A photo of your sketch (optional)</span>
          <input ref={fileRef} id="finish-photo" type="file" accept="image/*" className="visually-hidden" onChange={(e) => setPhoto(e.target.files?.[0])} />
          <div className="file-row">
            <label htmlFor="finish-photo" className="btn btn-small btn-quiet">
              <Icon name="image" size={16} /> {photo ? 'Choose a different photo' : 'Add a photo'}
            </label>
            {photo && (
              <>
                <span className="small file-name">{photo.name}</span>
                <button type="button" className="btn btn-link btn-small" onClick={() => { setPhoto(undefined); if (fileRef.current) fileRef.current.value = ''; }}>
                  Remove
                </button>
              </>
            )}
          </div>
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Keep sketching
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save to my sketchbook'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
