// The user's own reference pictures, kept only in this browser (IndexedDB).
// They are never uploaded anywhere.

import type { Item, Level, Medium } from '../data/pictures';

export interface MineRecord {
  id: string;
  level: Level;
  medium?: Medium;
  title: string;
  blob: Blob;
  w: number;
  h: number;
  added: number;
}

const DB = 'qcs-mine';
const STORE = 'pictures';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    t.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    t.onerror = t.onabort = () => {
      db.close();
      reject(t.error ?? req.error);
    };
  });
}

export const listMine = () => tx<MineRecord[]>('readonly', (s) => s.getAll() as IDBRequest<MineRecord[]>);
export const putMine = (r: MineRecord) => tx('readwrite', (s) => s.put(r));
export const deleteMine = (id: string) => tx('readwrite', (s) => s.delete(id));

/** Shrink large images (max 1800px side) so they stay small on the device. */
export async function prepareImage(file: File): Promise<{ blob: Blob; w: number; h: number }> {
  if (!file.type.startsWith('image/')) throw new Error('That file is not a picture.');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.88));
  return blob ? { blob, w, h } : { blob: file, w, h };
}

export const toItem = (r: MineRecord, url: string): Item => ({
  id: r.id,
  kind: 'mine',
  level: r.level,
  medium: r.medium,
  title: r.title,
  src: url,
  large: url,
  w: r.w,
  h: r.h,
});
