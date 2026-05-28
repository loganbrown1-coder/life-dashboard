# Personal Life Dashboard — Build Specification

> This document is a build spec for Claude Code. The user is a beginner on macOS who wants a personal dashboard for health, food, finances, life goals, projects, and side hustles. Build it in phases. Stop after each phase for testing.

---

## 0. How to use this document (instructions for Claude Code)

You are building a personal life dashboard for a single user. Follow these working principles strictly:

1. **Explain every command before running it.** The user is a complete coding beginner. Never assume software is installed. Walk them through installing things one step at a time.
2. **Build in phases.** Phase 0 → confirm working → Phase 1 → confirm → Phase 2 → confirm, etc. Do NOT skip ahead.
3. **STOP at the end of every phase** and explicitly ask the user to test it before moving on. Do not start the next phase until they confirm.
4. **Prefer simple, readable code over clever code.** Comment generously — explain *why*, not just *what*. The user must be able to read this code in 6 months and understand it.
5. **If anything is ambiguous, ASK before assuming.** One clarifying question is better than 30 minutes of rework.
6. **Maintain `PROGRESS.md` as you go.** After every meaningful chunk of work, append: what was done, what's next, key decisions made. This lets future sessions pick up where you left off.
7. **Maintain `README.md`.** Always keep an up-to-date "How to start the app each day" section in plain English.
8. **Never break working features.** When in doubt, restart the app and confirm it still works after your changes.
9. **Don't loop on errors.** If a command fails twice, stop and explain what's wrong to the user instead of retrying blindly.

---

## 1. Project overview

A **local-first personal dashboard** running on the user's Mac, also accessible from their phone via the same Wi-Fi network. Six life areas tracked in one place. All data lives on the user's machine in a single SQLite file. No accounts. No cloud. No paid APIs.

### v1 success criteria (Phases 0–2 only)
- App opens from the dock and runs at `localhost:3000`
- Home screen shows: today's plan, recent trends, quick-entry buttons, morning/evening checklists
- User can log a workout, weigh-in, meal, or transaction in under 30 seconds
- Food module suggests meals based on the day's planned workout
- Weekly grocery list auto-generates from planned meals
- Phone access works on home Wi-Fi
- Data persists between sessions

Modules 3–6 (Finances, Goals, Projects, Hustles) come AFTER v1 ships and the user has tested it.

---

## 2. About the user

| Attribute | Value |
|---|---|
| Skill level | Total beginner — no professional coding experience |
| OS | macOS |
| Base currency | GBP |
| Travel | Going to Australia soon — needs multi-currency from day one |
| Fitness goal | Body recomposition (build muscle, lose fat, general health) |
| Workout split | Push / Pull / Legs / Core / Arms+Shoulders + 2× running + ~1× swimming per week + daily walking |
| Diet | Prefers high-protein, lower-carb on weekdays. Eats freely on weekends. |
| Supplements (daily) | Creatine, Vitamin D, Dutasteride |
| Skincare (AM+PM) | Cleanser + moisturiser |
| Other daily | Morning + evening stretch, Brick app for blocking phone apps |
| Side hustles | ~3 planned, want them all on one page with click-through detail |
| Investments | One ISA, manual valuation updates only |
| Units | Metric (kg, cm, km) |

---

## 3. Tech stack — use exactly these

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14+ App Router, TypeScript | One stack does frontend + backend; well-supported by Claude Code |
| Styling | Tailwind CSS + shadcn/ui | Professional UI without designing from scratch |
| Database | SQLite via `better-sqlite3` | Zero setup; one file the user can back up |
| ORM | Drizzle ORM + `drizzle-kit` | Readable schemas, simple migrations |
| Charts | Recharts | Looks great by default, easy API |
| Icons | lucide-react | Clean, consistent |
| Forms | react-hook-form + zod | Validated forms, minimal boilerplate |
| Dates | date-fns | Lightweight, predictable |
| Client state | `useState` / `useReducer` only | No Redux, no Zustand — keep it simple |
| Server state | React Server Components + Server Actions | Native to Next.js |
| Desktop wrapper | Tauri 2.0 | Phase 6 only — get the web app working first |

**Do NOT add other libraries without asking the user.**

---

## 4. Design system

The user wants: **clean, lots of visuals, neatly laid out.** Think Linear meets Apple Health.

