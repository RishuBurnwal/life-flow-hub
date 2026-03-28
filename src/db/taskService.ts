import { openProjectDatabase } from "./projectDb";
import type { Task } from "@/types";

// Map camelCase Task to DB row (snake_case)
const toDbTask = (task: Task) => ({
  $id: task.id,
  $title: task.title,
  $description: task.description,
  $priority: task.priority,
  $status: task.status,
  $start_date: task.startDate,
  $deadline: task.deadline,
  $estimate_mins: task.estimateMins ?? 0,
  $actual_mins: task.actualMins ?? 0,
  $tags: JSON.stringify(task.tags ?? []),
  $parent_id: task.parentId,
  $sdlc_phase: (task as any).sdlcPhase ?? null,
  $goal_id: task.goalId,
  $kanban_column: task.kanbanColumn,
  $calendar_scheduled: (task as any).calendarScheduled ?? null,
  $pomodoro_count: task.pomodoroCount ?? 0,
  $created_at: task.createdAt,
  $updated_at: task.updatedAt,
});

const fromDbTask = (row: any): Task => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  description: row.description ?? "",
  priority: row.priority,
  status: row.status,
  startDate: row.start_date ?? null,
  deadline: row.deadline ?? null,
  estimateMins: row.estimate_mins ?? 0,
  actualMins: row.actual_mins ?? 0,
  tags: row.tags ? JSON.parse(row.tags) : [],
  parentId: row.parent_id ?? null,
  goalId: row.goal_id ?? null,
  kanbanColumn: row.kanban_column ?? row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  pomodoroCount: row.pomodoro_count ?? 0,
});

export const taskService = {
  async getAll(projectId: string): Promise<Task[]> {
    const { db } = await openProjectDatabase(projectId);
    const res = db.exec(
      "SELECT * FROM tasks WHERE project_id = $projectId ORDER BY created_at ASC",
      { $projectId: projectId }
    );
    if (!res[0]) return [];
    const rows = res[0].values.map((vals) => {
      const row: Record<string, any> = {};
      res[0].columns.forEach((col, idx) => {
        row[col] = vals[idx];
      });
      return row;
    });
    return rows.map(fromDbTask);
  },

  async upsert(projectId: string, task: Task) {
    const { db, persist } = await openProjectDatabase(projectId);
    db.run(
      `INSERT INTO tasks (
        id, project_id, title, description, priority, status, start_date, deadline, estimate_mins,
        actual_mins, tags, parent_id, sdlc_phase, goal_id, kanban_column, calendar_scheduled,
        pomodoro_count, created_at, updated_at
      ) VALUES (
        $id, $project_id, $title, $description, $priority, $status, $start_date, $deadline, $estimate_mins,
        $actual_mins, $tags, $parent_id, $sdlc_phase, $goal_id, $kanban_column, $calendar_scheduled,
        $pomodoro_count, $created_at, $updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        priority = excluded.priority,
        status = excluded.status,
        start_date = excluded.start_date,
        deadline = excluded.deadline,
        estimate_mins = excluded.estimate_mins,
        actual_mins = excluded.actual_mins,
        tags = excluded.tags,
        parent_id = excluded.parent_id,
        sdlc_phase = excluded.sdlc_phase,
        goal_id = excluded.goal_id,
        kanban_column = excluded.kanban_column,
        calendar_scheduled = excluded.calendar_scheduled,
        pomodoro_count = excluded.pomodoro_count,
        updated_at = excluded.updated_at;
      `,
      { ...toDbTask(task), $project_id: projectId }
    );
    await persist();
  },

  async delete(projectId: string, taskId: string) {
    const { db, persist } = await openProjectDatabase(projectId);
    db.run("DELETE FROM tasks WHERE id = $id AND project_id = $projectId", { $id: taskId, $projectId: projectId });
    await persist();
  },

  async replaceAll(projectId: string, tasks: Task[]) {
    const { db, persist } = await openProjectDatabase(projectId);
    db.run("DELETE FROM tasks WHERE project_id = $projectId", { $projectId: projectId });
    const insert = db.prepare(
      `INSERT INTO tasks (
        id, project_id, title, description, priority, status, start_date, deadline, estimate_mins,
        actual_mins, tags, parent_id, sdlc_phase, goal_id, kanban_column, calendar_scheduled,
        pomodoro_count, created_at, updated_at
      ) VALUES (
        $id, $project_id, $title, $description, $priority, $status, $start_date, $deadline, $estimate_mins,
        $actual_mins, $tags, $parent_id, $sdlc_phase, $goal_id, $kanban_column, $calendar_scheduled,
        $pomodoro_count, $created_at, $updated_at
      )`
    );
    db.run("BEGIN TRANSACTION");
    tasks.forEach((task) => insert.run({ ...toDbTask(task), $project_id: projectId }));
    db.run("COMMIT");
    insert.free();
    await persist();
  },
};
