import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/stores/useStore';
import type { Task, TaskStatus, TaskPriority } from '@/types';
import { STATUS_LABELS, PRIORITY_LABELS } from '@/types';
import {
  Plus, Circle, CheckCircle2, Clock, AlertTriangle, Archive,
  ChevronDown, ChevronRight, MoreHorizontal, Trash2, Calendar,
  Flag, Tag, X
} from 'lucide-react';

const STATUS_ICONS: Record<TaskStatus, React.ElementType> = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
  blocked: AlertTriangle,
  backlog: Archive,
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'text-status-todo',
  in_progress: 'text-status-progress',
  done: 'text-status-done',
  blocked: 'text-status-blocked',
  backlog: 'text-status-backlog',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: 'text-priority-urgent',
  high: 'text-priority-high',
  medium: 'text-priority-medium',
  low: 'text-priority-low',
  none: 'text-priority-none',
};

export function TodoView() {
  const { activeProjectId, tasks, addTask, updateTask, deleteTask } = useStore();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'priority' | 'deadline'>('created');
  const inputRef = useRef<HTMLInputElement>(null);

  const projectTasks = tasks.filter((t) => t.projectId === activeProjectId);

  const filtered = projectTasks
    .filter((t) => filterStatus === 'all' || t.status === filterStatus)
    .filter((t) => filterPriority === 'all' || t.priority === filterPriority);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') {
      const order: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none'];
      return order.indexOf(a.priority) - order.indexOf(b.priority);
    }
    if (sortBy === 'deadline') {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleAdd = () => {
    if (!newTaskTitle.trim() || !activeProjectId) return;
    addTask({ title: newTaskTitle.trim(), status: 'todo' });
    setNewTaskTitle('');
    inputRef.current?.focus();
  };

  const cycleStatus = (task: Task) => {
    const order: TaskStatus[] = ['todo', 'in_progress', 'done'];
    const idx = order.indexOf(task.status);
    const next = order[(idx + 1) % order.length];
    updateTask(task.id, { status: next, kanbanColumn: next });
  };

  if (!activeProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Select or create a project to get started</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
          className="text-xs px-2 py-1 rounded-md bg-secondary border-none outline-none cursor-pointer"
        >
          <option value="all">All Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')}
          className="text-xs px-2 py-1 rounded-md bg-secondary border-none outline-none cursor-pointer"
        >
          <option value="all">All Priority</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'created' | 'priority' | 'deadline')}
          className="text-xs px-2 py-1 rounded-md bg-secondary border-none outline-none cursor-pointer"
        >
          <option value="created">Newest</option>
          <option value="priority">Priority</option>
          <option value="deadline">Deadline</option>
        </select>
        <span className="text-xs text-muted-foreground ml-auto tabular-nums">{sorted.length} tasks</span>
      </div>

      {/* Add Task */}
      <div className="px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add a task… (Enter to create)"
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {sorted.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="border-b border-border last:border-0"
            >
              <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
                {/* Status Toggle */}
                <button onClick={() => cycleStatus(task)} className="mt-0.5 shrink-0">
                  {(() => {
                    const Icon = STATUS_ICONS[task.status];
                    return <Icon className={`w-4 h-4 ${STATUS_COLORS[task.status]} transition-colors`} />;
                  })()}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0" onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}>
                  <p className={`text-sm cursor-pointer ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`text-[10px] font-medium ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority !== 'none' && PRIORITY_LABELS[task.priority]}
                    </span>
                    {task.deadline && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    )}
                    {task.tags.map((tag) => (
                      <span key={tag} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-all shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Expanded Detail */}
              <AnimatePresence>
                {expandedTask === task.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <TaskDetail task={task} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No tasks yet</p>
            <p className="text-xs mt-1">Add your first task above</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskDetail({ task }: { task: Task }) {
  const { updateTask } = useStore();
  const [desc, setDesc] = useState(task.description);
  const [tagInput, setTagInput] = useState('');

  return (
    <div className="px-4 pb-3 pl-11 space-y-3">
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onBlur={() => updateTask(task.id, { description: desc })}
        placeholder="Add description…"
        className="w-full text-xs bg-muted/30 rounded-md p-2 outline-none resize-none min-h-[60px] placeholder:text-muted-foreground"
      />
      <div className="flex flex-wrap gap-2">
        <select
          value={task.status}
          onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus, kanbanColumn: e.target.value })}
          className="text-[11px] px-2 py-1 rounded bg-secondary border-none outline-none cursor-pointer"
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={task.priority}
          onChange={(e) => updateTask(task.id, { priority: e.target.value as TaskPriority })}
          className="text-[11px] px-2 py-1 rounded bg-secondary border-none outline-none cursor-pointer"
        >
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input
          type="date"
          value={task.deadline || ''}
          onChange={(e) => updateTask(task.id, { deadline: e.target.value || null })}
          className="text-[11px] px-2 py-1 rounded bg-secondary border-none outline-none cursor-pointer"
        />
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {task.tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] bg-secondary px-1.5 py-0.5 rounded">
            {tag}
            <button onClick={() => updateTask(task.id, { tags: task.tags.filter((t) => t !== tag) })}>
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && tagInput.trim()) {
              updateTask(task.id, { tags: [...task.tags, tagInput.trim()] });
              setTagInput('');
            }
          }}
          placeholder="+ tag"
          className="text-[10px] bg-transparent outline-none w-16 placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