### Visual rules
- **Font:** Inter (Google Fonts), generous line height
- **Background:** Near-white (`#fafafa`) with white cards
- **Accent colour:** Deep teal `#0d9488`. Use sparingly — primary buttons, active nav, key highlights.
- **Status colours:** Green `#10b981` (good / on track), amber `#f59e0b` (warning), red `#ef4444` (problem). Use sparingly.
- **Cards:** `rounded-xl`, subtle shadow (`shadow-sm`), white background, clear titles.
- **Spacing:** Generous. Don't cram.
- **Layout:** Sidebar navigation on left (collapsible to icons-only on small screens), main content area, max-width 1400px, comfortable padding.
- **Charts everywhere data exists.** Never show a number alone — always pair with a sparkline, trend arrow, or comparison.
- **Mobile-responsive from day one.** Every page must work on a 375px-wide screen. Sidebar becomes a bottom nav or sheet on mobile.

### shadcn/ui components to install in Phase 0
`button`, `card`, `dialog`, `sheet`, `tabs`, `calendar`, `form`, `input`, `select`, `progress`, `badge`, `checkbox`, `label`, `textarea`, `dropdown-menu`, `popover`, `toast` (sonner), `separator`, `tooltip`, `command`

---

## 5. Information architecture (sidebar nav)

```
🏠  Home              ← today's snapshot + checklists + quick entry
📅  Calendar          ← unified weekly/monthly view (workouts, meals, tasks)
💪  Health            ← workouts, weight, steps, supplements
🍽️  Food              ← meals library, meal plan, grocery list
💰  Finances          ← transactions, budgets, bills, savings, investments
🎯  Goals             ← life goals + habits
✅  Projects          ← projects + standalone tasks
🚀  Hustles           ← side hustles overview + detail
⚙️  Settings          ← currency rates, checklist customisation, backup, export
```

The Calendar page is the master view — workouts, planned meals, and tasks all show up there. Default view: week. Toggle to month.

---

## 6. Data model (Drizzle schema)

Set up the **complete schema in Phase 0** even though only some tables are used in v1. This avoids painful migrations later.

All tables include: `id` (uuid, primary key), `created_at` (timestamp), `updated_at` (timestamp).

### Health
- **workouts** — `date`, `type` (push/pull/legs/core/arms_shoulders/run/swim/walk/stretch/rest/other), `duration_minutes`, `distance_km` (nullable, for run/swim), `notes`, `planned` (bool), `completed` (bool)
- **workout_exercises** — `workout_id`, `name`, `sets`, `reps`, `weight_kg`, `notes`, `order_index`
- **weight_logs** — `date`, `weight_kg`, `body_fat_pct` (nullable), `notes`
- **steps_logs** — `date`, `step_count`, `source` (manual/import)
- **supplements** — `name`, `dosage`, `schedule` (daily/weekly/as_needed), `time_of_day` (morning/evening/anytime), `active` (bool)
- **supplement_logs** — `supplement_id`, `taken_at` (timestamp)

### Food
- **meals** — `name`, `description`, `meal_type` (breakfast/lunch/dinner/snack), `tags` (json: high_protein, post_workout, low_carb, weekend_treat, etc.), `calories_estimate`, `protein_g`, `carbs_g`, `fat_g`, `prep_time_minutes`, `recipe_notes`
- **meal_ingredients** — `meal_id`, `name`, `quantity`, `unit` (g/ml/piece/cup/tbsp/tsp), `aisle` (produce/protein/dairy/pantry/frozen/other) — used for grouping the grocery list
- **meal_plans** — `date`, `meal_id`, `meal_slot` (breakfast/lunch/dinner/snack), `eaten` (bool)
- **grocery_lists** — `week_start_date`, `items` (json array of `{name, total_quantity, unit, aisle, checked}`), `generated_at`

