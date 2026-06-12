import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

const envFile = readFileSync(".env.local", "utf-8");
for (const line of envFile.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Add new columns to check_in_logs (SQLite ignores if column already exists via try/catch)
for (const col of [
  "ALTER TABLE check_in_logs ADD COLUMN weight_logged INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE check_in_logs ADD COLUMN pot_logged    INTEGER NOT NULL DEFAULT 0",
]) {
  try {
    await client.execute(col);
    console.log(`✅ ${col}`);
  } catch (e) {
    if (e.message?.includes("duplicate column")) {
      console.log(`⏭  column already exists — skipping`);
    } else {
      throw e;
    }
  }
}

// Create pot_checkins table
await client.execute(`
  CREATE TABLE IF NOT EXISTS pot_checkins (
    id          TEXT    PRIMARY KEY,
    date        TEXT    NOT NULL UNIQUE,
    week_start  TEXT    NOT NULL,
    remaining_gbp REAL  NOT NULL,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  )
`);
console.log("✅ pot_checkins table ready");

await client.close();
console.log("🎉 Migration complete");
