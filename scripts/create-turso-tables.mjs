/**
 * Creates all database tables directly in Turso.
 * Run with:
 *   node scripts/create-turso-tables.mjs
 * (with TURSO_DATABASE_URL and TURSO_AUTH_TOKEN set in your environment)
 */

import { createClient } from "@libsql/client";

if (!process.env.TURSO_DATABASE_URL) {
  console.error("❌  TURSO_DATABASE_URL is not set.");
  process.exit(1);
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const tables = [
  `CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    duration_minutes INTEGER,
    distance_km REAL,
    notes TEXT,
    planned INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS workout_exercises (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sets INTEGER,
    reps INTEGER,
    weight_kg REAL,
    notes TEXT,
    order_index INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS weight_logs (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    date TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    body_fat_pct REAL,
    notes TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS steps_logs (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    date TEXT NOT NULL,
    step_count INTEGER NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual'
  )`,

  `CREATE TABLE IF NOT EXISTS sleep_logs (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    date TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    notes TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS supplements (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT,
    schedule TEXT NOT NULL DEFAULT 'daily',
    time_of_day TEXT NOT NULL DEFAULT 'morning',
    active INTEGER NOT NULL DEFAULT 1
  )`,

  `CREATE TABLE IF NOT EXISTS supplement_logs (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    supplement_id TEXT NOT NULL REFERENCES supplements(id) ON DELETE CASCADE,
    taken_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS meals (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    meal_type TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    calories_estimate INTEGER,
    protein_g REAL,
    carbs_g REAL,
    fat_g REAL,
    prep_time_minutes INTEGER,
    recipe_notes TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS meal_ingredients (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity REAL,
    unit TEXT,
    aisle TEXT NOT NULL DEFAULT 'other'
  )`,

  `CREATE TABLE IF NOT EXISTS meal_plans (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    date TEXT NOT NULL,
    meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    meal_slot TEXT NOT NULL,
    eaten INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS grocery_lists (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    week_start_date TEXT NOT NULL,
    items TEXT NOT NULL DEFAULT '[]',
    generated_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GBP',
    current_balance REAL NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    date TEXT NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GBP',
    amount_in_base_currency REAL NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    is_recurring INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS currency_rates (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    currency_code TEXT NOT NULL UNIQUE,
    rate_to_gbp REAL NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    category TEXT NOT NULL,
    monthly_limit_gbp REAL NOT NULL,
    active_from TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GBP',
    frequency TEXT NOT NULL,
    next_due_date TEXT NOT NULL,
    category TEXT NOT NULL,
    auto_pay INTEGER NOT NULL DEFAULT 0,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS savings_goals (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    name TEXT NOT NULL,
    target_amount_gbp REAL NOT NULL,
    current_amount_gbp REAL NOT NULL DEFAULT 0,
    target_date TEXT,
    notes TEXT,
    linked_life_goal_id TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS investments (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    last_known_value_gbp REAL NOT NULL DEFAULT 0,
    last_updated TEXT NOT NULL,
    notes TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS routines (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    name TEXT NOT NULL,
    time_of_day TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS routine_items (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    linked_supplement_id TEXT REFERENCES supplements(id) ON DELETE SET NULL,
    linked_habit_id TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS routine_logs (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    routine_item_id TEXT NOT NULL REFERENCES routine_items(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL DEFAULT 'daily',
    target_per_week INTEGER,
    active INTEGER NOT NULL DEFAULT 1
  )`,

  `CREATE TABLE IF NOT EXISTS habit_logs (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'life',
    target_date TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    progress_pct INTEGER NOT NULL DEFAULT 0,
    linked_savings_goal_id TEXT REFERENCES savings_goals(id) ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    deadline TEXT,
    colour TEXT NOT NULL DEFAULT '#0d9488'
  )`,

  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    due_date TEXT,
    priority TEXT NOT NULL DEFAULT 'med'
  )`,

  `CREATE TABLE IF NOT EXISTS side_hustles (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    colour TEXT NOT NULL DEFAULT '#0d9488',
    active INTEGER NOT NULL DEFAULT 1
  )`,

  `CREATE TABLE IF NOT EXISTS hustle_revenue (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    hustle_id TEXT NOT NULL REFERENCES side_hustles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GBP',
    source TEXT,
    notes TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS hustle_time_logs (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    hustle_id TEXT NOT NULL REFERENCES side_hustles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    minutes INTEGER NOT NULL,
    description TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS user_options (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    label TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS check_in_logs (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    date TEXT NOT NULL UNIQUE,
    steps_logged INTEGER NOT NULL DEFAULT 0,
    sleep_logged INTEGER NOT NULL DEFAULT 0,
    spend_logged INTEGER NOT NULL DEFAULT 0,
    dismissed INTEGER NOT NULL DEFAULT 0
  )`,
];

console.log(`Creating ${tables.length} tables in Turso...`);

let created = 0;
for (const sql of tables) {
  const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] ?? "?";
  try {
    await client.execute(sql);
    console.log(`  ✓  ${tableName}`);
    created++;
  } catch (err) {
    console.error(`  ✗  ${tableName}: ${err.message}`);
  }
}

// Verify
const result = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
);
console.log(`\n✅  Done — ${result.rows.length} tables now in Turso.`);
