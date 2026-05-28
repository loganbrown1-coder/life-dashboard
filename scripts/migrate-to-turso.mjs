/**
 * One-time migration: copies all data from your local SQLite database
 * into your Turso cloud database.
 *
 * Usage:
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/migrate-to-turso.mjs
 *
 * You can also put them in a .env.local file and run:
 *   npx dotenv -e .env.local -- node scripts/migrate-to-turso.mjs
 */

import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = path.join(root, "data", "dashboard.db");

// ── Validation ──────────────────────────────────────────────────────────────

import { existsSync } from "fs";

if (!process.env.TURSO_DATABASE_URL) {
  console.error("❌  TURSO_DATABASE_URL is not set.");
  console.error("    Run: TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/migrate-to-turso.mjs");
  process.exit(1);
}

if (!existsSync(dbPath)) {
  console.error(`❌  Local database not found at: ${dbPath}`);
  console.error("    Make sure you're running this from the project root.");
  process.exit(1);
}

// ── Connect ─────────────────────────────────────────────────────────────────

const local = new Database(dbPath, { readonly: true });
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// All tables to migrate (in dependency order so foreign keys work)
const TABLES = [
  "workouts",
  "workout_exercises",
  "weight_logs",
  "steps_logs",
  "sleep_logs",
  "supplements",
  "supplement_logs",
  "meals",
  "meal_ingredients",
  "meal_plans",
  "grocery_lists",
  "accounts",
  "transactions",
  "currency_rates",
  "budgets",
  "bills",
  "savings_goals",
  "investments",
  "routines",
  "routine_items",
  "routine_logs",
  "habits",
  "habit_logs",
  "goals",
  "projects",
  "tasks",
  "side_hustles",
  "hustle_revenue",
  "hustle_time_logs",
  "user_options",
  "check_in_logs",
];

// ── Migrate ─────────────────────────────────────────────────────────────────

let totalRows = 0;

for (const table of TABLES) {
  // Check if table exists in local DB
  const exists = local
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(table);

  if (!exists) {
    console.log(`⏭  Skipping ${table} (not found in local DB)`);
    continue;
  }

  const rows = local.prepare(`SELECT * FROM ${table}`).all();

  if (rows.length === 0) {
    console.log(`○  ${table}: empty`);
    continue;
  }

  // Build INSERT statement from the first row's columns
  const cols = Object.keys(rows[0]);
  const placeholders = cols.map(() => "?").join(", ");
  const sql = `INSERT OR IGNORE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`;

  let inserted = 0;
  for (const row of rows) {
    const values = cols.map((c) => {
      const v = row[c];
      // Convert Date objects to ISO strings / timestamps
      if (v instanceof Date) return v.toISOString();
      return v;
    });
    try {
      await turso.execute({ sql, args: values });
      inserted++;
    } catch (err) {
      console.warn(`  ⚠  Row skipped in ${table}:`, err.message?.slice(0, 80));
    }
  }

  console.log(`✓  ${table}: ${inserted}/${rows.length} rows migrated`);
  totalRows += inserted;
}

console.log(`\n✅  Migration complete — ${totalRows} total rows copied to Turso.`);
local.close();
