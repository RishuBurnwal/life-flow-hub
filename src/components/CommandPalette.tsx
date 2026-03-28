import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command } from 'cmdk';
import { useStore } from '@/stores/useStore';
import type { ViewName, ThemeName } from '@/types';
import {
  CheckSquare, Layout, Calendar, Target, BookOpen, TrendingUp,
  GitBranch, Brain, Plus, Palette, Sun, Moon, Trees, Waves,
  Search, Zap, FolderPlus
} from 'lucide-react';

const VIEWS: { view: ViewName; label: string; icon: React.ElementType }[] = [
  { view: 'todo', label: 'Tasks', icon: CheckSquare },
  { view: 'kanban', label: 'Kanban', icon: Layout },
  { view: 'calendar', label: 'Calendar', icon: Calendar },
  { view: 'habits', label: 'Habits', icon: TrendingUp },
  { view: 'journal', label: 'Journal', icon: BookOpen },
  { view: 'goals', label: 'Goals', icon: Target },
  { view: 'mindmap', label: 'Mind Map', icon: GitBranch },
  { view: 'sdlc', label: 'SDLC', icon: Brain },
];

const THEMES: { name: ThemeName; label: string; icon: React.ElementType }[] = [
  { name: 'terracotta', label: 'Warm Terracotta', icon: Sun },
  { name: 'sage', label: 'Forest Sage', icon: Trees },
  { name: 'ocean', label: 'Ocean Slate', icon: Waves },
  { name: 'midnight', label: 'Midnight', icon: Moon },
];

export function CommandPalette() {
  const {
    commandPaletteOpen, setCommandPaletteOpen,
    setActiveView, setTheme, addTask, addProject, activeProjectId, toggleFocusMode
  } = useStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setCommandPaletteOpen(false);
  }, [setCommandPaletteOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!commandPaletteOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-foreground/20 backdrop-blur-sm"
        onClick={() => setCommandPaletteOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-lg bg-popover border border-border rounded-xl shadow-elevated overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <Command className="bg-transparent">
            <div className="flex items-center gap-2 px-4 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <Command.Input
                placeholder="Type a command or search…"
                className="flex-1 py-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Close</span>
            </div>
            <Command.List className="max-h-72 overflow-y-auto p-2 scrollbar-thin">
              <Command.Empty className="text-center py-6 text-sm text-muted-foreground">No results found.</Command.Empty>

              <Command.Group heading="Navigate" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {VIEWS.map(({ view, label, icon: Icon }) => (
                  <Command.Item
                    key={view}
                    value={`go to ${label}`}
                    onSelect={() => { setActiveView(view); setCommandPaletteOpen(false); }}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm cursor-pointer data-[selected=true]:bg-muted transition-colors"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    {label}
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                <Command.Item
                  value="new task"
                  onSelect={() => {
                    if (activeProjectId) addTask({ title: 'New Task', status: 'todo' });
                    setCommandPaletteOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm cursor-pointer data-[selected=true]:bg-muted transition-colors"
                >
                  <Plus className="w-4 h-4 text-muted-foreground" />
                  New Task
                </Command.Item>
                <Command.Item
                  value="new project"
                  onSelect={() => { addProject('New Project'); setCommandPaletteOpen(false); }}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm cursor-pointer data-[selected=true]:bg-muted transition-colors"
                >
                  <FolderPlus className="w-4 h-4 text-muted-foreground" />
                  New Project
                </Command.Item>
                <Command.Item
                  value="toggle focus mode"
                  onSelect={() => { toggleFocusMode(); setCommandPaletteOpen(false); }}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm cursor-pointer data-[selected=true]:bg-muted transition-colors"
                >
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  Toggle Focus Mode
                </Command.Item>
              </Command.Group>

              <Command.Group heading="Theme" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {THEMES.map(({ name, label, icon: Icon }) => (
                  <Command.Item
                    key={name}
                    value={`theme ${label}`}
                    onSelect={() => { setTheme(name); setCommandPaletteOpen(false); }}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm cursor-pointer data-[selected=true]:bg-muted transition-colors"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    {label}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
