import { useStore } from '@/stores/useStore';
import { format } from 'date-fns';
import { Wifi, Save, Timer } from 'lucide-react';

export function StatusBar() {
  const { activeProjectId, projects, tasks, focusMode, aiConfig } = useStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const projectTasks = activeProjectId ? tasks.filter((t) => t.projectId === activeProjectId) : [];
  const pendingCount = projectTasks.filter((t) => t.status !== 'done').length;
  const today = format(new Date(), 'eee, MMM d');

  return (
    <footer className="h-10 flex items-center justify-between px-4 border-t border-border bg-surface-sunken text-[11px] text-muted-foreground shrink-0 select-none">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <Save className="w-3 h-3" />
          Saved
        </span>
        {project && <span className="truncate max-w-[160px]">{project.name}</span>}
        <span>{today}</span>
      </div>

      <div className="flex items-center gap-3">
        {pendingCount > 0 && (
          <span className="tabular-nums">{pendingCount} pending</span>
        )}
        {focusMode && (
          <span className="flex items-center gap-1 text-primary">
            <Timer className="w-3 h-3" />
            Focus
          </span>
        )}
        <span className="flex items-center gap-1">
          <Wifi className="w-3 h-3" />
          {aiConfig.provider === 'browser' ? 'Local AI' : aiConfig.provider}
        </span>
      </div>
    </footer>
  );
}
