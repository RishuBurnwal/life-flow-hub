import { openProjectDatabase } from './projectDb';
import type { SdlcPhase } from '@/types';

const toDb = (phase: SdlcPhase) => ({
  $id: phase.id,
  $project_id: phase.projectId,
  $name: phase.name,
  $description: phase.description ?? '',
  $status: phase.status,
  $owner: phase.owner ?? '',
  $start_date: phase.startDate,
  $end_date: phase.endDate,
  $risk: phase.risk ?? '',
  $created_at: phase.createdAt,
  $updated_at: phase.updatedAt,
});

const fromDb = (row: any): SdlcPhase => ({
  id: row.id,
  projectId: row.project_id,
  name: row.name,
  description: row.description ?? '',
  status: row.status ?? 'planned',
  owner: row.owner ?? '',
  startDate: row.start_date ?? null,
  endDate: row.end_date ?? null,
  risk: row.risk ?? '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const sdlcService = {
  async getAll(projectId: string): Promise<SdlcPhase[]> {
    const { db } = await openProjectDatabase(projectId);
    const res = db.exec(
      'SELECT * FROM sdlc_phases WHERE project_id = $projectId ORDER BY created_at ASC',
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
    return rows.map(fromDb);
  },

  async replaceAll(projectId: string, phases: SdlcPhase[]) {
    const { db, persist } = await openProjectDatabase(projectId);
    db.run('DELETE FROM sdlc_phases WHERE project_id = $projectId', { $projectId: projectId });
    const insert = db.prepare(`INSERT INTO sdlc_phases (
      id, project_id, name, description, status, owner, start_date, end_date, risk, created_at, updated_at
    ) VALUES (
      $id, $project_id, $name, $description, $status, $owner, $start_date, $end_date, $risk, $created_at, $updated_at
    )`);
    db.run('BEGIN TRANSACTION');
    phases.forEach((p) => insert.run({ ...toDb(p), $project_id: projectId }));
    db.run('COMMIT');
    insert.free();
    await persist();
  },
};
