"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { currencyRates, accounts, budgets } from "@/db/schema";
import { eq } from "drizzle-orm";

function uuid() { return crypto.randomUUID(); }
function now()  { return new Date(); }

function revalidateSettings() {
  revalidatePath("/settings");
  revalidatePath("/finances");
  revalidatePath("/finances/budgets");
  revalidatePath("/");
}

// ── Currency rates ────────────────────────────────────────────────────────────

export async function updateCurrencyRate(id: string, rateToGbp: number) {
  await db
    .update(currencyRates)
    .set({ rateToGbp, updatedAt: now() })
    .where(eq(currencyRates.id, id));
  revalidateSettings();
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export async function addAccount(data: {
  name: string;
  type: "checking" | "savings" | "credit" | "investment" | "cash";
  currency: string;
  currentBalance: number;
}) {
  await db.insert(accounts).values({
    id: uuid(),
    createdAt: now(),
    updatedAt: now(),
    name: data.name,
    type: data.type,
    currency: data.currency,
    currentBalance: data.currentBalance,
  });
  revalidateSettings();
}

export async function deleteAccount(id: string) {
  await db.delete(accounts).where(eq(accounts.id, id));
  revalidateSettings();
}

// ── Budgets ───────────────────────────────────────────────────────────────────

export async function upsertBudget(category: string, monthlyLimitGbp: number) {
  // Normalise category to Title Case to prevent duplicates ("groceries" vs "Groceries")
  const normCategory = category.trim().replace(/\b\w/g, (c) => c.toUpperCase());

  // Check if budget with this category exists (case-insensitive via normalised form)
  const existing = await db
    .select()
    .from(budgets)
    .where(eq(budgets.category, normCategory))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (existing) {
    await db
      .update(budgets)
      .set({ monthlyLimitGbp, updatedAt: now() })
      .where(eq(budgets.id, existing.id));
  } else {
    const today = new Date().toISOString().split("T")[0];
    await db.insert(budgets).values({
      id: uuid(),
      createdAt: now(),
      updatedAt: now(),
      category: normCategory,
      monthlyLimitGbp,
      activeFrom: today,
    });
  }
  revalidateSettings();
}

export async function deleteBudget(id: string) {
  await db.delete(budgets).where(eq(budgets.id, id));
  revalidateSettings();
}
