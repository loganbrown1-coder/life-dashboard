"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronUp } from "lucide-react";
import { logSpend, deleteTransaction, addBudget, updateBudget, deleteBudget } from "@/actions/finances";
import { format, isToday, isYesterday, parseISO } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

type Transaction = {
  id: string;
  date: string;
  description?: string | null;
  category: string;
  type: string;
  amountInBaseCurrency: number;
};

type Budget   = { id: string; category: string; monthlyLimitGbp: number };
type Spend    = { category: string; total: number };
type Totals   = { income: number; expenses: number; net: number };

type Props = {
  transactions:  Transaction[];
  totals:        Totals;
  budgets:       Budget[];
  categorySpend: Spend[];
  categories:    string[];
  month:         string;
};

// ── Emoji map ─────────────────────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = {
  groceries: "🛒", "eating out": "🍽️", transport: "🚗", coffee: "☕",
  health: "💊", shopping: "🛍️", travel: "✈️", bills: "💡", rent: "🏠",
  subscriptions: "📱", entertainment: "🎉", savings: "🐷", fitness: "💪",
  income: "💰", salary: "💰", other: "➕",
};

function emoji(cat: string) {
  return CAT_EMOJI[cat.toLowerCase()] ?? "📌";
}

function txDate(str: string) {
  try {
    const d = parseISO(str);
    if (isToday(d))     return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "d MMM");
  } catch { return str; }
}

// ── Main component ────────────────────────────────────────────────────────────

export function SimpleFinanceClient({ transactions, totals, budgets, categorySpend, categories, month }: Props) {
  return (
    <div className="max-w-lg mx-auto space-y-5 pb-12">

      {/* Month summary */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryPill label="Spent" value={totals.expenses} colour="text-red-500"   icon={<TrendingDown className="w-3.5 h-3.5" />} />
        <SummaryPill label="Income" value={totals.income} colour="text-teal-600"  icon={<TrendingUp   className="w-3.5 h-3.5" />} />
        <SummaryPill label="Left"  value={totals.net}    colour={totals.net >= 0 ? "text-teal-600" : "text-red-500"} icon={<Wallet className="w-3.5 h-3.5" />} />
      </div>

      {/* Quick-add */}
      <QuickAdd categories={categories} />

      {/* Budget bars */}
      {budgets.length > 0 && <BudgetBars budgets={budgets} categorySpend={categorySpend} />}

      {/* Manage budgets */}
      <ManageBudgets budgets={budgets} categories={categories} />

      {/* Transaction list */}
      <TransactionList transactions={transactions} month={month} />

    </div>
  );
}

// ── Summary pill ──────────────────────────────────────────────────────────────

function SummaryPill({ label, value, colour, icon }: { label: string; value: number; colour: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm p-3 text-center">
      <div className={`flex items-center justify-center gap-1 text-xs text-gray-400 mb-0.5 ${colour}`}>{icon} {label}</div>
      <p className={`text-lg font-bold tabular-nums ${colour}`}>
        £{Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}

// ── Quick-add card ─────────────────────────────────────────────────────────────

const QUICK_CATS = ["Groceries", "Eating Out", "Transport", "Coffee", "Health", "Shopping", "Bills", "Entertainment", "Other"];

function QuickAdd({ categories }: { categories: string[] }) {
  const [amount,   setAmount]   = useState("");
  const [category, setCategory] = useState("");
  const [note,     setNote]     = useState("");
  const [isIncome, setIsIncome] = useState(false);
  const [, start]               = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);

  // Use user's categories if available, otherwise defaults
  const cats = categories.length > 0 ? categories : QUICK_CATS;

  function reset() {
    setAmount(""); setNote(""); setCategory(""); setIsIncome(false);
  }

  function handleLog() {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Enter an amount"); return; }
    if (!category)        { toast.error("Pick a category"); return; }

    start(async () => {
      await logSpend(val, category, note, isIncome ? "income" : "expense");
      toast.success(`${isIncome ? "Income" : "Spend"} logged ✓`);
      reset();
      amountRef.current?.focus();
    });
  }

  return (
    <div className={`rounded-2xl border-2 bg-white shadow-sm p-5 transition-colors ${
      isIncome ? "border-teal-400" : "border-gray-100"
    }`}>
      {/* Income / Expense toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setIsIncome(false)}
          className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            !isIncome ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          Spend
        </button>
        <button
          onClick={() => setIsIncome(true)}
          className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            isIncome ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          Income
        </button>
      </div>

      {/* Amount input */}
      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-light text-gray-400">£</span>
        <input
          ref={amountRef}
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleLog(); }}
          className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3.5 text-2xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 tabular-nums"
        />
      </div>

      {/* Category buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c === category ? "" : c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              category === c
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {emoji(c)} {c}
          </button>
        ))}
      </div>

      {/* Note */}
      <input
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleLog(); }}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400 mb-4"
      />

      {/* Log button */}
      <button
        onClick={handleLog}
        className={`w-full py-3 rounded-xl text-white font-semibold text-base transition-colors ${
          isIncome ? "bg-teal-500 hover:bg-teal-600" : "bg-gray-900 hover:bg-gray-800"
        }`}
      >
        {isIncome ? "Log Income" : "Log Spend"}
      </button>
    </div>
  );
}

// ── Budget bars ───────────────────────────────────────────────────────────────

