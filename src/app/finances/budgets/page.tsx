import { FinancesNav } from "@/components/finances/finances-nav";
import { BudgetList } from "@/components/finances/budget-list";
import { getBudgets, getSpendingByCategory, getTransactionsForRange } from "@/db/queries/finances";
import { format, startOfWeek, endOfWeek } from "date-fns";

export default async function BudgetsPage() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  // Week boundaries (Mon–Sun)
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd   = format(endOfWeek(now,   { weekStartsOn: 1 }), "yyyy-MM-dd");

  const [budgets, monthSpending, weekTxns] = await Promise.all([
    getBudgets(),
    getSpendingByCategory(year, month),
    getTransactionsForRange(weekStart, weekEnd),
  ]);

  // Build weekly spending by category
  const weekSpendMap: Record<string, number> = {};
  for (const t of weekTxns) {
    if (t.type !== "expense") continue;
    weekSpendMap[t.category] = (weekSpendMap[t.category] ?? 0) + t.amountInBaseCurrency;
  }
  const weekSpending = Object.entries(weekSpendMap).map(([category, total]) => ({ category, total: +total.toFixed(2) }));

  const totalBudgeted = budgets.reduce((s, b) => s + b.monthlyLimitGbp, 0);
  const totalSpent    = monthSpending.reduce((s, b) => s + b.total, 0);

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Finances</h1>
        <p className="text-gray-500 mt-1">Budgets — {format(now, "MMMM yyyy")}</p>
      </div>

      <FinancesNav />

      <div className="flex items-center gap-6 mb-4 text-sm">
        <div>
          <span className="text-gray-500">Total budgeted: </span>
          <span className="font-semibold text-gray-900">£{totalBudgeted.toFixed(0)}/mo</span>
        </div>
        <div>
          <span className="text-gray-500">Spent this month: </span>
          <span className={`font-semibold ${totalSpent > totalBudgeted ? "text-red-500" : "text-gray-900"}`}>
            £{totalSpent.toFixed(0)}
          </span>
        </div>
      </div>

      <BudgetList budgets={budgets} monthSpending={monthSpending} weekSpending={weekSpending} />
    </div>
  );
}
