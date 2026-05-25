const DB_NAME = "letterPairDB";
const DB_VERSION = 1;
const STORE_NAME = "pairEntries";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "pair" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore(mode, handler) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const requestOrValue = handler(store);
        tx.oncomplete = () => resolve(requestOrValue?.result ?? requestOrValue);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

function getEntry(pair) {
  return withStore("readonly", (store) => store.get(pair));
}

function getAllEntries() {
  return withStore("readonly", (store) => store.getAll()).then((rows) => rows || []);
}

function upsertEntry(entry) {
  return withStore("readwrite", (store) => store.put(entry));
}

function deleteEntry(pair) {
  return withStore("readwrite", (store) => store.delete(pair));
}
