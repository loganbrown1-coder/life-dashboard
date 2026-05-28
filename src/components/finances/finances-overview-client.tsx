"use client";

import { useState, useTransition } from "react";
import { Wallet, PiggyBank, TrendingUp, TrendingDown, Pencil, Check, X, ChevronRight, AlertCircle } from "lucide-react";
import { updateAccountBalance } from "@/actions/settings";
import { logQuickSpend } from "@/actions/finances";
import { toast } from "sonner";
import Link from "next/link";

type Account      = { id: string; name: string; type: string; currency: string; currentBalance: number };
type Transaction  = { id: string; date: string; description?: string | null; category: string; type: string; amountInBaseCurrency: number };
type Bill         = { id: string; name: string; amount: number; nextDueDate: string };
type SavingsGoal  = { id: string; name: string; targetAmountGbp: number; currentAmountGbp: number; targetDate?: string | null };
type Rate         = { currencyCode: string; rateToGbp: number };
type Totals       = { income: number; expenses: number; net: number };

type Props = {
  accounts:     Account[];
  recent:       Transaction[];
  totals:       Totals;
  upcomingBills: Bill[];
  savingsGoals: SavingsGoal[];
  rates:        Rate[];
  categories:   string[];
};

export function FinancesOverviewClient({ accounts, recent, totals, upcomingBills, savingsGoals }: Props) {
  return (
    <div className="space-y-5">
      {/* Month summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1"><Wallet className="w-3 h-3" /> Balance</p>
          <p className={`text-xl font-bold ${accounts.reduce((s, a) => s + a.currentBalance, 0) < 0 ? "text-red-500" : "text-gray-900"}`}>
            £{accounts.reduce((s, a) => s + a.currentBalance, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-xl border bg-white shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3 text-red-400" /> Spent</p>
          <p className="text-xl font-bold text-red-500">£{totals.expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-gray-400">this month</p>
        </div>
        <div className="rounded-xl border bg-white shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3 text-green-400" /> Net</p>
          <p className={`text-xl font-bold ${totals.net >= 0 ? "text-[#0d9488]" : "text-red-500"}`}>
            {totals.net >= 0 ? "+" : "−"}£{Math.abs(totals.net).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Account balances — tap to update */}
      <AccountBalancesCard accounts={accounts} />

      {/* Savings pots */}
      {savingsGoals.length > 0 && <SavingsPotsCard goals={savingsGoals} />}

      {/* Quick spend */}
      <QuickSpendCard />

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
                  <p className="text-sm text-gray-800">{b.name}</p>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 tabular-nums">£{b.amount.toFixed(2)}</p>
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

      {/* Recent transactions */}
      {recent.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">Recent</h2>
            <Link href="/finances/transactions" className="text-xs text-[#0d9488] hover:underline">All →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{t.description || t.category}</p>
                  <p className="text-xs text-gray-400">{t.date} · <span className="capitalize">{t.category}</span></p>
                </div>
                <p className={`text-sm font-semibold tabular-nums shrink-0 ${t.type === "income" ? "text-green-600" : t.type === "expense" ? "text-red-500" : "text-blue-600"}`}>
                  {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}£{t.amountInBaseCurrency.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Account balances with inline edit ────────────────────────────────────────

function AccountBalancesCard({ accounts }: { accounts: Account[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [, startTransition] = useTransition();

  function startEdit(a: Account) {
    setEditingId(a.id);
    setEditValue(String(a.currentBalance));
  }

  function cancelEdit() { setEditingId(null); setEditValue(""); }

  function saveEdit(id: string) {
    const val = parseFloat(editValue);
    if (isNaN(val)) { toast.error("Enter a valid number"); return; }
    startTransition(async () => {
      await updateAccountBalance(id, val);
      toast.success("Balance updated");
      setEditingId(null);
    });
  }

  if (accounts.length === 0) return null;

  return (
    <div className="rounded-xl border bg-white shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-800">Accounts</h2>
        <Link href="/settings" className="text-xs text-gray-400 hover:text-gray-600">+ Add account</Link>
      </div>
      <div className="divide-y divide-gray-50">
        {accounts.map((a) => (
          <div key={a.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">{a.name}</p>
              <p className="text-xs text-gray-400 capitalize">{a.type}</p>
            </div>
            {editingId === a.id ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(a.id); if (e.key === "Escape") cancelEdit(); }}
                  autoFocus
                  className="w-28 rounded-lg border border-gray-200 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <button onClick={() => saveEdit(a.id)} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className={`text-sm font-semibold tabular-nums ${a.currentBalance < 0 ? "text-red-500" : "text-gray-900"}`}>
                  {a.currency !== "GBP" ? `${a.currency} ` : "£"}{a.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <button onClick={() => startEdit(a)} className="text-gray-300 hover:text-gray-500" title="Update balance">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Savings pots ─────────────────────────────────────────────────────────────

function SavingsPotsCard({ goals }: { goals: SavingsGoal[] }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          <PiggyBank className="w-4 h-4 text-purple-400" /> Savings pots
        </h2>
        <Link href="/finances/savings" className="text-xs text-[#0d9488] hover:underline">Manage →</Link>
      </div>
      <div className="space-y-4">
        {goals.map((g) => {
          const pct = g.targetAmountGbp > 0
            ? Math.min(100, Math.round((g.currentAmountGbp / g.targetAmountGbp) * 100))
            : 0;
          const remaining = Math.max(0, g.targetAmountGbp - g.currentAmountGbp);
          return (
            <div key={g.id}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-medium text-gray-800">{g.name}</p>
                <p className="text-xs text-gray-500 tabular-nums">
                  £{g.currentAmountGbp.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  <span className="text-gray-300"> / £{g.targetAmountGbp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </p>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? "#10b981" : "#8b5cf6" }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-purple-600 font-medium">{pct}%</p>
                {pct >= 100
                  ? <p className="text-xs text-green-600">🎉 Goal reached!</p>
                  : <p className="text-xs text-gray-400">£{remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })} to go</p>
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Quick spend ───────────────────────────────────────────────────────────────

function QuickSpendCard() {
  const [amount, setAmount]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [, startTransition]   = useTransition();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  function handleSubmit() {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setSaving(true);
    startTransition(async () => {
      const result = await logQuickSpend(yesterdayStr, val);
      if (result.ok) {
        toast.success(`£${val.toFixed(2)} logged`);
        setAmount("");
      } else {
        toast.warning("No bank account set up yet — add one in Settings first.");
      }
      setSaving(false);
    });
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-800 mb-3">Log yesterday&apos;s spending</h2>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">£</span>
          <input
            type="number"
            placeholder="0.00"
            min={0}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            className="w-full rounded-lg border border-gray-200 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving || !amount}
          className="rounded-lg bg-[#0d9488] px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          Log
        </button>
        <Link
          href="/finances/transactions"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-1"
        >
          All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <p className="text-[10px] text-gray-400 mt-2">Logged as "Other" — tap All to categorise</p>
    </div>
  );
}
