# Life Flow Hub

**Life Flow Hub** is a modern, all-in-one productivity platform built with React, Vite, Zustand, and Tailwind CSS. It unifies essential tools for personal and professional growth—tasks, kanban, pomodoro, habits, journal, goals, mind map, SDLC planner, and more—into a single, beautiful workspace.

---

## ✨ Features

- **Modular Productivity:** Tasks, Kanban, Pomodoro, Habits, Journal, Goals, Mind Map, SDLC, Sticky Notes, Calendar, and more.
- **Offline AI Assistant:** Local LLM inference (ONNX/transformers.js) for privacy and speed. No remote calls when offline mode is enabled.
- **Customizable Clocks:** Dual timezone clocks with digital, analog, and hybrid modes.
- **Weather Widget:** Localized weather with unit selection.
- **Focus Mode:** Distraction-free UI toggle.
- **Fast & Lightweight:** Built with Vite, optimized for speed.
- **Modern UI:** Responsive, themeable, and accessible.
- **Persistent Storage:** Uses sql.js for per-project SQLite data, synced via Zustand.
- **Comprehensive SDLC Planner:** Plan, track, and review software development lifecycle phases.
- **Command Palette & Search:** Fuzzy search, keyboard navigation, and global filters.
- **Onboarding & Backup:** First-launch onboarding, backup/export/import system.

---

## 🛠 Tech Stack

- **React** ^18.3.1
- **Vite** ^5.4.19
- **TypeScript** ^5.8.3
- **Zustand** ^5.0.12 (state management)
- **Tailwind CSS** ^3.4.17 (with tailwindcss-animate)
- **sql.js** ^1.14.1 (SQLite in browser)
- **@xenova/transformers** ^2.17.2 (local LLM inference)
- **framer-motion** ^12.38.0 (animations)
- **@dnd-kit** (drag-and-drop)
- **Radix UI** (all major primitives)
- **date-fns** ^3.6.0 (date utilities)
- **Lucide Icons** ^0.462.0
- **Testing:** Vitest, Playwright, Testing Library

See `package.json` for the full list of dependencies and versions.

---

## 📁 Project Structure

- `src/` — Main app source (components, hooks, db, stores, types)
  - `components/` — UI modules (Sidebar, TopBar, StatusBar, views for each feature)
  - `ai/` — AI engine, local agent API, types
  - `db/` — SQLite schema, per-feature services
  - `hooks/` — Custom React hooks
  - `stores/` — Zustand stores for state management
  - `pages/` — Main page routes
  - `types/` — TypeScript types
  - `utils/` — Utility functions
- `public/ai/models/` — Local AI models (not tracked in git)
- `public/music/` — Focus music assets and manifest
- `scripts/` — Utility scripts for asset/model management
- `README.md`, `LICENSE` — Docs and license

---

## 🚀 Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Start the development server:**
   ```sh
   npm run dev
   ```
3. **(Optional) Download AI models for offline mode:**
   ```sh
   node scripts/download-phi-offline.mjs
   # or place ONNX models in public/ai/models/Xenova/
   ```

---

## 🤖 AI & Local Models

- Place ONNX or compatible models in `public/ai/models/Xenova/` for offline LLM support.
- Large model files are managed with [Git LFS](https://git-lfs.github.com/).
- See `public/ai/models/README.md` for details.

---

## 🧩 Main Modules & Views

- **Sidebar:** Navigation for all modules (Tasks, Kanban, Calendar, Pomodoro, Habits, Journal, Goals, Mind Map, SDLC)
- **TopBar/StatusBar:** Clocks, weather, model status, and quick actions
- **Task System:** Full CRUD, inline edit, detail panel, animations
- **Kanban Board:** Columns, drag-drop, WIP limits
- **Calendar/Scheduler:** Month view, task scheduling
- **Pomodoro:** Timer, session tracking, focus overlay
- **Habits:** Tracker, streaks, heatmap
- **Journal:** Editor, mood selector, AI prompt
- **Goals:** OKR tree, progress bars
- **Mind Map:** D3.js tree, node interactions
- **SDLC Planner:** AI generation, phase cards, Gantt preview
- **Sticky Notes:** Overlay for quick notes
- **Command Palette:** Ctrl+K, fuzzy search, keyboard navigation

---

## 🧪 Testing

- **Unit tests:** `npm run test`
- **E2E tests:** `npx playwright test`
- **Linting:** `npm run lint`

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed log of all completed features and phases.

---

## 💡 Contributing

Pull requests and issues are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📣 Disclaimer

This is an open-source, personal productivity tool. Use at your own risk. No warranty is provided.
