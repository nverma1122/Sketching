import { useEffect, useMemo, useRef, useState } from 'react';
import type { SketchPrompt } from '../data/types';
import { useStore, type ReferencePhoto } from '../lib/store';
import { findPhotos, getPhotoIndex, setPhotoIndex, type CommonsPhoto } from '../lib/commons';
import { illustratedFor, illustratedLabel, illustratedSrc } from '../data/illustrated';
import { libraryFor, type LibraryItem } from '../lib/library';
import { href } from '../lib/router';
import { SceneGuide } from './SceneGuide';
import { regionLabel } from '../data/regions';
import { Icon } from './Icons';
import { Lightbox, useObjectUrl, useToast } from './ui';

type View = 'mine' | 'illus' | 'library' | 'photo' | 'guide';
type PhotoState = { status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'offline'; photos: CommonsPhoto[] };

/**
 * Reference for a scene, in order of preference: the user's own photo,
 * illustrated references bundled with the app (their sketches and their
 * collection), images from their personal reference library, freely licensed
 * photos from Wikimedia Commons, and a schematic composition guide. When
 * `focus` is set (a focused study), the guide frames that part of the scene.
 */
export function ReferencePanel({ prompt, focus, compact = false }: { prompt: SketchPrompt; focus?: string; compact?: boolean }) {
  const store = useStore();
  const toast = useToast();
  const online = store.prefs.onlinePhotos;
  const illus = useMemo(() => illustratedFor(prompt.id), [prompt.id]);
  const lib = useMemo(() => libraryFor(store.library, prompt), [store.library, prompt]);
  const [mine, setMine] = useState<ReferencePhoto | undefined>();
  const preferred: View = illus.length ? 'illus' : lib.length ? 'library' : focus || !online ? 'guide' : 'photo';
  const [view, setView] = useState<View>(preferred);
  const focusLabel = focus ? regionLabel(prompt.guide.t, focus) : undefined;
  const [photoState, setPhotoState] = useState<PhotoState>({ status: 'idle', photos: [] });
  const [index, setIndex] = useState(0);
  const [illusIdx, setIllusIdx] = useState(0);
  const [libIdx, setLibIdx] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const mineUrl = useObjectUrl(mine?.image);
  const libItem: LibraryItem | undefined = lib[Math.min(libIdx, lib.length - 1)];
  const libUrl = useObjectUrl(libItem?.image);
  const ill = illus[Math.min(illusIdx, illus.length - 1)];

  // The user's own photo for this scene.
  useEffect(() => {
    let cancelled = false;
    setMine(undefined);
    setIllusIdx(0);
    setLibIdx(0);
    setView(preferred);
    store
      .getReference(prompt.id)
      .then((p) => {
        if (cancelled) return;
        setMine(p);
        if (p) setView('mine');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [prompt.id, focus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Photos from Wikimedia Commons.
  useEffect(() => {
    if (!online) {
      setPhotoState({ status: 'idle', photos: [] });
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setPhotoState({ status: 'offline', photos: [] });
      return;
    }
    const ctrl = new AbortController();
    setPhotoState({ status: 'loading', photos: [] });
    findPhotos(prompt, ctrl.signal)
      .then((photos) => {
        setPhotoState({ status: photos.length ? 'ready' : 'empty', photos });
        setIndex(Math.min(getPhotoIndex(prompt.id), Math.max(0, photos.length - 1)));
      })
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') setPhotoState({ status: 'error', photos: [] });
      });
    return () => ctrl.abort();
  }, [prompt, online]);

  const photo = photoState.photos[index];

  const nextPhoto = () => {
    if (!photoState.photos.length) return;
    const i = (index + 1) % photoState.photos.length;
    setIndex(i);
    setPhotoIndex(prompt.id, i);
  };

  const skipBroken = () => {
    // A photo failed to load: drop it and show the next one.
    setPhotoState((s) => {
      const photos = s.photos.filter((_, i) => i !== index);
      return { status: photos.length ? 'ready' : 'empty', photos };
    });
    setIndex((i) => Math.max(0, Math.min(i, photoState.photos.length - 2)));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const rec = await store.setReference(prompt.id, file);
      setMine(rec);
      setView('mine');
      toast({ message: 'Your photo is saved with this idea, on this device only.', tone: 'info' });
    } catch (e) {
      toast({ message: (e as Error).message || 'That photo could not be added.', tone: 'error' });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeMine = async () => {
    try {
      await store.removeReference(prompt.id);
      setMine(undefined);
      setView(preferred);
      toast({ message: 'Photo removed.', tone: 'info' });
    } catch {
      toast({ message: 'The photo could not be removed.', tone: 'error' });
    }
  };

  const tabs: { key: View; label: string }[] = [
    ...(mine ? [{ key: 'mine' as const, label: 'My photo' }] : []),
    ...(illus.length ? [{ key: 'illus' as const, label: 'Illustrations' }] : []),
    ...(lib.length ? [{ key: 'library' as const, label: 'My library' }] : []),
    ...(online ? [{ key: 'photo' as const, label: 'Photos' }] : []),
    { key: 'guide', label: 'Composition guide' },
  ];
  const current: View = tabs.some((t) => t.key === view) ? view : tabs[0].key;

  let frame;
  if (current === 'mine' && mineUrl) {
    frame = <img src={mineUrl} alt="Your reference photograph" />;
  } else if (current === 'illus' && ill) {
    frame = <img key={ill.id} src={illustratedSrc(ill)} alt={`${illustratedLabel(ill.kind)}: ${ill.title}`} />;
  } else if (current === 'library' && libItem) {
    frame = libUrl ? <img key={libItem.id} src={libUrl} alt={`From your reference library: ${libItem.title}`} /> : <div className="photo-placeholder" />;
  } else if (current === 'photo') {
    if (photoState.status === 'ready' && photo) {
      frame = <img key={photo.id} src={photo.src} alt={`Reference photo: ${photo.title}`} onError={skipBroken} referrerPolicy="no-referrer" />;
    } else {
      const msg =
        photoState.status === 'loading' || photoState.status === 'idle'
          ? 'Finding reference photos…'
          : photoState.status === 'offline'
            ? 'You’re offline — reference photos need a connection. The composition guide and your own photos still work.'
            : photoState.status === 'empty'
              ? 'No matching photo was found on Wikimedia Commons for this scene. Use the composition guide (schematic), or add your own photo.'
              : 'Photos couldn’t be loaded right now. The composition guide and your own photos still work.';
      frame = (
        <div className={`photo-placeholder ${photoState.status === 'loading' ? 'is-loading' : ''}`} role="status">
          <span>{msg}</span>
        </div>
      );
    }
  } else {
    frame = <SceneGuide spec={prompt.guide} seed={prompt.id} focus={focus} title={prompt.title} />;
  }

  const canEnlarge = current !== 'photo' || (photoState.status === 'ready' && !!photo);

  const cycler = (i: number, n: number, set: (i: number) => void, label: string) =>
    n > 1 && (
      <button className="btn btn-small btn-quiet" onClick={() => set((i + 1) % n)}>
        <Icon name="shuffle" size={16} /> {label} <span className="muted small">({(i % n) + 1}/{n})</span>
      </button>
    );

  return (
    <section className={`reference ${compact ? 'reference-compact' : ''}`} aria-label="Reference">
      {tabs.length > 1 && (
        <div className="ref-tabs" role="tablist" aria-label="Reference type">
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={current === t.key} className={current === t.key ? 'active' : ''} onClick={() => setView(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {canEnlarge ? (
        <button className="ref-frame" onClick={() => setEnlarged(true)} aria-label="Enlarge reference">
          {frame}
          <span className="ref-enlarge" aria-hidden="true">
            <Icon name="expand" size={16} />
          </span>
        </button>
      ) : (
        <div className="ref-frame">{frame}</div>
      )}

      {current === 'illus' && ill && (
        <div className="photo-meta">
          <p className="ref-caption credit">
            <strong>{illustratedLabel(ill.kind)}</strong> · {ill.title}
          </p>
          {cycler(illusIdx, illus.length, setIllusIdx, 'Another illustration')}
        </div>
      )}
      {current === 'library' && libItem && (
        <div className="photo-meta">
          <p className="ref-caption credit">
            <strong>From your reference library</strong> · {libItem.title}
          </p>
          {cycler(libIdx, lib.length, setLibIdx, 'Another image')}
        </div>
      )}
      {current === 'photo' && photo && photoState.status === 'ready' && (
        <div className="photo-meta">
          <p className="ref-caption credit">
            Photo: {photo.artist} ·{' '}
            {photo.licenseUrl ? (
              <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">
                {photo.license}
              </a>
            ) : (
              photo.license
            )}{' '}
            ·{' '}
            <a href={photo.page} target="_blank" rel="noopener noreferrer">
              Wikimedia Commons
            </a>
          </p>
          {photoState.photos.length > 1 && (
            <button className="btn btn-small btn-quiet" onClick={nextPhoto}>
              <Icon name="shuffle" size={16} /> Another photo <span className="muted small">({index + 1}/{photoState.photos.length})</span>
            </button>
          )}
        </div>
      )}
      {current === 'guide' && (
        <p className="ref-caption">
          <strong>Composition guide (schematic).</strong> Drawn from the scene description to show structure and how the elements relate — it is not a photograph of a real place.
          {focusLabel && <> The dashed frame marks your study: {focusLabel}.</>}
        </p>
      )}
      {current !== 'guide' && focusLabel && (
        <p className="ref-caption focus-note">
          This is the full scene — your study is only <strong>{focusLabel}</strong>. The composition guide tab shows where it sits.
        </p>
      )}

      {!compact && (
        <div className="ref-actions">
          <input ref={fileRef} type="file" accept="image/*" className="visually-hidden" id={`ref-file-${prompt.id}`} onChange={(e) => onFile(e.target.files?.[0])} />
          <label htmlFor={`ref-file-${prompt.id}`} className={`btn btn-small btn-quiet ${busy ? 'is-busy' : ''}`}>
            <Icon name="upload" size={16} /> {mine ? 'Replace my photo' : 'Use my own photo'}
          </label>
          {mine && (
            <button className="btn btn-small btn-quiet" onClick={removeMine}>
              <Icon name="trash" size={16} /> Remove photo
            </button>
          )}
        </div>
      )}

      {!compact && <LibraryPicker prompt={prompt} />}

      <Lightbox
        open={enlarged}
        onClose={() => setEnlarged(false)}
        title={
          current === 'mine'
            ? 'Your reference photo'
            : current === 'illus' && ill
              ? ill.title
              : current === 'library' && libItem
                ? libItem.title
                : current === 'photo' && photo
                  ? photo.title
                  : prompt.title
        }
      >
        {current === 'mine' && mineUrl ? (
          <img src={mineUrl} alt="Your reference photograph, enlarged" />
        ) : current === 'illus' && ill ? (
          <>
            <img src={illustratedSrc(ill)} alt={`${illustratedLabel(ill.kind)}: ${ill.title}, enlarged`} />
            <p className="ref-caption">{illustratedLabel(ill.kind)}</p>
          </>
        ) : current === 'library' && libUrl ? (
          <img src={libUrl} alt={`From your reference library: ${libItem?.title}, enlarged`} />
        ) : current === 'photo' && photo ? (
          <>
            <img src={photo.large} alt={`Reference photo: ${photo.title}, enlarged`} referrerPolicy="no-referrer" />
            <p className="ref-caption">
              Photo: {photo.artist} · {photo.license} ·{' '}
              <a href={photo.page} target="_blank" rel="noopener noreferrer">
                Wikimedia Commons
              </a>
            </p>
          </>
        ) : (
          <>
            <SceneGuide spec={prompt.guide} seed={prompt.id} focus={focus} title={prompt.title} />
            <p className="ref-caption">Composition guide (schematic){focusLabel ? ` — focus: ${focusLabel}` : ''}</p>
          </>
        )}
      </Lightbox>
    </section>
  );
}

/** Link images from the personal reference library to this scene. */
function LibraryPicker({ prompt }: { prompt: SketchPrompt }) {
  const store = useStore();
  if (store.library.length === 0) {
    return (
      <p className="small muted ref-library-hint">
        Keep your own inspiration images in <a href={href('/sketchbook/references')}>My reference library</a> — they’ll appear here for matching scenes.
      </p>
    );
  }
  const linked = store.library.filter((l) => l.promptIds.includes(prompt.id)).length;
  return (
    <details className="ref-library">
      <summary>
        Link images from my library{linked ? ` (${linked} linked)` : ''}
      </summary>
      <ul className="lib-pick">
        {store.library.map((l) => (
          <li key={l.id}>
            <LibThumbToggle item={l} on={l.promptIds.includes(prompt.id)} onToggle={() => store.toggleLibraryLink(l.id, prompt.id)} />
          </li>
        ))}
      </ul>
      <a className="small" href={href('/sketchbook/references')}>
        Manage my reference library
      </a>
    </details>
  );
}

function LibThumbToggle({ item, on, onToggle }: { item: LibraryItem; on: boolean; onToggle: () => void }) {
  const url = useObjectUrl(item.thumb ?? item.image);
  return (
    <button className={`lib-thumb ${on ? 'on' : ''}`} onClick={onToggle} aria-pressed={on} aria-label={`${on ? 'Unlink' : 'Link'} ${item.title}`}>
      {url && <img src={url} alt="" />}
      <span>{item.title}</span>
    </button>
  );
}
