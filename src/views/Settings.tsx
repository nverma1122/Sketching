import { useEffect, useState } from 'react';
import { ChoiceGroup, ConfirmDialog, useToast } from '../components/ui';
import { Icon } from '../components/Icons';
import { useStore, type Theme } from '../lib/store';
import { LEVELS } from '../data/taxonomy';
import type { Level } from '../data/types';
import { exportJson, exportZip } from '../lib/exportData';

const fmtBytes = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export function Settings() {
  const store = useStore();
  const toast = useToast();
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [confirmErase, setConfirmErase] = useState(false);
  const [confirmHistory, setConfirmHistory] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setEstimate({ usage: e.usage ?? 0, quota: e.quota ?? 0 })).catch(() => {});
    navigator.storage?.persisted?.().then(setPersisted).catch(() => {});
  }, [store.artworks.length, store.sessions.length]);

  const askPersist = async () => {
    try {
      const ok = await navigator.storage?.persist?.();
      setPersisted(!!ok);
      toast({
        message: ok ? 'This browser will now try harder to keep your sketchbook.' : 'The browser declined for now. Installing the app or using it regularly can help.',
        tone: 'info',
      });
    } catch {
      toast({ message: 'This browser does not support that request.', tone: 'error' });
    }
  };

  const doZip = async () => {
    setExporting(true);
    try {
      await exportZip(store);
      toast({ message: 'Your export has been downloaded.', tone: 'info' });
    } catch {
      toast({ message: 'The export could not be created. Try the data-only export instead.', tone: 'error' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="settings page-narrow">
      <header className="page-head">
        <h1>Settings & privacy</h1>
      </header>

      <section className="card settings-section">
        <h2>Your drawing</h2>
        <ChoiceGroup<Level>
          name="level"
          legend="Sketching level"
          columns={3}
          value={store.prefs.level}
          onChange={(level) => store.setPrefs({ level })}
          options={LEVELS.map((l) => ({ value: l.key, label: l.label, hint: l.hint }))}
        />
        <p className="small muted">
          Chooses which scenes you are offered and how much guidance each plan carries. It is independent of session length: a five-minute session at any
          level becomes a focused study of a rich scene.
        </p>
        <label className="toggle-row" style={{ marginTop: 'var(--s-4)' }}>
          <input type="checkbox" checked={store.prefs.onlinePhotos} onChange={(e) => store.setPrefs({ onlinePhotos: e.target.checked })} />
          <span>
            <strong>Reference photos from Wikimedia Commons</strong>
            <span className="small muted" style={{ display: 'block' }}>
              Shows real, freely licensed photos for each idea, with the photographer credited. Only the idea’s search words are sent to Wikimedia; your notes
              and your own photos never leave this device. Needs an internet connection.
            </span>
          </span>
        </label>
      </section>

      <section className="card settings-section">
        <h2>Appearance</h2>
        <ChoiceGroup<Theme>
          name="theme"
          legend="Theme"
          columns={3}
          value={store.prefs.theme}
          onChange={(theme) => store.setPrefs({ theme })}
          options={[
            { value: 'system', label: 'Match my device' },
            { value: 'light', label: 'Paper' },
            { value: 'dark', label: 'Low light' },
          ]}
        />
      </section>

      <section className="card settings-section">
        <h2>Where your sketchbook lives</h2>
        <p>
          Everything — saved ideas, sessions, notes and artwork photos — is stored only in this browser on this device. Nothing is uploaded, there is no account,
          and there are no analytics, adverts or trackers. The only outside requests are reference-photo searches to Wikimedia Commons, which you can switch
          off above.
        </p>
        <p className="muted">
          Browser storage does not sync between devices, and it can be lost if you clear your browser’s site data or if the browser frees up space. Export a copy
          now and then to keep it safe.
        </p>
        <ul className="storage-facts">
          <li>
            <Icon name={store.persistent ? 'check' : 'info'} size={16} /> {store.persistent ? 'Storage is available.' : 'Storage is unavailable — data lasts only for this visit.'}
          </li>
          {estimate && estimate.quota > 0 && (
            <li>
              <Icon name="info" size={16} /> Using about {fmtBytes(estimate.usage)} of the space this browser allows.
            </li>
          )}
          {persisted !== null && (
            <li>
              <Icon name={persisted ? 'check' : 'info'} size={16} /> {persisted ? 'Protected from automatic clean-up.' : 'Not yet protected from automatic clean-up.'}
              {!persisted && typeof navigator.storage?.persist === 'function' && (
                <button className="btn-link" onClick={askPersist}>
                  Ask the browser to keep it
                </button>
              )}
            </li>
          )}
        </ul>
      </section>

      <section className="card settings-section">
        <h2>Export your data</h2>
        <p className="muted">Download your session history, notes, saved ideas and artwork details.</p>
        <div className="settings-actions">
          <button className="btn btn-primary" onClick={doZip} disabled={exporting}>
            <Icon name="download" size={18} /> {exporting ? 'Preparing…' : 'Export everything (.zip with photos)'}
          </button>
          <button className="btn btn-quiet" onClick={() => exportJson(store)}>
            <Icon name="download" size={18} /> Data only (.json)
          </button>
        </div>
      </section>

      <section className="card settings-section">
        <h2>Start fresh</h2>
        <div className="settings-actions">
          <button className="btn btn-quiet" onClick={() => setConfirmHistory(true)}>
            Forget recently shown ideas
          </button>
          <button className="btn btn-danger" onClick={() => setConfirmErase(true)}>
            <Icon name="trash" size={18} /> Erase all my data
          </button>
        </div>
        <p className="small muted">Forgetting recent ideas only resets which suggestions you have seen; your sketchbook is untouched.</p>
      </section>

      <section className="settings-section about">
        <h2>About</h2>
        <p className="muted small">
          Quiet Corners Studio · {`v${__APP_VERSION__}`}. The composition guides are schematic drawings generated for this app from each scene’s description — they are not photographs. Reference
          photos come from Wikimedia Commons with the photographer and licence credited. Your own photos are never altered or analysed.
        </p>
      </section>

      <ConfirmDialog
        open={confirmHistory}
        title="Forget recently shown ideas?"
        message="Ideas you have seen recently may be suggested again sooner."
        confirmLabel="Forget them"
        onCancel={() => setConfirmHistory(false)}
        onConfirm={() => {
          store.clearHistory();
          setConfirmHistory(false);
          toast({ message: 'Recent history cleared.', tone: 'info' });
        }}
      />
      <ConfirmDialog
        open={confirmErase}
        title="Erase all your data?"
        message={
          <>
            <p>This permanently removes your saved ideas, sessions, notes, artwork photos, reference photos and preferences from this browser.</p>
            <p>Consider exporting first. This cannot be undone.</p>
          </>
        }
        confirmLabel="Erase everything"
        danger
        onCancel={() => setConfirmErase(false)}
        onConfirm={async () => {
          setConfirmErase(false);
          try {
            await store.eraseAll();
            toast({ message: 'All data erased.', tone: 'info' });
          } catch {
            toast({ message: 'Some data could not be erased. Try clearing this site’s data in your browser settings.', tone: 'error' });
          }
        }}
      />
    </div>
  );
}
