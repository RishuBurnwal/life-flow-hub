# LIFE OS — Complete Build Prompt
### A Personal Productivity Operating System — Single User, Fully Offline-First

---

> **How to use this prompt:** Paste this entire document into your builder as the project prompt. Every section is a direct build instruction. Do not skip any section. This is the complete playbook.

---

## 1. PROJECT OVERVIEW

Build a single-user personal productivity operating system called **"Life OS"**. It is a full-featured web application that runs locally in the browser. The app combines task management, mind mapping, kanban boards, scheduling, habit tracking, journaling, goal hierarchy, and an AI assistant — all in one unified interface.

**Core identity:**
- Single user only. No login, no auth, no cloud sync.
- All data stored locally in SQLite (via sql.js or better-sqlite3).
- Fully offline-first. Zero network requests unless user opts into AI API mode.
- Voice features are NOT included.
- Data is organized into per-project folders on the filesystem.

**The experience should feel:** Premium, calm, and focused — like a tool a serious professional would use daily. Not cluttered, not toy-like. Think Notion meets Linear meets a personal cockpit.

---

## 2. TECHNOLOGY STACK

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Animations | Framer Motion |
| State management | Zustand (single global store — all views derive from it) |
| Mind map | D3.js (hierarchical tree layout) |
| Calendar | FullCalendar (React wrapper) |
| Drag & drop | @dnd-kit/core |
| Charts | Recharts |
| Command palette | cmdk |
| Database | sql.js (SQLite in browser, persisted via localStorage/IndexedDB) |
| AI offline | Ollama REST API (localhost:11434) — Phi-3 model |
| AI online (optional) | Anthropic Claude API or OpenAI API (user provides key) |
| Icons | Lucide React |
| Date handling | date-fns |

**Do NOT use:** Redux, React Query (use Zustand), any CSS-in-JS library, Electron (web only), any authentication library.

---

## 3. DATA ARCHITECTURE

### 3.1 Project isolation model

Every project the user creates is completely isolated. Each project has:
- Its own SQLite database (stored in IndexedDB under key `project_{id}`)
- Its own AI context file (stored in localStorage under key `context_{id}`)
- Its own AI memory log (stored in localStorage under key `memory_{id}`)

There is a **global settings store** (localStorage key: `lifeos_global`) for themes, clock preferences, and AI API config.

### 3.2 SQLite schema — per project database

```sql
-- Tasks: the core unit of work
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT CHECK(priority IN ('high','medium','low')) DEFAULT 'medium',
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

-- Goals: OKR-style hierarchy
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  level TEXT CHECK(level IN ('life','quarterly','weekly')) NOT NULL,
  parent_id TEXT DEFAULT NULL,
  progress REAL DEFAULT 0,
  deadline TEXT,
  color TEXT DEFAULT '#D4956A',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Habits
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  frequency TEXT CHECK(frequency IN ('daily','weekly')) DEFAULT 'daily',
  streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  color TEXT DEFAULT '#D4956A',
  last_done TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Habit completion logs
CREATE TABLE IF NOT EXISTS habit_logs (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL,
  completed_at TEXT DEFAULT (datetime('now')),
  note TEXT DEFAULT ''
);

-- Journal entries
CREATE TABLE IF NOT EXISTS journal (
  id TEXT PRIMARY KEY,
  date TEXT UNIQUE NOT NULL,
  content TEXT DEFAULT '',
  ai_summary TEXT DEFAULT '',
  mood TEXT DEFAULT '',
  word_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Mind map nodes
CREATE TABLE IF NOT EXISTS mindmap_nodes (
  id TEXT PRIMARY KEY,
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

-- Pomodoro sessions
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_mins INTEGER DEFAULT 25,
  completed INTEGER DEFAULT 0,
  type TEXT CHECK(type IN ('work','short_break','long_break')) DEFAULT 'work'
);

-- AI memory (conversation history)
CREATE TABLE IF NOT EXISTS ai_memory (
  id TEXT PRIMARY KEY,
  role TEXT CHECK(role IN ('user','assistant','system')) NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now')),
  type TEXT DEFAULT 'chat',
  skill_used TEXT DEFAULT NULL
);

-- Time tracking (actual work logs)
CREATE TABLE IF NOT EXISTS time_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_mins INTEGER DEFAULT 0,
  note TEXT DEFAULT ''
);
```

### 3.3 AI context.json structure (per project, stored in localStorage)

```json
{
  "soul_prompt": "You are a focused, intelligent productivity assistant. You help the user manage their projects, break down complex goals, track habits, and reflect on progress. You are concise, practical, and encouraging without being preachy. You understand software development workflows deeply.",
  "habitual_context": {
    "work_style": "deep focus blocks preferred",
    "domain": "",
    "preferred_stack": "",
    "energy_peak": "morning",
    "recurring_blockers": [],
    "communication_style": "concise"
  },
  "behavior": {
    "greeting_on_open": true,
    "proactive_suggestions": true,
    "sdlc_aware": true,
    "daily_brief_on_start": true,
    "risk_alert_sensitivity": "medium",
    "tone": "concise",
    "auto_suggest_tasks": true
  },
  "active_skills": [
    "task_breakdown",
    "sdlc_planner",
    "time_estimator",
    "daily_brief",
    "risk_detector",
    "habit_coach",
    "journal_analyser",
    "brain_dump_parser",
    "dependency_mapper",
    "okr_coach"
  ],
  "version": 1,
  "last_updated": ""
}
```

---

## 4. VISUAL DESIGN SYSTEM

This section defines every visual rule. Follow it exactly.

### 4.1 Color themes

**Default theme — Light Peach (professional, warm, calm):**
```
--bg-page:        #FDF6F0      (warm off-white page background)
--bg-surface:     #FFFFFF      (card / panel surfaces)
--bg-sidebar:     #F5EDE4      (left sidebar background)
--bg-elevated:    #FEF9F5      (slightly elevated above page)
--accent:         #D4956A      (warm terracotta — primary accent)
--accent-hover:   #C07D54      (accent hover state)
--accent-subtle:  #F5E6D8      (light accent fill for badges/pills)
--text-primary:   #2C1810      (near-black warm text)
--text-secondary: #8B6355      (muted warm brown)
--text-tertiary:  #B89080      (very muted, hints)
--border:         rgba(180,120,80,0.15)   (subtle warm border)
--border-strong:  rgba(180,120,80,0.30)   (stronger border for active states)
--shadow-sm:      0 1px 3px rgba(44,24,16,0.08), 0 1px 2px rgba(44,24,16,0.06)
--shadow-md:      0 4px 12px rgba(44,24,16,0.10), 0 2px 4px rgba(44,24,16,0.08)
--shadow-lg:      0 10px 30px rgba(44,24,16,0.12), 0 4px 8px rgba(44,24,16,0.08)
--shadow-popup:   0 20px 60px rgba(44,24,16,0.18), 0 8px 20px rgba(44,24,16,0.12)
```

