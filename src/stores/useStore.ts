import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import { taskService } from '@/db/taskService';
import { goalService } from '@/db/goalService';
import { habitService } from '@/db/habitService';
import { journalService } from '@/db/journalService';
import { pomodoroService } from '@/db/pomodoroService';
import { mindmapService } from '@/db/mindmapService';
import { sdlcService } from '@/db/sdlcService';
import { calendarService } from '@/db/calendarService';
import { stickyNoteService } from '@/db/stickyNoteService';
import { resetProjectDatabase } from '@/db/projectDb';
import type {
  Project, Task, TaskStatus, ThemeName, ViewName,
  Goal, Habit, HabitLog, JournalEntry, PomodoroSession, MoodType, HabitFrequency, MindmapNode, SdlcPhase, CalendarEvent, StickyNote,
} from '@/types';

interface PomodoroState {
  isRunning: boolean;
  timeLeft: number;
  sessionType: 'work' | 'break';
  workDuration: number;
  breakDuration: number;
  sessionsCompleted: number;
  activeTaskId: string | null;
}

interface AppState {
  // Theme
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;

  // Projects
  projects: Project[];
  activeProjectId: string | null;
  setActiveProject: (id: string) => void;
  hydrateProject: (id: string) => Promise<void>;
  addProject: (name: string, description?: string, color?: string) => string;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;

  // Tasks
  tasks: Task[];
  addTask: (task: Partial<Task>) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  bulkUpdateTasks: (ids: string[], updates: Partial<Task>) => void;
  bulkDeleteTasks: (ids: string[]) => void;

  // Goals
  goals: Goal[];
  addGoal: (goal: Partial<Goal>) => string;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  // Habits
  habits: Habit[];
  habitLogs: HabitLog[];
  addHabit: (habit: Partial<Habit>) => string;
  deleteHabit: (id: string) => void;
  toggleHabitLog: (habitId: string, date: string) => void;

  // Journal
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: Partial<JournalEntry>) => string;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;

  // Calendar events
  calendarEvents: CalendarEvent[];
  addCalendarEvent: (event: Partial<CalendarEvent>) => string;
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;

  // Pomodoro
  pomodoro: PomodoroState;
  pomodoroSessions: PomodoroSession[];
  setPomodoroRunning: (running: boolean) => void;
  setPomodoroTimeLeft: (time: number) => void;
  setPomodoroSessionType: (type: 'work' | 'break') => void;
  setPomodoroActiveTask: (taskId: string | null) => void;
  setPomodoroSettings: (work: number, brk: number) => void;
  completePomodoroSession: () => void;
  resetPomodoro: () => void;
  addPomodoroSession: (session: Partial<PomodoroSession>) => string;
  updatePomodoroSession: (id: string, updates: Partial<PomodoroSession>) => void;
  deletePomodoroSession: (id: string) => void;

  // Mindmap
  mindmapNodes: MindmapNode[];
  addMindmapNode: (node: Partial<MindmapNode>) => string;
  updateMindmapNode: (id: string, updates: Partial<MindmapNode>) => void;
  deleteMindmapNode: (id: string) => void;
  stickyNotes: StickyNote[];
  addStickyNote: (note: Partial<StickyNote>) => string;
  updateStickyNote: (id: string, updates: Partial<StickyNote>) => void;
  deleteStickyNote: (id: string) => void;

  // SDLC
  sdlcPhases: SdlcPhase[];
  addSdlcPhase: (phase: Partial<SdlcPhase>) => string;
  updateSdlcPhase: (id: string, updates: Partial<SdlcPhase>) => void;
  deleteSdlcPhase: (id: string) => void;

  // View
  activeView: ViewName;
  setActiveView: (view: ViewName) => void;

  // UI
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  aiPanelOpen: boolean;
  toggleAiPanel: () => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  focusMode: boolean;
  toggleFocusMode: () => void;

  // Settings
  aiConfig: AIConfig;
  setAiConfig: (config: Partial<AIConfig>) => void;
  clockSettings: ClockSettings;
  setClockSettings: (settings: Partial<ClockSettings>) => void;

  // Computed
  getProjectTasks: (projectId: string) => Task[];
  getTasksByStatus: (projectId: string, status: TaskStatus) => Task[];
}

type AIProvider = 'browser' | 'huggingface' | 'anthropic' | 'openai';

interface AIConfig {
  provider: AIProvider;
  model: string;
  hfModelId?: string;
  apiKey?: string;
  preferApi?: boolean;
}

interface ClockSettings {
  primaryTimezone: string;
  secondaryTimezone?: string | null;
  secondaryEnabled: boolean;
  primaryFormat24h: boolean;
  secondaryFormat24h: boolean;
  primaryDigitalSkin: string;
  secondaryDigitalSkin: string;
  weatherEnabled?: boolean;
  weatherUnit?: 'c' | 'f';
  weatherLocationName?: string;
  // Backward compatibility for persisted state from previous versions.
  format24h?: boolean;
  digitalSkin?: string;
  analogSkin?: string;
}

