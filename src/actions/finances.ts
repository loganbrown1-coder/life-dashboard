"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts, transactions, currencyRates, budgets, bills, savingsGoals, investments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { addWeeks, addMonths, addYears, parseISO, format } from "date-fns";

function uuid() { return crypto.randomUUID(); }
function now()  { return new Date(); }

function revalidateAll() {
  revalidatePath("/finances");
  revalidatePath("/finances/transactions");
  revalidatePath("/finances/budgets");
  revalidatePath("/finances/bills");
  revalidatePath("/finances/savings");
  revalidatePath("/finances/investments");
  revalidatePath("/");
}

// ── Accounts ──────────────────────────────────────────────────────────────────

const AccountSchema = z.object({
  name:           z.string().min(1),
  type:           z.enum(["checking","savings","credit","investment","cash"]),
  currency:       z.string().min(1).default("GBP"),
  currentBalance: z.coerce.number().default(0),
});

export async function addAccount(data: z.infer<typeof AccountSchema>) {
  const p = AccountSchema.parse(data);
  await db.insert(accounts).values({ id: uuid(), createdAt: now(), updatedAt: now(), ...p });
  revalidateAll();
}

export async function updateAccountBalance(id: string, balance: number) {
  await db.update(accounts).set({ currentBalance: balance, updatedAt: now() }).where(eq(accounts.id, id));
  revalidateAll();
}

export async function deleteAccount(id: string) {
  await db.delete(accounts).where(eq(accounts.id, id));
  revalidateAll();
}

// ── Currency rates ────────────────────────────────────────────────────────────

export async function updateCurrencyRate(code: string, rate: number) {
  const existing = await db.select().from(currencyRates).where(eq(currencyRates.currencyCode, code)).limit(1).get();
  if (existing) {
    await db.update(currencyRates).set({ rateToGbp: rate, updatedAt: now() }).where(eq(currencyRates.id, existing.id));
  } else {
    await db.insert(currencyRates).values({ id: uuid(), createdAt: now(), updatedAt: now(), currencyCode: code, rateToGbp: rate });
  }
  revalidateAll();
  revalidatePath("/settings");
}

// ── Transactions ──────────────────────────────────────────────────────────────

const TransactionSchema = z.object({
  date:        z.string().min(1),
  accountId:   z.string().min(1),
  amount:      z.coerce.number(),
  currency:    z.string().default("GBP"),
  type:        z.enum(["income","expense","transfer"]),
  category:    z.string().min(1),
  description: z.string().optional(),
  isRecurring: z.boolean().default(false),
  // caller provides pre-converted GBP value (or passes amount if already GBP)
  amountInBaseCurrency: z.coerce.number(),
});

export async function addTransaction(data: z.infer<typeof TransactionSchema>) {
  const p = TransactionSchema.parse(data);
  await db.insert(transactions).values({ id: uuid(), createdAt: now(), updatedAt: now(), ...p });
  // Update account balance
  const account = await db.select().from(accounts).where(eq(accounts.id, p.accountId)).limit(1).get();
  if (account) {
    let delta = 0;
    if (p.type === "income")   delta = +p.amount;
    if (p.type === "expense")  delta = -p.amount;
    // transfer: leave balance unchanged (user logs both sides manually, or we just record)
    if (p.type !== "transfer") {
      await db.update(accounts)
        .set({ currentBalance: account.currentBalance + delta, updatedAt: now() })
        .where(eq(accounts.id, p.accountId));
    }
  }
  revalidateAll();
}

// Quick daily spend log — picks the first account automatically
// Returns { ok: true } on success or { ok: false, reason: "no_account" } if no account exists yet
export async function logQuickSpend(date: string, amount: number): Promise<{ ok: boolean; reason?: string }> {
  const firstAccount = await db.select().from(accounts).limit(1).get();
  if (!firstAccount) return { ok: false, reason: "no_account" };
  await db.insert(transactions).values({
    id: uuid(), createdAt: now(), updatedAt: now(),
    date,
    accountId: firstAccount.id,
    amount,
    currency: firstAccount.currency,
    type: "expense",
    category: "Other",
    description: "Daily spending (quick log)",
    isRecurring: false,
    amountInBaseCurrency: amount, // assumes GBP; close enough for a rough entry
  });
  // Update account balance
  await db.update(accounts)
    .set({ currentBalance: firstAccount.currentBalance - amount, updatedAt: now() })
    .where(eq(accounts.id, firstAccount.id));
  revalidateAll();
  return { ok: true };
}

