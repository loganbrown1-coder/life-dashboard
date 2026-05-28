import { FinancesNav } from "@/components/finances/finances-nav";
import { AddTransactionDialog } from "@/components/finances/add-transaction-dialog";
import { SpendingTrendChart } from "@/components/finances/spending-trend-chart";
import {
  getAccounts, getRecentTransactions, getMonthTotals,
  getUpcomingBills, getSavingsGoals, getCurrencyRates,
  getMonthlySpendingTrend,
} from "@/db/queries/finances";
import { getUserOptions } from "@/db/queries/user-options";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const TYPE_COLORS: Record<string, string> = {
  income:   "text-green-600",
  expense:  "text-red-500",
  transfer: "text-blue-600",
};

export default async function FinancesOverviewPage() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const [accounts, recent, totals, upcomingBills, savingsGoals, rates, spendingTrend, categoryOptions] = await Promise.all([
    getAccounts(),
    getRecentTransactions(8),
    getMonthTotals(year, month),
    getUpcomingBills(14),
    getSavingsGoals(),
    getCurrencyRates(),
    getMonthlySpendingTrend(6),
    getUserOptions("transaction_category"),
  ]);
  const categories = categoryOptions.map((o) => o.label);

  const totalBalance = accounts.reduce((s, a) => s + a.currentBalance, 0);

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
            Add an account first — go to <Link href="/settings" className="underline">Settings</Link> or use the button on this page.
          </p>
        </div>
      )}

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Wallet className="w-3.5 h-3.5 text-[#0d9488]" /> Balance</p>
          <p className={`text-2xl font-bold ${totalBalance < 0 ? "text-red-500" : "text-gray-900"}`}>
            £{Math.abs(totalBalance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-400">across {accounts.length} account{accounts.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="rounded-xl border bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-green-500" /> Income</p>
          <p className="text-2xl font-bold text-green-600">£{totals.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-gray-400">this month</p>
        </div>

        <div className="rounded-xl border bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5 text-red-400" /> Spent</p>
          <p className="text-2xl font-bold text-red-500">£{totals.expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-gray-400">this month</p>
        </div>

        <div className="rounded-xl border bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><PiggyBank className="w-3.5 h-3.5 text-purple-400" /> Net</p>
          <p className={`text-2xl font-bold ${totals.net >= 0 ? "text-[#0d9488]" : "text-red-500"}`}>
            {totals.net >= 0 ? "+" : "−"}£{Math.abs(totals.net).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-400">this month</p>
        </div>
      </div>

      {/* 6-month trend */}
      <div className="rounded-xl border bg-white shadow-sm p-4 mb-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Income vs Spending — last 6 months</h2>
        <SpendingTrendChart data={spendingTrend} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Accounts */}
        <div className="rounded-xl border bg-white shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Accounts</h2>
          {accounts.length === 0 ? (
            <p className="text-sm text-gray-400">No accounts yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{a.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{a.type} · {a.currency}</p>
                  </div>
                  <p className={`text-sm font-semibold tabular-nums ${a.currentBalance < 0 ? "text-red-500" : "text-gray-900"}`}>
                    {a.currency !== "GBP" ? `${a.currency} ` : "£"}{a.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="rounded-xl border bg-white shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">Recent transactions</h2>
            <Link href="/finances/transactions" className="text-xs text-[#0d9488] hover:underline">All →</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400">No transactions yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recent.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{t.description || t.category}</p>
                    <p className="text-xs text-gray-400">{t.date} · <span className="capitalize">{t.category}</span></p>
                  </div>
                  <p className={`text-sm font-semibold tabular-nums shrink-0 ${TYPE_COLORS[t.type] ?? ""}`}>
                    {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}£{t.amountInBaseCurrency.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming bills */}
        {upcomingBills.length > 0 && (
          <div className="rounded-xl border bg-white shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800">Bills due soon</h2>
              <Link href="/finances/bills" className="text-xs text-[#0d9488] hover:underline">All →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingBills.map((b) => {
                const daysUntil = Math.ceil((new Date(b.nextDueDate).getTime() - Date.now()) / 86400000);
                return (
                  <div key={b.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm text-gray-800">{b.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{b.nextDueDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">
                        £{b.amount.toFixed(2)}
                      </p>
                      <p className={`text-xs ${daysUntil <= 3 ? "text-red-500 font-medium" : "text-gray-400"}`}>
                        {daysUntil === 0 ? "today!" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil}d`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Savings goals summary */}
        {savingsGoals.length > 0 && (
          <div className="rounded-xl border bg-white shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800">Savings goals</h2>
              <Link href="/finances/savings" className="text-xs text-[#0d9488] hover:underline">All →</Link>
            </div>
            <div className="space-y-3">
              {savingsGoals.slice(0, 4).map((g) => {
                const pct = g.targetAmountGbp > 0
                  ? Math.min(100, Math.round((g.currentAmountGbp / g.targetAmountGbp) * 100))
                  : 0;
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-gray-800">{g.name}</p>
                      <p className="text-xs text-gray-500 tabular-nums">£{g.currentAmountGbp.toFixed(0)} / £{g.targetAmountGbp.toFixed(0)}</p>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? "#10b981" : "#0d9488" }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{pct}% saved</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