**Priority colors (all themes):**
```
High priority:    #E53E3E  (red)   background: #FFF5F5
Medium priority:  #D69E2E  (amber) background: #FFFBEB
Low priority:     #2D9CDB  (blue)  background: #EBF8FF
```

**Status colors:**
```
Todo:        #8B6355   (muted brown)
In Progress: #2D9CDB   (blue)
Done:        #38A169   (green)
Blocked:     #E53E3E   (red)
Backlog:     #B89080   (tertiary)
```

**Pre-built themes (user selectable):**
1. **Light Peach** — default (described above)
2. **Midnight Dark** — `#0F0F13` page, `#1A1A24` surface, `#6C63FF` accent
3. **Forest Green** — `#F0F7F0` page, `#FFFFFF` surface, `#2D6A4F` accent
4. **Ocean Blue** — `#F0F6FF` page, `#FFFFFF` surface, `#1A56DB` accent
5. **Warm Sand** — `#FAF7F0` page, `#FFFFFF` surface, `#B7791F` accent
6. **Pure White** — `#F8F8F8` page, `#FFFFFF` surface, `#4A4A4A` accent

### 4.2 Typography

```
Font family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
Import from: https://fonts.google.com/specimen/Inter

Font scale:
  --text-xs:   11px
  --text-sm:   12px
  --text-base: 14px
  --text-md:   15px
  --text-lg:   16px
  --text-xl:   18px
  --text-2xl:  22px
  --text-3xl:  28px

Font weights: 400 (regular), 500 (medium), 600 (semibold) only.
No 700 or 800 weights anywhere in the UI.
Line height: 1.6 for body, 1.3 for headings.
```

### 4.3 Spacing & shape

```
Border radius:
  --radius-sm:   6px   (badges, pills, small inputs)
  --radius-md:   8px   (buttons, small cards)
  --radius-lg:  12px   (main cards, panels)
  --radius-xl:  16px   (large panels, modals)
  --radius-2xl: 24px   (full popups, dialogs)
  --radius-full: 9999px (pills, toggles)

Border width: 0.5px on all card/panel borders (1px only for active/focus states)

Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px
```

### 4.4 Animation & motion system (CRITICAL — implement all of these)

All animations must use Framer Motion. Every interactive element must have motion.

**Core animation presets:**
```javascript
// Page/view transitions
const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }
}

// Card entrance (staggered list items)
const cardEntrance = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.18, ease: 'easeOut' }
}

// Panel slide-in from right
const panelSlideIn = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
  transition: { type: 'spring', damping: 28, stiffness: 300 }
}

// Modal popup
const modalEntrance = {
  initial: { opacity: 0, scale: 0.94, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 8 },
  transition: { type: 'spring', damping: 25, stiffness: 350 }
}

// Dropdown / popover
const dropdownEntrance = {
  initial: { opacity: 0, scale: 0.95, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: -4 },
  transition: { duration: 0.14, ease: 'easeOut' }
}

// Sidebar collapse/expand
const sidebarTransition = {
  transition: { type: 'spring', damping: 30, stiffness: 300 }
}

// Toast notification
const toastEntrance = {
  initial: { opacity: 0, x: 40, scale: 0.9 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 40, scale: 0.9 },
  transition: { type: 'spring', damping: 20, stiffness: 300 }
}
```

**Hover effects (ALL interactive elements must have these):**
```
Buttons: scale(1.02) on hover, scale(0.98) on click, shadow increase
Cards: translateY(-2px) on hover, shadow increase (shadow-md → shadow-lg)
Sidebar items: background slide-in from left (translateX from -100% to 0)
Task rows: subtle background highlight + left border accent reveal
Priority badges: slight glow effect matching priority color
Navigation tabs: underline slide animation (not jump)
Toggle switches: spring animation on thumb movement
Clock widget: scale(1.08) on hover with shadow-popup
```

**Micro-animations:**
```
Task completion: checkbox fills with spring bounce + strikethrough text animation
Task creation: row slides down from top with fade-in
Task deletion: row collapses height to 0 with fade-out (not disappear)
Kanban card drag: card lifts (scale 1.05, rotation 1-2deg, shadow-popup, cursor:grabbing)
Kanban drop: receiving column highlights with pulse animation
Pomodoro tick: subtle ring pulse every second
Progress bars: fill animation with spring easing on value change
Habit streak: flame icon bounces on new streak day
Modal backdrop: blur(4px) fade-in on background
Sidebar badge: scale bounce when count changes
Mind map node expand: children fan out with staggered delay
Clock seconds: smooth CSS transition (not jerky tick)
Loading states: skeleton shimmer (left-to-right shine sweep)
```

---

## 5. APP LAYOUT

The app uses a **4-zone layout** that is always present:

```
┌─────────────────────────────────────────────────────────┐
│                   TOP PANEL (Clock Bar)                 │  64px height
├──────────┬──────────────────────────────┬───────────────┤
│          │                              │               │
│  LEFT    │      CENTER WORKSPACE        │  RIGHT PANEL  │
│ SIDEBAR  │      (main content)          │  (AI Chat)    │
│  240px   │      (flex: 1)               │   320px       │
│          │                              │               │
│          │                              │               │
├──────────┴──────────────────────────────┴───────────────┤
│                   BOTTOM BAR (Status)                   │  40px height
└─────────────────────────────────────────────────────────┘
```

**Responsive rules:**
- Left sidebar collapses to icon-only mode (48px) on narrow screens
- Right AI panel collapses to a floating button on narrow screens
- Bottom bar always visible

---

## 6. TOP PANEL — CLOCK SYSTEM

The top panel is a dedicated clock bar. Height: 64px. Background matches sidebar color. Border-bottom: 0.5px. Contains multiple clock widgets side-by-side.

### 6.1 Digital rectangular clock (Clock Widget 1)

**Default appearance:**
- Rounded rectangle card (border-radius: 12px)
- Shows: HH:MM:SS in large monospace font (24px, weight 600)
- Below time: full date (e.g. "Saturday, March 21, 2026") in 11px text-secondary
- Active timezone label as a small pill badge bottom-right of the card
- Subtle border (0.5px) and shadow-sm

**Hover behavior (CRITICAL animation):**
- On hover: card scales up from its normal size (scale 1.0) to slightly larger (scale 1.08)
- Shadow transitions from shadow-sm to shadow-popup
- A soft glow ring appears around the card (box-shadow: 0 0 0 3px accent-subtle)
- Duration: 200ms spring easing
- The clock visually "floats" out toward the user

**Click behavior:**
- Clicking the digital clock opens a **Calendar Popup** (described in Section 6.3)

### 6.2 Analog circular clock (Clock Widget 2)