export async function deleteTransaction(id: string) {
  // Reverse the balance effect before deleting so accounts stay accurate
  const tx = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1).get();
  if (tx && tx.type !== "transfer") {
    const account = await db.select().from(accounts).where(eq(accounts.id, tx.accountId)).limit(1).get();
    if (account) {
      const reversal = tx.type === "income" ? -tx.amount : +tx.amount;
      await db.update(accounts)
        .set({ currentBalance: account.currentBalance + reversal, updatedAt: now() })
        .where(eq(accounts.id, tx.accountId));
    }
  }
  await db.delete(transactions).where(eq(transactions.id, id));
  revalidateAll();
}

export async function bulkImportTransactions(rows: z.infer<typeof TransactionSchema>[]) {
  for (const row of rows) {
    await addTransaction(row);
  }
}

// ── Budgets ───────────────────────────────────────────────────────────────────

export async function updateBudget(id: string, monthlyLimitGbp: number) {
  await db.update(budgets).set({ monthlyLimitGbp, updatedAt: now() }).where(eq(budgets.id, id));
  revalidatePath("/finances/budgets");
  revalidatePath("/finances");
}

export async function addBudget(category: string, monthlyLimitGbp: number) {
  const today = new Date().toISOString().split("T")[0];
  await db.insert(budgets).values({ id: uuid(), createdAt: now(), updatedAt: now(), category, monthlyLimitGbp, activeFrom: today });
  revalidatePath("/finances/budgets");
}

export async function deleteBudget(id: string) {
  await db.delete(budgets).where(eq(budgets.id, id));
  revalidatePath("/finances/budgets");
}

// ── Bills ─────────────────────────────────────────────────────────────────────

const BillSchema = z.object({
  name:        z.string().min(1),
  amount:      z.coerce.number().positive(),
  currency:    z.string().default("GBP"),
  frequency:   z.enum(["weekly","monthly","quarterly","yearly"]),
  nextDueDate: z.string().min(1),
  category:    z.string().min(1),
  autoPay:     z.boolean().default(false),
  accountId:   z.string().optional(),
});

export async function addBill(data: z.infer<typeof BillSchema>) {
  const p = BillSchema.parse(data);
  await db.insert(bills).values({ id: uuid(), createdAt: now(), updatedAt: now(), ...p, accountId: p.accountId ?? null });
  revalidatePath("/finances/bills");
  revalidatePath("/finances");
}

export async function updateBill(id: string, data: z.infer<typeof BillSchema>) {
  const p = BillSchema.parse(data);
  await db.update(bills).set({ ...p, accountId: p.accountId ?? null, updatedAt: now() }).where(eq(bills.id, id));
  revalidatePath("/finances/bills");
  revalidatePath("/finances");
}

export async function deleteBill(id: string) {
  await db.delete(bills).where(eq(bills.id, id));
  revalidatePath("/finances/bills");
  revalidatePath("/finances");
}

function rollDueDate(date: string, frequency: string): string {
  const d = parseISO(date);
  switch (frequency) {
    case "weekly":    return format(addWeeks(d, 1),    "yyyy-MM-dd");
    case "monthly":   return format(addMonths(d, 1),   "yyyy-MM-dd");
    case "quarterly": return format(addMonths(d, 3),   "yyyy-MM-dd");
    case "yearly":    return format(addYears(d, 1),    "yyyy-MM-dd");
    default:          return date;
  }
}

