# CHANGELOG

> Update this log immediately after completing each feature.

[PHASE 1] Project foundation scaffolding
Status: COMPLETE
What was built: Removed react-query to align with Zustand-only spec; added sql.js-powered per-project SQLite schema and persistence layer with debounced syncing; initialized AI engine scaffold defaulting to Phi-3 offline with request builder and health checks; expanded global settings (AI + clocks) and ensured full-viewport layout baseline.
Files changed: src/App.tsx, package.json, src/db/schema.ts, src/db/projectDb.ts, src/db/taskService.ts, src/ai/aiEngine.ts, src/ai/types.ts, src/stores/useStore.ts, src/App.css, CHANGELOG.md
Notes: Tasks persist via sql.js with project hydration and debounced flush; AI API mode placeholder remains to implement; further layout and feature phases follow spec sequencing.
---
[PHASE 2] Layout shell (4-zone)
Status: COMPLETE
What was built: Set top bar to 64px, bottom bar to 40px with date/model indicators; sidebar widths aligned to 240/48 with auto-collapse on mobile; AI panel gains mobile FAB, slide-in with backdrop, and desktop 320px rail; ensured full-viewport layout scaffold ready for subsequent feature views.
Files changed: src/components/TopBar.tsx, src/components/StatusBar.tsx, src/components/Sidebar.tsx, src/components/AiPanel.tsx, CHANGELOG.md
Notes: Focus mode still hides sidebar/AI per store; future phases will flesh out view content and additional bottom-bar data.
---
[PHASE 3] Clock system
Status: COMPLETE
What was built: Replaced clock widget with skinnable digital/analog versions (hover/tap motion), timezone-aware rendering with 12/24h toggle, secondary clock support, and timezone pills (IST/GMT/PST/EST). Added calendar popup with month navigation and today’s tasks list, clickable from any clock. Integrated settings-backed format/timezone options and responsive behavior.
Files changed: src/components/ClockWidget.tsx, src/components/TopBar.tsx, CHANGELOG.md
Notes: Uses system time for offline-first spec; no external network time sync. Calendar interactions beyond display are stubbed for future phases.
---
