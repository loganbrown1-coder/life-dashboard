"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { Trash2, TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { logSpend, deleteTransaction, addBudget, updateBudget, deleteBudget, logBalance, deleteBalanceLog } from "@/actions/finances";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

type Transaction = {
  id: string;
  date: string;
  description?: string | null;
  category: string;
  type: string;
  amountInBaseCurrency: number;
};

type BalanceLog = { id: string; date: string; balanceGbp: number; note?: string | null };
type Budget     = { id: string; category: string; monthlyLimitGbp: number };
type Spend      = { category: string; total: number };

type Props = {
  transactions:  Transaction[];
  balanceLogs:   BalanceLog[];
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

function emoji(cat: string) { return CAT_EMOJI[cat.toLowerCase()] ?? "📌"; }

function txDate(str: string) {
  try {
    const d = parseISO(str);
    if (isToday(d))     return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "d MMM");
  } catch { return str; }
}

// ── Main component ────────────────────────────────────────────────────────────

export function SimpleFinanceClient({ transactions, balanceLogs, budgets, categorySpend, categories, month }: Props) {
  return (
    <div className="max-w-lg mx-auto space-y-5 pb-12">
      <BalanceTracker balanceLogs={balanceLogs} />
      <QuickAdd categories={categories} />
      {budgets.length > 0 && <BudgetBars budgets={budgets} categorySpend={categorySpend} />}
      <ManageBudgets budgets={budgets} categories={categories} />
      <TransactionList transactions={transactions} month={month} />
    </div>
  );
}

// ── Balance tracker ───────────────────────────────────────────────────────────