### Finances
- **accounts** — `name`, `type` (checking/savings/credit/investment/cash), `currency` (GBP/AUD/etc.), `current_balance`
- **transactions** — `date`, `account_id`, `amount`, `currency`, `amount_in_base_currency` (computed using rate at time of entry), `type` (income/expense/transfer), `category`, `description`, `is_recurring` (bool)
- **currency_rates** — `currency_code`, `rate_to_gbp`, `updated_at` — manually edited in Settings
- **budgets** — `category`, `monthly_limit_gbp`, `active_from`
- **bills** — `name`, `amount`, `currency`, `frequency` (monthly/quarterly/yearly/weekly), `next_due_date`, `category`, `auto_pay` (bool), `account_id` (nullable)
- **savings_goals** — `name`, `target_amount_gbp`, `current_amount_gbp`, `target_date` (nullable), `notes`, `linked_life_goal_id` (nullable, FK to goals)
- **investments** — `name`, `type` (isa/stock/crypto/etf/other), `last_known_value_gbp`, `last_updated`, `notes`

### Routines (morning/evening checklists) and Habits
- **routines** — `name` (Morning / Evening / etc.), `time_of_day` (morning/evening/anytime), `display_order`
- **routine_items** — `routine_id`, `label`, `display_order`, `active` (bool), `linked_supplement_id` (nullable — ticking the item also logs the supplement), `linked_habit_id` (nullable)
- **routine_logs** — `routine_item_id`, `date`, `completed` (bool)
- **habits** — `title`, `description`, `frequency` (daily / Nx_per_week), `target_per_week` (int, nullable), `active` (bool)
- **habit_logs** — `habit_id`, `date`, `completed`

### Goals, Projects, Tasks
- **goals** — `title`, `description`, `category` (life/career/relationships/travel/learning/other), `target_date` (nullable), `status` (active/done/paused/abandoned), `progress_pct` (0–100, manual), `linked_savings_goal_id` (nullable)
- **projects** — `title`, `description`, `status` (active/paused/done), `deadline` (nullable), `colour` (for calendar)
- **tasks** — `project_id` (nullable for standalone), `title`, `notes`, `status` (todo/doing/done), `due_date` (nullable, drives calendar), `priority` (low/med/high)

### Side hustles
- **side_hustles** — `name`, `description`, `colour`, `active`
- **hustle_revenue** — `hustle_id`, `date`, `amount`, `currency`, `source`, `notes`
- **hustle_time_logs** — `hustle_id`, `date`, `minutes`, `description`

---

## 7. Build phases

**You MUST stop at the end of each phase and ask the user to test before continuing.** Do not chain phases.

---

### Phase 0 — Setup (do this first; walk the user through every step)

**Goal:** Get a working Next.js app shell running at `localhost:3000` with the sidebar nav, design system, and full database schema in place.