**Default appearance:**
- Perfect circle (60px diameter in top bar)
- Clean minimal face: no numbers, just 12 tick marks
- Hour hand: thick, rounded, accent color
- Minute hand: thinner, rounded, text-primary color
- Second hand: very thin, red (#E53E3E)
- Center dot: 4px circle, accent color
- Face background: bg-surface
- Border: 1.5px border, border-strong color

**Second hand:** Smooth CSS `transition: transform 0.1s` — never jerky.

**Hover behavior:**
- Circle scales to 1.1x
- Shadow-popup appears
- Slight glow ring (same as digital clock)

**Click:** Opens the same Calendar Popup.

**Design skins (user selectable per clock):**
For digital: Minimal Clean, Retro LCD (monospace green on dark), Glassmorphic (frosted glass effect), Neon Outline (colored border glow), Classic Bold
For analog: Minimal, Bauhaus, Roman Numerals, Dots Only, Dark Face

### 6.3 Calendar popup (triggered by clicking any clock)

- Opens as a **floating popup** anchored below the clock that was clicked
- Uses `modalEntrance` animation
- Background: bg-surface, border-radius: 16px, shadow-popup
- Backdrop: rgba(0,0,0,0.15) blur(4px) behind popup
- Shows a full month calendar:
  - Current month/year title at top with left/right navigation arrows
  - 7-column grid (Su Mo Tu We Th Fr Sa)
  - Today highlighted with accent fill circle
  - Days with tasks have a small dot indicator below the date
  - Clicking a date in the popup filters the calendar view to that day
- Below the calendar: a mini list of "today's tasks" (max 5)
- Close button top-right, also closes on backdrop click or Escape

### 6.4 Timezone support

A horizontal row of timezone pills lives in the top panel between the clocks:
- Pills: IST | GMT | PST | EST
- Active timezone: filled pill (accent background, white text)
- Inactive: ghost pill (border only)
- Clicking a pill switches both clocks to that timezone instantly
- Multiple timezone display: user can enable "secondary timezone" which shows a smaller second time below the main time in the digital clock

### 6.5 Clock management

- A small settings icon (gear) at the far right of the top panel
- Opens a mini dropdown: toggle each clock on/off, change skin, set primary timezone
- Preferences saved to global settings

---

## 7. LEFT SIDEBAR — PROJECT MANAGER

Width: 240px (collapsible to 48px). Background: bg-sidebar. Border-right: 0.5px.

### 7.1 Header area

- App logo/name "Life OS" at top (18px, weight 600)
- Small avatar circle (user's initials or a dot)
- Collapse toggle button (arrow icon)

### 7.2 Project list

Each project item in the list:
- Colored dot (project color) + project name (14px, weight 500)
- On hover: background slides in from left (translateX animation, not just opacity)
- Active project: left border accent (3px, accent color), slightly elevated background
- Right side: project health badge (small colored dot: green/yellow/red)
- On hover: a "..." more options button fades in on the right

**Right-click / "..." context menu on project:**
- Options: Rename, Change color, Archive, Delete, Open in new tab
- Menu appears with `dropdownEntrance` animation
- Has a subtle shadow-lg

**New project button:**
- At bottom of project list
- Dashed border style when no projects exist
- On click: inline input field slides down (height animation 0 → auto)
- User types project name, presses Enter to create
- Color picker appears after name is typed (small color swatches)
- Creating a project: triggers initialization animation (card appears with cardEntrance)

### 7.3 Navigation sections

Below projects, collapsible sections:
- **Views**: Todo, Mind Map, Kanban, Calendar, SDLC Planner
- **Personal**: Habits, Journal, Goals
- **Tools**: Brain Dump, Search, Settings
- Section headers collapse/expand with arrow icon + height animation

### 7.4 Bottom of sidebar

- Current project name + health score (numeric 0-100)
- Pomodoro mini-timer (if active)
- Settings gear icon
- Day/night theme toggle (sun/moon icon with spring rotation animation)

---

## 8. CENTER WORKSPACE

The main content area. Uses `pageTransition` when switching between views. Always has a view tab bar at the top.

### 8.1 View tab bar

A horizontal tab strip at the top of the center workspace:

Tabs: **Todo** | **Mind Map** | **Kanban** | **Calendar** | **SDLC** | **Goals** | **Habits** | **Journal**

- Active tab: accent underline that slides (not jumps) between tabs — use `layoutId` in Framer Motion for the underline
- Inactive tabs: text-secondary
- Tab hover: text-primary with subtle background
- Keyboard shortcut hints shown on hover (1, 2, 3, etc.)

### 8.2 Top action bar (inside workspace, below tabs)

Context-sensitive. For todo view shows:
- Filter button (opens filter panel)
- Sort dropdown
- View density toggle (comfortable / compact / cozy)
- "New Task" primary button (accent color, shadow-sm, hover shadow-md)
- Search within view

---

## 9. TODO LIST VIEW

### 9.1 Layout

Full-width list. Each task is a row card.

**Task row card:**
- Background: bg-surface
- Border: 0.5px border, border-radius: 8px
- Height: 52px (comfortable) or 40px (compact)
- Subtle left border (3px, colored by priority) — only visible on hover/active
- Shadow-sm, hover → shadow-md + translateY(-2px)

**Row contents (left to right):**
1. Checkbox (custom styled — circle border, fills with checkmark + accent color on completion)
2. Priority dot (colored circle: red/amber/blue)
3. Task title (14px, weight 500, text-primary)
4. Tags (colored pill badges, small, inline)
5. SDLC phase label (if assigned — small gray pill)
6. Estimate time ("~2h" in text-tertiary)
7. Deadline (date in text-secondary, turns red if overdue)
8. Status badge (pill)
9. More options "..." (appears on hover)

**Task completion animation:**
- Checkbox springs from unchecked to checked with a bounce
- Task title gets strikethrough (animated, left to right)
- Row fades to 60% opacity over 300ms
- Row collapses and disappears after 800ms delay

**Inline editing:**
- Click task title → title becomes an inline input (no modal)
- Border appears around the entire row to indicate edit mode
- Escape cancels, Enter saves
- Tab moves to next field (title → priority → deadline → estimate)

### 9.2 Task detail panel

Clicking anywhere on a task row (except the checkbox) opens a **slide-in detail panel** from the right side of the workspace (NOT a modal).

**Detail panel:**
- Width: 400px
- Uses `panelSlideIn` animation
- Has its own scroll if content is long
- Close button (X) top-right, also closes on Escape

**Detail panel contents:**
- Task title (large, editable inline, 20px, weight 600)
- Status selector (horizontal pills: Todo / In Progress / Done / Blocked / Backlog)
- Priority selector (3 buttons: High / Medium / Low, colored)
- Description (rich text area — at minimum support bold, italic, bullet lists)
- Dates section: Start date picker + Deadline date picker
- Time section: Estimate input + Actual time (from timer) + Timer start/stop button
- Tags: tag input with autocomplete (existing tags suggested)
- SDLC Phase: dropdown selector
- Goal link: searchable dropdown to link to an OKR goal
- Dependencies: search + add dependent tasks
- Subtasks: expandable list of child tasks (can create inline)
- Mind map: "Show in Mind Map" button — highlights this task's node
- Pomodoro count: shows "🍅 × 3" for completed sessions
- AI quick actions: "Break this down", "Estimate time", "Suggest deadline" buttons (calls AI skill)
- Created / Updated timestamps at bottom

### 9.3 Task creation

**Quick add (inline — preferred method):**
- Pressing "N" or clicking "+ New Task" at the top of the list
- A blank row appears at the top with an animated slide-down
- User types directly — this creates the task on Enter
- Tab moves focus: title → deadline → priority

**Full create (from + button with options):**
- Opens the task detail panel pre-filled for a new task

### 9.4 Grouping and sorting

Toggle group by:
- Status (default)
- Priority
- SDLC Phase
- Due date (Today / This week / Later / No date)
- Goal

Sort by: Priority, Deadline, Created date, Alphabetical, Last updated

Each group has a collapsible header showing count.

### 9.5 Bulk actions

- Shift+click selects range, Ctrl+click selects individual
- Selection mode shows a floating action bar at the bottom (mark complete, change priority, move to project, delete)
- Action bar uses `toastEntrance` animation sliding up from bottom

---

## 10. MIND MAP VIEW

D3.js hierarchical tree. The entire view is a canvas the user can pan and zoom.

### 10.1 Canvas behavior

- Mouse wheel: zoom in/out (smooth, not jumpy)
- Click + drag on empty space: pan the canvas
- Canvas background: subtle dot grid pattern (using CSS background-image with radial-gradient dots)
- Minimap: small thumbnail in bottom-right corner showing full tree with viewport indicator

### 10.2 Node design

**Root node (project name):**
- Large rounded rectangle (120px × 44px)
- Accent color fill, white text
- Shadow-lg
- Slightly larger font (15px, weight 600)

**Branch nodes:**
- Medium rounded rectangle (100px × 36px)
- bg-surface fill, text-primary
- Left border colored by priority (if linked to task)
- Shadow-sm

**Leaf nodes (tasks):**
- Smaller rounded rectangle (90px × 32px)
- Light fill (priority color at 10% opacity)
- Border colored by priority
- 12px text

**Node hover:**
- Scale 1.05 with shadow-md
- Reveals action buttons (+ add child, edit, delete, link) as small icon buttons that fade in

**Connector lines:**
- Smooth bezier curves (not straight lines)
- Color: border-strong
- Animated: dashed-line drawing animation when a node is first created
- Line tapers slightly from parent to child

### 10.3 Node interactions

**Create child node:**
- Hover parent → click "+" icon that appears
- New node slides in with animation, starts in edit mode
- Automatically positioned to not overlap siblings

**Edit node:**
- Double-click label → inline edit input
- Border highlights around node during edit
- Enter to save, Escape to cancel

**Delete node:**
- Hover → red X button appears
- Confirmation tooltip (not full modal) before delete
- Node collapses with children (height animation)

**Drag to reparent:**
- Drag node over another node → target highlights with dashed border
- Drop → node moves with animated path redraw

**Right-click context menu:**
- Add child, Add sibling, Delete, Promote to root, Link to task, Set color, Collapse all children
- Menu appears with `dropdownEntrance` animation

### 10.4 Sync with task list

- When a node is linked to a task: node shows task priority color and status icon
- If task is completed: node gets a checkmark badge
- Changes in task title reflect in mind map node label in real-time
- "Create task from node" option in right-click menu

### 10.5 Export

- Export as PNG (current view or full tree)
- Export as SVG

---

## 11. KANBAN BOARD VIEW

### 11.1 Board layout

Horizontal columns. Scrollable horizontally if many columns.

**Default columns:** Backlog | Todo | In Progress | Review | Done | Blocked

**Column header:**
- Column name (14px, weight 600)
- Task count badge (pill)
- WIP limit indicator (e.g. "4 / 5") — turns yellow when at limit, red when over
- "+" button to add task directly to this column
- "..." menu to rename, set WIP limit, or delete column

### 11.2 Kanban cards

**Card dimensions:** ~240px wide, variable height

**Card contents:**
- Task title (14px, weight 500, max 2 lines, ellipsis overflow)
- Priority badge (colored pill top-right)
- Tags (colored small pills)
- Deadline (shows as "Overdue" in red if past)
- Pomodoro count (small tomato icon + number)
- Estimated time
- Assignee (always "You" — small avatar circle)
- Progress bar (if task has subtasks — shows % subtasks done)
- AI insight badge (optional — shows if AI has flagged a risk)

**Card hover:**
- Elevation: scale(1.02), shadow-md → shadow-lg
- Edit and quick-action icons fade in on the right side

**Card drag:**
- On drag start: card lifts up (scale 1.05, slight rotation 1-2 degrees, shadow-popup)
- Dragging cursor changes to grabbing
- Source column: shows ghost placeholder (dashed outline where card was)
- Target column: highlights with accent-subtle background, dashed border
- On drop: spring settle animation

**Column scroll:**
- Each column has its own vertical scroll if many cards
- Columns have a max-height with scroll
- "Show more" link at bottom if > 10 cards

### 11.3 Adding a task to kanban

- Click "+" in column header
- A new card appears at the top of the column with slide-down animation
- Inline title editing
- Press Enter to save, Escape to cancel

### 11.4 Swimlanes

Toggle button in the view bar:
- By SDLC Phase: rows labeled by phase
- By Priority: rows for High / Medium / Low
- Off: default flat columns

---

## 12. CALENDAR / SCHEDULER VIEW

### 12.1 Views

Toggle: **Day** | **Week** | **Month** at top.

FullCalendar configured with:
- Week starts Monday
- Business hours highlighted (configurable)
- Current time indicator (animated moving line in day/week view)
- Holiday display (user's locale)

### 12.2 Task scheduling

**Drag from task list to calendar:**
- Task list collapses to a narrow strip on the left
- Tasks shown as draggable pills
- Drag onto calendar time slot → sets task's calendar_scheduled field
- On drop: event appears with spring animation

**Resize task event:**
- Drag bottom edge of event to extend/reduce duration
- Updates estimate_mins in real time

**Task event appearance:**
- Color by priority (red/amber/blue)
- Shows title + estimated time
- Completed tasks: strikethrough + reduced opacity

**Conflict detection:**
- Overlapping scheduled tasks: both get a pulsing orange warning border
- A tooltip explains the conflict
- AI suggests resolution via the right panel

### 12.3 Gantt strip (at bottom of calendar view)

A horizontal Gantt-style timeline for the current project:
- Shows all tasks with deadlines as horizontal bars
- Bar length = estimated duration
- Bar color = priority
- Bar hover: shows task name, dates, status in tooltip
- Today line: vertical dashed line
- Scrollable left/right for different months

---

## 13. SDLC PLANNER VIEW

### 13.1 Goal input

- Large, prominent textarea at the top: "Describe your project goal..."
- Below it: a "Generate SDLC Plan" button (large, accent, with sparkle icon)
- Example placeholder: "Build a web-based e-commerce platform with user auth, product listings, and Stripe payments"

### 13.2 AI generation flow

When user clicks generate:
1. Button shows loading state (spinner + "Analyzing your goal...")
2. The 7 SDLC phase cards appear one by one with staggered `cardEntrance` animation:
   - Phase 1: Requirement Analysis
   - Phase 2: System Planning
   - Phase 3: System Design
   - Phase 4: Development
   - Phase 5: Testing & QA
   - Phase 6: Deployment
   - Phase 7: Maintenance
3. Each phase card shows: phase name, description, estimated duration, and a list of auto-generated tasks
4. Each task has an editable title, priority dropdown, and time estimate field

### 13.3 Phase card design

**Phase card:**
- Colored left border (each phase gets a distinct color from the palette)
- Phase name (16px, weight 600) + phase icon
- Estimated duration pill (e.g. "~1 week")
- Collapsible task list
- "Add task" link at bottom
- Drag handle to reorder phases

**Task rows within phase:**
- Checkbox (to include/exclude this task)
- Editable title
- Priority selector
- Time estimate input

### 13.4 Gantt preview

Below all phase cards:
- A read-only Gantt chart showing all phases on a timeline
- Phases as colored bars, scaled by estimated duration
- Dependencies shown as arrows between bars

### 13.5 Apply to project

- "Apply Full Plan" button at bottom (large, accent)
- Creates all tasks, mind map nodes, and calendar events in one action
- Progress animation while creating (tasks tick off one by one)
- Success toast: "47 tasks created across 7 phases"

---

## 14. HABIT TRACKER VIEW

### 14.1 Layout

Split into two areas: habit list on the left (40%), heatmap + stats on the right (60%).

### 14.2 Habit list

Each habit is a card with:
- Habit name (15px, weight 500)
- Frequency badge (Daily / Weekly)
- Current streak (flame icon + number, accent color)
- "Done today" button — large, obvious. When clicked:
  - Button fills with green, checkmark appears with spring bounce
  - Streak counter increments with a bounce animation
  - Celebration effect if milestone hit (5, 10, 21, 30, 50, 100 days)
- Progress bar for the week (7 dots — filled = done that day)

**Streak milestone celebration:**
- When streak hits 7, 14, 21, 30, 50, 100 days:
- A confetti burst animation plays (small colored particles)
- A toast notification slides in: "🎉 21-day streak! You're unstoppable."

### 14.3 Heatmap

GitHub-style contribution heatmap:
- 90-day rolling view (15 columns × 6 rows approximately)
- Each cell = one day
- Color intensity = habits completed that day (0 = bg-secondary, 4 = full accent)
- Hover: tooltip shows date and "X of Y habits completed"
- Animated on load: cells fill in sequentially with a sweep from left to right

### 14.4 Stats panel

- Current streak (large number)
- Best streak (smaller)
- Completion rate this week (%)
- Completion rate this month (%)
- Most consistent habit (name)

### 14.5 Morning checklist

On app open each day, if habits exist:
- A dismissible banner appears at the top of the workspace
- Shows all today's habits as quick checkboxes
- "Morning routine: 2/5 complete" with a progress bar
- Disappears when all checked or dismissed

---

## 15. JOURNAL VIEW

### 15.1 Layout

Two-column:
- Left (30%): list of past entries (dates, mood icon, word count, AI summary line)
- Right (70%): current entry editor

### 15.2 Entry editor

**Header:**
- Large date display (today's date, 22px, weight 500)
- Mood selector: a row of 5 emoji-style mood icons (😔 😐 🙂 😊 😄) — selected mood gets a slight bounce + ring
- Word count (live, bottom right of editor)

**Editor area:**
- Large, clean textarea with minimal borders
- Comfortable line height (1.8)
- 500-600px max-width, centered
- Auto-growing height
- Placeholder: "How was your day? What did you accomplish? What's on your mind?"

**AI prompt button:**
- "Get a reflection prompt from AI" button
- AI generates a contextual end-of-day prompt based on today's completed tasks
- Prompt appears in a highlighted box above the editor with a "Use this prompt" button

### 15.3 Past entries list

Each entry in the list:
- Date (bold)
- Mood icon
- AI one-line summary (italic, text-secondary)
- Word count pill
- Hover: slight right-arrow appears indicating clickable

Clicking loads that entry in the editor (read mode, edit button to modify).

### 15.4 Weekly synthesis

A special card that appears on Sunday or Monday:
- "Your week in review" with AI-generated synthesis
- Shows: tasks completed count, habits success rate, mood trend, key themes from journal
- Dismissible, stored in journal table

---

## 16. GOAL HIERARCHY VIEW (OKR)

### 16.1 Layout

Tree structure displayed as collapsible sections, not a graph.

**Three levels:**
1. **Life Goals** (large cards, accent left border)
2. **Quarterly Objectives** (medium cards, indented)
3. **Weekly Key Results** (compact rows, indented further)

Each level is collapsible with arrow icon + height animation.

### 16.2 Goal card design

**Life Goal card:**
- Large, prominent (full width)
- Goal title (18px, weight 600)
- Description (text-secondary, italic)
- Progress bar (filling from left, animated on load)
- Progress % text
- Deadline
- Count of linked objectives

**Quarterly Objective card:**
- Medium card, indented 24px
- Title (15px, weight 500)
- Progress bar (derived from linked key results)
- Deadline
- "Add key result" link at bottom

**Weekly Key Result row:**
- Compact, indented 48px
- Checkbox (marks KR as complete)
- Title
- Linked tasks count (small badge — clicking shows linked tasks)
- Status pill

### 16.3 Orphan task warning

In the Todo view and task detail, if a task has no goal_id:
- Small warning badge: "Not linked to any goal"
- "Link to goal" quick button

### 16.4 Sunday goal review

Every Sunday (detected from date), a modal auto-opens on app start:
- "Weekly Goal Review" title
- Shows all key results with their status
- Quick bulk update (mark done/in progress/missed)
- AI generates a one-line summary for each objective
- User can add notes per objective

---

## 17. BRAIN DUMP MODE

### 17.1 Activation

- Keyboard shortcut: Ctrl+D
- Also accessible from sidebar nav
- Opens as a **full-screen overlay** with backdrop blur

### 17.2 Interface

- Full-screen editor, clean and distraction-free
- Large font (18px), wide margins (15-20% horizontal padding)
- Placeholder: "Type anything freely. Thoughts, tasks, ideas, worries — everything. AI will help organize it."
- No formatting toolbar (pure plain text input)
- A timer in the corner (optional — some users do timed brain dumps)
- "Process with AI" button at bottom-right (large, accent)
- Escape or X button to exit without processing

### 17.3 AI processing

When "Process with AI" is clicked:
1. Full-screen dims slightly, loading state ("Reading your thoughts...")
2. AI parses the text into categories
3. Results appear in a split view:
   - Left: original text (read-only, with highlights)
   - Right: categorized results in sections:
     - **Tasks detected** (list of checkboxes)
     - **Ideas to explore** (list)
     - **Journal notes** (single block)
     - **Mind map concepts** (pills)
4. User reviews each section, unchecks items they don't want to save
5. "Save all" button creates everything in one action

---

## 18. RIGHT PANEL — AI ASSISTANT

Width: 320px. Always visible (collapsible). Background: bg-surface. Border-left: 0.5px.

### 18.1 Header

- "AI Assistant" label (14px, weight 600)
- Model indicator: small pill showing "Phi-3 (offline)" or "Claude API"
- Settings icon: opens AI settings (soul editor, API key, skill toggles)
- Collapse button

### 18.2 Context summary bar

A collapsible section at top of the panel (below header):
- Shows active project name
- 3 key items from habitual_context (work style, domain, tone)
- "Edit context" link → opens context editor modal

**Context editor modal:**
- Full editing of context.json
- Three tabs: Soul Prompt | Habitual Context | Behavior Flags
- Soul prompt: large textarea
- Habitual context: key-value form (editable fields)
- Behavior: toggle switches for each behavior flag
- Version history: shows last 5 versions with timestamps + restore button
- Save button with "Context updated" toast

### 18.3 Chat interface

**Message layout:**
- User messages: right-aligned, accent-subtle background, border-radius: 16px 16px 4px 16px
- AI messages: left-aligned, bg-secondary background, border-radius: 4px 16px 16px 16px
- Timestamps: very small, text-tertiary, shown on hover
- Messages animate in with `cardEntrance`

**Typing indicator:**
- When AI is generating: three-dot pulsing animation in an AI message bubble
- Streaming output: text appears character by character (typewriter effect)

**Message input:**
- Auto-growing textarea at bottom
- Placeholder: "Ask anything about your project..."
- Send button (arrow icon)
- Enter to send, Shift+Enter for newline
- Recent commands available on focus (chip suggestions above input)

### 18.4 AI greeting flow

**On app open (if greeting_on_open is true):**
1. AI assistant panel opens automatically (or pulsed if already open)
2. AI generates and streams a greeting:
   > "Good morning! You have **5 tasks** scheduled for today, **2 are overdue**.  
   > Your 'Exercise' habit streak is at 7 days 🔥  
   > Which project do you want to focus on?"
3. User can type a project name or click a quick-select button showing recent projects
4. After selection: AI loads that project's context and generates a daily brief

### 18.5 Daily brief format

When `daily_brief_on_start` is true, AI generates:
```
Today — [Day, Date]

📋 Tasks: 5 due today, 2 overdue
   High priority: [task name], [task name]
   
🎯 Goal progress: "Q1 Launch" is at 67%

💪 Habits: 1/3 done today
   Remaining: Exercise, Read 20 pages

💡 AI note: You've been blocking "API integration" for 3 days.
   Want me to break it down into smaller steps?
```

### 18.6 Skill-triggered quick actions

When AI detects intent, it shows action chips below its message:

- "Create these tasks" (if AI listed tasks in response)
- "Add to mind map" (if AI listed concepts)
- "Schedule this" (if AI mentioned timing)
- "Break it down more" (for further decomposition)

Clicking a chip executes the action without typing.

### 18.7 Memory viewer

A "Memory" tab in the AI panel:
- List of last 30 memory entries
- Each entry shows: role (user/AI), first 60 chars of content, timestamp
- Individual delete button per entry (with confirmation)
- "Clear all memory" at bottom (with confirmation modal)
- Export memory as .txt file

---

## 19. COMMAND PALETTE (Ctrl+K)

Opens as a centered modal with backdrop blur.

### 19.1 Design

- Width: 560px, max-height: 420px with scroll
- Border-radius: 16px
- Shadow-popup
- Input at top: "Search commands, tasks, projects..."
- Results grouped below with section headers

### 19.2 Result types

**Commands** (actions):
- New task, New project, Open calendar, Start pomodoro, Brain dump, Toggle theme
- Switch to view (Todo, Mind Map, Kanban, etc.)
- Open AI assistant

**Recent tasks** (filtered by query):
- Shows title, project, priority badge

**Projects** (filtered by query):
- Shows name, task count

**AI skills** (e.g. "Break down", "Generate SDLC plan"):
- Shown with sparkle icon

### 19.3 Keyboard navigation

- Arrow up/down to navigate results
- Enter to select
- Escape to close
- Each result shows its keyboard shortcut (if any) on the right

---

## 20. POMODORO TIMER & FOCUS MODE

### 20.1 Pomodoro widget

Lives in the bottom bar. Also accessible via the detail panel.

**Widget states:**
- Idle: "Start Pomodoro" button
- Running (work): countdown timer (25:00 → 0:00), task name shown, pause button, stop button
- Running (break): green background, "Break time" label
- Ring animation: SVG circle stroke that drains as time passes

**Settings:**
- Work duration (default 25 min)
- Short break (5 min)
- Long break (15 min)
- Long break after X sessions (default 4)
- Notification sound options

**On session complete:**
- Desktop notification (browser API)
- Sound plays (optional)
- session saved to pomodoro_sessions table
- Task's pomodoro_count increments (+1 on the card/row)

### 20.2 Focus mode

Activated via keyboard shortcut "F" or the focus button in pomodoro widget.

**Focus mode:**
- Left sidebar collapses to icon-only (48px)
- Right AI panel collapses to a small tab
- Top bar collapses to just the timer
- Center workspace dims everything except the active task
- Soft ambient background (slightly different shade)
- Exit focus mode: press Escape or click the "Exit focus" button

---

## 21. AI ENGINE — FULL TECHNICAL SPECIFICATION

### 21.1 Dual-mode configuration

**Mode 1 — Offline (default):**
```
Provider: Ollama (must be installed separately by user)
Endpoint: http://localhost:11434/api/chat
Model: phi3:mini (default) or phi3:medium (user selects)
No internet required.
If Ollama not running: show friendly setup guide in AI panel
```

**Mode 2 — API (optional):**
```
Settings → AI → API Configuration
User enters: provider (Anthropic / OpenAI), API key
Key stored: encrypted in localStorage (use AES-256 with a local salt)
Toggle: "Use API when available" switch
Supported models: claude-sonnet, gpt-4o, gpt-4o-mini
```

**Mode detection:**
On app open, ping Ollama health endpoint. If healthy: offline mode active. If user has API key AND "prefer API" is enabled: use API mode. Show status in AI panel header.

### 21.2 Request construction (every AI call)

```javascript
function buildAIRequest(userMessage, projectId, skillName) {
  const context = loadContext(projectId);         // context.json
  const memory = loadMemory(projectId, 20);       // last 20 messages from ai_memory

  const systemPrompt = `
${context.soul_prompt}

HABITUAL CONTEXT:
Work style: ${context.habitual_context.work_style}
Domain: ${context.habitual_context.domain}
Preferred stack: ${context.habitual_context.preferred_stack}
Energy peak: ${context.habitual_context.energy_peak}
Communication style: ${context.habitual_context.communication_style}

BEHAVIOR:
Tone: ${context.behavior.tone}
SDLC aware: ${context.behavior.sdlc_aware}
Proactive suggestions: ${context.behavior.proactive_suggestions}

ACTIVE SKILL: ${skillName}

IMPORTANT: 
- Be ${context.behavior.tone} in responses.
- If creating tasks, return structured JSON.
- Always check context before answering.
- Remember what was discussed in the conversation history below.
`;

  return {
    system: systemPrompt,
    messages: [
      ...memory,          // previous conversation
      { role: 'user', content: userMessage }
    ]
  };
}
```

### 21.3 Skills — each skill's behavior

**task_breakdown:**
- Input: goal or task description text
- Behavior: Breaks it into 5-15 subtasks with titles, estimated minutes, priority, and SDLC phase
- Output format: JSON array of task objects
- UI action: "Create all these tasks?" confirmation with checklist

**sdlc_planner:**
- Input: project goal description
- Behavior: Generates 7-phase plan with tasks per phase, dependencies, Gantt timeline
- Output: structured JSON with phases array, each containing tasks array
- UI action: Populates the SDLC Planner view

**time_estimator:**
- Input: task title + habitual_context
- Behavior: Returns a time estimate in minutes with brief reasoning
- Uses historical data: queries similar past tasks from DB, compares actual vs estimated
- Output: `{ estimate_mins: 90, confidence: "medium", reasoning: "Similar API tasks took you ~80-100 mins" }`

**daily_brief:**
- Input: today's date, project context
- Behavior: Queries DB for today's tasks, overdue items, habit status, goal progress
- Generates formatted briefing (markdown)
- Runs automatically on app open if `daily_brief_on_start` is true

**risk_detector:**
- Runs as background check (on project switch, or every 30 minutes)
- Scans for: tasks overdue > 2 days, tasks with no deadline and high priority, dependency conflicts, overloaded schedule days
- Returns list of risks with severity (low/medium/high) and suggestions
- UI: subtle warning icon on affected task cards

**habit_coach:**
- Input: habit logs for the past 7 days
- Behavior: Generates encouragement for streaks, gentle reminder for missed habits, streak milestone celebration messages
- Suggests new habits if user has < 3 active habits

**journal_analyser:**
- Input: journal entries for past 7 days
- Behavior: Extracts mood trend, recurring themes (keywords), accomplishments, challenges
- Generates weekly synthesis report (3-5 sentences)
- Updates habitual_context with detected patterns

**brain_dump_parser:**
- Input: free-form text blob
- Behavior: Classifies each sentence/phrase as: task, idea, journal note, or mind map concept
- Returns JSON with four categorized arrays

**dependency_mapper:**
- Input: list of task titles for a project
- Behavior: Infers likely dependencies (e.g. "deploy" depends on "test")
- Returns dependency graph as list of pairs: `[{from: taskId, to: taskId}, ...]`
- Warns about circular dependencies

**okr_coach:**
- Input: goals tree + tasks
- Behavior: Calculates actual progress per goal based on linked tasks, identifies at-risk objectives, generates review summary
- Sunday trigger: generates full weekly review prompt

### 21.4 Memory management

On every AI interaction:
1. Append user message to ai_memory table
2. Append AI response to ai_memory table
3. If memory entries exceed 100: summarize oldest 50 into one "summary" entry, delete original 50
4. Update habitual_context if response contains pattern detection

### 21.5 Error handling

- Ollama not running: show friendly message in AI panel with setup instructions link
- API key invalid: inline error in chat with "Update key" link
- Response timeout (> 30s): show retry button
- JSON parse failure: fallback to showing raw text response

---

## 22. SEARCH & FILTER SYSTEM

### 22.1 Global search (Ctrl+F)

- Opens as a panel sliding in from the top
- Searches across: task titles, descriptions, tags, journal entries, goal titles, habit names
- Results grouped by type with section headers
- Keyboard navigation (arrow keys)
- Filters: checkboxes for which content types to include
- Highlight matching text in results

### 22.2 Task filter panel

Opens as a side panel or dropdown within the Todo view.

**Filter options:**
- By project (if viewing all projects)
- By priority (High / Medium / Low checkboxes)
- By status (checkboxes)
- By tags (tag selector with autocomplete)
- By date range (deadline from → to, or preset: Today, This week, Overdue)
- By SDLC phase
- By goal link (linked / unlinked / specific goal)

**Saved filter presets:**
- Save current filter as a named preset
- Presets shown as clickable pills above the task list
- Presets stored per project in SQLite (or settings)

---

## 23. BACKUP & DATA MANAGEMENT

### 23.1 Auto-backup

- Runs daily at midnight (check on app open if last backup was > 24h ago)
- Creates a JSON export of all project databases
- Stores in browser's IndexedDB or offers a file download prompt
- Settings → Backup: shows last 10 backups with dates
- "Restore" button: replaces current data with backup

### 23.2 Manual export / import

**Export options:**
- Export project as JSON (full data export)
- Export tasks as CSV
- Export project as Markdown (tasks as checkboxes, organized by status)
- Export mind map as PNG / SVG

**Import options:**
- Import from JSON (Life OS format)
- Import tasks from CSV (with column mapping UI)
- Import from plain text (each line = one task)

---

## 24. SETTINGS PANEL

Accessible from sidebar bottom or gear icon. Opens as a full panel replacing the center workspace.

### 24.1 Sections

**Appearance:**
- Theme selector (visual previews of all 6 themes)
- Custom theme builder (color pickers for each token)
- Font size adjustment (small / medium / large)
- Animation speed (reduced / normal / snappy)

**Clock:**
- Clock 1 (digital): enable/disable, skin selector, timezone
- Clock 2 (analog): enable/disable, skin selector
- Primary timezone selector
- 24h vs 12h format

**AI Assistant:**
- Offline model: model selector (phi3:mini / phi3:medium)
- API mode: toggle, provider selector, API key input
- Behavior toggles: greeting on open, daily brief, proactive suggestions
- Risk alert sensitivity slider

**Notifications:**
- Pomodoro sounds toggle + sound selector
- Desktop notifications permission toggle
- Overdue task alerts: disable / daily / immediate

**Keyboard shortcuts:**
- Visual reference table of all shortcuts
- Custom shortcut assignment (advanced)

**Data & Privacy:**
- Storage usage display
- Export all data button
- Delete project (with confirmation)
- Clear all AI memory button

---

## 25. TOAST NOTIFICATION SYSTEM

A global toast system (top-right corner, stacked).

**Toast types:**
- Success (green left border): task created, habit completed, plan generated
- Warning (amber left border): WIP limit reached, risk detected
- Error (red left border): AI error, save failed
- Info (blue left border): daily brief available, backup completed

**Toast behavior:**
- Appears with `toastEntrance` animation (slides in from right)
- Auto-dismisses after 4 seconds (with a visible progress bar draining)
- Hover pauses the timer
- Click to dismiss
- Max 3 toasts stacked at once (oldest auto-dismissed when 4th arrives)
- Dismiss with swipe right (if touch)

---

## 26. BOTTOM STATUS BAR

Height: 40px. Background: bg-sidebar. Border-top: 0.5px.

**Contents (left to right):**
- Active project name (clickable → opens project switcher)
- Separator |
- Task count: "X tasks, Y due today"
- Separator |
- Pomodoro timer (if running: countdown, else "Start Pomodoro" link)
- Separator |
- Habit streak summary: "3 day streak 🔥"
- Right side: AI model badge (Phi-3 / Claude), connection status dot (green = ready, gray = offline AI unavailable)

---

## 27. KEYBOARD SHORTCUTS (COMPLETE LIST)

| Shortcut | Action |
|---|---|
| Ctrl+K | Open command palette |
| Ctrl+D | Brain dump mode |
| Ctrl+F | Global search |
| Ctrl+Shift+D | Toggle day/night theme |
| Ctrl+Z | Undo last action |
| Ctrl+S | Force save (auto-save is always on) |
| N | New task (when task list focused) |
| 1 | Switch to Todo view |
| 2 | Switch to Mind Map view |
| 3 | Switch to Kanban view |
| 4 | Switch to Calendar view |
| 5 | Switch to SDLC Planner view |
| 6 | Switch to Goals view |
| 7 | Switch to Habits view |
| 8 | Switch to Journal view |
| F | Toggle focus mode |
| P | Start / pause Pomodoro |
| Escape | Close any open modal, panel, or overlay |
| Tab | Move between task fields (in inline edit) |
| Alt+Left / Alt+Right | Previous / next project |
| Ctrl+Enter | Save and close any open editor |
| Shift+Click | Multi-select tasks (range) |
| Ctrl+Click | Multi-select tasks (individual) |

---

## 28. REAL-TIME AUTO-SAVE

- Every change debounced 500ms before writing to SQLite
- Visual indicator: small dot in status bar (orange = unsaved changes, green = saved)
- Dot animates: pulses orange when pending, transitions to green with a smooth fade when saved
- On app close: force-save all pending changes

---

## 29. PROJECT HEALTH INDICATOR

Each project displays a health score (0-100) as a colored badge.

**Score calculation:**
- Tasks overdue: -5 per task (max -30)
- High priority tasks untouched > 3 days: -10 each
- No tasks with deadlines: -10
- Habit completion rate this week: +20 if > 80%, +10 if > 50%
- Goal progress on track: +20
- Recent AI interaction: +10
- Active journal entries this week: +10
- All tasks have estimates: +10

**Badge display:**
- 80-100: green badge "Healthy"
- 50-79: amber badge "Needs attention"
- 0-49: red badge "At risk"

Score shown in sidebar next to project name, and in a larger display in the AI panel context summary.

---

## 30. ONBOARDING FLOW (FIRST LAUNCH)

When no projects exist:

1. Welcome screen (full viewport): "Welcome to Life OS" title, brief tagline
2. "Create your first project" button (large, prominent)
3. Step 1: Name your project (input field with a few example names as ghost text)
4. Step 2: What is this project about? (goal input — feeds the AI context)
5. Step 3: Set AI behavior (three quick toggles: greeting, daily brief, proactive suggestions)
6. Step 4: Optional — "Generate an initial plan with AI?" (if yes, runs the SDLC planner immediately)
7. App opens with the new project active and AI greeting playing

---

## 31. WHAT NOT TO BUILD (HARD EXCLUSIONS)

- ❌ No user authentication, login, or registration screen
- ❌ No cloud sync or remote database
- ❌ No voice input or text-to-speech
- ❌ No multi-user features or collaboration
- ❌ No mobile app (desktop web only, min 1200px width)
- ❌ No payment or subscription system
- ❌ Do NOT use Redux (use Zustand only)
- ❌ Do NOT store API keys in plain text (encrypt in localStorage)
- ❌ Do NOT make any network requests except: Ollama localhost, optional AI API when user enables it
- ❌ No third-party analytics or tracking

---

## 32. ARCHITECTURE RULES (DEVELOPER INSTRUCTIONS)

1. **Zustand is the single source of truth.** Every view (Todo, Kanban, Mind Map, Calendar) reads from and writes to the same Zustand store. Views do not maintain their own local state for tasks.

2. **All database operations go through a `db/` service layer.** Components never call SQL directly. They call `taskService.create()`, `taskService.update()`, etc.

3. **All AI calls go through a single `ai/aiEngine.ts` module.** This module handles model detection, request building, memory reading, memory writing, and error handling.

4. **Real-time sync:** When a task is updated in the detail panel, the Kanban card, the Todo row, the Mind Map node, and the Calendar event all update simultaneously via the Zustand subscription.

5. **Performance:** 
   - Virtualize long task lists (use react-virtual or @tanstack/virtual)
   - Lazy load the Mind Map and Calendar views (they are heavy)
   - Memoize all task list items with React.memo
   - Debounce all database writes (500ms)

6. **Accessibility:**
   - All interactive elements have ARIA labels
   - Focus ring visible on all focused elements
   - Modal and panel focus trapping
   - Color is never the only differentiator (always paired with icon or label)

---

## 33. DELIVERABLE CHECKLIST

The finished application must demonstrate all of the following working simultaneously:

- [ ] Multiple projects created, each with isolated data
- [ ] Tasks created, edited, completed, deleted in Todo view
- [ ] Same tasks visible in Kanban with drag-drop working
- [ ] Same tasks visible as bookings in Calendar view
- [ ] Mind map synced with task list (add node = add task offer)
- [ ] SDLC planner generates a full plan from a text goal
- [ ] Habits tracked with streak counter and heatmap rendering
- [ ] Journal entry saved with word count
- [ ] Goal hierarchy with progress bars
- [ ] Brain dump mode parses text into categorized items
- [ ] Clock (digital + analog) showing correct time with hover animation
- [ ] Calendar popup opens when clock is clicked
- [ ] Theme switching between all 6 themes (including dark)
- [ ] Day/Night toggle works instantly
- [ ] AI chat responds (Ollama or API, whichever is available)
- [ ] AI greeting appears on open
- [ ] Daily brief generated
- [ ] Command palette (Ctrl+K) opens and executes commands
- [ ] Pomodoro timer runs and logs sessions
- [ ] Focus mode hides sidebar and AI panel
- [ ] Toast notifications appear for key actions
- [ ] Settings panel accessible with all sections present
- [ ] Auto-save indicator visible and functional
- [ ] All keyboard shortcuts documented and working

---

*End of Life OS Build Prompt — Version 1.0*
*Total features: 33 sections, 200+ specifications*
*Target: Production-quality prototype, single user, fully offline-first*
