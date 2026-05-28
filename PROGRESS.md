# Progress Log

---

## Phase 0 — Complete ✅
**Date:** 2026-05-07

### What was done
- Scaffolded Next.js 14 (App Router, TypeScript, Tailwind v4)
- Installed all dependencies: drizzle-orm, better-sqlite3, recharts, lucide-react, react-hook-form, zod, sonner, date-fns
- Initialised shadcn/ui with all required components: button, card, dialog, sheet, tabs, calendar, form, input, select, progress, badge, checkbox, label, textarea, dropdown-menu, popover, separator, tooltip, command, sonner
- Created full Drizzle schema (28 tables covering all 6 life areas)
- Ran migrations — `data/dashboard.db` created and ready
- Built app shell: sidebar with all 9 nav items (collapsible), mobile nav (Sheet), Inter font, teal design system
- Built Home placeholder page with 3 cards (Today / This Week / Quick Actions)
- Built Settings stub showing currency rates and routine sections
- Wrote and ran seed script: supplements (Creatine, Vitamin D, Dutasteride), Morning + Evening routines, currency rates (GBP, AUD), default budget categories
- Created README with startup instructions and phone access guide

### Key decisions
- Database file lives at `data/` (gitignored) — user backs it up manually
- Sidebar collapses to icon-only mode on click; mobile uses a Sheet drawer
- Used Tailwind v4 (shadcn default) — CSS variables for design tokens
- Accent colour: `#0d9488` (deep teal)

### What's next
- **Phase 1** — Health module: workouts, weight, steps, supplements pages ← done

---

## Phase 1 — Complete ✅
**Date:** 2026-05-07

### What was done
- DB query helpers: `src/db/queries/workouts.ts`, `weight.ts`, `steps.ts`, `supplements.ts`
- Server actions: `src/actions/health.ts` (logWorkout, logWeight, logSteps, takeSupplement, addSupplement, etc.)
- `/health` — overview with 4 stat cards (workouts this week, latest weight + delta, steps + 7d avg, supplement adherence %) and recent activity list
- `/health/workouts` — month-view calendar with coloured dots per workout type, "Log workout" dialog (date, type, duration, distance, notes, dynamic exercise rows), recent workouts list with exercise details
- `/health/weight` — quick log form, line chart (30d/90d/365d/All toggle), 3 delta cards (vs 7d/30d/start), full log history
- `/health/steps` — bar chart with 10k goal line, stat cards (today/7d avg/30d avg), manual log form, Apple Health export instructions
- `/health/supplements` — today's progress bar, list of all 3 supplements with "✓ Take" buttons (tap to log + shows "Done"), weekly adherence %
- Health sub-nav (tabbed): Overview / Workouts / Weight / Steps / Supplements

### Key decisions
- shadcn uses `@base-ui/react` — no `asChild` prop; custom form.tsx written manually
- WorkoutCalendar is a pure client component receiving all workouts; filters by month client-side (avoids server→client function prop serialisation issue)
- Forms use plain `register()` / `Controller` (not shadcn Form wrapper) for type safety

### What's next
- **Phase 2** — Food module: meal library, meal plan calendar, grocery list ← done

---

## Phase 2 — Complete ✅
**Date:** 2026-05-07

### What was done
- DB query helpers: `src/db/queries/food.ts` (meals, plans, grocery lists)
- Server actions: `src/actions/food.ts` (addMeal, updateMeal, deleteMeal, planMeal, removeMealPlan, markMealEaten, copyWeekPlan, generateGroceryList, toggleGroceryItem, addManualGroceryItem)
- Workout-aware meal suggestion engine: `src/lib/meal-suggestions.ts` (scores meals by tags based on workout type + day of week)
- `/food` — overview: today's 4 meal slots (with eaten/planned state), macro totals (cals + protein from eaten meals), 3 suggestions based on today's workout, grocery list badge
- `/food/meals` — meal library grid (cards with name, tags, macros, ingredient count), "Add meal" dialog (name, type, tags, macros, prep time, dynamic ingredient rows with qty/unit/aisle, recipe notes), edit + delete per card
- `/food/plan` — week-view calendar (7 days × 4 slots), workout type shown per day, click empty slot → pick-meal dialog (suggestions at top, searchable full list), mark eaten toggle (green checkmark), remove plan, "Copy to next week" button, week navigation (prev/next)
- `/food/groceries` — generate list from current week's meal plan (auto-merges duplicate ingredients), grouped by aisle (produce/protein/dairy/pantry/frozen/other), checkbox toggle per item, progress bar, add manual items, print button
- Food sub-nav (tabbed): Overview / Meals / Meal Plan / Groceries

