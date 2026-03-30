export const PROJECT_SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT CHECK(priority IN ('urgent','high','medium','low','none')) DEFAULT 'none',
  status TEXT CHECK(status IN ('todo','in_progress','done','blocked','backlog')) DEFAULT 'todo',
  start_date TEXT,
  deadline TEXT,
  estimate_mins INTEGER DEFAULT 0,
  actual_mins INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]',
  parent_id TEXT DEFAULT NULL,
  sdlc_phase TEXT DEFAULT NULL,
  goal_id TEXT DEFAULT NULL,
  kanban_column TEXT DEFAULT 'todo',
  calendar_scheduled TEXT DEFAULT NULL,
  pomodoro_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  date TEXT NOT NULL,
  time TEXT,
  location TEXT,
  color TEXT,
  all_day INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  level TEXT CHECK(level IN ('life','quarterly','weekly')) NOT NULL,
  parent_id TEXT DEFAULT NULL,
  progress REAL DEFAULT 0,
  deadline TEXT,
  color TEXT DEFAULT '#D4956A',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  frequency TEXT CHECK(frequency IN ('daily','weekly')) DEFAULT 'daily',
  streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  color TEXT DEFAULT '#D4956A',
  last_done TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  habit_id TEXT NOT NULL,
  completed_at TEXT DEFAULT (datetime('now')),
  note TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS journal (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  date TEXT UNIQUE NOT NULL,
  content TEXT DEFAULT '',
  ai_summary TEXT DEFAULT '',
  mood TEXT DEFAULT '',
  word_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mindmap_nodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT DEFAULT '',
  parent_id TEXT DEFAULT NULL,
  x REAL DEFAULT 0,
  y REAL DEFAULT 0,
  expanded INTEGER DEFAULT 1,
  task_id TEXT DEFAULT NULL,
  color TEXT DEFAULT NULL,
  priority TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sticky_notes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  color TEXT DEFAULT '#FFE59A',
  linked_node_id TEXT DEFAULT NULL,
  x REAL DEFAULT 24,
  y REAL DEFAULT 120,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  task_id TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_mins INTEGER DEFAULT 25,
  completed INTEGER DEFAULT 0,
  type TEXT CHECK(type IN ('work','short_break','long_break')) DEFAULT 'work'
);

CREATE TABLE IF NOT EXISTS ai_memory (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  role TEXT CHECK(role IN ('user','assistant','system')) NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now')),
  type TEXT DEFAULT 'chat',
  skill_used TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS ai_brain_profile (
  project_id TEXT PRIMARY KEY,
  soul_prompt TEXT NOT NULL,
  habitual_context TEXT NOT NULL,
  behavior TEXT NOT NULL,
  active_skills TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  last_updated TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS time_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_mins INTEGER DEFAULT 0,
  note TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sdlc_phases (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT CHECK(status IN ('planned','in_progress','done','blocked')) DEFAULT 'planned',
  owner TEXT DEFAULT '',
  start_date TEXT,
  end_date TEXT,
  risk TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`;