function BalanceTracker({ balanceLogs }: { balanceLogs: BalanceLog[] }) {
  const [amount, setAmount]   = useState("");
  const [note, setNote]       = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [, start]             = useTransition();

  const sorted  = [...balanceLogs].sort((a, b) => a.date.localeCompare(b.date));
  const latest  = sorted[sorted.length - 1] ?? null;
  const previous = sorted[sorted.length - 2] ?? null;
  const change  = latest && previous ? latest.balanceGbp - previous.balanceGbp : null;

  function handleLog() {
    const val = parseFloat(amount);
    if (!val && val !== 0) { toast.error("Enter a balance"); return; }
    start(async () => {
      await logBalance(val, note || undefined);
      toast.success("Balance updated");
      setAmount(""); setNote("");
    });
  }

  // Chart data — last 30 entries
  const chartData = sorted.slice(-30).map((l) => ({
    date: l.date,
    label: format(parseISO(l.date), "d MMM"),
    balance: l.balanceGbp,
  }));

  const yValues = chartData.map((d) => d.balance);
  const yMin = yValues.length ? Math.floor(Math.min(...yValues) * 0.98) : 0;
  const yMax = yValues.length ? Math.ceil(Math.max(...yValues) * 1.02) : 10000;

  return (
    <div className="rounded-2xl border-2 border-teal-200 bg-white shadow-sm overflow-hidden">
      {/* Current balance header */}
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Current balance</p>
        {latest ? (
          <div className="flex items-end gap-3 flex-wrap">
            <span className="text-4xl font-bold text-gray-900 tabular-nums">
              £{latest.balanceGbp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="flex items-center gap-2 mb-1">
              {change !== null && (
                <span className={`flex items-center gap-1 text-sm font-semibold ${change >= 0 ? "text-teal-600" : "text-red-500"}`}>
                  {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {change >= 0 ? "+" : ""}£{change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs text-gray-400 font-normal">since last update</span>
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-2xl font-bold text-gray-400">No balance logged yet</p>
        )}
        {latest && (
          <p className="text-xs text-gray-400 mt-1">
            Last updated {isToday(parseISO(latest.date)) ? "today" : format(parseISO(latest.date), "d MMM yyyy")}
            {latest.note && ` · ${latest.note}`}
          </p>
        )}
      </div>

      {/* Mini chart */}
      {chartData.length > 1 && (
        <div className="px-2 pb-2">
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <YAxis domain={[yMin, yMax]} hide />
              <XAxis dataKey="label" hide />
              <Tooltip
                formatter={(v) => [`£${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Balance"]}
                contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e5e7eb" }}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#0d9488"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Update form */}
      <div className="border-t px-5 py-4 bg-gray-50/50">
        <p className="text-xs font-medium text-gray-500 mb-2">Update balance</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">£</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleLog(); }}
              className="w-full rounded-xl border border-gray-200 pl-7 pr-3 py-2.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
            />
          </div>
          <input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleLog(); }}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
          />
          <button
            onClick={handleLog}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold text-sm transition-colors whitespace-nowrap"
          >
            Save
          </button>
        </div>
      </div>

      {/* History toggle */}
      {balanceLogs.length > 0 && (
        <div className="border-t">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-sm text-gray-500 hover:bg-gray-50"
          >
            <span>Balance history ({balanceLogs.length} entries)</span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showHistory && (
            <div className="divide-y max-h-48 overflow-y-auto">
              {[...sorted].reverse().map((l) => (
                <BalanceRow key={l.id} log={l} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BalanceRow({ log }: { log: BalanceLog }) {
  const [, start] = useTransition();
  return (
    <div className="group flex items-center gap-3 px-5 py-2.5">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold tabular-nums text-gray-900">
          £{log.balanceGbp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        {log.note && <span className="text-xs text-gray-400 ml-2">{log.note}</span>}
      </div>
      <span className="text-xs text-gray-400">{format(parseISO(log.date), "d MMM yyyy")}</span>
      <button
        onClick={() => start(async () => { await deleteBalanceLog(log.id); toast.success("Deleted"); })}
        className="p-1 text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Quick-add spend ────────────────────────────────────────────────────────────

const QUICK_CATS = ["Groceries", "Eating Out", "Transport", "Coffee", "Health", "Shopping", "Bills", "Entertainment", "Other"];

function QuickAdd({ categories }: { categories: string[] }) {
  const [amount,   setAmount]   = useState("");
  const [category, setCategory] = useState("");
  const [note,     setNote]     = useState("");
  const [isIncome, setIsIncome] = useState(false);
  const [, start]               = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);

  const cats = categories.length > 0 ? categories : QUICK_CATS;

  function reset() { setAmount(""); setNote(""); setCategory(""); setIsIncome(false); }

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
    <div className={`rounded-2xl border-2 bg-white shadow-sm p-5 transition-colors ${isIncome ? "border-teal-400" : "border-gray-100"}`}>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setIsIncome(false)} className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${!isIncome ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"}`}>
          Log Spend
        </button>
        <button onClick={() => setIsIncome(true)} className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${isIncome ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-500"}`}>
          Log Income
        </button>
      </div>

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

      <div className="flex flex-wrap gap-2 mb-4">
        {cats.map((c) => (
          <button key={c} onClick={() => setCategory(c === category ? "" : c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${category === c ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
            {emoji(c)} {c}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleLog(); }}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400 mb-4"
      />

      <button onClick={handleLog} className={`w-full py-3 rounded-xl text-white font-semibold text-base transition-colors ${isIncome ? "bg-teal-500 hover:bg-teal-600" : "bg-gray-900 hover:bg-gray-800"}`}>
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
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${r.pct}%`, backgroundColor: r.pct >= 100 ? "#ef4444" : r.pct >= 80 ? "#f59e0b" : "#0d9488" }} />
          </div>
          {r.pct >= 80 && <p className={`text-[10px] mt-0.5 font-medium ${r.pct >= 100 ? "text-red-500" : "text-amber-500"}`}>{r.pct >= 100 ? "Over budget!" : `${r.pct}% used`}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Manage budgets ─────────────────────────────────────────────────────────────

function ManageBudgets({ budgets, categories }: { budgets: Budget[]; categories: string[] }) {
  const [open, setOpen]         = useState(false);
  const [newCat, setNewCat]     = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [, start]               = useTransition();

  function handleAdd() {
    const limit = parseFloat(newLimit);
    if (!newCat || !limit || limit <= 0) return;
    start(async () => { await addBudget(newCat, limit); setNewCat(""); setNewLimit(""); toast.success("Budget added"); });
  }

  const cats = categories.length > 0 ? categories : QUICK_CATS;

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">
        <span>⚙️ Manage budgets</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="border-t px-4 py-4 space-y-4">
          {budgets.length > 0 && <div className="space-y-2">{budgets.map((b) => <BudgetRow key={b.id} budget={b} />)}</div>}
          <div className="flex gap-2">
            <select value={newCat} onChange={(e) => setNewCat(e.target.value)} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="">Category…</option>
              {cats.filter((c) => !budgets.find((b) => b.category.toLowerCase() === c.toLowerCase())).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="relative w-28">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">£</span>
              <input type="number" placeholder="Limit" value={newLimit} onChange={(e) => setNewLimit(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }} className="w-full rounded-lg border border-gray-200 pl-6 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <button onClick={handleAdd} className="px-3 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600">Add</button>
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

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm flex-1 text-gray-700">{emoji(budget.category)} {budget.category}</span>
      {editing ? (
        <>
          <div className="relative w-24"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">£</span><input autoFocus type="number" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { start(async () => { await updateBudget(budget.id, parseFloat(val)); setEditing(false); toast.success("Updated"); }); } if (e.key === "Escape") setEditing(false); }} className="w-full rounded border pl-5 pr-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400" /></div>
          <button onClick={() => start(async () => { await updateBudget(budget.id, parseFloat(val)); setEditing(false); toast.success("Updated"); })} className="text-xs text-teal-600 font-medium px-2 py-1 rounded bg-teal-50">Save</button>
          <button onClick={() => setEditing(false)} className="text-xs text-gray-400">✕</button>
        </>
      ) : (
        <>
          <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-gray-700 tabular-nums">£{budget.monthlyLimitGbp.toLocaleString()}/mo</button>
          <button onClick={() => start(async () => { await deleteBudget(budget.id); toast.success("Removed"); })} className="text-gray-300 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
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
  const groups: Record<string, Transaction[]> = {};
  for (const t of visible) { const key = txDate(t.date); (groups[key] ??= []).push(t); }

  if (transactions.length === 0) return (
    <div className="rounded-xl border bg-white shadow-sm p-6 text-center text-sm text-gray-400">No transactions logged in {month} yet.</div>
  );

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Transactions · {month}</h2>
        <span className="text-xs text-gray-400">{transactions.length} total</span>
      </div>
      {Object.entries(groups).map(([date, txns]) => (
        <div key={date}>
          <div className="px-4 py-1.5 bg-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">{date}</div>
          {txns.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
              <span className="text-lg shrink-0">{emoji(t.category)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{t.description || t.category}</p>
                <p className="text-xs text-gray-400 capitalize">{t.category}</p>
              </div>
              <p className={`text-sm font-semibold tabular-nums shrink-0 ${t.type === "income" ? "text-teal-600" : t.type === "expense" ? "text-red-500" : "text-blue-500"}`}>
                {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}£{t.amountInBaseCurrency.toFixed(2)}
              </p>
              <button onClick={() => start(async () => { await deleteTransaction(t.id); toast.success("Deleted"); })} className="shrink-0 p-1 text-gray-300 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      ))}
      {transactions.length > 20 && (
        <button onClick={() => setShowAll(!showAll)} className="w-full py-3 text-sm text-teal-600 font-medium hover:bg-gray-50 flex items-center justify-center gap-1">
          {showAll ? <><ChevronUp className="w-4 h-4" /> Show less</> : <><ChevronDown className="w-4 h-4" /> Show all {transactions.length}</>}
        </button>
      )}
    </div>
  );
}