### Key decisions
- `suggestMeals()` scores meals by tags: lifting days → high_protein + post_workout; cardio → high_protein; rest/walk → high_protein + low_carb; weekends → flexible with weekend_treat
- Grocery list stored as JSON in SQLite; regenerate overwrites and re-merges from meal plan
- Plan page uses URL `?week=` param for week navigation — server re-fetches on each nav
- `zodResolver` cast needed (`as unknown as Resolver<FormValues>`) due to `@hookform/resolvers` generic variance with Zod `.default()`

### What's next
- **Phase 3** — Home page + Calendar ← done

---

## Phase 3 — Complete ✅
**Date:** 2026-05-07

### What was done
- DB query helpers: `src/db/queries/routines.ts`, `src/db/queries/tasks.ts`
- Server actions: `src/actions/routines.ts` (toggleRoutineItem — also logs linked supplement), `src/actions/tasks.ts` (addTask, completeTask)
- `/` (Home) rebuilt with three sections:
  - **Today**: greeting (morning/afternoon/evening), morning checklist (collapses after noon), today's 4 meal slots, tasks due today with inline complete button, evening checklist (dimmed before 5pm)
  - **This Week**: 4 stat cards (workouts, weight + delta, steps, routine %), weight sparkline (last 30 days)
  - **Quick Actions**: Log workout dialog, Log weight dialog, Plan a meal (→ /food/plan), Add task dialog, Log expense (→ /finances/transactions or toast if no accounts)
- `/calendar` — week view (default) + month toggle, workout badges by type, meal count, task pills; prev/next navigation; filter toggles; click day → side sheet with full day detail

### Key decisions
- Calendar uses `?view=week&anchor=YYYY-MM-DD` URL params — server re-fetches range on each navigation
- Routine toggle upserts via select-then-insert-or-update
- `completeTask` used as inline Server Action in JSX directly from page

### What's next
- **Phase 4** — Finances ← done

---

## Phase 4 — Complete ✅
**Date:** 2026-05-07

### What was done
- DB query helpers: `src/db/queries/finances.ts` (accounts, transactions, budgets, bills, savings goals, investments, currency rates)
- Server actions: `src/actions/finances.ts` (add/delete accounts; add/delete transactions with auto balance update; update budgets; add/update/delete/mark-paid bills with rolling due date; add/update/delete savings goals with add-money; add/update/delete investments)
- `/finances` — overview with 4 stat cards (income, expenses, net, total savings), spending donut chart by category, accounts list, recent 10 transactions, upcoming 14-day bills
- `/finances/transactions` — filterable table (search, type, category, account), delete row on hover, shows native currency + GBP equivalent
- `/finances/budgets` — per-category progress bars (green/amber at 80%/red over), inline edit limits, add/delete categories
- `/finances/bills` — list sorted by next due date (overdue section + upcoming), mark paid (creates transaction + rolls due date), add/edit/delete
- `/finances/savings` — card per goal with progress bar + % complete, "Add money" dialog (logs transfer transaction), edit/delete
- `/finances/investments` — list with click-to-edit value (Enter to save), total portfolio value at top, add/delete
- All dialogs: AddAccountDialog, AddTransactionDialog (with live GBP conversion preview for non-GBP currencies), AddBillDialog, AddSavingsGoalDialog, AddInvestmentDialog

### Key decisions
- Multi-currency: transaction stores native amount + GBP converted at time of entry using rates table; live conversion preview shown in form while typing
- Bill "mark paid" rolls next_due_date forward by frequency (weekly/monthly/quarterly/yearly) and creates an expense transaction if account is linked
- Account balance auto-updates on every income/expense transaction; transfers leave balance unchanged (user logs both sides manually)

### What's next
- **Phase 5** — Goals, Projects, Tasks, Habits ← done

---

## Phase 5 — Complete ✅
**Date:** 2026-05-07

### What was done
- DB query helpers: `src/db/queries/goals.ts` (getGoals, getActiveGoals, getActiveHabits, getHabitLogsForRange), `src/db/queries/projects.ts` (getProjects, getProjectWithTasks, getStandaloneTasks, getAllActiveTasks)
- Server actions: `src/actions/goals.ts` (addGoal with optional linked savings goal, updateGoal, updateGoalProgress, deleteGoal, addHabit, toggleHabitLog, deleteHabit), `src/actions/projects.ts` (addProject, updateProject, deleteProject, setProjectStatus, addTask, updateTaskStatus, deleteTask)
- `/goals` — goal cards grouped by status (Active/Paused/Done/Abandoned), category colour badges, inline progress % editor with blur-to-save, linked savings goal progress bar, edit/delete dropdown; habits section below with 7-day dot grid per habit (click any dot to toggle), add habit dialog
- `/projects` — kanban columns (Active/Paused/Done), project cards with colour accent border, link to detail page, cycle status button, edit/delete; standalone quick-tasks section below
- `/projects/[id]` — project detail: title with colour dot, description, status/deadline/task-count stats, progress bar (done/total tasks), task list grouped by In Progress / To Do / Done with click-to-cycle status and delete
- Dialogs: AddGoalDialog (optional linked savings goal checkbox), AddProjectDialog (colour palette picker), AddTaskDialog (reusable, accepts optional projectId)

