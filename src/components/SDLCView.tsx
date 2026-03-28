import { useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { Plus, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-100',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100',
  blocked: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100',
};

export function SDLCView() {
  const {
    activeProjectId,
    sdlcPhases,
    addSdlcPhase,
    updateSdlcPhase,
    deleteSdlcPhase,
  } = useStore();

  const projectPhases = useMemo(
    () => sdlcPhases.filter((p) => p.projectId === activeProjectId),
    [sdlcPhases, activeProjectId]
  );

  const addPhase = () => addSdlcPhase({ name: 'New Phase', status: 'planned' });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">SDLC Planner</h2>
          <p className="text-sm text-muted-foreground">Track phases, owners, and risks per project.</p>
        </div>
        <button
          onClick={addPhase}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Add Phase
        </button>
      </div>

      {projectPhases.length === 0 && (
        <div className="text-sm text-muted-foreground">No phases yet. Add your first phase.</div>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {projectPhases.map((phase) => (
            <motion.div
              key={phase.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-lg border border-border bg-card p-3 shadow-sm space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <input
                  value={phase.name}
                  onChange={(e) => updateSdlcPhase(phase.id, { name: e.target.value })}
                  className="w-full bg-transparent text-sm font-semibold outline-none"
                />
                <button
                  onClick={() => deleteSdlcPhase(phase.id)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <textarea
                value={phase.description}
                onChange={(e) => updateSdlcPhase(phase.id, { description: e.target.value })}
                placeholder="Description"
                className="w-full text-sm bg-transparent outline-none resize-none"
                rows={2}
              />

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={phase.status}
                  onChange={(e) => updateSdlcPhase(phase.id, { status: e.target.value as any })}
                  className="rounded-md border border-border bg-surface-elevated/70 px-2 py-1 text-xs text-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
                >
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                </select>
                <input
                  value={phase.owner}
                  onChange={(e) => updateSdlcPhase(phase.id, { owner: e.target.value })}
                  placeholder="Owner"
                  className="flex-1 min-w-[80px] rounded-md border border-border bg-surface-elevated/70 px-2 py-1 text-xs text-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <div className={`px-2 py-1 rounded ${STATUS_COLORS[phase.status] || STATUS_COLORS.planned}`}>
                  {phase.status.replace('_', ' ')}
                </div>
                <div className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <input
                    type="date"
                    value={phase.startDate ?? ''}
                    onChange={(e) => updateSdlcPhase(phase.id, { startDate: e.target.value || null })}
                    className="border border-border rounded px-1.5 py-1 bg-surface-elevated/70 text-foreground text-[11px] focus:border-primary focus:ring-1 focus:ring-primary/50"
                  />
                  <span>→</span>
                  <input
                    type="date"
                    value={phase.endDate ?? ''}
                    onChange={(e) => updateSdlcPhase(phase.id, { endDate: e.target.value || null })}
                    className="border border-border rounded px-1.5 py-1 bg-surface-elevated/70 text-foreground text-[11px] focus:border-primary focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="w-3 h-3 mt-0.5" />
                <textarea
                  value={phase.risk}
                  onChange={(e) => updateSdlcPhase(phase.id, { risk: e.target.value })}
                  placeholder="Risks or blockers"
                  className="w-full bg-transparent outline-none resize-none"
                  rows={2}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
