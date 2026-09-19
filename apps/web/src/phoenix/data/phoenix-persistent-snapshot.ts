import type { PhoenixReadModel } from '../contracts';

const DB_NAME = 'meg-phoenix-runtime';
const DB_VERSION = 1;
const STORE_NAME = 'monthly-snapshots';
const MAX_AGE_MS = 36 * 60 * 60_000;

type PersistentSnapshot = {
  key: string;
  userId: string;
  month: string;
  storedAt: number;
  data: PhoenixReadModel;
};

function supported() {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function snapshotKey(userId: string, month: string) {
  return `${userId}:${month}`;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!supported()) return reject(new Error('INDEXED_DB_UNAVAILABLE'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('INDEXED_DB_OPEN_FAILED'));
  });
}

export async function readPhoenixPersistentSnapshot(userId: string, month: string) {
  if (!supported() || !userId) return null;
  try {
    const database = await openDatabase();
    const result = await new Promise<PersistentSnapshot | undefined>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(snapshotKey(userId, month));
      request.onsuccess = () => resolve(request.result as PersistentSnapshot | undefined);
      request.onerror = () => reject(request.error || new Error('INDEXED_DB_READ_FAILED'));
    });
    database.close();
    if (!result) return null;
    if (result.userId !== userId || result.month !== month || result.data?.user?.id !== userId || result.data?.month !== month) return null;
    if (Date.now() - result.storedAt > MAX_AGE_MS) return null;
    return result;
  } catch {
    return null;
  }
}

export async function writePhoenixPersistentSnapshot(userId: string, month: string, data: PhoenixReadModel) {
  if (!supported() || !userId || data.user?.id !== userId || data.month !== month) return;
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('INDEXED_DB_WRITE_FAILED'));
      transaction.objectStore(STORE_NAME).put({
        key: snapshotKey(userId, month),
        userId,
        month,
        storedAt: Date.now(),
        data,
      } satisfies PersistentSnapshot);
    });
    database.close();
  } catch {
    // Cache persistente é otimização de inicialização. Falha nunca bloqueia a operação financeira.
  }
}

export async function deletePhoenixPersistentSnapshot(userId: string, month: string) {
  if (!supported() || !userId) return;
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('INDEXED_DB_DELETE_FAILED'));
      transaction.objectStore(STORE_NAME).delete(snapshotKey(userId, month));
    });
    database.close();
  } catch {
    // Invalidação de cache nunca pode bloquear uma gravação financeira confirmada.
  }
}