### Key decisions
- Habit logs stored as YYYY-MM-DD strings; 7-day grid built client-side from `subDays(new Date(), 0..6)`
- Savings goals fetched separately via `inArray` for goals that have a linked savings ID — avoids a join
- Project kanban uses `setProjectStatus` (status-only update) so cards can cycle status without opening edit dialog
- Task status cycles: todo → doing → done → todo (click the status icon)

### What's next
- **Phase 6** — Side Hustles ← done

---

## Phase 6 — Complete ✅
**Date:** 2026-05-07

### What was done
- DB query helpers: `src/db/queries/hustles.ts` (getHustles, getHustleById, getRevenueForHustle, getTimeLogsForHustle, getRevenueInRange, getTimeLogsInRange)
- Server actions: `src/actions/hustles.ts` (addHustle, updateHustle, deleteHustle, logRevenue, deleteRevenue, logTime, deleteTimeLog)
- `/hustles` — overview with 3 stat cards (total monthly revenue, total hours, effective £/hr), grid of hustle cards each showing that hustle's month revenue + hours, click-through to detail
- `/hustles/[id]` — detail page: 3 stat cards (12-month revenue/hours/rate), "Log Revenue" + "Log Time" dialogs, monthly bar chart (12 months), weekly hours chart (12 weeks), recent revenue table, recent time log table with hover-to-delete
- Dialogs: AddHustleDialog (colour palette), LogRevenueDialog (multi-currency amount + source + notes), LogTimeDialog (hours + minutes split)
- Charts: RevenueChart (Recharts BarChart grouping revenue by month and converting to GBP), TimeChart (BarChart grouping time by week)

### Key decisions
- Revenue stored in native currency; converted to GBP at display time using currency_rates table (not at entry time, unlike transactions)
- Hustle delete is soft-delete (active=false) so historical revenue/time data is preserved
- Charts query full 12-month / 12-week range from server; grouping done client-side in the chart components

### What's next
- **Phase 7** — Tauri desktop wrapper ← done

---

## Phase 7 — Complete ✅
**Date:** 2026-05-07

### What was done
- Installed Rust 1.95 (required for Tauri)
- Installed `@tauri-apps/cli` v2.11.1 as a dev dependency
- Ran `tauri init` and configured `src-tauri/tauri.conf.json`:
  - identifier: `com.personal.life-dashboard`
  - Window: 1400×900 (min 800×600), loads `http://localhost:3000` directly
  - CSP disabled (local-only app, no external threats)
  - `beforeDevCommand: "npm run dev"` so `tauri dev` auto-starts Next.js
- Added `output: "standalone"` to `next.config.ts` for production builds
- Built `.app` bundle with `npx tauri build` (Rust compiled in ~2 min)
- Installed `Life Dashboard.app` to `/Applications`
- Also built `Life Dashboard_0.1.0_aarch64.dmg` (in `src-tauri/target/release/bundle/dmg/`)
- Created `launch-dashboard.command` — double-click launcher that starts the Next.js server, waits for it to be ready, then opens the Tauri app
- Added `tauri:dev` and `tauri:build` npm scripts
- Updated README with native app launch instructions

### Key decisions
- The Tauri app always loads `http://localhost:3000` (SSR app with Server Actions can't be exported as static)
- `launch-dashboard.command` handles starting the server before opening the app
- App stays open independently — closing the window doesn't kill the server (user can reopen it)

### Architecture summary — all 7 phases complete
- Phase 0: App shell, DB schema, seed data
- Phase 1: Health (workouts, weight, steps, supplements)
- Phase 2: Food (meals, meal plan, grocery list)
- Phase 3: Home dashboard + Calendar
- Phase 4: Finances (accounts, transactions, budgets, bills, savings, investments)
- Phase 5: Goals, Projects, Tasks, Habits
- Phase 6: Side Hustles (revenue, time tracking, charts)
- Phase 7: Tauri native Mac app wrapper

---
