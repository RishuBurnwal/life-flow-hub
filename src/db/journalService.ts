import { openProjectDatabase } from "./projectDb";
import type { JournalEntry } from "@/types";

const toDb = (e: JournalEntry) => ({
  $id: e.id,
  $project_id: e.projectId,
  $title: e.title ?? '',
  $content: e.content ?? '',
  $mood: e.mood ?? '',
  $tags: JSON.stringify(e.tags ?? []),
  $created_at: e.createdAt,
  $updated_at: e.updatedAt,
  $date: (e as any).date || e.createdAt,
  $ai_summary: (e as any).ai_summary || '',
  $word_count: (e as any).word_count || 0,
});

const fromRow = (row: any): JournalEntry => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title ?? '',
  content: row.content ?? '',
  mood: row.mood || null,
  tags: row.tags ? JSON.parse(row.tags) : [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const journalService = {
  async getAll(projectId: string): Promise<JournalEntry[]> {
    const { db } = await openProjectDatabase(projectId);
    const res = db.exec("SELECT * FROM journal WHERE project_id = $projectId", { $projectId: projectId });
    if (!res[0]) return [];
    const rows = res[0].values.map((vals) => {
      const row: Record<string, any> = {};
      res[0].columns.forEach((col, idx) => { row[col] = vals[idx]; });
      return row;
    });
    return rows.map(fromRow);
  },

  async replaceAll(projectId: string, entries: JournalEntry[]) {
    const { db, persist } = await openProjectDatabase(projectId);
    db.run("DELETE FROM journal WHERE project_id = $projectId", { $projectId: projectId });
    const stmt = db.prepare(`INSERT INTO journal (
      id, project_id, date, content, ai_summary, mood, word_count, title, tags, created_at, updated_at
    ) VALUES (
      $id, $project_id, $date, $content, $ai_summary, $mood, $word_count, $title, $tags, $created_at, $updated_at
    )`);
    db.run("BEGIN TRANSACTION");
    entries.forEach((e) => stmt.run(toDb(e)));
    db.run("COMMIT");
    stmt.free();
    await persist();
  },
};
