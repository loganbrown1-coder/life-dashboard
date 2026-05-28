"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Check, X, Trash2, Plus } from "lucide-react";
import { updateBudget, addBudget, deleteBudget } from "@/actions/finances";

type BudgetRow = {
  id: string;
  category: string;
  monthlyLimitGbp: number;
};

type SpendRow = { category: string; total: number };

type Props = {
  budgets: BudgetRow[];
  monthSpending: SpendRow[];
  weekSpending: SpendRow[];
};

const CATEGORIES = [
  "Rent","Groceries","Eating Out","Transport","Subscriptions",
  "Health","Shopping","Travel","Bills","Savings","Other",
];

const WEEKS_PER_MONTH = 4.33;

export function BudgetList({ budgets, monthSpending, weekSpending }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [view, setView]     = useState<"monthly" | "weekly">("weekly");
  const [editId, setEditId]   = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [newCat, setNewCat]   = useState(CATEGORIES[0]);
  const [newLim, setNewLim]   = useState("");

  const monthMap = Object.fromEntries(monthSpending.map((s) => [s.category, s.total]));
  const weekMap  = Object.fromEntries(weekSpending.map((s) => [s.category, s.total]));

  function startEdit(id: string, current: number) {
    setEditId(id);
    setEditVal(String(current));
  }

  function cancelEdit() {
    setEditId(null);
    setEditVal("");
  }

  function saveEdit(id: string) {
    const val = Number(editVal);
    if (isNaN(val) || val < 0) { toast.error("Invalid amount"); return; }
    startTransition(async () => {
      try {
        await updateBudget(id, val);
        toast.success("Budget updated");
        setEditId(null);
        router.refresh();
      } catch {
        toast.error("Failed to update");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this budget?")) return;
    startTransition(async () => {
      try {
        await deleteBudget(id);
        toast.success("Deleted");
        router.refresh();
      } catch {
        toast.error("Failed to delete");
      }
    });
  }

  function handleAdd() {
    const lim = Number(newLim);
    if (!newCat || isNaN(lim) || lim <= 0) { toast.error("Enter a valid limit"); return; }
    startTransition(async () => {
      try {
        await addBudget(newCat, lim);
        toast.success("Budget added");
        setAddMode(false);
        setNewLim("");
        router.refresh();
      } catch {
        toast.error("Failed to add");
      }
    });
  }

  return (
    <div className="space-y-2">
      {/* Monthly / Weekly toggle */}
      <div className="flex items-center gap-1 mb-3 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setView("monthly")}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            view === "monthly" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setView("weekly")}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            view === "weekly" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Weekly
        </button>
      </div>

      {budgets.map((b) => {
        const limit = view === "weekly"
          ? +(b.monthlyLimitGbp / WEEKS_PER_MONTH).toFixed(2)
          : b.monthlyLimitGbp;
        const spent = view === "weekly"
          ? (weekMap[b.category] ?? 0)
          : (monthMap[b.category] ?? 0);
        const pct  = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
        const over = spent > limit;
        const warn = !over && pct >= 80;

        return (
          <div key={b.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium text-gray-800 flex-1">{b.category}</span>
              <span className="text-xs text-gray-500 tabular-nums">
                £{spent.toFixed(0)} / {editId === b.id
                  ? <input
                      type="number"
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(b.id); if (e.key === "Escape") cancelEdit(); }}
                      className="w-16 border border-[#0d9488] rounded px-1 text-xs text-right focus:outline-none"
                      autoFocus
                    />
                  : `£${limit.toFixed(0)}`
                }
                <span className="text-gray-400 ml-0.5">{view === "weekly" ? "/wk" : "/mo"}</span>
              </span>
              {editId === b.id ? (
                <>
                  <button onClick={() => saveEdit(b.id)} className="p-1 text-green-500 hover:text-green-600"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={cancelEdit} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                </>
              ) : (
                <>
                  <button onClick={() => startEdit(b.id, b.monthlyLimitGbp)} className="p-1 text-gray-300 hover:text-gray-500" title="Edit monthly limit"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(b.id)} className="p-1 text-gray-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </>
              )}
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${over ? "bg-red-500" : warn ? "bg-amber-400" : "bg-[#0d9488]"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {over && <p className="text-xs text-red-500 mt-1">Over by £{(spent - limit).toFixed(0)}</p>}
          </div>
        );
      })}

      {addMode ? (
        <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
          <select
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 flex-1 focus:outline-none"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="number"
            placeholder="£/mo limit"
            value={newLim}
            onChange={(e) => setNewLim(e.target.value)}
            className="w-28 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none"
          />
          <button onClick={handleAdd} className="p-1 text-green-500 hover:text-green-600"><Check className="w-4 h-4" /></button>
          <button onClick={() => setAddMode(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <button
          onClick={() => setAddMode(true)}
          className="w-full py-3 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400 hover:border-[#0d9488] hover:text-[#0d9488] transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add budget category
        </button>
      )}
    </div>
  );
}
