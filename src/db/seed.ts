/**
 * Run once to populate starting data.
 * Usage: npx tsx src/db/seed.ts
 *
 * Safe to re-run — it checks for existing rows before inserting.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const dbPath = path.join(process.cwd(), "data", "dashboard.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

function uuid(): string {
  return crypto.randomUUID();
}

function now(): Date {
  return new Date();
}

async function seed() {
  console.log("🌱 Seeding database…");

  // -------------------------------------------------------------------------
  // Supplements
  // -------------------------------------------------------------------------
  const existingSupplements = await db.select().from(schema.supplements);
  if (existingSupplements.length === 0) {
    const supplementData = [
      { name: "Creatine",    dosage: "5g",   schedule: "daily" as const, timeOfDay: "morning" as const },
      { name: "Vitamin D",   dosage: "2000IU", schedule: "daily" as const, timeOfDay: "morning" as const },
      { name: "Dutasteride", dosage: "0.5mg", schedule: "daily" as const, timeOfDay: "morning" as const },
    ];

    const supplementIds: Record<string, string> = {};
    for (const s of supplementData) {
      const id = uuid();
      supplementIds[s.name] = id;
      await db.insert(schema.supplements).values({
        id, createdAt: now(), updatedAt: now(),
        name: s.name, dosage: s.dosage,
        schedule: s.schedule, timeOfDay: s.timeOfDay,
        active: true,
      });
    }
    console.log("  ✓ Supplements added");

    // -----------------------------------------------------------------------
    // Routines
    // -----------------------------------------------------------------------
    const morningId = uuid();
    const eveningId = uuid();

    await db.insert(schema.routines).values([
      { id: morningId, createdAt: now(), updatedAt: now(), name: "Morning", timeOfDay: "morning", displayOrder: 0 },
      { id: eveningId, createdAt: now(), updatedAt: now(), name: "Evening", timeOfDay: "evening", displayOrder: 1 },
    ]);

    const morningItems = [
      { label: "Take weight",          order: 0, supplementId: null },
      { label: "Creatine",             order: 1, supplementId: supplementIds["Creatine"] },
      { label: "Vitamin D",            order: 2, supplementId: supplementIds["Vitamin D"] },
      { label: "Dutasteride",          order: 3, supplementId: supplementIds["Dutasteride"] },
      { label: "Face cleanser (AM)",   order: 4, supplementId: null },
      { label: "Moisturiser (AM)",     order: 5, supplementId: null },
      { label: "Morning stretch",      order: 6, supplementId: null },
      { label: "Block phone (Brick)",  order: 7, supplementId: null },
      { label: "Exercise",             order: 8, supplementId: null },
    ];

    const eveningItems = [
      { label: "Face cleanser (PM)",   order: 0, supplementId: null },
      { label: "Moisturiser (PM)",     order: 1, supplementId: null },
      { label: "Evening stretch",      order: 2, supplementId: null },
      { label: "Read",                 order: 3, supplementId: null },
    ];

    for (const item of morningItems) {
      await db.insert(schema.routineItems).values({
        id: uuid(), createdAt: now(), updatedAt: now(),
        routineId: morningId, label: item.label,
        displayOrder: item.order, active: true,
        linkedSupplementId: item.supplementId,
        linkedHabitId: null,
      });
    }

    for (const item of eveningItems) {
      await db.insert(schema.routineItems).values({
        id: uuid(), createdAt: now(), updatedAt: now(),
        routineId: eveningId, label: item.label,
        displayOrder: item.order, active: true,
        linkedSupplementId: null,
        linkedHabitId: null,
      });
    }

    console.log("  ✓ Routines added (Morning + Evening)");
  } else {
    console.log("  – Supplements/routines already exist, skipping");
  }

  // -------------------------------------------------------------------------
  // Currency rates
  // -------------------------------------------------------------------------
  const existingRates = await db.select().from(schema.currencyRates);
  if (existingRates.length === 0) {
    await db.insert(schema.currencyRates).values([
      { id: uuid(), createdAt: now(), updatedAt: now(), currencyCode: "GBP", rateToGbp: 1.0 },
      { id: uuid(), createdAt: now(), updatedAt: now(), currencyCode: "AUD", rateToGbp: 0.52 },
    ]);
    console.log("  ✓ Currency rates added (GBP, AUD)");
  } else {
    console.log("  – Currency rates already exist, skipping");
  }

  // -------------------------------------------------------------------------
  // Default budget categories (one row per category, small monthly limits)
  // -------------------------------------------------------------------------
  const existingBudgets = await db.select().from(schema.budgets);
  if (existingBudgets.length === 0) {
    const today = new Date().toISOString().split("T")[0];
    const categories = [
      { cat: "Rent",          limit: 1200 },
      { cat: "Groceries",     limit: 300  },
      { cat: "Eating Out",    limit: 150  },
      { cat: "Transport",     limit: 100  },
      { cat: "Subscriptions", limit: 50   },
      { cat: "Health",        limit: 100  },
      { cat: "Shopping",      limit: 200  },
      { cat: "Travel",        limit: 200  },
      { cat: "Bills",         limit: 200  },
      { cat: "Savings",       limit: 300  },
      { cat: "Other",         limit: 100  },
    ];
    for (const { cat, limit } of categories) {
      await db.insert(schema.budgets).values({
        id: uuid(), createdAt: now(), updatedAt: now(),
        category: cat, monthlyLimitGbp: limit, activeFrom: today,
      });
    }
    console.log("  ✓ Default budget categories added");
  } else {
    console.log("  – Budgets already exist, skipping");
  }

  console.log("\n✅ Seed complete!");
  sqlite.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
