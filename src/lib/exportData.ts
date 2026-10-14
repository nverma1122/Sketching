import { getPrompt } from '../data/prompts';
import type { Store } from './store';
import { idbGetAll } from './storage/idb';
import type { ReferencePhoto } from './store';
import { createZip, type ZipEntry } from './zip';
import { extensionFor } from './images';

function buildJson(store: Store, files: Record<string, string>) {
  return {
    app: 'Quiet Corners Studio',
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    preferences: store.prefs,
    savedIdeas: store.saved.map((s) => ({ ...s, title: getPrompt(s.promptId)?.title })),
    recentlyViewed: store.recent,
    sessions: store.sessions.map((s) => ({ ...s, startedAt: new Date(s.startedAt).toISOString(), endedAt: new Date(s.endedAt).toISOString() })),
    artwork: store.artworks.map(({ image: _image, thumb: _thumb, ...meta }) => ({
      ...meta,
      promptTitle: meta.promptId ? getPrompt(meta.promptId)?.title : undefined,
      file: files[meta.id],
    })),
    referenceLibrary: store.library.map(({ image: _image, thumb: _thumb, ...meta }) => ({
      ...meta,
      addedAt: new Date(meta.addedAt).toISOString(),
      scenes: meta.promptIds.map((id) => getPrompt(id)?.title ?? id),
      file: files[meta.id],
    })),
  };
}

const safe = (s: string) => s.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'sketch';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

/** JSON only: preferences, saved ideas, sessions, notes and artwork metadata. */
export function exportJson(store: Store) {
  const json = buildJson(store, {});
  downloadBlob(new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }), `quiet-corners-${stamp()}.json`);
}

/** A ZIP with data.json plus every artwork file, reference photo and library image. */
export async function exportZip(store: Store) {
  const enc = new TextEncoder();
  const entries: ZipEntry[] = [];
  const files: Record<string, string> = {};
  for (const a of store.artworks) {
    const name = `artwork/${a.date}-${safe(a.title)}-${a.id.slice(0, 6)}.${extensionFor(a.mimeType, a.fileName)}`;
    files[a.id] = name;
    entries.push({ name, data: new Uint8Array(await a.image.arrayBuffer()) });
  }
  const refs = await idbGetAll<ReferencePhoto>('references');
  for (const r of refs) {
    const name = `references/${r.promptId}-${safe(r.name)}.${extensionFor(r.image.type, r.name)}`;
    entries.push({ name, data: new Uint8Array(await r.image.arrayBuffer()) });
  }
  for (const l of store.library) {
    const name = `library/${safe(l.title)}-${l.id.slice(0, 6)}.${extensionFor(l.image.type, l.fileName)}`;
    files[l.id] = name;
    entries.push({ name, data: new Uint8Array(await l.image.arrayBuffer()) });
  }
  const json = buildJson(store, files);
  entries.unshift({ name: 'data.json', data: enc.encode(JSON.stringify(json, null, 2)) });
  downloadBlob(createZip(entries), `quiet-corners-${stamp()}.zip`);
}
