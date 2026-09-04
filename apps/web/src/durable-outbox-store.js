const DB_NAME = 'meg-financas-durable-sync';
const DB_VERSION = 1;
const STORE_NAME = 'pending-outboxes';

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'kind' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

export async function readDurableOutbox(kind) {
  const database = await openDatabase();
  if (!database) return null;
  return new Promise((resolve) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(kind);
    request.onsuccess = () => resolve(request.result?.payload || null);
    request.onerror = () => resolve(null);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
  });
}

export async function protectDurableOutbox(kind, payload) {
  const database = await openDatabase();
  if (!database) return { protected: false, unavailable: true };
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put({ kind, payload });
    transaction.oncomplete = () => {
      database.close();
      resolve({ protected: true, unavailable: false });
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Não foi possível proteger a fila no armazenamento durável.'));
    };
    transaction.onabort = transaction.onerror;
  });
}

export async function deleteDurableOutboxIfGeneration(kind, generation) {
  const database = await openDatabase();
  if (!database) return false;
  return new Promise((resolve) => {
    let removed = false;
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(kind);
    request.onsuccess = () => {
      if (Number(request.result?.payload?.generation || 0) !== Number(generation || 0)) return;
      store.delete(kind);
      removed = true;
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(removed);
    };
    transaction.onerror = () => {
      database.close();
      resolve(false);
    };
    transaction.onabort = transaction.onerror;
  });
}