function BudgetBars({ budgets, categorySpend }: { budgets: Budget[]; categorySpend: Spend[] }) {
  const spendMap = Object.fromEntries(categorySpend.map((c) => [c.category.toLowerCase(), c.total]));
  const rows = budgets
    .map((b) => {
      const spent = spendMap[b.category.toLowerCase()] ?? 0;
      const pct   = b.monthlyLimitGbp > 0 ? Math.min(100, Math.round((spent / b.monthlyLimitGbp) * 100)) : 0;
      return { ...b, spent, pct };
    })
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="rounded-xl border bg-white shadow-sm p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Budget this month</h2>
      {rows.map((r) => (
        <div key={r.id}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-700">{emoji(r.category)} {r.category}</span>
            <span className="text-xs tabular-nums text-gray-500">
              £{r.spent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              <span className="text-gray-300"> / £{r.monthlyLimitGbp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${r.pct}%`,
                backgroundColor: r.pct >= 100 ? "#ef4444" : r.pct >= 80 ? "#f59e0b" : "#0d9488",
              }}
            />
          </div>
          {r.pct >= 80 && (
            <p className={`text-[10px] mt-0.5 font-medium ${r.pct >= 100 ? "text-red-500" : "text-amber-500"}`}>
              {r.pct >= 100 ? "Over budget!" : `${r.pct}% used`}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Manage budgets (collapsed by default) ─────────────────────────────────────

function ManageBudgets({ budgets, categories }: { budgets: Budget[]; categories: string[] }) {
  const [open, setOpen]         = useState(false);
  const [newCat, setNewCat]     = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [, start]               = useTransition();

  function handleAdd() {
    const limit = parseFloat(newLimit);
    if (!newCat || !limit || limit <= 0) return;
    start(async () => {
      await addBudget(newCat, limit);
      setNewCat(""); setNewLimit("");
      toast.success("Budget added");
    });
  }

  const cats = categories.length > 0 ? categories : QUICK_CATS;

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        <span>⚙️ Manage budgets</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="border-t px-4 py-4 space-y-4">
          {/* Existing budgets */}
          {budgets.length > 0 && (
            <div className="space-y-2">
              {budgets.map((b) => (
                <BudgetRow key={b.id} budget={b} />
              ))}
            </div>
          )}

          {/* Add new budget */}
          <div className="flex gap-2">
            <select
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">Category…</option>
              {cats.filter((c) => !budgets.find((b) => b.category.toLowerCase() === c.toLowerCase())).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="relative w-28">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">£</span>
              <input
                type="number"
                placeholder="Limit"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                className="w-full rounded-lg border border-gray-200 pl-6 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <button
              onClick={handleAdd}
              className="px-3 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BudgetRow({ budget }: { budget: Budget }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(String(budget.monthlyLimitGbp));
  const [, start]             = useTransition();

  function save() {
    const n = parseFloat(val);
    if (!n || n <= 0) return;
    start(async () => {
      await updateBudget(budget.id, n);
      setEditing(false);
      toast.success("Budget updated");
    });
  }

  function remove() {
    start(async () => {
      await deleteBudget(budget.id);
      toast.success("Budget removed");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm flex-1 text-gray-700">{emoji(budget.category)} {budget.category}</span>
      {editing ? (
        <>
          <div className="relative w-24">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">£</span>
            <input
              autoFocus
              type="number"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
              className="w-full rounded border pl-5 pr-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
          </div>
          <button onClick={save} className="text-xs text-teal-600 font-medium px-2 py-1 rounded bg-teal-50 hover:bg-teal-100">Save</button>
          <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
        </>
      ) : (
        <>
          <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-gray-700 tabular-nums">
            £{budget.monthlyLimitGbp.toLocaleString()}/mo
          </button>
          <button onClick={remove} className="text-gray-300 hover:text-red-400 p-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

// ── Transaction list ──────────────────────────────────────────────────────────

function TransactionList({ transactions, month }: { transactions: Transaction[]; month: string }) {
  const [showAll, setShowAll] = useState(false);
  const [, start]             = useTransition();

  const visible = showAll ? transactions : transactions.slice(0, 20);

  function handleDelete(id: string) {
    start(async () => {
      await deleteTransaction(id);
      toast.success("Deleted");
    });
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border bg-white shadow-sm p-6 text-center text-sm text-gray-400">
        No transactions in {month} yet.
      </div>
    );
  }

  // Group by date
  const groups: Record<string, Transaction[]> = {};
  for (const t of visible) {
    const key = txDate(t.date);
    (groups[key] ??= []).push(t);
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Transactions · {month}</h2>
        <span className="text-xs text-gray-400">{transactions.length} total</span>
      </div>

      {Object.entries(groups).map(([date, txns]) => (
        <div key={date}>
          <div className="px-4 py-1.5 bg-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
            {date}
          </div>
          {txns.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
              <span className="text-lg shrink-0">{emoji(t.category)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{t.description || t.category}</p>
                <p className="text-xs text-gray-400 capitalize">{t.category}</p>
              </div>
              <p className={`text-sm font-semibold tabular-nums shrink-0 ${
                t.type === "income" ? "text-teal-600" : t.type === "expense" ? "text-red-500" : "text-blue-500"
              }`}>
                {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}£{t.amountInBaseCurrency.toFixed(2)}
              </p>
              <button
                onClick={() => handleDelete(t.id)}
                className="shrink-0 p-1 text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ))}

      {transactions.length > 20 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-3 text-sm text-teal-600 font-medium hover:bg-gray-50 flex items-center justify-center gap-1"
        >
          {showAll ? <><ChevronUp className="w-4 h-4" /> Show less</> : <><ChevronDown className="w-4 h-4" /> Show all {transactions.length}</>}
        </button>
      )}
    </div>
  );
}
