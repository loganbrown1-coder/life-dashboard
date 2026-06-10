"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { Trash2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Pencil, Check } from "lucide-react";
import {
  logSpend, deleteTransaction, addBudget, updateBudget, deleteBudget,
  logBalance, deleteBalanceLog, setFinanceSetting,
} from "@/actions/finances";
import { format, isToday, isYesterday, parseISO, startOfWeek, endOfWeek, addWeeks, isSameWeek, differenceInDays } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

type Transaction = { id: string; date: string; description?: string | null; category: string; type: string; amountInBaseCurrency: number };
type BalanceLog  = { id: string; date: string; balanceGbp: number; note?: string | null };
type Budget      = { id: string; category: string; monthlyLimitGbp: number };
type Spend       = { category: string; total: number };

type Props = {
  transactions:  Transaction[];
  balanceLogs:   BalanceLog[];
  budgets:       Budget[];
  categorySpend: Spend[];
  categories:    string[];
  month:         string;
  weeklyPotGbp:  number | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = {
  groceries:"🛒","eating out":"🍽️",transport:"🚗",coffee:"☕",health:"💊",
  shopping:"🛍️",travel:"✈️",bills:"💡",rent:"🏠",subscriptions:"📱",
  entertainment:"🎉",savings:"🐷",fitness:"💪",income:"💰",salary:"💰",other:"➕",
};
function emoji(cat: string) { return CAT_EMOJI[cat.toLowerCase()] ?? "📌"; }

function txDate(str: string) {
  try {
    const d = parseISO(str);
    if (isToday(d))     return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "EEE d MMM");
  } catch { return str; }
}

function getMonthWeeks(year: number, month: number): { start: Date; end: Date; label: string }[] {
  // Return all Mon–Sun spans that overlap with this calendar month
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 0);
  const weeks: { start: Date; end: Date; label: string }[] = [];

  let cursor = startOfWeek(monthStart, { weekStartsOn: 1 });
  while (cursor <= monthEnd) {
    const weekEnd = endOfWeek(cursor, { weekStartsOn: 1 });
    weeks.push({
      start: new Date(cursor),
      end:   new Date(weekEnd),
      label: `${format(cursor, "d MMM")} – ${format(weekEnd, "d MMM")}`,
    });
    cursor = addWeeks(cursor, 1);
  }
  return weeks;
}

function spentInWeek(transactions: Transaction[], weekStart: Date, weekEnd: Date): number {
  const s = format(weekStart, "yyyy-MM-dd");
  const e = format(weekEnd,   "yyyy-MM-dd");
  return transactions
    .filter((t) => t.type === "expense" && t.date >= s && t.date <= e)
    .reduce((sum, t) => sum + t.amountInBaseCurrency, 0);
}

function daysLeftInWeek(weekEnd: Date): number {
  const today = new Date(); today.setHours(0,0,0,0);
  const end   = new Date(weekEnd); end.setHours(0,0,0,0);
  return Math.max(0, differenceInDays(end, today));
}

// ── Main export ───────────────────────────────────────────────────────────────

export function WeeklyPotsClient({ transactions, balanceLogs, budgets, categorySpend, categories, month, weeklyPotGbp }: Props) {
  const now = new Date();
  const weeks = getMonthWeeks(now.getFullYear(), now.getMonth() + 1);
  const currentWeekIdx = weeks.findIndex((w) => isSameWeek(now, w.start, { weekStartsOn: 1 }));

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-12">

      {/* Pot setup prompt if not yet configured */}
      {!weeklyPotGbp && <SetPotBanner />}

      {/* Current week — big hero card */}
      {currentWeekIdx >= 0 && (
        <CurrentWeekCard
          week={weeks[currentWeekIdx]}
          weekNumber={currentWeekIdx + 1}
          totalWeeks={weeks.length}
          spent={spentInWeek(transactions, weeks[currentWeekIdx].start, weeks[currentWeekIdx].end)}
          pot={weeklyPotGbp}
          categories={categories}
          transactions={transactions.filter((t) => {
            const s = format(weeks[currentWeekIdx].start, "yyyy-MM-dd");
            const e = format(weeks[currentWeekIdx].end,   "yyyy-MM-dd");
            return t.date >= s && t.date <= e;
          })}
        />
      )}

      {/* All weeks in month */}
      <MonthWeeks weeks={weeks} transactions={transactions} pot={weeklyPotGbp} currentWeekIdx={currentWeekIdx} />

      {/* Set / change weekly pot */}
      {weeklyPotGbp && <SetPotRow current={weeklyPotGbp} />}

      {/* Balance tracker */}
      <BalanceTracker balanceLogs={balanceLogs} />

      {/* Budget bars */}
      {budgets.length > 0 && <BudgetBars budgets={budgets} categorySpend={categorySpend} />}
      <ManageBudgets budgets={budgets} categories={categories} />

      {/* Transaction history */}
      <TransactionList transactions={transactions} month={month} />
    </div>
  );
}

