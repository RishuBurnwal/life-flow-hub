import { openProjectDatabase } from "./projectDb";
import type { Project } from "@/types";

type MetaValue = string | number | boolean | null | Record<string, unknown> | Array<unknown>;

const APP_META_PROJECT_ID = "__app_global__";
let appMetaWriteQueue: Promise<void> = Promise.resolve();

const readRow = (columns: string[], values: any[]) => {
  const row: Record<string, any> = {};
  columns.forEach((col, idx) => {
    row[col] = values[idx];
  });
  return row;
};

const parseSafe = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const appMetaService = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const { db } = await openProjectDatabase(APP_META_PROJECT_ID);
    const res = db.exec("SELECT value FROM app_meta WHERE key = $key LIMIT 1", { $key: key });
    if (!res[0]?.values?.[0]) return fallback;
    const row = readRow(res[0].columns, res[0].values[0]);
    return parseSafe(String(row.value || ""), fallback);
  },

  async set(key: string, value: MetaValue) {
    appMetaWriteQueue = appMetaWriteQueue.then(async () => {
      const { db, persist } = await openProjectDatabase(APP_META_PROJECT_ID);
      db.run(
        `INSERT INTO app_meta (key, value, updated_at)
         VALUES ($key, $value, $updated_at)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
        {
          $key: key,
          $value: JSON.stringify(value),
          $updated_at: new Date().toISOString(),
        }
      );
      await persist();
    });
    return appMetaWriteQueue;
  },

  async remove(key: string) {
    appMetaWriteQueue = appMetaWriteQueue.then(async () => {
      const { db, persist } = await openProjectDatabase(APP_META_PROJECT_ID);
      db.run("DELETE FROM app_meta WHERE key = $key", { $key: key });
      await persist();
    });
    return appMetaWriteQueue;
  },

  async getProjects(): Promise<Project[]> {
    return this.get("projects", [] as Project[]);
  },

  async setProjects(projects: Project[]) {
    await this.set("projects", projects);
  },
};