const COLORS = ['#C46D4E', '#8B9E6B', '#5B8A9A', '#6B7DB3', '#B37DB3', '#B3896B', '#6BB39E', '#9E6B8B'];

const DEMO_PROJECT_ID = 'demo-project';
const DEMO_NOW = new Date();
const DEMO_NOW_ISO = DEMO_NOW.toISOString();
const DEMO_TODAY = DEMO_NOW_ISO.slice(0, 10);
const DEMO_TOMORROW = new Date(DEMO_NOW.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const DEMO_PROJECTS: Project[] = [
  {
    id: DEMO_PROJECT_ID,
    name: 'Demo Workspace',
    description: 'Seeded workspace with sample data for every section.',
    color: COLORS[0],
    createdAt: DEMO_NOW_ISO,
    updatedAt: DEMO_NOW_ISO,
  },
];

const DEMO_TASKS: Task[] = [
  {
    id: 'demo-task-1',
    projectId: DEMO_PROJECT_ID,
    title: 'Kickoff planning meeting',
    description: 'Align milestones and owners.',
    status: 'todo',
    priority: 'high',
    tags: ['planning'],
    parentId: null,
    goalId: 'demo-goal-1',
    kanbanColumn: 'todo',
    startDate: DEMO_TODAY,
    deadline: DEMO_TODAY,
    estimateMins: 45,
    actualMins: null,
    pomodoroCount: 0,
    createdAt: DEMO_NOW_ISO,
    updatedAt: DEMO_NOW_ISO,
  },
  {
    id: 'demo-task-2',
    projectId: DEMO_PROJECT_ID,
    title: 'Prototype UI review',
    description: 'Review first iteration with team.',
    status: 'in_progress',
    priority: 'medium',
    tags: ['design'],
    parentId: null,
    goalId: null,
    kanbanColumn: 'in_progress',
    startDate: DEMO_TODAY,
    deadline: DEMO_TOMORROW,
    estimateMins: 90,
    actualMins: 30,
    pomodoroCount: 1,
    createdAt: DEMO_NOW_ISO,
    updatedAt: DEMO_NOW_ISO,
  },
];

const DEMO_GOALS: Goal[] = [
  {
    id: 'demo-goal-1',
    projectId: DEMO_PROJECT_ID,
    title: 'Ship MVP dashboard',
    description: 'Core workflow screens ready for beta.',
    level: 'quarterly',
    parentId: null,
    progress: 35,
    targetDate: DEMO_TOMORROW,
    createdAt: DEMO_NOW_ISO,
    updatedAt: DEMO_NOW_ISO,
  },
];

const DEMO_HABITS: Habit[] = [
  {
    id: 'demo-habit-1',
    projectId: DEMO_PROJECT_ID,
    name: 'Daily standup notes',
    description: 'Capture top priorities every morning.',
    frequency: 'daily',
    color: COLORS[1],
    createdAt: DEMO_NOW_ISO,
  },
];

const DEMO_HABIT_LOGS: HabitLog[] = [
  {
    id: 'demo-habit-log-1',
    habitId: 'demo-habit-1',
    date: DEMO_TODAY,
    completed: true,
  },
];

const DEMO_JOURNAL: JournalEntry[] = [
  {
    id: 'demo-journal-1',
    projectId: DEMO_PROJECT_ID,
    title: 'Sprint reflection',
    content: 'Good velocity today. Need clearer QA handoff tomorrow.',
    mood: 'good',
    tags: ['sprint', 'retro'],
    createdAt: DEMO_NOW_ISO,
    updatedAt: DEMO_NOW_ISO,
  },
];

const DEMO_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'demo-cal-1',
    projectId: DEMO_PROJECT_ID,
    title: 'Team standup',
    description: '15-min async sync to align blockers.',
    date: DEMO_TODAY,
    time: '09:30',
    location: 'Huddle Room A',
    color: COLORS[2],
    allDay: false,
    createdAt: DEMO_NOW_ISO,
    updatedAt: DEMO_NOW_ISO,
  },
  {
    id: 'demo-cal-2',
    projectId: DEMO_PROJECT_ID,
    title: 'Release review',
    description: 'Walk through demo scope and QA results.',
    date: DEMO_TOMORROW,
    time: '15:00',
    location: 'Video call',
    color: COLORS[3],
    allDay: false,
    createdAt: DEMO_NOW_ISO,
    updatedAt: DEMO_NOW_ISO,
  },
];

const DEMO_POMODORO: PomodoroSession[] = [
  {
    id: 'demo-pomo-1',
    projectId: DEMO_PROJECT_ID,
    taskId: 'demo-task-2',
    startedAt: DEMO_NOW_ISO,
    duration: 25,
    type: 'work',
    completed: true,
  },
];

