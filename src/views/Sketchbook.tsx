import { useMemo, useState, type FormEvent } from 'react';
import { PROMPTS, getPrompt } from '../data/prompts';
import { CATEGORIES, MEDIA, mediumShort, timeLabel } from '../data/taxonomy';
import type { ArtworkWithImage, Medium, Outcome } from '../data/types';
import { Illustration } from '../components/Illustration';
import { Icon } from '../components/Icons';
import { ConfirmDialog, Dialog, EmptyState, useObjectUrl, useToast } from '../components/ui';
import { useStore, type NewArtwork, type SavedIdea } from '../lib/store';
import { href, navigate } from '../lib/router';

type Tab = 'saved' | 'sessions' | 'artwork';
const TABS: { key: Tab; label: string }[] = [
  { key: 'saved', label: 'Saved ideas' },
  { key: 'sessions', label: 'My sessions' },
  { key: 'artwork', label: 'My artwork' },
];

const OUTCOME_LABEL: Record<Outcome, string> = {
  completed: 'Completed',
  partial: 'Partly attempted',
  explored: 'Explored',
};

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDate = (d: number | string) => dateFmt.format(typeof d === 'string' ? new Date(`${d}T12:00:00`) : new Date(d));

export function Sketchbook({ tab }: { tab?: string }) {
  const active: Tab = TABS.some((t) => t.key === tab) ? (tab as Tab) : 'saved';
  const { saved, sessions, artworks, ready } = useStore();
  const counts: Record<Tab, number> = { saved: saved.length, sessions: sessions.length, artwork: artworks.length };

  return (
    <div className="sketchbook page">
      <header className="page-head">
        <h1>My Sketchbook</h1>
        <p className="muted">A personal record, kept on this device.</p>
      </header>
      <nav className="tabs" aria-label="Sketchbook sections">
        {TABS.map((t) => (
          <a key={t.key} href={href(`/sketchbook/${t.key}`)} aria-current={active === t.key ? 'page' : undefined} className="tab">
            {t.label} <span className="tab-count">{counts[t.key]}</span>
          </a>
        ))}
      </nav>
      {!ready ? <p className="muted">Opening your sketchbook…</p> : active === 'saved' ? <SavedTab /> : active === 'sessions' ? <SessionsTab /> : <ArtworkTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SavedTab() {
  const store = useStore();
  const toast = useToast();
  if (store.saved.length === 0) {
    return (
      <EmptyState title="No saved ideas yet" action={<a className="btn btn-primary" href={href('/find')}>Find me something to sketch</a>}>
        When an idea appeals but the moment isn’t right, press “Save for later” and it will wait here.
      </EmptyState>
    );
  }
  const remove = (idea: SavedIdea) => {
    store.unsaveIdea(idea.promptId);
    toast({ message: 'Removed from saved ideas.', tone: 'info', action: { label: 'Undo', run: () => store.restoreSaved(idea) } });
  };
  return (
    <ul className="saved-list">
      {store.saved.map((s) => {
        const p = getPrompt(s.promptId);
        if (!p) return null;
        return (
          <li key={s.promptId} className="saved-item card">
            <div className="saved-art">
              <Illustration id={p.reference} decorative />
            </div>
            <div className="saved-body">
              <h2 className="card-title">{p.title}</h2>
              <p className="meta">
                {timeLabel(s.time)} · {mediumShort(s.medium)} · saved {fmtDate(s.savedAt)}
              </p>
              <div className="saved-actions">
                <button
                  className="btn btn-small btn-primary"
                  onClick={() => {
                    store.open(s.promptId, s.time, s.medium);
                    navigate('/idea');
                  }}
                >
                  Open
                </button>
                <button
                  className="btn btn-small btn-quiet"
                  onClick={() => {
                    store.open(s.promptId, s.time, s.medium);
                    store.startSession({ promptId: s.promptId, time: s.time, medium: s.medium, simplified: 0, criteria: { time: s.time, medium: s.medium }, broadened: [], createdAt: Date.now() });
                    navigate('/session');
                  }}
                >
                  <Icon name="pencil" size={16} /> Start sketching
                </button>
                <button className="btn btn-small btn-quiet" onClick={() => remove(s)} aria-label={`Remove ${p.title} from saved ideas`}>
                  <Icon name="trash" size={16} /> Remove
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------

function SessionsTab() {
  const store = useStore();
  const toast = useToast();
  const [toDelete, setToDelete] = useState<string | null>(null);
  if (store.sessions.length === 0) {
    return (
      <EmptyState title="No sessions yet" action={<a className="btn btn-primary" href={href('/find')}>Find me something to sketch</a>}>
        Each time you finish a sketch, a simple note of it will appear here — no photo needed.
      </EmptyState>
    );
  }
  return (
    <>
      <ul className="session-list">
        {store.sessions.map((s) => (
          <li key={s.id} className="session-item card">
            <div className="session-item-head">
              <h2 className="card-title">{s.title}</h2>
              <span className={`outcome outcome-${s.outcome}`}>{OUTCOME_LABEL[s.outcome]}</span>
            </div>
            <p className="meta">
              {fmtDate(s.endedAt)} · {mediumShort(s.medium)} · planned {timeLabel(s.plannedTime).toLowerCase()}
              {s.timedSeconds > 0 && ` · timed ${Math.max(1, Math.round(s.timedSeconds / 60))} min`}
            </p>
            {s.note && <blockquote className="session-note">{s.note}</blockquote>}
            <div className="saved-actions">
              {getPrompt(s.promptId) && (
                <button
                  className="btn btn-small btn-quiet"
                  onClick={() => {
                    store.open(s.promptId, s.plannedTime, s.medium);
                    navigate('/idea');
                  }}
                >
                  View the idea
                </button>
              )}
              <button className="btn btn-small btn-quiet" onClick={() => setToDelete(s.id)} aria-label={`Delete session ${s.title}`}>
                <Icon name="trash" size={16} /> Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!toDelete}
        title="Delete this session?"
        message="The session and its note will be removed from this device. This cannot be undone."
        confirmLabel="Delete"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          const id = toDelete!;
          setToDelete(null);
          try {
            await store.deleteSession(id);
            toast({ message: 'Session deleted.', tone: 'info' });
          } catch {
            toast({ message: 'The session could not be deleted.', tone: 'error' });
          }
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------

function ArtworkTab() {
  const store = useStore();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ArtworkWithImage | null>(null);
  const opened = store.artworks.find((a) => a.id === openId) ?? null;

  return (
    <>
      <div className="artwork-toolbar">
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Icon name="upload" size={18} /> Add artwork
        </button>
      </div>
      {store.artworks.length === 0 ? (
        <EmptyState title="Your gallery is empty">Add a photo of any sketch — finished, unfinished or abandoned. It stays on this device.</EmptyState>
      ) : (
        <ul className="gallery">
          {store.artworks.map((a) => (
            <li key={a.id}>
              <GalleryItem art={a} onOpen={() => setOpenId(a.id)} />
            </li>
          ))}
        </ul>
      )}
      <ArtworkForm open={adding} onClose={() => setAdding(false)} />
      <ArtworkForm open={!!editing} existing={editing ?? undefined} onClose={() => setEditing(null)} />
      <ArtworkDetail
        art={opened}
        onClose={() => setOpenId(null)}
        onEdit={() => {
          setEditing(opened);
          setOpenId(null);
        }}
      />
    </>
  );
}

function GalleryItem({ art, onOpen }: { art: ArtworkWithImage; onOpen: () => void }) {
  const url = useObjectUrl(art.thumb ?? art.image);
  return (
    <button className="gallery-item" onClick={onOpen}>
      <span className="gallery-thumb">{url && <img src={url} alt="" loading="lazy" />}</span>
      <span className="gallery-title">{art.title}</span>
      <span className="gallery-meta">{fmtDate(art.date)}</span>
    </button>
  );
}

function ArtworkDetail({ art, onClose, onEdit }: { art: ArtworkWithImage | null; onClose: () => void; onEdit: () => void }) {
  const store = useStore();
  const toast = useToast();
  const url = useObjectUrl(art?.image);
  const [confirm, setConfirm] = useState(false);
  const prompt = art?.promptId ? getPrompt(art.promptId) : undefined;
  return (
    <>
      <Dialog open={!!art} onClose={onClose} title={art?.title ?? ''} wide className="artwork-dialog">
        {art && (
          <div className="artwork-detail">
            <div className="artwork-image">{url && <img src={url} alt={`${art.title} — your artwork`} />}</div>
            <div className="artwork-info">
              <p className="meta">
                {fmtDate(art.date)}
                {art.medium && ` · ${mediumShort(art.medium)}`}
              </p>
              {art.tags.length > 0 && (
                <ul className="chips">
                  {art.tags.map((t) => (
                    <li key={t} className="chip chip-soft">
                      {t}
                    </li>
                  ))}
                </ul>
              )}
              {art.note && <p className="session-note">{art.note}</p>}
              {prompt && (
                <p className="small">
                  Inspired by{' '}
                  <button
                    className="btn-link"
                    onClick={() => {
                      store.open(prompt.id, prompt.time[0], art.medium ?? prompt.media[0]);
                      onClose();
                      navigate('/idea');
                    }}
                  >
                    {prompt.title}
                  </button>
                </p>
              )}
              <div className="saved-actions">
                <button className="btn btn-small btn-quiet" onClick={onEdit}>
                  <Icon name="edit" size={16} /> Edit details
                </button>
                <button className="btn btn-small btn-quiet" onClick={() => setConfirm(true)}>
                  <Icon name="trash" size={16} /> Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
      <ConfirmDialog
        open={confirm}
        title="Delete this artwork?"
        message="The photo and its details will be removed from this device. This cannot be undone."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          if (!art) return;
          setConfirm(false);
          try {
            await store.deleteArtwork(art.id);
            onClose();
            toast({ message: 'Artwork deleted.', tone: 'info' });
          } catch {
            toast({ message: 'The artwork could not be deleted.', tone: 'error' });
          }
        }}
      />
    </>
  );
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function ArtworkForm({ open, onClose, existing }: { open: boolean; onClose: () => void; existing?: ArtworkWithImage }) {
  return (
    <Dialog open={open} onClose={onClose} title={existing ? 'Edit artwork' : 'Add artwork'}>
      {open && <ArtworkFormBody onClose={onClose} existing={existing} />}
    </Dialog>
  );
}

function ArtworkFormBody({ onClose, existing }: { onClose: () => void; existing?: ArtworkWithImage }) {
  const store = useStore();
  const toast = useToast();
  const [file, setFile] = useState<File | undefined>();
  const preview = useObjectUrl(file ?? existing?.image);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? todayIso());
  const [medium, setMedium] = useState<Medium | ''>(existing?.medium ?? '');
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [extraTags, setExtraTags] = useState('');
  const [note, setNote] = useState(existing?.note ?? '');
  const [promptId, setPromptId] = useState(existing?.promptId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promptOptions = useMemo(() => {
    const fromSessions = [...new Set(store.sessions.map((s) => s.promptId))];
    const fromSaved = store.saved.map((s) => s.promptId).filter((id) => !fromSessions.includes(id));
    const used = new Set([...fromSessions, ...fromSaved]);
    const rest = PROMPTS.filter((p) => !used.has(p.id)).sort((a, b) => a.title.localeCompare(b.title));
    return { fromSessions, fromSaved, rest };
  }, [store.sessions, store.saved]);

  const toggleTag = (t: string) => setTags((list) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!existing && !file) {
      setError('Please choose a photo of your sketch.');
      return;
    }
    const allTags = [...tags, ...extraTags.split(',').map((t) => t.trim()).filter(Boolean)];
    const meta: NewArtwork = {
      title: title.trim() || (promptId && getPrompt(promptId)?.title) || 'Untitled sketch',
      date: date || todayIso(),
      medium: medium || undefined,
      tags: [...new Set(allTags)],
      note: note.trim(),
      promptId: promptId || undefined,
    };
    setSaving(true);
    try {
      if (existing) await store.updateArtwork(existing.id, meta);
      else await store.addArtwork(file!, meta);
      toast({ message: existing ? 'Artwork updated.' : 'Added to your gallery.', tone: 'info' });
      onClose();
    } catch (err) {
      setError((err as Error).message || 'The artwork could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const titleFor = (id: string) => getPrompt(id)?.title ?? id;

  return (
    <form className="artwork-form" onSubmit={submit}>
      {!existing && (
        <div className="field">
          <span className="field-label">Photo</span>
          <input id="art-file" type="file" accept="image/*" className="visually-hidden" onChange={(e) => setFile(e.target.files?.[0])} />
          <label htmlFor="art-file" className={`upload-drop ${preview ? 'has-preview' : ''}`}>
            {preview ? <img src={preview} alt="Preview of the selected photo" /> : (
              <span>
                <Icon name="upload" /> Choose a photo
              </span>
            )}
          </label>
        </div>
      )}
      <label className="field">
        <span className="field-label">Title</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled sketch" maxLength={120} />
      </label>
      <div className="field-row">
        <label className="field">
          <span className="field-label">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Medium</span>
          <select value={medium} onChange={(e) => setMedium(e.target.value as Medium | '')}>
            <option value="">Not specified</option>
            {MEDIA.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="field">
        <legend className="field-label">Subject tags</legend>
        <div className="tag-picker">
          {CATEGORIES.map((c) => (
            <button type="button" key={c.key} className={`tag-toggle ${tags.includes(c.short) ? 'on' : ''}`} aria-pressed={tags.includes(c.short)} onClick={() => toggleTag(c.short)}>
              {c.short}
            </button>
          ))}
          {tags
            .filter((t) => !CATEGORIES.some((c) => c.short === t))
            .map((t) => (
              <button type="button" key={t} className="tag-toggle on" aria-pressed onClick={() => toggleTag(t)}>
                {t}
              </button>
            ))}
        </div>
        <input type="text" value={extraTags} onChange={(e) => setExtraTags(e.target.value)} placeholder="Other tags, separated by commas" aria-label="Other tags" />
      </fieldset>
      <label className="field">
        <span className="field-label">A short note</span>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Optional" />
      </label>
      <label className="field">
        <span className="field-label">Inspired by (optional)</span>
        <select value={promptId} onChange={(e) => setPromptId(e.target.value)}>
          <option value="">No particular idea</option>
          {promptOptions.fromSessions.length > 0 && (
            <optgroup label="From your sessions">
              {promptOptions.fromSessions.map((id) => (
                <option key={id} value={id}>
                  {titleFor(id)}
                </option>
              ))}
            </optgroup>
          )}
          {promptOptions.fromSaved.length > 0 && (
            <optgroup label="Saved ideas">
              {promptOptions.fromSaved.map((id) => (
                <option key={id} value={id}>
                  {titleFor(id)}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="All ideas">
            {promptOptions.rest.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn btn-quiet" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : existing ? 'Save changes' : 'Add to gallery'}
        </button>
      </div>
    </form>
  );
}
