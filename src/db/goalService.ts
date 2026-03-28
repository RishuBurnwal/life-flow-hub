import { openProjectDatabase } from "./projectDb";
import type { Goal } from "@/types";

const toDb = (g: Goal) => ({
  $id: g.id,
  $project_id: g.projectId,
  $title: g.title,
  $description: g.description ?? '',
  $level: g.level,
  $parent_id: g.parentId,
  $progress: g.progress ?? 0,
  $deadline: g.targetDate,
  $color: (g as any).color ?? '#D4956A',
  $created_at: g.createdAt,
  $updated_at: g.updatedAt,
});

const fromRow = (row: any): Goal => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  description: row.description ?? '',
  level: row.level,
  parentId: row.parent_id ?? null,
  progress: row.progress ?? 0,
  targetDate: row.deadline ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const goalService = {
  async getAll(projectId: string): Promise<Goal[]> {
    const { db } = await openProjectDatabase(projectId);
    const res = db.exec("SELECT * FROM goals WHERE project_id = $projectId", { $projectId: projectId });
    if (!res[0]) return [];
    const rows = res[0].values.map((vals) => {
      const row: Record<string, any> = {};
      res[0].columns.forEach((col, idx) => { row[col] = vals[idx]; });
      return row;
    });
    return rows.map(fromRow);
  },

  async replaceAll(projectId: string, goals: Goal[]) {
    const { db, persist } = await openProjectDatabase(projectId);
    db.run("DELETE FROM goals WHERE project_id = $projectId", { $projectId: projectId });
    const stmt = db.prepare(`INSERT INTO goals (
      id, project_id, title, description, level, parent_id, progress, deadline, color, created_at, updated_at
    ) VALUES (
      $id, $project_id, $title, $description, $level, $parent_id, $progress, $deadline, $color, $created_at, $updated_at
    )`);
    db.run("BEGIN TRANSACTION");
    goals.forEach((g) => stmt.run(toDb(g)));
    db.run("COMMIT");
    stmt.free();
    await persist();
  },
};