const DEMO_MINDMAP: MindmapNode[] = [
  {
    id: 'demo-node-root',
    projectId: DEMO_PROJECT_ID,
    label: 'Launch Plan',
    description: 'Root planning node',
    parentId: null,
    x: 0,
    y: 0,
    expanded: true,
    taskId: null,
    color: null,
    priority: null,
    createdAt: DEMO_NOW_ISO,
  },
  {
    id: 'demo-node-child',
    projectId: DEMO_PROJECT_ID,
    label: 'Marketing Tasks',
    description: 'Child node example',
    parentId: 'demo-node-root',
    x: 0,
    y: 0,
    expanded: true,
    taskId: 'demo-task-1',
    color: null,
    priority: 'medium',
    createdAt: DEMO_NOW_ISO,
  },
];

const DEMO_STICKY_NOTES: StickyNote[] = [
  {
    id: 'demo-note-1',
    projectId: DEMO_PROJECT_ID,
    title: 'Launch checklist',
    content: 'Collect QA sign-off, update changelog, announce in team channel.',
    color: '#FFE59A',
    linkedNodeId: 'demo-node-root',
    x: 28,
    y: 130,
    createdAt: DEMO_NOW_ISO,
    updatedAt: DEMO_NOW_ISO,
  },
];

const DEMO_SDLC: SdlcPhase[] = [
  {
    id: 'demo-sdlc-1',
    projectId: DEMO_PROJECT_ID,
    name: 'Planning',
    description: 'Define scope and requirements.',
    status: 'planned',
    owner: 'Team Lead',
    startDate: DEMO_TODAY,
    endDate: DEMO_TOMORROW,
    risk: 'Low',
    createdAt: DEMO_NOW_ISO,
    updatedAt: DEMO_NOW_ISO,
  },
];

const taskPersistTimers: Record<string, number | undefined> = {};
const mindmapPersistTimers: Record<string, number | undefined> = {};
const sdlcPersistTimers: Record<string, number | undefined> = {};
const calendarPersistTimers: Record<string, number | undefined> = {};
const stickyPersistTimers: Record<string, number | undefined> = {};

const scheduleTaskPersist = (projectId: string, getTasks: () => Task[]) => {
  if (!projectId) return;
  if (taskPersistTimers[projectId]) {
    clearTimeout(taskPersistTimers[projectId]);
  }
  taskPersistTimers[projectId] = window.setTimeout(async () => {
    try {
      const tasks = getTasks().filter((t) => t.projectId === projectId);
      await taskService.replaceAll(projectId, tasks);
    } catch (e) {
      console.error('Failed to persist tasks', e);
    }
  }, 500);
};

const scheduleMindmapPersist = (projectId: string, getNodes: () => MindmapNode[]) => {
  if (!projectId) return;
  if (mindmapPersistTimers[projectId]) {
    clearTimeout(mindmapPersistTimers[projectId]);
  }
  mindmapPersistTimers[projectId] = window.setTimeout(async () => {
    try {
      const nodes = getNodes().filter((n) => n.projectId === projectId);
      await mindmapService.replaceAll(projectId, nodes);
    } catch (e) {
      console.error('Failed to persist mindmap nodes', e);
    }
  }, 300);
};

const scheduleGoalPersist = (projectId: string, getGoals: () => Goal[]) => {
  if (!projectId) return;
  window.setTimeout(async () => {
    try {
      const goals = getGoals().filter((g) => g.projectId === projectId);
      await goalService.replaceAll(projectId, goals);
    } catch (e) {
      console.error('Failed to persist goals', e);
    }
  }, 300);
};

const scheduleHabitPersist = (projectId: string, getHabits: () => Habit[], getLogs: () => HabitLog[]) => {
  if (!projectId) return;
  window.setTimeout(async () => {
    try {
      const habits = getHabits().filter((h) => h.projectId === projectId);
      const logs = getLogs();
      await habitService.replaceAll(projectId, habits, logs);
    } catch (e) {
      console.error('Failed to persist habits', e);
    }
  }, 300);
};

const scheduleJournalPersist = (projectId: string, getEntries: () => JournalEntry[]) => {
  if (!projectId) return;
  window.setTimeout(async () => {
    try {
      const entries = getEntries().filter((j) => j.projectId === projectId);
      await journalService.replaceAll(projectId, entries);
    } catch (e) {
      console.error('Failed to persist journal', e);
    }
  }, 300);
};

const schedulePomodoroPersist = (projectId: string, getSessions: () => PomodoroSession[]) => {
  if (!projectId) return;
  window.setTimeout(async () => {
    try {
      const sessions = getSessions().filter((p) => p.projectId === projectId);
      await pomodoroService.replaceAll(projectId, sessions);
    } catch (e) {
      console.error('Failed to persist pomodoro sessions', e);
    }
  }, 300);
};

