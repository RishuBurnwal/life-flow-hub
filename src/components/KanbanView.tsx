import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent, DragOverlay, type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '@/stores/useStore';
import type { Task, TaskStatus } from '@/types';
import { DEFAULT_KANBAN_COLUMNS, PRIORITY_LABELS } from '@/types';
import { Plus, Calendar, Flag, GripVertical } from 'lucide-react';

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'border-t-status-todo',
  in_progress: 'border-t-status-progress',
  done: 'border-t-status-done',
  blocked: 'border-t-status-blocked',
  backlog: 'border-t-status-backlog',
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-priority-urgent',
  high: 'bg-priority-high',
  medium: 'bg-priority-medium',
  low: 'bg-priority-low',
  none: 'bg-priority-none',
};

function KanbanCard({ task, overlay }: { task: Task; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = overlay
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      {...(overlay ? {} : attributes)}
      className={`bg-card rounded-lg p-3 shadow-soft border border-border hover:shadow-medium transition-shadow cursor-grab active:cursor-grabbing ${overlay ? 'shadow-elevated rotate-2' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div {...(overlay ? {} : listeners)} className="mt-0.5 cursor-grab">
          <GripVertical className="w-3 h-3 text-muted-foreground/50" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium leading-snug ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {task.priority !== 'none' && (
              <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} title={PRIORITY_LABELS[task.priority]} />
            )}
            {task.deadline && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" />
                {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
            {task.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[9px] bg-muted px-1 py-0.5 rounded">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function KanbanView() {
  const { activeProjectId, tasks, addTask, updateTask } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const projectTasks = tasks.filter((t) => t.projectId === activeProjectId);
  const activeTask = activeId ? projectTasks.find((t) => t.id === activeId) : null;

  const getColumnTasks = (status: TaskStatus) =>
    projectTasks.filter((t) => t.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const targetColumn = DEFAULT_KANBAN_COLUMNS.find((c) => c.id === overId);
    if (targetColumn) {
      updateTask(taskId, { status: targetColumn.status, kanbanColumn: targetColumn.id });
      return;
    }

    // Dropped on a task - move to that task's column
    const overTask = projectTasks.find((t) => t.id === overId);
    if (overTask && overTask.id !== taskId) {
      updateTask(taskId, { status: overTask.status, kanbanColumn: overTask.kanbanColumn });
    }
  };

  const handleAddToColumn = (status: TaskStatus) => {
    if (!activeProjectId) return;
    addTask({ title: 'New Task', status, kanbanColumn: status });
  };

  if (!activeProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Select or create a project</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-auto">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 p-4 h-full min-w-max">
          {DEFAULT_KANBAN_COLUMNS.map((col) => {
            const colTasks = getColumnTasks(col.status);
            return (
              <div
                key={col.id}
                id={col.id}
                className={`w-64 flex flex-col rounded-xl bg-surface-sunken border-t-2 ${STATUS_COLORS[col.status]}`}
              >
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold">{col.title}</h3>
                    <span className="text-[10px] tabular-nums text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAddToColumn(col.status)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto scrollbar-thin">
                  <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    {colTasks.map((task) => (
                      <KanbanCard key={task.id} task={task} />
                    ))}
                  </SortableContext>
                  {colTasks.length === 0 && (
                    <div className="text-center py-8 text-[10px] text-muted-foreground">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask && <KanbanCard task={activeTask} overlay />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
