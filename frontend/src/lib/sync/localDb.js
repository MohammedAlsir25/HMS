const DB_NAME = 'hms';
const META_STORE = '_meta';
const storeNames = new Set();
let dbPromise = null;
let DB_VERSION = 1;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'id' });
        }
        for (const name of storeNames) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        }
      };
      req.onerror = () => { dbPromise = null; reject(req.error); };
      req.onsuccess = () => resolve(req.result);
    });
  }
  return dbPromise;
}

function addStoreIfMissing(name, db) {
  if (db.objectStoreNames.contains(name)) return db;
  db.close();
  dbPromise = null;
  storeNames.add(name);
  DB_VERSION++;
  return openDb();
}

export const localDb = {
  registerTables(tables) {
    for (const t of tables) storeNames.add(t);
  },
  async do(table, method, ...args) {
    let db = await openDb();
    db = await addStoreIfMissing(table, db);
    const tx = db.transaction(table, method === 'putMany' || method === 'put' || method === 'delete' || method === 'clear' ? 'readwrite' : 'readonly');
    const store = tx.objectStore(table);
    return new Promise((resolve, reject) => {
      let req;
      if (method === 'get') req = store.get(args[0]);
      else if (method === 'getAll') req = store.getAll();
      else if (method === 'put') req = store.put(args[0]);
      else if (method === 'putMany') { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); for (const r of args[0]) store.put(r); return; }
      else if (method === 'delete') req = store.delete(args[0]);
      else if (method === 'clear') req = store.clear();
      else if (method === 'getMeta') req = store.get(args[0]);
      else if (method === 'setMeta') req = store.put({ id: args[0], value: args[1] });
      if (req) { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }
    });
  },
  get(table, id) { return this.do(table, 'get', id); },
  getAll(table) { return this.do(table, 'getAll'); },
  put(table, record) { return this.do(table, 'put', record); },
  putMany(table, records) { return this.do(table, 'putMany', records); },
  delete(table, id) { return this.do(table, 'delete', id); },
  clear(table) { return this.do(table, 'clear'); },
  async getMeta(key) {
    const db = await openDb();
    if (!db.objectStoreNames.contains(META_STORE)) return null;
    const tx = db.transaction(META_STORE, 'readonly');
    const store = tx.objectStore(META_STORE);
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result?.value);
      req.onerror = () => reject(req.error);
    });
  },
  async setMeta(key, value) {
    const db = await openDb();
    const tx = db.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);
    return new Promise((resolve, reject) => {
      const req = store.put({ id: key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
  async destroy() {
    indexedDB.deleteDatabase(DB_NAME);
    dbPromise = null;
  },
};