const scheduleSdlcPersist = (projectId: string, getPhases: () => SdlcPhase[]) => {
  if (!projectId) return;
  if (sdlcPersistTimers[projectId]) {
    clearTimeout(sdlcPersistTimers[projectId]);
  }
  sdlcPersistTimers[projectId] = window.setTimeout(async () => {
    try {
      const phases = getPhases().filter((p) => p.projectId === projectId);
      await sdlcService.replaceAll(projectId, phases);
    } catch (e) {
      console.error('Failed to persist SDLC phases', e);
    }
  }, 300);
};

const scheduleCalendarPersist = (projectId: string, getEvents: () => CalendarEvent[]) => {
  if (!projectId) return;
  if (calendarPersistTimers[projectId]) {
    clearTimeout(calendarPersistTimers[projectId]);
  }
  calendarPersistTimers[projectId] = window.setTimeout(async () => {
    try {
      const events = getEvents().filter((evt) => evt.projectId === projectId);
      await calendarService.replaceAll(projectId, events);
    } catch (e) {
      console.error('Failed to persist calendar events', e);
    }
  }, 300);
};

const scheduleStickyPersist = (projectId: string, getNotes: () => StickyNote[]) => {
  if (!projectId) return;
  if (stickyPersistTimers[projectId]) {
    clearTimeout(stickyPersistTimers[projectId]);
  }
  stickyPersistTimers[projectId] = window.setTimeout(async () => {
    try {
      const notes = getNotes().filter((note) => note.projectId === projectId);
      await stickyNoteService.replaceAll(projectId, notes);
    } catch (e) {
      console.error('Failed to persist sticky notes', e);
    }
  }, 300);
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'terracotta',
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },

      projects: DEMO_PROJECTS,
      activeProjectId: DEMO_PROJECT_ID,
      setActiveProject: (id) => {
        set({ activeProjectId: id });
        get().hydrateProject(id).catch((e) => console.error('Hydrate project failed', e));
      },
      hydrateProject: async (id) => {
        if (!id) return;
        const [tasks, goalsResult, journalEntries, pomodoroSessions, habitsResult, mindmapNodes, sdlcPhases, calendarEvents, stickyNotes] = await Promise.all([
          taskService.getAll(id),
          goalService.getAll(id),
          journalService.getAll(id),
          pomodoroService.getAll(id),
          habitService.getAll(id),
          mindmapService.getAll(id),
          sdlcService.getAll(id),
          calendarService.getAll(id),
          stickyNoteService.getAll(id),
        ]);

        set((s) => ({
          tasks: [...s.tasks.filter((t) => t.projectId !== id), ...tasks],
          goals: [...s.goals.filter((g) => g.projectId !== id), ...goalsResult],
          journalEntries: [...s.journalEntries.filter((j) => j.projectId !== id), ...journalEntries],
          pomodoroSessions: [...s.pomodoroSessions.filter((p) => p.projectId !== id), ...pomodoroSessions],
          habits: [...s.habits.filter((h) => h.projectId !== id), ...habitsResult.habits],
          habitLogs: [
            ...s.habitLogs.filter((l) => habitsResult.habitIds?.includes(l.habitId) === false),
            ...habitsResult.logs,
          ],
          mindmapNodes: [...s.mindmapNodes.filter((n) => n.projectId !== id), ...mindmapNodes],
          stickyNotes: [...s.stickyNotes.filter((n) => n.projectId !== id), ...stickyNotes],
          sdlcPhases: [...s.sdlcPhases.filter((p) => p.projectId !== id), ...sdlcPhases],
          calendarEvents: [...s.calendarEvents.filter((e) => e.projectId !== id), ...calendarEvents],
        }));
      },
      addProject: (name, description = '', color) => {
        const id = uuid();
        const project: Project = {
          id, name, description,
          color: color || COLORS[get().projects.length % COLORS.length],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ projects: [...s.projects, project], activeProjectId: id }));
        resetProjectDatabase(id).catch((e) => console.error('Init project DB failed', e));
        return id;
      },
      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          tasks: s.tasks.filter((t) => t.projectId !== id),
          goals: s.goals.filter((g) => g.projectId !== id),
          habits: s.habits.filter((h) => h.projectId !== id),
          habitLogs: s.habitLogs.filter((l) => s.habits.find((h) => h.id === l.habitId)?.projectId !== id),
          journalEntries: s.journalEntries.filter((j) => j.projectId !== id),
          pomodoroSessions: s.pomodoroSessions.filter((p) => p.projectId !== id),
          mindmapNodes: s.mindmapNodes.filter((n) => n.projectId !== id),
          stickyNotes: s.stickyNotes.filter((n) => n.projectId !== id),
          sdlcPhases: s.sdlcPhases.filter((p) => p.projectId !== id),
          calendarEvents: s.calendarEvents.filter((e) => e.projectId !== id),
          activeProjectId: s.activeProjectId === id ? (s.projects.find((p) => p.id !== id)?.id ?? null) : s.activeProjectId,
        })),
      renameProject: (id, name) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p)),
        })),

      // Tasks
      tasks: DEMO_TASKS,
      addTask: (partial) => {
        const id = uuid();
        const projectId = partial.projectId || get().activeProjectId;
        if (!projectId) return id;
        const task: Task = {
          id, projectId,
          title: partial.title || 'Untitled Task',
          description: partial.description || '',
          status: partial.status || 'todo',
          priority: partial.priority || 'none',
          tags: partial.tags || [],
          parentId: partial.parentId || null,
          goalId: partial.goalId || null,
          kanbanColumn: partial.kanbanColumn || partial.status || 'todo',
          startDate: partial.startDate || null,
          deadline: partial.deadline || null,
          estimateMins: partial.estimateMins || null,
          actualMins: partial.actualMins || null,
          pomodoroCount: partial.pomodoroCount || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ tasks: [...s.tasks, task] }));
        scheduleTaskPersist(projectId, () => get().tasks);
        return id;
      },
      updateTask: (id, updates) =>
        set((s) => {
          const tasks = s.tasks.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
          const task = tasks.find((t) => t.id === id);
          if (task?.projectId) scheduleTaskPersist(task.projectId, () => get().tasks);
          return { tasks };
        }),
      deleteTask: (id) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === id);
          const tasks = s.tasks.filter((t) => t.id !== id);
          if (task?.projectId) scheduleTaskPersist(task.projectId, () => get().tasks);
          return { tasks };
        }),
      bulkUpdateTasks: (ids, updates) =>
        set((s) => {
          const tasks = s.tasks.map((t) => (ids.includes(t.id) ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
          const projectId = tasks.find((t) => ids.includes(t.id))?.projectId;
          if (projectId) scheduleTaskPersist(projectId, () => get().tasks);
          return { tasks };
        }),
      bulkDeleteTasks: (ids) =>
        set((s) => {
          const projectId = s.tasks.find((t) => ids.includes(t.id))?.projectId;
          const tasks = s.tasks.filter((t) => !ids.includes(t.id));
          if (projectId) scheduleTaskPersist(projectId, () => get().tasks);
          return { tasks };
        }),

      // Goals
      goals: DEMO_GOALS,
      addGoal: (partial) => {
        const id = uuid();
        const projectId = partial.projectId || get().activeProjectId;
        if (!projectId) return id;
        const goal: Goal = {
          id, projectId,
          title: partial.title || 'New Goal',
          description: partial.description || '',
          level: partial.level || 'quarterly',
          parentId: partial.parentId || null,
          progress: partial.progress || 0,
          targetDate: partial.targetDate || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ goals: [...s.goals, goal] }));
        scheduleGoalPersist(projectId, () => get().goals);
        return id;
      },
      updateGoal: (id, updates) =>
        set((s) => {
          const goals = s.goals.map((g) => (g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g));
          const goal = goals.find((g) => g.id === id);
          if (goal?.projectId) scheduleGoalPersist(goal.projectId, () => get().goals);
          return { goals };
        }),
      deleteGoal: (id) =>
        set((s) => {
          const goal = s.goals.find((g) => g.id === id);
          const goals = s.goals.filter((g) => g.id !== id);
          const tasks = s.tasks.map((t) => (t.goalId === id ? { ...t, goalId: null } : t));
          if (goal?.projectId) scheduleGoalPersist(goal.projectId, () => get().goals);
          return { goals, tasks };
        }),

      // Habits
      habits: DEMO_HABITS,
      habitLogs: DEMO_HABIT_LOGS,
      addHabit: (partial) => {
        const id = uuid();
        const projectId = partial.projectId || get().activeProjectId;
        if (!projectId) return id;
        const habit: Habit = {
          id, projectId,
          name: partial.name || 'New Habit',
          description: partial.description || '',
          frequency: (partial.frequency as HabitFrequency) || 'daily',
          color: partial.color || COLORS[get().habits.length % COLORS.length],
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ habits: [...s.habits, habit] }));
        scheduleHabitPersist(projectId, () => get().habits, () => get().habitLogs);
        return id;
      },
      deleteHabit: (id) =>
        set((s) => {
          const habit = s.habits.find((h) => h.id === id);
          const habits = s.habits.filter((h) => h.id !== id);
          const habitLogs = s.habitLogs.filter((l) => l.habitId !== id);
          if (habit?.projectId) scheduleHabitPersist(habit.projectId, () => get().habits, () => get().habitLogs);
          return { habits, habitLogs };
        }),
      toggleHabitLog: (habitId, date) =>
        set((s) => {
          const existing = s.habitLogs.find((l) => l.habitId === habitId && l.date === date);
          let habitLogs = s.habitLogs;
          if (existing) {
            habitLogs = s.habitLogs.filter((l) => l.id !== existing.id);
          } else {
            habitLogs = [...s.habitLogs, { id: uuid(), habitId, date, completed: true }];
          }
          const habit = s.habits.find((h) => h.id === habitId);
          if (habit?.projectId) scheduleHabitPersist(habit.projectId, () => get().habits, () => get().habitLogs);
          return { habitLogs };
        }),

      // Journal
      journalEntries: DEMO_JOURNAL,
      addJournalEntry: (partial) => {
        const id = uuid();
        const projectId = partial.projectId || get().activeProjectId;
        if (!projectId) return id;
        const entry: JournalEntry = {
          id, projectId,
          title: partial.title || '',
          content: partial.content || '',
          mood: (partial.mood as MoodType) || null,
          tags: partial.tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ journalEntries: [...s.journalEntries, entry] }));
        scheduleJournalPersist(projectId, () => get().journalEntries);
        return id;
      },
      updateJournalEntry: (id, updates) =>
        set((s) => {
          const journalEntries = s.journalEntries.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          );
          const entry = journalEntries.find((e) => e.id === id);
          if (entry?.projectId) scheduleJournalPersist(entry.projectId, () => get().journalEntries);
          return { journalEntries };
        }),
      deleteJournalEntry: (id) =>
        set((s) => {
          const entry = s.journalEntries.find((e) => e.id === id);
          const journalEntries = s.journalEntries.filter((e) => e.id !== id);
          if (entry?.projectId) scheduleJournalPersist(entry.projectId, () => get().journalEntries);
          return { journalEntries };
        }),

      // Calendar events
      calendarEvents: DEMO_CALENDAR_EVENTS,
      addCalendarEvent: (partial) => {
        const id = uuid();
        const projectId = partial.projectId || get().activeProjectId;
        if (!projectId) return id;
        const event: CalendarEvent = {
          id,
          projectId,
          title: partial.title || 'New event',
          description: partial.description || '',
          date: partial.date || new Date().toISOString().slice(0, 10),
          time: partial.time ?? null,
          location: partial.location ?? null,
          color: partial.color ?? null,
          allDay: partial.allDay ?? !partial.time,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ calendarEvents: [...s.calendarEvents, event] }));
        scheduleCalendarPersist(projectId, () => get().calendarEvents);
        return id;
      },
      updateCalendarEvent: (id, updates) =>
        set((s) => {
          const calendarEvents = s.calendarEvents.map((evt) =>
            evt.id === id ? { ...evt, ...updates, updatedAt: new Date().toISOString() } : evt
          );
          const event = calendarEvents.find((e) => e.id === id);
          if (event?.projectId) scheduleCalendarPersist(event.projectId, () => get().calendarEvents);
          return { calendarEvents };
        }),
      deleteCalendarEvent: (id) =>
        set((s) => {
          const evt = s.calendarEvents.find((e) => e.id === id);
          const calendarEvents = s.calendarEvents.filter((e) => e.id !== id);
          if (evt?.projectId) scheduleCalendarPersist(evt.projectId, () => get().calendarEvents);
          return { calendarEvents };
        }),

      // Pomodoro
      pomodoro: {
        isRunning: false,
        timeLeft: 25 * 60,
        sessionType: 'work',
        workDuration: 25,
        breakDuration: 5,
        sessionsCompleted: 0,
        activeTaskId: null,
      },
      pomodoroSessions: DEMO_POMODORO,
      setPomodoroRunning: (running) => set((s) => ({ pomodoro: { ...s.pomodoro, isRunning: running } })),
      setPomodoroTimeLeft: (time) => set((s) => ({ pomodoro: { ...s.pomodoro, timeLeft: time } })),
      setPomodoroSessionType: (type) =>
        set((s) => ({
          pomodoro: {
            ...s.pomodoro,
            sessionType: type,
            timeLeft: type === 'work' ? s.pomodoro.workDuration * 60 : s.pomodoro.breakDuration * 60,
          },
        })),
      setPomodoroActiveTask: (taskId) => set((s) => ({ pomodoro: { ...s.pomodoro, activeTaskId: taskId } })),
      setPomodoroSettings: (work, brk) =>
        set((s) => ({
          pomodoro: {
            ...s.pomodoro,
            workDuration: work,
            breakDuration: brk,
            timeLeft: s.pomodoro.sessionType === 'work' ? work * 60 : brk * 60,
            isRunning: false,
          },
        })),
      completePomodoroSession: () =>
        set((s) => {
          const session: PomodoroSession = {
            id: uuid(),
            projectId: s.activeProjectId || '',
            taskId: s.pomodoro.activeTaskId,
            startedAt: new Date().toISOString(),
            duration: s.pomodoro.sessionType === 'work' ? s.pomodoro.workDuration : s.pomodoro.breakDuration,
            type: s.pomodoro.sessionType,
            completed: true,
          };

          const nextType = s.pomodoro.sessionType === 'work' ? 'break' : 'work';
          const nextSessionsCompleted = s.pomodoro.sessionType === 'work'
            ? s.pomodoro.sessionsCompleted + 1
            : s.pomodoro.sessionsCompleted;

          let tasks = s.tasks;
          if (s.pomodoro.sessionType === 'work' && s.pomodoro.activeTaskId) {
            tasks = tasks.map((t) =>
              t.id === s.pomodoro.activeTaskId
                ? { ...t, pomodoroCount: t.pomodoroCount + 1, updatedAt: new Date().toISOString() }
                : t
            );
          }

          const projectId = s.activeProjectId;
          if (projectId) {
            schedulePomodoroPersist(projectId, () => get().pomodoroSessions);
            scheduleTaskPersist(projectId, () => get().tasks);
          }

          return {
            pomodoroSessions: [...s.pomodoroSessions, session],
            tasks,
            pomodoro: {
              ...s.pomodoro,
              isRunning: false,
              sessionsCompleted: nextSessionsCompleted,
              sessionType: nextType,
              timeLeft: nextType === 'work' ? s.pomodoro.workDuration * 60 : s.pomodoro.breakDuration * 60,
            },
          };
        }),
      resetPomodoro: () =>
        set((s) => ({
          pomodoro: {
            ...s.pomodoro,
            isRunning: false,
            timeLeft: s.pomodoro.workDuration * 60,
            sessionType: 'work',
            sessionsCompleted: 0,
          },
        })),
      addPomodoroSession: (partial) => {
        const id = uuid();
        const projectId = partial.projectId || get().activeProjectId;
        if (!projectId) return id;
        const session: PomodoroSession = {
          id,
          projectId,
          taskId: partial.taskId ?? null,
          startedAt: partial.startedAt || new Date().toISOString(),
          duration: partial.duration ?? get().pomodoro.workDuration,
          type: (partial.type as PomodoroSession['type']) || 'work',
          completed: partial.completed ?? true,
        };
        set((s) => ({ pomodoroSessions: [...s.pomodoroSessions, session] }));
        schedulePomodoroPersist(projectId, () => get().pomodoroSessions);
        return id;
      },
      updatePomodoroSession: (id, updates) =>
        set((s) => {
          const pomodoroSessions = s.pomodoroSessions.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          );
          const session = pomodoroSessions.find((p) => p.id === id);
          if (session?.projectId) schedulePomodoroPersist(session.projectId, () => get().pomodoroSessions);
          return { pomodoroSessions };
        }),
      deletePomodoroSession: (id) =>
        set((s) => {
          const session = s.pomodoroSessions.find((p) => p.id === id);
          const pomodoroSessions = s.pomodoroSessions.filter((p) => p.id !== id);
          if (session?.projectId) schedulePomodoroPersist(session.projectId, () => get().pomodoroSessions);
          return { pomodoroSessions };
        }),

      // Mindmap
      mindmapNodes: DEMO_MINDMAP,
      addMindmapNode: (partial) => {
        const id = uuid();
        const projectId = partial.projectId || get().activeProjectId;
        if (!projectId) return id;
        const node: MindmapNode = {
          id,
          projectId,
          label: partial.label || 'Node',
          description: partial.description || '',
          parentId: partial.parentId ?? null,
          x: partial.x ?? 0,
          y: partial.y ?? 0,
          expanded: partial.expanded ?? true,
          taskId: partial.taskId ?? null,
          color: partial.color ?? null,
          priority: (partial.priority as any) ?? null,
          createdAt: partial.createdAt || new Date().toISOString(),
        };
        set((s) => ({ mindmapNodes: [...s.mindmapNodes, node] }));
        scheduleMindmapPersist(projectId, () => get().mindmapNodes);
        return id;
      },
      updateMindmapNode: (id, updates) =>
        set((s) => {
          const mindmapNodes = s.mindmapNodes.map((n) => (n.id === id ? { ...n, ...updates } : n));
          const node = mindmapNodes.find((n) => n.id === id);
          if (node?.projectId) scheduleMindmapPersist(node.projectId, () => get().mindmapNodes);
          return { mindmapNodes };
        }),
      deleteMindmapNode: (id) =>
        set((s) => {
          const node = s.mindmapNodes.find((n) => n.id === id);
          const mindmapNodes = s.mindmapNodes.filter((n) => n.id !== id);
          const stickyNotes = s.stickyNotes.map((note) =>
            note.linkedNodeId === id ? { ...note, linkedNodeId: null, updatedAt: new Date().toISOString() } : note
          );
          if (node?.projectId) scheduleMindmapPersist(node.projectId, () => get().mindmapNodes);
          if (node?.projectId) scheduleStickyPersist(node.projectId, () => get().stickyNotes);
          return { mindmapNodes, stickyNotes };
        }),
      stickyNotes: DEMO_STICKY_NOTES,
      addStickyNote: (partial) => {
        const id = uuid();
        const projectId = partial.projectId || get().activeProjectId;
        if (!projectId) return id;
        const now = new Date().toISOString();
        const note: StickyNote = {
          id,
          projectId,
          title: partial.title || 'Sticky note',
          content: partial.content || '',
          color: partial.color || '#FFE59A',
          linkedNodeId: partial.linkedNodeId ?? null,
          x: partial.x ?? (24 + (get().stickyNotes.filter((n) => n.projectId === projectId).length % 4) * 28),
          y: partial.y ?? (120 + (get().stickyNotes.filter((n) => n.projectId === projectId).length % 5) * 22),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ stickyNotes: [note, ...s.stickyNotes] }));
        scheduleStickyPersist(projectId, () => get().stickyNotes);
        return id;
      },
      updateStickyNote: (id, updates) =>
        set((s) => {
          const stickyNotes = s.stickyNotes.map((note) =>
            note.id === id ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note
          );
          const note = stickyNotes.find((n) => n.id === id);
          if (note?.projectId) scheduleStickyPersist(note.projectId, () => get().stickyNotes);
          return { stickyNotes };
        }),
      deleteStickyNote: (id) =>
        set((s) => {
          const note = s.stickyNotes.find((n) => n.id === id);
          const stickyNotes = s.stickyNotes.filter((n) => n.id !== id);
          if (note?.projectId) scheduleStickyPersist(note.projectId, () => get().stickyNotes);
          return { stickyNotes };
        }),

      // SDLC
      sdlcPhases: DEMO_SDLC,
      addSdlcPhase: (partial) => {
        const id = uuid();
        const projectId = partial.projectId || get().activeProjectId;
        if (!projectId) return id;
        const phase: SdlcPhase = {
          id,
          projectId,
          name: partial.name || 'Phase',
          description: partial.description || '',
          status: (partial.status as SdlcPhase['status']) || 'planned',
          owner: partial.owner || '',
          startDate: partial.startDate ?? null,
          endDate: partial.endDate ?? null,
          risk: partial.risk || '',
          createdAt: partial.createdAt || new Date().toISOString(),
          updatedAt: partial.updatedAt || new Date().toISOString(),
        };
        set((s) => ({ sdlcPhases: [...s.sdlcPhases, phase] }));
        scheduleSdlcPersist(projectId, () => get().sdlcPhases);
        return id;
      },
      updateSdlcPhase: (id, updates) =>
        set((s) => {
          const sdlcPhases = s.sdlcPhases.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
          const phase = sdlcPhases.find((p) => p.id === id);
          if (phase?.projectId) scheduleSdlcPersist(phase.projectId, () => get().sdlcPhases);
          return { sdlcPhases };
        }),
      deleteSdlcPhase: (id) =>
        set((s) => {
          const phase = s.sdlcPhases.find((p) => p.id === id);
          const sdlcPhases = s.sdlcPhases.filter((p) => p.id !== id);
          if (phase?.projectId) scheduleSdlcPersist(phase.projectId, () => get().sdlcPhases);
          return { sdlcPhases };
        }),

      activeView: 'todo',
      setActiveView: (view) => set({ activeView: view }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      aiPanelOpen: false,
      toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      focusMode: false,
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),

      aiConfig: {
        provider: 'browser',
        model: 'Xenova/Phi-3-mini-4k-instruct',
        hfModelId: 'Xenova/Phi-3-mini-4k-instruct',
        preferApi: false,
      },
      setAiConfig: (config) => set((s) => ({ aiConfig: { ...s.aiConfig, ...config } })),

      clockSettings: {
        primaryTimezone: (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Kolkata') || 'Asia/Kolkata',
        secondaryTimezone: 'Etc/UTC',
        secondaryEnabled: true,
        primaryFormat24h: false,
        secondaryFormat24h: false,
        primaryDigitalSkin: 'minimal',
        secondaryDigitalSkin: 'minimal',
        weatherEnabled: true,
        weatherUnit: 'c',
      },
      setClockSettings: (settings) => set((s) => ({ clockSettings: { ...s.clockSettings, ...settings } })),

      getProjectTasks: (projectId) => get().tasks.filter((t) => t.projectId === projectId),
      getTasksByStatus: (projectId, status) =>
        get().tasks.filter((t) => t.projectId === projectId && t.status === status),
    }),
    {
      name: 'lifeos_global',
      partialize: (state) => ({
        theme: state.theme,
        projects: state.projects,
        tasks: state.tasks,
        calendarEvents: state.calendarEvents,
        goals: state.goals,
        habits: state.habits,
        habitLogs: state.habitLogs,
        journalEntries: state.journalEntries,
        pomodoroSessions: state.pomodoroSessions,
        mindmapNodes: state.mindmapNodes,
        stickyNotes: state.stickyNotes,
        sdlcPhases: state.sdlcPhases,
        pomodoro: {
          workDuration: state.pomodoro.workDuration,
          breakDuration: state.pomodoro.breakDuration,
          sessionsCompleted: state.pomodoro.sessionsCompleted,
        },
        activeProjectId: state.activeProjectId,
        activeView: state.activeView,
        sidebarCollapsed: state.sidebarCollapsed,
        aiConfig: state.aiConfig,
        clockSettings: state.clockSettings,
      }),
    }
  )
);