// ── Set pot banner (first-time) ───────────────────────────────────────────────

function SetPotBanner() {
  const [value, setValue] = useState("");
  const [, start]         = useTransition();

  function save() {
    const n = parseFloat(value);
    if (!n || n <= 0) return;
    start(async () => {
      await setFinanceSetting("weekly_pot_gbp", String(n));
      toast.success(`Weekly pot set to £${n}`);
    });
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50 p-5">
      <p className="font-semibold text-teal-800 mb-1">Set your weekly pot 💰</p>
      <p className="text-sm text-teal-600 mb-4">How much do you transfer to your spending account each Monday?</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">£</span>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            placeholder="200"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); }}
            className="w-full rounded-xl border border-teal-200 pl-7 pr-3 py-2.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
          />
        </div>
        <button onClick={save} className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold transition-colors">
          Set pot
        </button>
      </div>
    </div>
  );
}

function SetPotRow({ current }: { current: number }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(String(current));
  const [, start]             = useTransition();

  function save() {
    const n = parseFloat(value);
    if (!n || n <= 0) return;
    start(async () => {
      await setFinanceSetting("weekly_pot_gbp", String(n));
      toast.success(`Weekly pot updated to £${n}`);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-white shadow-sm px-4 py-3">
        <span className="text-sm text-gray-500 shrink-0">Weekly pot:</span>
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">£</span>
          <input autoFocus type="number" value={value} onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
            className="w-full rounded-lg border pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <button onClick={save} className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600">Save</button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="w-full flex items-center justify-between rounded-xl border bg-white shadow-sm px-4 py-3 hover:bg-gray-50 group">
      <span className="text-sm text-gray-500">Weekly pot</span>
      <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        £{current.toLocaleString()}/week
        <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
      </span>
    </button>
  );
}

// ── Current week hero ─────────────────────────────────────────────────────────

function CurrentWeekCard({ week, weekNumber, totalWeeks, spent, pot, categories, transactions }: {
  week: { start: Date; end: Date; label: string };
  weekNumber: number; totalWeeks: number;
  spent: number; pot: number | null;
  categories: string[];
  transactions: Transaction[];
}) {
  const pct         = pot ? Math.min(100, Math.round((spent / pot) * 100)) : 0;
  const remaining   = pot ? pot - spent : null;
  const daysLeft    = daysLeftInWeek(week.end);
  const isOver      = pot ? spent > pot : false;
  const barColour   = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#0d9488";

  return (
    <div className={`rounded-2xl border-2 bg-white shadow-sm overflow-hidden ${isOver ? "border-red-200" : "border-teal-200"}`}>
      {/* Header */}
      <div className={`px-5 py-4 ${isOver ? "bg-red-50" : "bg-teal-50/50"}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Week {weekNumber} of {totalWeeks} · {format(week.start, "d MMM")}–{format(week.end, "d MMM")}
          </span>
          <span className="text-xs text-gray-400">{daysLeft === 0 ? "last day" : `${daysLeft}d left`}</span>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <span className={`text-4xl font-bold tabular-nums ${isOver ? "text-red-500" : "text-gray-900"}`}>
              £{spent.toFixed(2)}
            </span>
            {pot && <span className="text-lg text-gray-400 ml-1">/ £{pot.toLocaleString()}</span>}
          </div>
          {remaining !== null && (
            <span className={`text-sm font-semibold mb-1 ${remaining < 0 ? "text-red-500" : "text-teal-600"}`}>
              {remaining < 0 ? `£${Math.abs(remaining).toFixed(2)} over` : `£${remaining.toFixed(2)} left`}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {pot && (
          <div className="mt-3">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColour }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">{pct}% spent</span>
              {pct < 100 && daysLeft > 0 && (
                <span className="text-xs text-gray-400">~£{(remaining! / daysLeft).toFixed(0)}/day remaining</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick-add spend */}
      <div className="border-t">
        <QuickAdd categories={categories} compact />
      </div>
    </div>
  );
}

// ── Month weeks overview ──────────────────────────────────────────────────────

function MonthWeeks({ weeks, transactions, pot, currentWeekIdx }: {
  weeks: { start: Date; end: Date; label: string }[];
  transactions: Transaction[];
  pot: number | null;
  currentWeekIdx: number;
}) {
  if (!pot) return null;

  return (
    <div className="rounded-xl border bg-white shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">All weeks this month</h2>
      <div className="space-y-3">
        {weeks.map((w, i) => {
          const spent   = spentInWeek(transactions, w.start, w.end);
          const pct     = Math.min(100, Math.round((spent / pot) * 100));
          const isCur   = i === currentWeekIdx;
          const isPast  = i < currentWeekIdx;
          const isFuture = i > currentWeekIdx;
          const isOver  = spent > pot;
          const barColour = isOver ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#0d9488";

          return (
            <div key={i} className={`rounded-lg p-3 ${isCur ? "bg-teal-50 ring-1 ring-teal-200" : "bg-gray-50"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isCur ? "text-teal-700" : isPast ? "text-gray-500" : "text-gray-300"}`}>
                    W{i + 1} {isCur && "← now"}
                  </span>
                  <span className="text-xs text-gray-400">{w.label}</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-semibold tabular-nums ${isOver ? "text-red-500" : isFuture && spent === 0 ? "text-gray-300" : "text-gray-700"}`}>
                    £{spent.toFixed(0)}
                  </span>
                  <span className="text-xs text-gray-400"> / £{pot}</span>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: isFuture && spent === 0 ? "#e5e7eb" : barColour }} />
              </div>
              {isOver && <p className="text-[10px] text-red-500 mt-0.5 font-medium">£{(spent - pot).toFixed(0)} over pot</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Balance tracker (compact) ─────────────────────────────────────────────────

function BalanceTracker({ balanceLogs }: { balanceLogs: BalanceLog[] }) {
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount]     = useState("");
  const [note, setNote]         = useState("");
  const [, start]               = useTransition();

  const sorted = [...balanceLogs].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1] ?? null;
  const prev   = sorted[sorted.length - 2] ?? null;
  const change = latest && prev ? latest.balanceGbp - prev.balanceGbp : null;

  function handleLog() {
    const val = parseFloat(amount);
    if (isNaN(val)) { toast.error("Enter a balance"); return; }
    start(async () => {
      await logBalance(val, note || undefined);
      toast.success("Balance saved");
      setAmount(""); setNote("");
    });
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">Bank balance</span>
          {latest && (
            <span className="text-lg font-bold tabular-nums text-gray-900">
              £{latest.balanceGbp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          {change !== null && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${change >= 0 ? "text-teal-600" : "text-red-500"}`}>
              {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {change >= 0 ? "+" : ""}£{Math.abs(change).toFixed(2)}
            </span>
          )}
          {!latest && <span className="text-sm text-gray-400">not logged yet</span>}
        </div>
        <div className="flex items-center gap-2">
          {latest && <span className="text-xs text-gray-400">{isToday(parseISO(latest.date)) ? "today" : format(parseISO(latest.date), "d MMM")}</span>}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 py-4 space-y-3">
          {/* Update form */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">£</span>
              <input type="number" inputMode="decimal" placeholder="Current balance" value={amount} onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleLog(); }}
                className="w-full rounded-lg border border-gray-200 pl-7 pr-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <input type="text" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            <button onClick={handleLog} className="px-3 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600">Save</button>
          </div>

          {/* History */}
          {sorted.length > 0 && (
            <div className="divide-y max-h-40 overflow-y-auto rounded-lg border">
              {[...sorted].reverse().map((l) => (
                <div key={l.id} className="group flex items-center gap-3 px-3 py-2">
                  <span className="text-xs text-gray-400 w-20 shrink-0">{format(parseISO(l.date), "d MMM yyyy")}</span>
                  <span className="text-sm font-semibold tabular-nums flex-1">£{l.balanceGbp.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  {l.note && <span className="text-xs text-gray-400 truncate">{l.note}</span>}
                  <button onClick={() => start(async () => { await deleteBalanceLog(l.id); toast.success("Deleted"); })}
                    className="p-1 text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Quick-add spend ───────────────────────────────────────────────────────────

const QUICK_CATS = ["Groceries","Eating Out","Transport","Coffee","Health","Shopping","Bills","Entertainment","Other"];

function QuickAdd({ categories, compact = false }: { categories: string[]; compact?: boolean }) {
  const [amount, setAmount]     = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote]         = useState("");
  const [isIncome, setIsIncome] = useState(false);
  const [, start]               = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);
  const cats = categories.length > 0 ? categories : QUICK_CATS;

  function handleLog() {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Enter an amount"); return; }
    if (!category)        { toast.error("Pick a category"); return; }
    start(async () => {
      await logSpend(val, category, note, isIncome ? "income" : "expense");
      toast.success(`${isIncome ? "Income" : "Spend"} logged ✓`);
      setAmount(""); setNote(""); setCategory(""); setIsIncome(false);
      amountRef.current?.focus();
    });
  }

  return (
    <div className={compact ? "px-4 py-3" : "rounded-2xl border-2 border-gray-100 bg-white shadow-sm p-5"}>
      {!compact && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => setIsIncome(false)} className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${!isIncome ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>Spend</button>
          <button onClick={() => setIsIncome(true)} className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${isIncome ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-500"}`}>Income</button>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">£</span>
          <input ref={amountRef} type="number" inputMode="decimal" placeholder="0.00" value={amount}
            onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleLog(); }}
            className="w-full rounded-xl border border-gray-200 pl-8 pr-3 py-2.5 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        {compact && (
          <button onClick={handleLog} className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-sm transition-colors whitespace-nowrap">
            Log spend
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {cats.map((c) => (
          <button key={c} onClick={() => setCategory(c === category ? "" : c)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${category === c ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
            {emoji(c)} {c}
          </button>
        ))}
      </div>

      <div className={`flex gap-2 ${compact ? "" : ""}`}>
        <input type="text" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleLog(); }}
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        {!compact && (
          <button onClick={handleLog} className={`px-5 py-2 rounded-xl text-white font-semibold text-sm transition-colors ${isIncome ? "bg-teal-500 hover:bg-teal-600" : "bg-gray-900 hover:bg-gray-800"}`}>
            {isIncome ? "Log Income" : "Log Spend"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Budget bars ───────────────────────────────────────────────────────────────

function BudgetBars({ budgets, categorySpend }: { budgets: Budget[]; categorySpend: Spend[] }) {
  const spendMap = Object.fromEntries(categorySpend.map((c) => [c.category.toLowerCase(), c.total]));
  const rows = budgets.map((b) => {
    const spent = spendMap[b.category.toLowerCase()] ?? 0;
    const pct   = b.monthlyLimitGbp > 0 ? Math.min(100, Math.round((spent / b.monthlyLimitGbp) * 100)) : 0;
    return { ...b, spent, pct };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <div className="rounded-xl border bg-white shadow-sm p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Monthly budgets</h2>
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
            <div className="h-full rounded-full transition-all" style={{ width: `${r.pct}%`, backgroundColor: r.pct >= 100 ? "#ef4444" : r.pct >= 80 ? "#f59e0b" : "#0d9488" }} />
          </div>
          {r.pct >= 80 && <p className={`text-[10px] mt-0.5 font-medium ${r.pct >= 100 ? "text-red-500" : "text-amber-500"}`}>{r.pct >= 100 ? "Over budget!" : `${r.pct}% used`}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Manage budgets ────────────────────────────────────────────────────────────

function ManageBudgets({ budgets, categories }: { budgets: Budget[]; categories: string[] }) {
  const [open, setOpen]         = useState(false);
  const [newCat, setNewCat]     = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [, start]               = useTransition();
  const cats = categories.length > 0 ? categories : QUICK_CATS;

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">
        <span>⚙️ Manage monthly budgets</span>
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
              <input type="number" placeholder="Limit" value={newLimit} onChange={(e) => setNewLimit(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { const l = parseFloat(newLimit); if (newCat && l > 0) start(async () => { await addBudget(newCat, l); setNewCat(""); setNewLimit(""); toast.success("Added"); }); } }}
                className="w-full rounded-lg border border-gray-200 pl-6 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <button onClick={() => { const l = parseFloat(newLimit); if (newCat && l > 0) start(async () => { await addBudget(newCat, l); setNewCat(""); setNewLimit(""); toast.success("Added"); }); }}
              className="px-3 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600">Add</button>
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
          <div className="relative w-24"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">£</span>
            <input autoFocus type="number" value={val} onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") start(async () => { await updateBudget(budget.id, parseFloat(val)); setEditing(false); toast.success("Updated"); }); if (e.key === "Escape") setEditing(false); }}
              className="w-full rounded border pl-5 pr-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400" /></div>
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
  const visible = showAll ? transactions : transactions.slice(0, 15);
  const groups: Record<string, Transaction[]> = {};
  for (const t of visible) { const key = txDate(t.date); (groups[key] ??= []).push(t); }

  if (transactions.length === 0) return (
    <div className="rounded-xl border bg-white shadow-sm p-5 text-center text-sm text-gray-400">No spends logged in {month} yet.</div>
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
              <p className={`text-sm font-semibold tabular-nums shrink-0 ${t.type === "income" ? "text-teal-600" : "text-red-500"}`}>
                {t.type === "income" ? "+" : "−"}£{t.amountInBaseCurrency.toFixed(2)}
              </p>
              <button onClick={() => start(async () => { await deleteTransaction(t.id); toast.success("Deleted"); })} className="shrink-0 p-1 text-gray-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      ))}
      {transactions.length > 15 && (
        <button onClick={() => setShowAll(!showAll)} className="w-full py-3 text-sm text-teal-600 font-medium hover:bg-gray-50 flex items-center justify-center gap-1">
          {showAll ? <><ChevronUp className="w-4 h-4" /> Show less</> : <><ChevronDown className="w-4 h-4" /> Show all {transactions.length}</>}
        </button>
      )}
    </div>
  );
}
