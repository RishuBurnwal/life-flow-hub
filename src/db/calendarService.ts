import { openProjectDatabase } from './projectDb';
import type { CalendarEvent } from '@/types';

const toDb = (evt: CalendarEvent) => ({
  $id: evt.id,
  $project_id: evt.projectId,
  $title: evt.title,
  $description: evt.description ?? '',
  $date: evt.date,
  $time: evt.time ?? null,
  $location: evt.location ?? null,
  $color: evt.color ?? null,
  $all_day: evt.allDay ? 1 : 0,
  $created_at: evt.createdAt,
  $updated_at: evt.updatedAt,
});

const fromRow = (row: any): CalendarEvent => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  description: row.description ?? '',
  date: row.date,
  time: row.time ?? null,
  location: row.location ?? null,
  color: row.color ?? null,
  allDay: !!row.all_day,
  createdAt: row.created_at ?? new Date().toISOString(),
  updatedAt: row.updated_at ?? new Date().toISOString(),
});

export const calendarService = {
  async getAll(projectId: string): Promise<CalendarEvent[]> {
    const { db } = await openProjectDatabase(projectId);
    const res = db.exec('SELECT * FROM calendar_events WHERE project_id = $projectId ORDER BY date ASC', { $projectId: projectId });
    if (!res[0]) return [];
    const rows = res[0].values.map((vals) => {
      const row: Record<string, any> = {};
      res[0].columns.forEach((col, idx) => {
        row[col] = vals[idx];
      });
      return row;
    });
    return rows.map(fromRow);
  },

  async replaceAll(projectId: string, events: CalendarEvent[]) {
    const { db, persist } = await openProjectDatabase(projectId);
    db.run('DELETE FROM calendar_events WHERE project_id = $projectId', { $projectId: projectId });
    const stmt = db.prepare(`INSERT INTO calendar_events (
      id, project_id, title, description, date, time, location, color, all_day, created_at, updated_at
    ) VALUES (
      $id, $project_id, $title, $description, $date, $time, $location, $color, $all_day, $created_at, $updated_at
    )`);
    db.run('BEGIN TRANSACTION');
    events.forEach((evt) => stmt.run(toDb(evt)));
    db.run('COMMIT');
    stmt.free();
    await persist();
  },
};
