import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { StatusBar } from '@/components/StatusBar';
import { TodoView } from '@/components/TodoView';
import { KanbanView } from '@/components/KanbanView';
import { HabitsView } from '@/components/HabitsView';
import { JournalView } from '@/components/JournalView';
import { GoalsView } from '@/components/GoalsView';
import { PomodoroView } from '@/components/PomodoroView';
import { CalendarView } from '@/components/CalendarView';
import { MindmapView } from '@/components/MindmapView';
import { SDLCView } from '@/components/SDLCView';
import { AiPanel } from '@/ai/AiPanel';
import { CommandPalette } from '@/components/CommandPalette';
import { StickyNotesOverlay } from '@/components/StickyNotesOverlay';
import { PlaceholderView } from '@/components/PlaceholderView';

function Workspace() {
  const { activeView } = useStore();

  switch (activeView) {
    case 'todo':
      return <TodoView />;
    case 'kanban':
      return <KanbanView />;
    case 'pomodoro':
      return <PomodoroView />;
    case 'habits':
      return <HabitsView />;
    case 'journal':
      return <JournalView />;
    case 'goals':
      return <GoalsView />;
    case 'calendar':
      return <CalendarView />;
    case 'mindmap':
      return <MindmapView />;
    case 'sdlc':
      return <SDLCView />;
    default:
      return <PlaceholderView view={activeView} />;
  }
}

export default function Index() {
  const { theme, focusMode, activeProjectId, setActiveProject, projects, isInitialized } = useStore();
  const params = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const store = useStore.getState();
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'n' && !e.shiftKey) {
          e.preventDefault();
          if (store.activeProjectId) store.addTask({ title: '', status: 'todo' });
        }
        if (e.key === 'n' && e.shiftKey) {
          e.preventDefault();
          store.addProject('New Project');
        }
      }
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const views = ['todo', 'kanban', 'calendar', 'pomodoro', 'habits', 'journal', 'goals', 'mindmap', 'sdlc'] as const;
        const idx = parseInt(e.key) - 1;
        if (idx < views.length) store.setActiveView(views[idx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const paramId = params.projectId;
    if (paramId && paramId !== activeProjectId) {
      const exists = projects.find((p) => p.id === paramId);
      if (exists) setActiveProject(paramId);
    }
  }, [params.projectId, activeProjectId, projects, setActiveProject]);

  useEffect(() => {
    if (!isInitialized) return;

    const paramId = params.projectId;
    if (activeProjectId) {
      navigate(`/workspace/${activeProjectId}`, { replace: true });
      return;
    }

    if (!paramId) {
      navigate('/welcome', { replace: true });
      return;
    }

    const exists = projects.some((p) => p.id === paramId);
    if (!exists) {
      navigate('/welcome', { replace: true });
    }
  }, [activeProjectId, isInitialized, navigate, params.projectId, projects]);

  if (!activeProjectId) {
    return null;
  }

  return (
    <div className="h-screen min-h-0 flex flex-col overflow-hidden bg-background">
      <TopBar />
      <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden">
        {!focusMode && <Sidebar />}
        <main className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
          <Workspace />
        </main>
        <AnimatePresence>
          {!focusMode && <AiPanel />}
        </AnimatePresence>
      </div>
      <StatusBar />
      <CommandPalette />
      <StickyNotesOverlay />
    </div>
  );
}
