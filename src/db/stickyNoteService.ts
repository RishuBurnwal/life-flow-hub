import { openProjectDatabase } from './projectDb';
import type { StickyNote } from '@/types';

const toDb = (note: StickyNote) => ({
  $id: note.id,
  $project_id: note.projectId,
  $title: note.title,
  $content: note.content ?? '',
  $color: note.color,
  $linked_node_id: note.linkedNodeId ?? null,
  $x: note.x ?? 24,
  $y: note.y ?? 120,
  $created_at: note.createdAt,
  $updated_at: note.updatedAt,
});

const fromRow = (row: any): StickyNote => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  content: row.content ?? '',
  color: row.color ?? '#FFE59A',
  linkedNodeId: row.linked_node_id ?? null,
  x: Number(row.x ?? 24),
  y: Number(row.y ?? 120),
  createdAt: row.created_at ?? new Date().toISOString(),
  updatedAt: row.updated_at ?? new Date().toISOString(),
});

export const stickyNoteService = {
  async getAll(projectId: string): Promise<StickyNote[]> {
    const { db } = await openProjectDatabase(projectId);
    const res = db.exec('SELECT * FROM sticky_notes WHERE project_id = $projectId ORDER BY updated_at DESC', { $projectId: projectId });
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

  async replaceAll(projectId: string, notes: StickyNote[]) {
    const { db, persist } = await openProjectDatabase(projectId);
    db.run('DELETE FROM sticky_notes WHERE project_id = $projectId', { $projectId: projectId });
    const stmt = db.prepare(`INSERT INTO sticky_notes (
      id, project_id, title, content, color, linked_node_id, x, y, created_at, updated_at
    ) VALUES (
      $id, $project_id, $title, $content, $color, $linked_node_id, $x, $y, $created_at, $updated_at
    )`);
    db.run('BEGIN TRANSACTION');
    notes.forEach((note) => stmt.run(toDb(note)));
    db.run('COMMIT');
    stmt.free();
    await persist();
  },
};
