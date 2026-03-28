import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/stores/useStore';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ViewName } from '@/types';
import {
  CheckSquare, Layout, Timer, Target, BookOpen, TrendingUp,
  GitBranch, Brain, FolderPlus, ChevronLeft, ChevronRight,
  MoreHorizontal, Trash2, Edit3, Plus, Search, Calendar as CalendarIcon,
} from 'lucide-react';

const NAV_ITEMS: { view: ViewName; label: string; icon: React.ElementType }[] = [
  { view: 'todo', label: 'Tasks', icon: CheckSquare },
  { view: 'kanban', label: 'Kanban', icon: Layout },
  { view: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { view: 'pomodoro', label: 'Pomodoro', icon: Timer },
  { view: 'habits', label: 'Habits', icon: TrendingUp },
  { view: 'journal', label: 'Journal', icon: BookOpen },
  { view: 'goals', label: 'Goals', icon: Target },
  { view: 'mindmap', label: 'Mind Map', icon: GitBranch },
  { view: 'sdlc', label: 'SDLC', icon: Brain },
];

export function Sidebar() {
  const {
    projects, activeProjectId, setActiveProject, addProject, deleteProject, renameProject,
    activeView, setActiveView, sidebarCollapsed, toggleSidebar,
  } = useStore();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [contextMenu, setContextMenu] = useState<string | null>(null);
  const [contextPos, setContextPos] = useState<{ x: number; y: number } | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#5B8A9A');

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    const fallbackName = `Project ${projects.length + 1}`;
    const name = newProjectName.trim() || fallbackName;
    addProject(name, '', newProjectColor);
    setNewProjectName('');
    setShowCreateProject(false);
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameProject(id, editName.trim());
    }
    setEditingId(null);
  };

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
    setContextMenu(null);
  };

  const collapsed = sidebarCollapsed || isMobile;
  const expandedWidth = 240;
  const collapsedWidth = 48;

  if (collapsed) {
    return (
      <motion.aside
        initial={{ width: collapsedWidth }}
        animate={{ width: collapsedWidth }}
        className="h-full flex flex-col items-center py-3 gap-1 border-r border-border bg-sidebar-bg shrink-0"
      >
        {!isMobile && (
          <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-sidebar-hover transition-colors mb-2">
            <ChevronRight className="w-4 h-4 text-sidebar-fg" />
          </button>
        )}
        {NAV_ITEMS.map(({ view, icon: Icon }) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`p-2 rounded-lg transition-colors ${activeView === view ? 'bg-sidebar-active text-primary-foreground' : 'hover:bg-sidebar-hover text-sidebar-fg'}`}
            title={view}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </motion.aside>
    );
  }

  return (
    <motion.aside
      initial={{ width: expandedWidth }}
      animate={{ width: expandedWidth }}
      className="h-full flex flex-col border-r border-border bg-sidebar-bg shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-sidebar-fg tracking-tight">Life OS</h1>
        <button onClick={toggleSidebar} className="p-1.5 rounded-md hover:bg-sidebar-hover transition-colors">
          <ChevronLeft className="w-3.5 h-3.5 text-sidebar-fg" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-sidebar-hover border-none outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Projects */}
      <div className="px-2 pb-2">
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Projects</span>
          <button onClick={() => setShowCreateProject((v) => !v)} className="p-1 rounded hover:bg-sidebar-hover transition-colors">
            <Plus className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
        <AnimatePresence>
          {showCreateProject && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-2"
            >
              <div className="rounded-md border border-border bg-sidebar-hover/70 p-2 space-y-2">
                <input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Workspace name"
                  className="w-full px-2 py-1 text-xs rounded bg-background border border-border outline-none"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newProjectColor}
                    onChange={(e) => setNewProjectColor(e.target.value)}
                    className="h-7 w-9 rounded border border-border bg-background"
                  />
                  <button
                    onClick={handleCreate}
                    className="flex-1 text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90"
                  >
                    Create workspace
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="space-y-0.5 max-h-[200px] overflow-y-auto scrollbar-thin">
          {filtered.map((project) => (
            <div
              key={project.id}
              className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${
                activeProjectId === project.id
                  ? 'bg-sidebar-active/10 text-sidebar-active font-medium'
                  : 'text-sidebar-fg hover:bg-sidebar-hover'
              }`}
              onClick={() => setActiveProject(project.id)}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
              {editingId === project.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleRename(project.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(project.id)}
                  className="flex-1 bg-transparent outline-none text-xs"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 truncate">{project.name}</span>
              )}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                    setContextPos({ x: rect.right + 4, y: rect.bottom + 4 });
                    setContextMenu(contextMenu === project.id ? null : project.id);
                  }}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-sidebar-hover transition-all"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {contextMenu === project.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="fixed z-[120] bg-popover border border-border rounded-lg shadow-elevated py-1 w-36"
                      style={{ left: contextPos?.x ?? 0, top: contextPos?.y ?? 0 }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); startRename(project.id, project.name); }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                      >
                        <Edit3 className="w-3 h-3" /> Rename
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteProject(project.id); setContextMenu(null); setContextPos(null); }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted transition-colors text-destructive"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
          {filtered.length === 0 && projects.length === 0 && (
            <button onClick={handleCreate} className="w-full text-center py-4 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Create your first project
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-2 overflow-y-auto scrollbar-thin">
        <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Views</span>
        <div className="mt-1 space-y-0.5">
          {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-xs transition-colors ${
                activeView === view
                  ? 'bg-sidebar-active/10 text-sidebar-active font-medium'
                  : 'text-sidebar-fg hover:bg-sidebar-hover'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}
