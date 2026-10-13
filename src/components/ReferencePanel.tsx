import { useEffect, useRef, useState } from 'react';
import type { SketchPrompt } from '../data/types';
import { useStore, type ReferencePhoto } from '../lib/store';
import { Illustration, illustrationLabel } from './Illustration';
import { Icon } from './Icons';
import { Lightbox, useObjectUrl, useToast } from './ui';

export function ReferencePanel({ prompt, compact = false }: { prompt: SketchPrompt; compact?: boolean }) {
  const store = useStore();
  const toast = useToast();
  const [photo, setPhoto] = useState<ReferencePhoto | undefined>();
  const [view, setView] = useState<'photo' | 'sketch'>('sketch');
  const [enlarged, setEnlarged] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoUrl = useObjectUrl(photo?.image);

  useEffect(() => {
    let cancelled = false;
    setPhoto(undefined);
    setView('sketch');
    store
      .getReference(prompt.id)
      .then((p) => {
        if (cancelled || !p) return;
        setPhoto(p);
        setView('photo');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [prompt.id]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const rec = await store.setReference(prompt.id, file);
      setPhoto(rec);
      setView('photo');
      toast({ message: 'Your photo is saved with this idea, on this device only.', tone: 'info' });
    } catch (e) {
      toast({ message: (e as Error).message || 'That photo could not be added.', tone: 'error' });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async () => {
    try {
      await store.removeReference(prompt.id);
      setPhoto(undefined);
      setView('sketch');
      toast({ message: 'Photo removed.', tone: 'info' });
    } catch {
      toast({ message: 'The photo could not be removed.', tone: 'error' });
    }
  };

  const showingPhoto = view === 'photo' && photoUrl;

  return (
    <section className={`reference ${compact ? 'reference-compact' : ''}`} aria-label="Reference">
      {photo && (
        <div className="ref-tabs" role="tablist" aria-label="Reference type">
          <button role="tab" aria-selected={view === 'photo'} className={view === 'photo' ? 'active' : ''} onClick={() => setView('photo')}>
            My photo
          </button>
          <button role="tab" aria-selected={view === 'sketch'} className={view === 'sketch' ? 'active' : ''} onClick={() => setView('sketch')}>
            Sketch reference
          </button>
        </div>
      )}
      <button className="ref-frame" onClick={() => setEnlarged(true)} aria-label="Enlarge reference">
        {showingPhoto ? (
          <img src={photoUrl} alt="Your reference photograph" />
        ) : (
          <Illustration id={prompt.reference} />
        )}
        <span className="ref-enlarge" aria-hidden="true">
          <Icon name="expand" size={16} />
        </span>
      </button>
      {!showingPhoto && <p className="ref-caption">An original schematic sketch to show the idea’s main shapes — not a photograph of a real place.</p>}

      {!compact && (
        <div className="ref-actions">
          <input ref={fileRef} type="file" accept="image/*" className="visually-hidden" id={`ref-file-${prompt.id}`} onChange={(e) => onFile(e.target.files?.[0])} />
          <label htmlFor={`ref-file-${prompt.id}`} className={`btn btn-small btn-quiet ${busy ? 'is-busy' : ''}`}>
            <Icon name="upload" size={16} /> {photo ? 'Replace my photo' : 'Use my own photo'}
          </label>
          {photo && (
            <button className="btn btn-small btn-quiet" onClick={remove}>
              <Icon name="trash" size={16} /> Remove photo
            </button>
          )}
        </div>
      )}

      <div className="brief">
        <h3 className="brief-title">Drawing brief</h3>
        <dl>
          <dt>Main shapes</dt>
          <dd>{prompt.brief.shapes}</dd>
          <dt>Perspective</dt>
          <dd>{prompt.brief.perspective}</dd>
          <dt>Shadows</dt>
          <dd>{prompt.brief.shadows}</dd>
          {!compact && (
            <>
              <dt>Optional details</dt>
              <dd>{prompt.brief.optional}</dd>
            </>
          )}
        </dl>
      </div>

      <Lightbox open={enlarged} onClose={() => setEnlarged(false)} title={showingPhoto ? 'Your reference photo' : prompt.title}>
        {showingPhoto ? <img src={photoUrl} alt="Your reference photograph, enlarged" /> : <Illustration id={prompt.reference} />}
        {!showingPhoto && <p className="ref-caption">{illustrationLabel(prompt.reference)}</p>}
      </Lightbox>
    </section>
  );
}
