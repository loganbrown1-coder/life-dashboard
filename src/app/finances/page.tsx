import { SimpleFinanceClient } from "@/components/finances/simple-finance-client";
import {
  getTransactionsForMonth,
  getMonthTotals,
  getBudgets,
  getSpendingByCategory,
} from "@/db/queries/finances";
import { getUserOptions } from "@/db/queries/user-options";
import { format } from "date-fns";

export default async function FinancesPage() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const [transactions, totals, budgets, categorySpend, categoryOptions] = await Promise.all([
    getTransactionsForMonth(year, month),
    getMonthTotals(year, month),
    getBudgets(),
    getSpendingByCategory(year, month),
    getUserOptions("transaction_category"),
  ]);

  const categories = categoryOptions.map((o) => o.label);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-gray-900">Finances</h1>
        <p className="text-gray-500 mt-1">{format(now, "MMMM yyyy")}</p>
      </div>

      <SimpleFinanceClient
        transactions={transactions}
        totals={totals}
        budgets={budgets}
        categorySpend={categorySpend}
        categories={categories}
        month={format(now, "MMMM yyyy")}
      />
    </div>
  );
}
