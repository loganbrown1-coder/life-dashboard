import { SimpleFinanceClient } from "@/components/finances/simple-finance-client";
import { getTransactionsForMonth, getBudgets, getSpendingByCategory } from "@/db/queries/finances";
import { getUserOptions } from "@/db/queries/user-options";
import { db } from "@/db";
import { balanceLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { format } from "date-fns";

export default async function FinancesPage() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const [transactions, budgets, categorySpend, categoryOptions, balanceHistory] = await Promise.all([
    getTransactionsForMonth(year, month),
    getBudgets(),
    getSpendingByCategory(year, month),
    getUserOptions("transaction_category"),
    db.select().from(balanceLogs).orderBy(desc(balanceLogs.date)).limit(60).all(),
  ]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-gray-900">Finances</h1>
        <p className="text-gray-500 mt-1">{format(now, "MMMM yyyy")}</p>
      </div>

      <SimpleFinanceClient
        transactions={transactions}
        balanceLogs={balanceHistory.map((b) => ({ id: b.id, date: b.date, balanceGbp: b.balanceGbp, note: b.note }))}
        budgets={budgets}
        categorySpend={categorySpend}
        categories={categoryOptions.map((o) => o.label)}
        month={format(now, "MMMM yyyy")}
      />
    </div>
  );
}
