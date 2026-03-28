import { openProjectDatabase } from "./projectDb";
import type { PomodoroSession } from "@/types";

const toDb = (s: PomodoroSession) => ({
  $id: s.id,
  $project_id: s.projectId,
  $task_id: s.taskId,
  $start_time: (s as any).start_time || s.startedAt,
  $end_time: (s as any).end_time || null,
  $duration_mins: s.duration,
  $type: s.type,
  $completed: s.completed ? 1 : 0,
});

const fromRow = (row: any): PomodoroSession => ({
  id: row.id,
  projectId: row.project_id,
  taskId: row.task_id ?? null,
  startedAt: row.start_time,
  duration: row.duration_mins,
  type: row.type,
  completed: !!row.completed,
});

export const pomodoroService = {
  async getAll(projectId: string): Promise<PomodoroSession[]> {
    const { db } = await openProjectDatabase(projectId);
    const res = db.exec("SELECT * FROM pomodoro_sessions WHERE project_id = $projectId", { $projectId: projectId });
    if (!res[0]) return [];
    const rows = res[0].values.map((vals) => {
      const row: Record<string, any> = {};
      res[0].columns.forEach((col, idx) => (row[col] = vals[idx]));
      return row;
    });
    return rows.map(fromRow);
  },

  async replaceAll(projectId: string, sessions: PomodoroSession[]) {
    const { db, persist } = await openProjectDatabase(projectId);
    db.run("DELETE FROM pomodoro_sessions WHERE project_id = $projectId", { $projectId: projectId });
    const stmt = db.prepare(`INSERT INTO pomodoro_sessions (
      id, project_id, task_id, start_time, end_time, duration_mins, completed, type
    ) VALUES (
      $id, $project_id, $task_id, $start_time, $end_time, $duration_mins, $completed, $type
    )`);
    db.run("BEGIN TRANSACTION");
    sessions.forEach((s) => stmt.run(toDb(s)));
    db.run("COMMIT");
    stmt.free();
    await persist();
  },
};