export async function markBillPaid(id: string, rateToGbp = 1) {
  const bill = await db.select().from(bills).where(eq(bills.id, id)).limit(1).get();
  if (!bill) return;

  // Create an expense transaction for this bill payment
  if (bill.accountId) {
    const amountGbp = +(bill.amount * rateToGbp).toFixed(2);
    await addTransaction({
      date: new Date().toISOString().split("T")[0],
      accountId: bill.accountId,
      amount: bill.amount,
      currency: bill.currency,
      type: "expense",
      category: bill.category,
      description: `${bill.name} (bill)`,
      isRecurring: true,
      amountInBaseCurrency: amountGbp,
    });
  }

  // Roll the due date forward
  const newDate = rollDueDate(bill.nextDueDate, bill.frequency);
  await db.update(bills).set({ nextDueDate: newDate, updatedAt: now() }).where(eq(bills.id, id));
  revalidatePath("/finances/bills");
  revalidatePath("/finances");
}

// ── Savings goals ─────────────────────────────────────────────────────────────

const SavingsSchema = z.object({
  name:             z.string().min(1),
  targetAmountGbp:  z.coerce.number().positive(),
  currentAmountGbp: z.coerce.number().default(0),
  targetDate:       z.string().optional(),
  notes:            z.string().optional(),
});

export async function addSavingsGoal(data: z.infer<typeof SavingsSchema>) {
  const p = SavingsSchema.parse(data);
  await db.insert(savingsGoals).values({ id: uuid(), createdAt: now(), updatedAt: now(), ...p, targetDate: p.targetDate ?? null, notes: p.notes ?? null });
  revalidatePath("/finances/savings");
  revalidatePath("/finances");
}

export async function updateSavingsGoal(id: string, data: z.infer<typeof SavingsSchema>) {
  const p = SavingsSchema.parse(data);
  await db.update(savingsGoals).set({ ...p, targetDate: p.targetDate ?? null, notes: p.notes ?? null, updatedAt: now() }).where(eq(savingsGoals.id, id));
  revalidatePath("/finances/savings");
}

export async function deleteSavingsGoal(id: string) {
  await db.delete(savingsGoals).where(eq(savingsGoals.id, id));
  revalidatePath("/finances/savings");
  revalidatePath("/finances");
}

export async function addMoneyToGoal(goalId: string, amount: number, accountId?: string) {
  const goal = await db.select().from(savingsGoals).where(eq(savingsGoals.id, goalId)).limit(1).get();
  if (!goal) return;

  const newAmount = +(goal.currentAmountGbp + amount).toFixed(2);
  await db.update(savingsGoals).set({ currentAmountGbp: newAmount, updatedAt: now() }).where(eq(savingsGoals.id, goalId));

  // Log as transfer if account provided
  if (accountId) {
    await addTransaction({
      date: new Date().toISOString().split("T")[0],
      accountId,
      amount,
      currency: "GBP",
      type: "transfer",
      category: "Savings",
      description: `Savings: ${goal.name}`,
      isRecurring: false,
      amountInBaseCurrency: amount,
    });
  }

  revalidatePath("/finances/savings");
  revalidatePath("/finances");
}

// ── Investments ───────────────────────────────────────────────────────────────

const InvestmentSchema = z.object({
  name:              z.string().min(1),
  type:              z.enum(["isa","stock","crypto","etf","other"]),
  lastKnownValueGbp: z.coerce.number().default(0),
  notes:             z.string().optional(),
});

export async function addInvestment(data: z.infer<typeof InvestmentSchema>) {
  const p = InvestmentSchema.parse(data);
  const today = new Date().toISOString().split("T")[0];
  await db.insert(investments).values({ id: uuid(), createdAt: now(), updatedAt: now(), ...p, notes: p.notes ?? null, lastUpdated: today });
  revalidatePath("/finances/investments");
  revalidatePath("/finances");
}

export async function updateInvestmentValue(id: string, value: number) {
  const today = new Date().toISOString().split("T")[0];
  await db.update(investments).set({ lastKnownValueGbp: value, lastUpdated: today, updatedAt: now() }).where(eq(investments.id, id));
  revalidatePath("/finances/investments");
  revalidatePath("/finances");
}

export async function deleteInvestment(id: string) {
  await db.delete(investments).where(eq(investments.id, id));
  revalidatePath("/finances/investments");
  revalidatePath("/finances");
}
