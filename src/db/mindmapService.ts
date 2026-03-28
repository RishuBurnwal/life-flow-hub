import { openProjectDatabase } from './projectDb';
import type { MindmapNode } from '@/types';

const toDbNode = (node: MindmapNode) => ({
  $id: node.id,
  $project_id: node.projectId,
  $label: node.label,
  $description: node.description ?? '',
  $parent_id: node.parentId,
  $x: node.x ?? 0,
  $y: node.y ?? 0,
  $expanded: node.expanded ? 1 : 0,
  $task_id: node.taskId,
  $color: node.color ?? null,
  $priority: node.priority ?? null,
  $created_at: node.createdAt,
});

const fromDbNode = (row: any): MindmapNode => ({
  id: row.id,
  projectId: row.project_id,
  label: row.label,
  description: row.description ?? '',
  parentId: row.parent_id ?? null,
  x: Number(row.x ?? 0),
  y: Number(row.y ?? 0),
  expanded: !!row.expanded,
  taskId: row.task_id ?? null,
  color: row.color ?? null,
  priority: (row.priority as any) ?? null,
  createdAt: row.created_at ?? new Date().toISOString(),
});

export const mindmapService = {
  async getAll(projectId: string): Promise<MindmapNode[]> {
    const { db } = await openProjectDatabase(projectId);
    const res = db.exec("SELECT * FROM mindmap_nodes WHERE project_id = $projectId ORDER BY created_at ASC", {
      $projectId: projectId,
    });
    if (!res[0]) return [];
    const rows = res[0].values.map((vals) => {
      const row: Record<string, any> = {};
      res[0].columns.forEach((col, idx) => {
        row[col] = vals[idx];
      });
      return row;
    });
    return rows.map(fromDbNode);
  },

  async replaceAll(projectId: string, nodes: MindmapNode[]) {
    const { db, persist } = await openProjectDatabase(projectId);
    db.run('DELETE FROM mindmap_nodes WHERE project_id = $projectId', { $projectId: projectId });

    const insert = db.prepare(`INSERT INTO mindmap_nodes (
      id, project_id, label, description, parent_id, x, y, expanded, task_id, color, priority, created_at
    ) VALUES (
      $id, $project_id, $label, $description, $parent_id, $x, $y, $expanded, $task_id, $color, $priority, $created_at
    )`);

    db.run('BEGIN TRANSACTION');
    nodes.forEach((node) => insert.run({ ...toDbNode(node), $project_id: projectId }));
    db.run('COMMIT');
    insert.free();
    await persist();
  },
};
