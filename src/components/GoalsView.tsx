import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/stores/useStore';
import type { GoalLevel } from '@/types';
import { GOAL_LEVEL_LABELS } from '@/types';
import {
  Plus, Trash2, ChevronDown, ChevronRight, Target,
  AlertCircle, Link2, Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

const LEVEL_COLORS: Record<GoalLevel, string> = {
  life: 'border-l-primary',
  quarterly: 'border-l-accent',
  weekly: 'border-l-status-progress',
};

export function GoalsView() {
  const {
    activeProjectId, goals, tasks, addGoal, updateGoal, deleteGoal,
  } = useStore();
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalLevel, setNewGoalLevel] = useState<GoalLevel>('quarterly');

  const projectGoals = goals.filter((g) => g.projectId === activeProjectId);
  const projectTasks = tasks.filter((t) => t.projectId === activeProjectId);

  // Goals by level
  const lifeGoals = projectGoals.filter((g) => g.level === 'life');
  const quarterlyGoals = projectGoals.filter((g) => g.level === 'quarterly');
  const weeklyGoals = projectGoals.filter((g) => g.level === 'weekly');

  // Orphan tasks - tasks not linked to any goal
  const orphanTasks = projectTasks.filter((t) => !t.goalId && t.status !== 'done');

  // Calculate progress from linked tasks
  const getGoalProgress = (goalId: string) => {
    const linkedTasks = projectTasks.filter((t) => t.goalId === goalId);
    if (linkedTasks.length === 0) return 0;
    const done = linkedTasks.filter((t) => t.status === 'done').length;
    return Math.round((done / linkedTasks.length) * 100);
  };

  const getLinkedTaskCount = (goalId: string) =>
    projectTasks.filter((t) => t.goalId === goalId).length;

  const getChildGoals = (parentId: string) =>
    projectGoals.filter((g) => g.parentId === parentId);

  const toggleExpand = (id: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    if (!newGoalTitle.trim() || !activeProjectId) return;
    addGoal({ title: newGoalTitle.trim(), level: newGoalLevel });
    setNewGoalTitle('');
  };

  if (!activeProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Select or create a project</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Add Goal */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add a goal…"
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
          <select
            value={newGoalLevel}
            onChange={(e) => setNewGoalLevel(e.target.value as GoalLevel)}
            className="text-xs px-2 py-1 rounded-md bg-secondary border-none outline-none cursor-pointer"
          >
            {Object.entries(GOAL_LEVEL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
        {/* Goal Levels */}
        {([
          { label: '🌟 Life Goals', goals: lifeGoals, level: 'life' as GoalLevel },
          { label: '📅 Quarterly Goals', goals: quarterlyGoals, level: 'quarterly' as GoalLevel },
          { label: '📋 Weekly Goals', goals: weeklyGoals, level: 'weekly' as GoalLevel },
        ]).map(({ label, goals: levelGoals, level }) => (
          <div key={level}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</h3>
            {levelGoals.length === 0 ? (
              <p className="text-xs text-text-tertiary py-2">No {level} goals yet</p>
            ) : (
              <div className="space-y-2">
                {levelGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    progress={getGoalProgress(goal.id)}
                    taskCount={getLinkedTaskCount(goal.id)}
                    childGoals={getChildGoals(goal.id)}
                    expanded={expandedGoals.has(goal.id)}
                    onToggle={() => toggleExpand(goal.id)}
                    onDelete={() => deleteGoal(goal.id)}
                    onUpdate={(updates) => updateGoal(goal.id, updates)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Orphan Tasks Warning */}
        {orphanTasks.length > 0 && (
          <div className="bg-priority-medium/10 rounded-xl border border-priority-medium/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-priority-medium" />
              <h3 className="text-xs font-semibold text-priority-medium">
                {orphanTasks.length} Unlinked Tasks
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              These tasks aren't linked to any goal. Consider assigning them.
            </p>
            <div className="space-y-1">
              {orphanTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-priority-medium" />
                  <span className="truncate">{task.title}</span>
                </div>
              ))}
              {orphanTasks.length > 5 && (
                <span className="text-[10px] text-text-tertiary">
                  +{orphanTasks.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {projectGoals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Target className="w-10 h-10 text-muted-foreground/25 mb-3" />
            <p className="text-sm text-muted-foreground">Set your first goal above</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GoalCard({
  goal, progress, taskCount, childGoals, expanded, onToggle, onDelete, onUpdate,
}: {
  goal: { id: string; title: string; description: string; level: GoalLevel; targetDate: string | null };
  progress: number;
  taskCount: number;
  childGoals: any[];
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (updates: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(goal.description);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-lg border border-border border-l-2 ${LEVEL_COLORS[goal.level]} shadow-soft`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer group" onClick={onToggle}>
        {childGoals.length > 0 || taskCount > 0 ? (
          expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> :
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <Target className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{goal.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {taskCount > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Link2 className="w-2.5 h-2.5" />
                {taskCount} tasks
              </span>
            )}
            {goal.targetDate && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" />
                {format(new Date(goal.targetDate), 'MMM d')}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-[10px] font-medium tabular-nums w-8 text-right">{progress}%</span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-all shrink-0"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 pl-9 space-y-2">
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onBlur={() => onUpdate({ description: desc })}
                placeholder="Add description…"
                className="w-full text-xs bg-muted/30 rounded-md p-2 outline-none resize-none min-h-[40px] placeholder:text-muted-foreground"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={goal.targetDate || ''}
                  onChange={(e) => onUpdate({ targetDate: e.target.value || null })}
                  className="text-[11px] px-2 py-1 rounded bg-secondary border-none outline-none cursor-pointer"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
