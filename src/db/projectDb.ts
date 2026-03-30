import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import { PROJECT_SCHEMA } from "./schema";

const IDB_NAME = "lifeos_sqlite";
const IDB_STORE = "projects";
const IDB_VERSION = 1;

let sqlPromise: Promise<SqlJsStatic> | null = null;

const getSqlWasmPath = () => {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}sql-wasm.wasm`;
};

const getSql = () => {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      // Keep this path rooted at Vite BASE_URL so direct-route loads still find WASM.
      locateFile: () => getSqlWasmPath(),
    });
  }
  return sqlPromise;
};

const openIdb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const readProjectBytes = async (projectId: string): Promise<Uint8Array | null> => {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(projectId);
    req.onsuccess = () => resolve(req.result ? new Uint8Array(req.result) : null);
    req.onerror = () => reject(req.error);
  });
};

const writeProjectBytes = async (projectId: string, data: Uint8Array) => {
  const db = await openIdb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const req = store.put(data, projectId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

const applySchema = (db: Database) => {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(PROJECT_SCHEMA);

  // Lightweight forward-compatible migrations for older local DB files.
  try { db.exec("ALTER TABLE sticky_notes ADD COLUMN x REAL DEFAULT 24;"); } catch {}
  try { db.exec("ALTER TABLE sticky_notes ADD COLUMN y REAL DEFAULT 120;"); } catch {}
};

export interface ProjectDatabase {
  db: Database;
  persist: () => Promise<void>;
}

export const openProjectDatabase = async (projectId: string): Promise<ProjectDatabase> => {
  const SQL = await getSql();
  const existingBytes = await readProjectBytes(projectId);
  const db = existingBytes ? new SQL.Database(existingBytes) : new SQL.Database();

  applySchema(db);

  const persist = async () => {
    const data = db.export();
    await writeProjectBytes(projectId, data);
  };

  if (!existingBytes) {
    await persist();
  }

  return { db, persist };
};

export const resetProjectDatabase = async (projectId: string) => {
  const SQL = await getSql();
  const db = new SQL.Database();
  applySchema(db);
  const data = db.export();
  await writeProjectBytes(projectId, data);
};
