// Minimal promise wrapper around IndexedDB for records that may be large:
// session history, artwork (with image blobs), user reference photos and the
// personal reference library.
// If IndexedDB cannot be opened, an in-memory store is used and the UI shows
// a notice that nothing will survive a refresh.

export type StoreName = 'sessions' | 'artworks' | 'references' | 'library';

const DB_NAME = 'quiet-corners-studio';
const DB_VERSION = 2;
const STORES: { name: StoreName; keyPath: string }[] = [
  { name: 'sessions', keyPath: 'id' },
  { name: 'artworks', keyPath: 'id' },
  { name: 'references', keyPath: 'promptId' },
  { name: 'library', keyPath: 'id' },
];

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly kind: 'quota' | 'unavailable' | 'unknown',
  ) {
    super(message);
  }
}

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory: Record<StoreName, Map<string, unknown>> = {
  sessions: new Map(),
  artworks: new Map(),
  references: new Map(),
  library: new Map(),
};
let usingMemory = false;

export const idbIsPersistent = () => !usingMemory;

function open(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') throw new Error('no indexedDB');
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of STORES) {
          if (!db.objectStoreNames.contains(s.name)) db.createObjectStore(s.name, { keyPath: s.keyPath });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        usingMemory = true;
        resolve(null);
      };
      req.onblocked = () => {
        usingMemory = true;
        resolve(null);
      };
    } catch {
      usingMemory = true;
      resolve(null);
    }
  });
  return dbPromise;
}

/** Resolve once the database is open (or the memory fallback is in use). */
export const initIdb = () => open().then((db) => !!db);

function translate(err: unknown): StorageError {
  const name = (err as DOMException | undefined)?.name;
  if (name === 'QuotaExceededError') {
    return new StorageError(
      'Your browser has run out of space for this app. Try exporting and removing some older artwork photos.',
      'quota',
    );
  }
  return new StorageError('Something went wrong while saving to this browser’s storage.', 'unknown');
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        if (!db) throw new StorageError('Storage unavailable', 'unavailable');
        let result: T;
        let t: IDBTransaction;
        try {
          t = db.transaction(store, mode);
        } catch (e) {
          reject(translate(e));
          return;
        }
        const req = fn(t.objectStore(store));
        if (req) req.onsuccess = () => (result = req.result);
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(translate(t.error));
        t.onabort = () => reject(translate(t.error));
      }),
  );
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await open();
  if (!db) return [...memory[store].values()] as T[];
  return tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);
}

export async function idbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await open();
  if (!db) return memory[store].get(key) as T | undefined;
  return tx<T | undefined>(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>);
}

export async function idbPut<T extends object>(store: StoreName, value: T): Promise<void> {
  const db = await open();
  if (!db) {
    const keyPath = STORES.find((s) => s.name === store)!.keyPath;
    memory[store].set((value as Record<string, string>)[keyPath], value);
    return;
  }
  await tx(store, 'readwrite', (s) => {
    s.put(value);
  });
}

export async function idbDelete(store: StoreName, key: string): Promise<void> {
  const db = await open();
  if (!db) {
    memory[store].delete(key);
    return;
  }
  await tx(store, 'readwrite', (s) => {
    s.delete(key);
  });
}

export async function idbClearAll(): Promise<void> {
  const db = await open();
  for (const s of STORES) {
    memory[s.name].clear();
    if (db) {
      await tx(s.name, 'readwrite', (st) => {
        st.clear();
      });
    }
  }
}
