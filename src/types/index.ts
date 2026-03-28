export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked' | 'backlog';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';
export type ThemeName = 'terracotta' | 'sage' | 'ocean' | 'midnight';
export type ViewName = 'todo' | 'kanban' | 'calendar' | 'pomodoro' | 'habits' | 'journal' | 'goals' | 'mindmap' | 'sdlc';
export type GoalLevel = 'life' | 'quarterly' | 'weekly';
export type HabitFrequency = 'daily' | 'weekly';
export type MoodType = 'great' | 'good' | 'neutral' | 'bad' | 'terrible';

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  parentId: string | null;
  goalId: string | null;
  kanbanColumn: string;
  sdlcPhase?: string | null;
  calendarScheduled?: string | null;
  startDate: string | null;
  deadline: string | null;
  estimateMins: number | null;
  actualMins: number | null;
  pomodoroCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  projectId: string;
  title: string;
  description: string;
  level: GoalLevel;
  parentId: string | null;
  progress: number; // 0-100
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Habit {
  id: string;
  projectId: string;
  name: string;
  description: string;
  frequency: HabitFrequency;
  color: string;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

export interface CalendarEvent {
  id: string;
  projectId: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:mm or null for all-day
  location: string | null;
  color: string | null;
  allDay: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  projectId: string;
  title: string;
  content: string;
  mood: MoodType | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PomodoroSession {
  id: string;
  projectId: string;
  taskId: string | null;
  startedAt: string;
  duration: number; // minutes
  type: 'work' | 'break';
  completed: boolean;
}

export interface MindmapNode {
  id: string;
  projectId: string;
  label: string;
  description: string;
  parentId: string | null;
  x: number;
  y: number;
  expanded: boolean;
  taskId: string | null;
  color: string | null;
  priority: TaskPriority | null;
  createdAt: string;
}

export interface StickyNote {
  id: string;
  projectId: string;
  title: string;
  content: string;
  color: string;
  linkedNodeId: string | null;
  x: number;
  y: number;
  createdAt: string;
  updatedAt: string;
}

export interface SdlcPhase {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: 'planned' | 'in_progress' | 'done' | 'blocked';
  owner: string;
  startDate: string | null;
  endDate: string | null;
  risk: string;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  status: TaskStatus;
  order: number;
}

export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', title: 'Backlog', status: 'backlog', order: 0 },
  { id: 'todo', title: 'Todo', status: 'todo', order: 1 },
  { id: 'in_progress', title: 'In Progress', status: 'in_progress', order: 2 },
  { id: 'blocked', title: 'Blocked', status: 'blocked', order: 3 },
  { id: 'done', title: 'Done', status: 'done', order: 4 },
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
  backlog: 'Backlog',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'None',
};

export const MOOD_EMOJI: Record<MoodType, string> = {
  great: '😄',
  good: '🙂',
  neutral: '😐',
  bad: '😔',
  terrible: '😢',
};

export const GOAL_LEVEL_LABELS: Record<GoalLevel, string> = {
  life: 'Life Goal',
  quarterly: 'Quarterly',
  weekly: 'Weekly',
};

export const PROJECT_COLORS = [
  '#C46D4E', '#8B9E6B', '#5B8A9A', '#6B7DB3',
  '#B37DB3', '#B3896B', '#6BB39E', '#9E6B8B',
];

export const HABIT_COLORS = [
  '#C46D4E', '#8B9E6B', '#5B8A9A', '#6B7DB3',
  '#B37DB3', '#E8A87C', '#6BB39E', '#D4A574',
];