#### Steps
1. **Check Node.js.** Run `node --version`. If missing or below v18, instruct the user to download the LTS installer from [nodejs.org](https://nodejs.org), double-click the `.pkg` file, follow the prompts. Re-check after.
2. **Create the project.**
   ```bash
   npx create-next-app@latest life-dashboard --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"
   ```
   Choose Yes/No defaults explicitly so the user sees what's happening.
3. **Install dependencies.**
   ```bash
   npm install better-sqlite3 drizzle-orm date-fns recharts lucide-react react-hook-form zod @hookform/resolvers sonner
   npm install -D drizzle-kit @types/better-sqlite3
   ```
4. **Initialise shadcn/ui.**
   ```bash
   npx shadcn@latest init
   ```
   Then install the components listed in section 4.
5. **Set up the database.**
   - Create `data/` folder at project root
   - Add `data/` to `.gitignore`
   - Create `src/db/schema.ts` with the FULL schema from section 6 (all tables, even unused ones)
   - Create `src/db/index.ts` exporting a Drizzle client pointed at `data/dashboard.db`
   - Create `drizzle.config.ts`
   - Run `npx drizzle-kit generate` and `npx drizzle-kit migrate` to create the database file
6. **Build the app shell.**
   - `src/app/layout.tsx` — sets up Inter font, sidebar layout, toast provider
   - `src/components/sidebar.tsx` — collapsible left sidebar with the nav items from section 5. Active item highlighted in teal.
   - `src/components/mobile-nav.tsx` — bottom nav or Sheet trigger for mobile (<768px)
   - Each nav item routes to `src/app/[section]/page.tsx`. For Phase 0, every page except Home is a placeholder showing `<h1>Coming soon</h1>`.
7. **Build the Home page placeholder.** Three empty cards labelled "Today", "This Week", "Quick Actions" so the structure is visible.
8. **Seed initial data.** Create `src/db/seed.ts` and run it once. It should insert:
   - The user's three supplements: Creatine, Vitamin D, Dutasteride (all daily, morning)
   - Two routines: "Morning" and "Evening", with these items pre-populated:
     - **Morning:** Take weight, Creatine, Vitamin D, Dutasteride, Face cleanser, Moisturiser, Morning stretch, Block phone apps (Brick), Exercise (if scheduled)
     - **Evening:** Face cleanser, Moisturiser, Evening stretch, Read
   - Default currency rate row: GBP → GBP at 1.0
   - One additional currency rate to start: AUD → GBP at 0.52 (user can edit)
   - The user's workout template: Push, Pull, Legs, Core, Arms+Shoulders, plus Run and Swim as workout types available
   - Default budget categories: Rent, Groceries, Eating Out, Transport, Subscriptions, Health, Shopping, Travel, Bills, Savings, Other
9. **Create `README.md`** with:
   - Project description (one paragraph)
   - "How to start the app each day" section: open Terminal, `cd ~/Projects/life-dashboard`, `npm run dev`, open `http://localhost:3000`
   - "How to access from phone" section: find Mac's local IP via System Settings → Network, then on phone visit `http://[mac-ip]:3000` over the same Wi-Fi
   - "Where my data lives" section: `data/dashboard.db` — back this file up
10. **Create `PROGRESS.md`** with the Phase 0 completion log.

#### Stop here.
Tell the user:
> Phase 0 is complete. Please run `npm run dev`, open `http://localhost:3000`, and confirm: (a) the sidebar shows all nav items, (b) clicking each nav item changes the URL, (c) it looks clean on your phone if you visit your Mac's IP. Once confirmed, say "Phase 1" and I'll continue.

---

### Phase 1 — Health module

**Goal:** Workouts, weight, steps, and supplements all functional. This is the user's #1 priority module.

#### Pages to build

**`/health` (overview)** — landing page for the section
- 4 stat cards across the top: Workouts this week (with target of ~6), Latest weight (with delta vs last week), Steps today (with weekly avg), Supplement adherence (% this week)
- Below: a small recent-activity list showing the last 7 days of logged items

**`/health/workouts`**
- Month calendar grid at the top, each day a coloured dot per workout type (push=blue, pull=purple, legs=red, core=orange, arms_shoulders=cyan, run=green, swim=teal, walk=grey, stretch=yellow). Click a day to see what was logged or to log a new workout.
- "Log workout" primary button → dialog form:
  - Date (defaults to today)
  - Type (select from the workout types above)
  - Duration in minutes
  - Distance km (only shown if type is run or swim)
  - Notes
  - Exercises (optional, dynamic add-row): name, sets, reps, weight kg
  - Save → toast confirmation
- Below the calendar: chronological list of recent workouts (last 30), each card expandable to show exercises.
- Stats panel: workouts this week vs target (6 default), most common type this month, current streak.

**`/health/weight`**
- Big "Log weight" input at the top — just a number field and Save button (the user weighs in daily; this should take 3 seconds).
- Big line chart below with toggles: 30 days / 90 days / 365 days / All time
- Three deltas: vs 7 days ago, vs 30 days ago, vs starting weight (whatever the first log is)
- Below: editable list of recent entries

**`/health/steps`**
- Bar chart of last 30 days
- Manual entry form (date + step count)
- "Import from CSV" button — accept Apple Health export format. Walk the user through how to export from the iPhone Health app (Profile → Export Health Data) when they first click this button. Parse the XML, extract step counts, dedupe by date, save.
- Stat cards: today, 7-day average, 30-day average

**`/health/supplements`**
- List of active supplements with a big "✓ Take" button each
- Tapping ✓ logs that supplement as taken now AND ticks the corresponding routine item if it's morning
- Adherence chart: stacked bar showing % of supplements taken on time over the last 30 days
- Add/edit/deactivate supplements

#### Phase 1 stop point
> Phase 1 complete. Please log a real workout, a weigh-in, today's steps, and tick off your supplements. Test it on your phone too. Once confirmed, say "Phase 2" and I'll build the Food module.

---

### Phase 2 — Food module (the most ambitious feature — build carefully)

**Goal:** A meal library + workout-aware meal planning calendar + auto-generated weekly grocery list.

#### Pages to build

**`/food` (overview)** — landing page
- Today's planned meals (4 slots: breakfast, lunch, dinner, snack), each clickable to mark eaten
- Today's macro estimate vs targets (protein/carbs/fat/calories)
- Quick "What should I eat?" suggestion based on today's planned workout
- Link to grocery list for the current week

**`/food/meals` — the meal library**
- Grid of meal cards. Each card: name, meal type, calorie/protein estimate, prep time, tags as small pills.
- Filter bar: by meal type, by tag (high_protein, low_carb, post_workout, weekend_treat, quick), search by name
- "Add meal" dialog form: name, description, meal type, tags (multi-select), prep time, dynamic ingredient rows (name + quantity + unit + aisle), optional macros (calories, protein g, carbs g, fat g), recipe notes
- Edit and delete on each meal card
- Empty state: "Add your first meal" with a friendly prompt

**`/food/plan` — meal planning calendar**
- This page mirrors the Calendar workout view but for meals. Week view default, month toggle.
- Each day shows the day's planned workout (read-only, from the workouts table) at the top, then 4 meal slots (breakfast/lunch/dinner/snack) below.
- Click an empty slot → "Pick a meal" dialog:
  - **At the top: 3 suggested meals** based on the day's workout type (rules below)
  - Below that: full searchable list of meals from the library
- Click a planned meal → option to mark eaten, change to another meal, or remove
- Toggle to copy this week's plan to next week (one-click weekly repeat)

##### Meal suggestion rules
The user's goal is **recomposition** — gain muscle, lose fat. Default suggestions weight toward higher protein.

| Day's planned workout | Suggest meals tagged… |
|---|---|
| Push / Pull / Legs / Core / Arms+Shoulders | `high_protein` + `post_workout` (more carbs around the lift) |
| Run | `high_protein` + moderate carbs |
| Swim | `high_protein` + moderate carbs |
| Walk only / rest | `high_protein` + `low_carb` (lower-carb default) |
| Saturday or Sunday | Mix in `weekend_treat` and don't filter strictly — this is a flex day |

If fewer than 3 meals match the filter, fall back to general high_protein meals. Always show 3 suggestions.

##### Day-of-week rule
- **Mon–Fri:** strict suggestions following the rules above
- **Sat–Sun:** suggestions are softer — it's fine to suggest weekend_treat meals, and the macro display shows "flex day" instead of judging targets

**`/food/groceries` — auto-generated grocery list**
- "Generate this week's list" button (also auto-generates on Sunday night for the week ahead)
- The generator: read all `meal_plans` for the week, sum ingredients across all planned meals, group by `aisle`, present as a checkable list.
- Each item is checkable (saved to grocery_lists.items json). Checked items show greyed out.
- "Add manual item" input at the bottom for things outside meals.
- Print-friendly view button.

#### Phase 2 stop point
> Phase 2 complete. Please add at least 8–10 of your real meals, plan a full week including the weekend, generate the grocery list, and try it on your phone. Once confirmed, say "Phase 3" and I'll build Home + Calendar (the things that tie this together).

---

### Phase 3 — Home page + unified Calendar (this is what makes it feel like a real dashboard)

**Goal:** Build the home dashboard the user sees first, and the master Calendar view that unifies workouts, meals, and tasks.

#### `/` (Home)

Three vertical sections, in order:

1. **Today section** (top, biggest)
   - Greeting (morning/afternoon/evening based on time)
   - Today's date + day-of-week
   - **Morning checklist card** — pulls from the routine_items where time_of_day = morning, shows checkboxes, tick to log. If it's already past noon, this card collapses but still shows completion %.
   - **Today's plan card** — workout planned (if any) + 4 meal slots
   - **Today's tasks card** — tasks with due_date = today, click to mark done
   - **Evening checklist card** — pulls evening routine items. Greyed out before 5pm, prominent after.

2. **This Week section**
   - 4 small stat cards: workouts done vs target, weight delta vs last week, total steps this week, % checklist completion
   - One big sparkline showing weight trend over last 30 days

3. **Quick Actions section**
   - Big buttons: "Log workout", "Log weight", "Log meal", "Add task", "Log expense" — each opens the relevant dialog without leaving the home page

#### `/calendar` (master calendar view)

Week view default, monthly toggle. On each day cell:
- Workout badge (if any) coloured by type
- Meal slots indicator (e.g., "3/4 planned")
- Task pills (with project colour)

Click a day → side sheet showing everything scheduled that day, with quick links to edit each.

Filters at top: toggle workouts on/off, meals on/off, tasks on/off (so the user can isolate views).

#### Phase 3 stop point
> Phase 3 complete. The dashboard now feels like a real product. Use it for a few days as your daily driver before we add Finances. Once you're ready, say "Phase 4".

---

### Phase 4 — Finances module

**Goal:** Multi-currency transaction tracking, budgets, bills, savings goals, and a manual investment value.

#### Multi-currency model
- **Base currency = GBP.** Every transaction is stored in its native currency AND converted to GBP using the rate at time of entry.
- **Currency rates table** is editable from Settings. The user manually updates rates when they travel. Default rates: GBP=1, AUD=0.52 (user can change).
- The transaction form has a currency dropdown. If non-GBP is picked, the conversion is shown live as the user types.
- All summary views (budgets, totals, charts) are in GBP. Per-account views show native currency.

#### Pages

**`/finances` (overview)**
- 4 stat cards: This month's income, This month's expenses, Net this month, Total savings
- Spending by category (donut chart, current month)
- Recent transactions list (last 10)
- Upcoming bills (next 14 days)

**`/finances/transactions`**
- Big table: date, description, category, account, amount (native), amount in GBP
- Filters: date range, category, account, type
- "Add transaction" dialog: date, type (income/expense/transfer), amount, currency (defaults to account's currency), category, description, account
- Bulk import: paste CSV from a bank export (the user will need to map columns the first time; save the mapping per account)

**`/finances/budgets`**
- Per-category monthly limits with progress bars (green / amber at 80% / red at 100%+)
- Edit limits inline
- Show this month's spend per category vs limit

**`/finances/bills`**
- List of recurring bills with next due date, amount in native currency + GBP
- "Mark as paid" button creates a transaction and rolls the next_due_date forward
- Add/edit/delete

**`/finances/savings`**
- Card per savings goal with progress bar, target, current, target date
- "Add money" button → creates a transfer transaction
- If linked to a life goal, show that link
- Add/edit/delete

**`/finances/investments`**
- Simple list: name, type, last known value (GBP), last updated date
- "Update value" button → quick numeric input
- Total portfolio value at top
- Tiny chart of value over time (built from the history of updates)

#### Phase 4 stop point
> Phase 4 complete. Test multi-currency by adding both a GBP and an AUD transaction. Once confirmed, say "Phase 5".

---

### Phase 5 — Goals, Projects, Tasks, Habits

**Goal:** Lighter modules for life goals, projects/tasks, and habit tracking.

**`/goals`**
- Card per active life goal: title, category, progress bar (manual %), target date, linked savings goal (if any) showing finance progress
- Goal categories with their own colour (travel, career, learning, etc.)
- "Add goal" → form with optional "Create linked savings goal" checkbox that auto-creates the savings_goals row
- Examples to seed for the user: leave it empty, just show an empty-state with "Add your first goal"
- Habits live on the same page as a separate section: small grid showing each habit with the last 7 days as dots (filled = done, empty = missed)

**`/projects`**
- Kanban-style columns: Active / Paused / Done
- Click a project → detail view with task list, deadline, notes
- Tasks with due dates show on the Calendar and Home page
- Standalone tasks (no project) live in a "Quick tasks" section

#### Phase 5 stop point
> Phase 5 complete. Add a couple of life goals and projects. Say "Phase 6" when ready.

---

### Phase 6 — Side Hustles

**Goal:** One overview page, click-through detail.

**`/hustles`**
- Grid of cards, one per active hustle. Each card: name, this month's revenue, this month's hours logged, click-through arrow.
- Top stat row: total revenue this month across all hustles, total hours, effective £/hour
- "Add hustle" button

**`/hustles/[id]`**
- Hustle name + description at top
- Revenue chart (monthly bars, last 12 months)
- Time log chart (hours per week, last 12 weeks)
- "Log revenue" + "Log time" buttons
- Recent revenue and time log tables

#### Phase 6 stop point
> Phase 6 complete. The full v2 is built. Say "Phase 7" to make it a real Mac desktop app with Tauri.

---

### Phase 7 — Tauri desktop wrapper (optional, last)

**Goal:** Wrap the Next.js app as a real macOS app with a dock icon.

Walk the user through:
1. Installing Rust (one-time, required for Tauri)
2. `npm install -D @tauri-apps/cli`
3. `npx tauri init` and configure to point at the Next.js dev/prod build
4. Building a `.app` bundle: `npx tauri build`
5. Moving the resulting `.app` to `/Applications` so it shows in Spotlight and the dock

If Rust install fails or feels heavy, offer the simpler fallback: create a macOS shortcut/Automator app that just opens `localhost:3000` in the default browser after running `npm run dev` in the project folder.

---

## 8. Settings page (build alongside Phase 0; expand each phase)

`/settings` should always exist and gain features as modules come online:
- **Currency:** view/edit currency rates (Phase 0 base, Phase 4 expanded)
- **Routines:** add/remove/reorder morning + evening checklist items, link items to supplements or habits (Phase 0)
- **Habits:** manage habit definitions (Phase 5)
- **Backup:** "Backup database now" button copies `data/dashboard.db` to a folder of the user's choice. Plus an "Auto-backup" toggle that, when enabled, saves a timestamped copy to `~/Documents/dashboard-backups/` once per day on app start.
- **Export:** buttons to export each table to CSV and one "Export everything as JSON" button
- **About:** version, link to the README, location of the data file

---

## 9. Backup & data safety (do this from Phase 0)

- On every app start, if Auto-backup is on, copy `data/dashboard.db` to `~/Documents/dashboard-backups/dashboard-YYYY-MM-DD.db`. Keep last 30 days only.
- Backup to a user-chosen folder is a button in Settings.
- All data is local. No telemetry. No external calls except for fonts (Google Fonts can be self-hosted in a later phase if the user wants fully offline).

---

## 10. Phone access

In the README and in the Settings → About page, document:
1. Mac System Settings → Network → click the active Wi-Fi connection → note the IP (e.g., `192.168.1.42`)
2. With `npm run dev` running on the Mac, on the phone: open Safari, go to `http://192.168.1.42:3000`
3. "Add to Home Screen" from the share sheet for an app-like icon

The Next.js dev server already binds to all interfaces by default. If not, run `npm run dev -- -H 0.0.0.0`.

---

## 11. Coding conventions

- TypeScript strict mode on
- Server Components by default, `"use client"` only when needed (forms, charts, interactivity)
- Server Actions for all mutations (no API routes unless necessary)
- Validate every form input with zod
- Every database read/write goes through `src/db/queries/[table].ts` — keep query logic centralised, not inline in components
- Toast on every successful mutation (sonner)
- Loading states on every async UI (skeleton or spinner)
- Empty states with friendly prompts on every list view
- File structure:
  ```
  src/
    app/                  ← routes (App Router)
      (sections)/
        health/
        food/
        ...
    components/
      ui/                 ← shadcn components
      [domain]/           ← workout-form.tsx, meal-card.tsx, etc.
    db/
      schema.ts
      index.ts
      seed.ts
      queries/
    lib/
      utils.ts
      currency.ts         ← conversion helpers
      meal-suggestions.ts ← suggestion rules
    actions/              ← server actions per domain
  data/                   ← SQLite file (gitignored)
  ```

---

## 12. What NOT to do

- Don't add libraries not listed in section 3 without asking
- Don't suggest cloud/hosting solutions — this is local-first by design
- Don't use paid APIs
- Don't write more than ~200 lines of code without showing the user a working result
- Don't skip the "stop and test" step at the end of each phase
- Don't auto-update PROGRESS.md and forget to also tell the user what you did in chat
- Don't refactor working code "for cleanliness" without the user asking

---

## 13. First message back to the user

After reading this spec, your first response should be:

> I've read BUILD_SPEC.md. Before I start Phase 0, two quick checks:
> 1. Do you have Node.js installed already? (run `node --version` in Terminal — if you see something like `v20.x` you're set; if not I'll walk you through installing it)
> 2. Where on your Mac do you want this project to live? (default suggestion: `~/Projects/life-dashboard`)
>
> Once you answer, I'll start Phase 0.

Do not start running commands until the user answers.
