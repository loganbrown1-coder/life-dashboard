import { FinancesNav } from "@/components/finances/finances-nav";
import { AddTransactionDialog } from "@/components/finances/add-transaction-dialog";
import { FinancesOverviewClient } from "@/components/finances/finances-overview-client";
import {
  getAccounts, getRecentTransactions, getMonthTotals,
  getUpcomingBills, getSavingsGoals, getCurrencyRates,
  getBudgets, getSpendingByCategory,
} from "@/db/queries/finances";
import { getUserOptions } from "@/db/queries/user-options";
import { format } from "date-fns";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function FinancesOverviewPage() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const [accounts, recent, totals, upcomingBills, savingsGoals, rates, categoryOptions, budgets, categorySpend] =
    await Promise.all([
      getAccounts(),
      getRecentTransactions(5),
      getMonthTotals(year, month),
      getUpcomingBills(14),
      getSavingsGoals(),
      getCurrencyRates(),
      getUserOptions("transaction_category"),
      getBudgets(),
      getSpendingByCategory(year, month),
    ]);

  const categories = categoryOptions.map((o) => o.label);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Finances</h1>
          <p className="text-gray-500 mt-1">{format(now, "MMMM yyyy")}</p>
        </div>
        <AddTransactionDialog accounts={accounts} rates={rates} categories={categories} />
      </div>

      <FinancesNav />

      {accounts.length === 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Add an account first — go to <Link href="/settings" className="underline">Settings</Link> to set one up.
          </p>
        </div>
      )}

      <FinancesOverviewClient
        accounts={accounts}
        recent={recent}
        totals={totals}
        upcomingBills={upcomingBills}
        savingsGoals={savingsGoals}
        rates={rates}
        categories={categories}
        budgets={budgets}
        categorySpend={categorySpend}
      />
    </div>
  );
}
