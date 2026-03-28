import { openProjectDatabase } from "./projectDb";
import type { Habit, HabitLog } from "@/types";

const toHabit = (h: Habit) => ({
  $id: h.id,
  $project_id: h.projectId,
  $name: h.name,
  $description: h.description ?? '',
  $frequency: h.frequency,
  $streak: (h as any).streak ?? 0,
  $best_streak: (h as any).best_streak ?? 0,
  $color: h.color,
  $last_done: (h as any).last_done ?? null,
  $created_at: h.createdAt,
});

const toHabitLog = (l: HabitLog) => ({
  $id: l.id,
  $project_id: (l as any).projectId ?? '',
  $habit_id: l.habitId,
  $completed_at: (l as any).completed_at ?? l.date,
  $note: (l as any).note ?? '',
});

const rowToHabit = (row: any): Habit => ({
  id: row.id,
  projectId: row.project_id,
  name: row.name,
  description: row.description ?? '',
  frequency: row.frequency,
  color: row.color,
  createdAt: row.created_at,
});

const rowToHabitLog = (row: any): HabitLog => ({
  id: row.id,
  habitId: row.habit_id,
  date: row.completed_at?.slice(0, 10) ?? '',
  completed: true,
});

export const habitService = {
  async getAll(projectId: string): Promise<{ habits: Habit[]; logs: HabitLog[] }> {
    const { db } = await openProjectDatabase(projectId);
    const habitsRes = db.exec("SELECT * FROM habits WHERE project_id = $projectId", { $projectId: projectId });
    const logsRes = db.exec("SELECT * FROM habit_logs WHERE project_id = $projectId", { $projectId: projectId });
    const habits = habitsRes[0]
      ? habitsRes[0].values.map((vals) => {
          const row: Record<string, any> = {};
          habitsRes[0].columns.forEach((col, idx) => (row[col] = vals[idx]));
          return rowToHabit(row);
        })
      : [];
    const logs = logsRes[0]
      ? logsRes[0].values.map((vals) => {
          const row: Record<string, any> = {};
          logsRes[0].columns.forEach((col, idx) => (row[col] = vals[idx]));
          return rowToHabitLog(row);
        })
      : [];
    return { habits, logs };
  },

  async replaceAll(projectId: string, habits: Habit[], logs: HabitLog[]) {
    const { db, persist } = await openProjectDatabase(projectId);
    db.run("DELETE FROM habits WHERE project_id = $projectId", { $projectId: projectId });
    db.run("DELETE FROM habit_logs WHERE project_id = $projectId", { $projectId: projectId });

    const habitStmt = db.prepare(`INSERT INTO habits (
      id, project_id, name, description, frequency, streak, best_streak, color, last_done, created_at
    ) VALUES (
      $id, $project_id, $name, $description, $frequency, $streak, $best_streak, $color, $last_done, $created_at
    )`);
    const logStmt = db.prepare(`INSERT INTO habit_logs (
      id, project_id, habit_id, completed_at, note
    ) VALUES (
      $id, $project_id, $habit_id, $completed_at, $note
    )`);

    db.run("BEGIN TRANSACTION");
    habits.forEach((h) => habitStmt.run(toHabit(h)));
    logs.forEach((l) => logStmt.run({ ...toHabitLog(l), $project_id: projectId }));
    db.run("COMMIT");

    habitStmt.free();
    logStmt.free();
    await persist();
  },
};
