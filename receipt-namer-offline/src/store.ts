import type { RecordMeta } from './core/types';

export interface StoredRecord extends RecordMeta { blob: Blob }

const DB = 'receipt-namer';
const STORE = 'records';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); res(req.result); };
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}

export const loadAll = (): Promise<StoredRecord[]> => tx('readonly', (s) => s.getAll());
export const put = (r: StoredRecord): Promise<IDBValidKey> => tx('readwrite', (s) => s.put(r));
export const remove = (id: string): Promise<undefined> => tx('readwrite', (s) => s.delete(id));
export const clearAll = (): Promise<undefined> => tx('readwrite', (s) => s.clear());
