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

try {
  await client.execute(`ALTER TABLE calendar_events ADD COLUMN goal_id TEXT`);
  console.log("✅ Added goal_id to calendar_events");
} catch (e) {
  if (e.message?.includes("duplicate column")) console.log("ℹ️ Already exists");
  else throw e;
}
await client.close();
