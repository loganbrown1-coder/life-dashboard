import { db } from "@/db";
import { accounts, transactions, currencyRates, budgets, bills, savingsGoals, investments } from "@/db/schema";
import { eq, desc, gte, lte, and, asc } from "drizzle-orm";

// ── Accounts ──────────────────────────────────────────────────────────────────

export async function getAccounts() {
  return db.select().from(accounts).orderBy(accounts.name);
}

// ── Transactions ──────────────────────────────────────────────────────────────

export async function getRecentTransactions(limit = 10) {
  return db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(limit);
}

export async function getTransactionsForMonth(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end   = `${year}-${String(month).padStart(2, "0")}-31`;
  return db
    .select()
    .from(transactions)
    .where(and(gte(transactions.date, start), lte(transactions.date, end)))
    .orderBy(desc(transactions.date));
}

export async function getTransactionsForRange(start: string, end: string) {
  return db
    .select()
    .from(transactions)
    .where(and(gte(transactions.date, start), lte(transactions.date, end)))
    .orderBy(desc(transactions.date));
}

// Returns { income, expenses, net } in GBP for a given month
export async function getMonthTotals(year: number, month: number) {
  const rows = await getTransactionsForMonth(year, month);
  const income   = rows.filter((t) => t.type === "income")  .reduce((s, t) => s + t.amountInBaseCurrency, 0);
  const expenses = rows.filter((t) => t.type === "expense") .reduce((s, t) => s + t.amountInBaseCurrency, 0);
  return { income, expenses, net: income - expenses };
}

// Returns spending by category for the donut chart
export async function getSpendingByCategory(year: number, month: number) {
  const rows = await getTransactionsForMonth(year, month);
  const map: Record<string, number> = {};
  for (const t of rows) {
    if (t.type !== "expense") continue;
    map[t.category] = (map[t.category] ?? 0) + t.amountInBaseCurrency;
  }
  return Object.entries(map)
    .map(([category, total]) => ({ category, total: +total.toFixed(2) }))
    .sort((a, b) => b.total - a.total);
}

// ── Currency rates ────────────────────────────────────────────────────────────

export async function getCurrencyRates() {
  return db.select().from(currencyRates).orderBy(currencyRates.currencyCode);
}

// ── Budgets ───────────────────────────────────────────────────────────────────

export async function getBudgets() {
  return db.select().from(budgets).orderBy(budgets.category);
}

// ── Bills ─────────────────────────────────────────────────────────────────────

export async function getBills() {
  return db.select().from(bills).orderBy(asc(bills.nextDueDate));
}

export async function getUpcomingBills(days = 14) {
  const today = new Date().toISOString().split("T")[0];
  const future = new Date(); future.setDate(future.getDate() + days);
  const end = future.toISOString().split("T")[0];
  return db
    .select()
    .from(bills)
    .where(and(gte(bills.nextDueDate, today), lte(bills.nextDueDate, end)))
    .orderBy(asc(bills.nextDueDate));
}

// ── Savings goals ─────────────────────────────────────────────────────────────

export async function getSavingsGoals() {
  return db.select().from(savingsGoals).orderBy(savingsGoals.name);
}

export async function getTotalSavings() {
  const goals = await getSavingsGoals();
  return goals.reduce((s, g) => s + g.currentAmountGbp, 0);
}

// ── Investments ───────────────────────────────────────────────────────────────

export async function getInvestments() {
  return db.select().from(investments).orderBy(investments.name);
}

// ── Spending trend (last N months) ────────────────────────────────────────────

export async function getMonthlySpendingTrend(months = 6) {
  const now = new Date();
  const result: Array<{ month: string; income: number; expenses: number; net: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year  = d.getFullYear();
    const month = d.getMonth() + 1;
    const totals = await getMonthTotals(year, month);
    result.push({
      month: `${year}-${String(month).padStart(2, "0")}`,
      ...totals,
    });
  }
  return result;
}
