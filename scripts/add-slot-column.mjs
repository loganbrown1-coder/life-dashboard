import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

// Load .env.local manually
const envFile = readFileSync(".env.local", "utf-8");
for (const line of envFile.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

try {
  await client.execute(
    `ALTER TABLE workout_schedule ADD COLUMN slot TEXT NOT NULL DEFAULT 'morning'`
  );
  console.log("✅ Added 'slot' column to workout_schedule");
} catch (e) {
  if (e.message?.includes("duplicate column")) {
    console.log("ℹ️  Column already exists — skipping");
  } else {
    throw e;
  }
}

await client.close();
