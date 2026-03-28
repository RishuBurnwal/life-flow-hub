PROMPT:
Before writing a single line of code, you must do the following:
Step 1 — Read and understand the full project spec. Go through every section of the Life OS build prompt. Do not skip anything.
Step 2 — Create a master TODO list. List every single feature from the spec as individual checklist items. Group them by module (Clock System, Sidebar, Todo View, Mind Map, Kanban, Calendar, SDLC Planner, Habits, Journal, Goals, Brain Dump, AI Engine, Pomodoro, Settings, etc.). Number every item. This TODO list is your source of truth for the entire build. Nothing gets built that is not on this list. Nothing on this list gets skipped.
Step 3 — Create a complete SDLC plan. Break the build into sequential phases:

Phase 1: Project foundation (tech stack setup, folder structure, Zustand store, SQLite schema, routing)
Phase 2: Layout shell (4-zone layout, sidebar, top panel, right panel, bottom bar)
Phase 3: Clock system (digital clock, analog clock, hover animations, calendar popup, timezones)
Phase 4: Project manager (create, rename, delete, archive, per-project data isolation)
Phase 5: Task system + Todo view (full CRUD, inline edit, detail panel, animations)
Phase 6: Mind map view (D3.js tree, node interactions, sync with tasks)
Phase 7: Kanban board (columns, drag-drop, cards, WIP limits)
Phase 8: Calendar + Scheduler (FullCalendar, drag scheduling, Gantt strip)
Phase 9: SDLC Planner view (AI generation, phase cards, Gantt preview, apply to project)
Phase 10: Habit tracker (streaks, heatmap, morning checklist, celebrations)
Phase 11: Journal (editor, mood selector, AI prompt, weekly synthesis)
Phase 12: Goal hierarchy (OKR tree, progress bars, Sunday review)
Phase 13: Brain dump mode (full-screen overlay, AI parsing, categorized results)
Phase 14: AI engine (dual-mode Phi/API, context loading, all 10 skills, memory management)
Phase 15: Pomodoro + Focus mode (timer, sessions, focus overlay)
Phase 16: Command palette (Ctrl+K, fuzzy search, keyboard navigation)
Phase 17: Search + Filter system (global search, task filters, saved presets)
Phase 18: Theme engine (6 themes, custom builder, day/night toggle)
Phase 19: Settings panel (all sections)
Phase 20: Backup, export, import system
Phase 21: Polish pass (all animations, transitions, micro-interactions, toast system, auto-save indicator)
Phase 22: Onboarding flow (first launch experience)
Phase 23: Final QA (test every item on the TODO list)

Step 4 — Create a CHANGE LOG file called CHANGELOG.md in the root of the project. Every time you complete a feature, you must immediately update this file with:
[PHASE X] [FEATURE NAME]
Status: COMPLETE
What was built: (2-3 sentences describing exactly what was implemented)
Files changed: (list every file that was created or modified)
Notes: (any decisions made, edge cases handled, or things to watch)
---
This log must be updated after every single task, no exceptions.
Step 5 — Work rules (follow these strictly throughout the entire build):

One task at a time. Pick the first incomplete item from the TODO list. Work on it and nothing else until it is 100% complete and tested. Do not start the next item while the current one has any known issue.
Complete means complete. A feature is only marked done when: it renders correctly, all animations specified in the design system are implemented, data saves to SQLite correctly, the Zustand store updates correctly, and edge cases (empty state, error state, loading state) are handled.
Never leave broken code to fix later. If something breaks while building a feature, fix it before moving on. Do not comment out broken code with "TODO: fix this later."
Announce your current task. At the start of each task, state clearly: "Now working on: [Phase X] — [Feature Name]". At the end, state: "Completed: [Feature Name]. Updating CHANGELOG. Moving to: [next item]."
Check the TODO list before every response. Before writing any code, confirm which item you are working on and that it is the correct next item in sequence.
Do not skip phases. Phase 1 must be 100% complete before Phase 2 begins. Phase 2 must be complete before Phase 3 begins. No jumping ahead.
Animation is not optional. Every interaction specified in Section 4.4 of the spec (hover effects, card entrances, modal animations, drag effects, etc.) must be implemented as part of the feature it belongs to — not deferred to the polish phase.
Ask before assuming. If the spec is ambiguous on any detail, ask one specific question before proceeding. Do not guess and build the wrong thing.
No placeholder content. Do not use "Lorem ipsum", fake data, or "coming soon" placeholders. Every view must show a meaningful empty state with an action to get started.
Test as you build. After each feature, describe how you tested it and confirm it works before marking it done.

Now begin. Start with Step 2: write the complete master TODO list first. Do not write any code yet. Show me the full numbered TODO list grouped by module, then show me the full SDLC phase plan, then wait for my confirmation before writing any code.