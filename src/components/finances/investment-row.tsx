"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Check, X, Trash2 } from "lucide-react";
import { updateInvestmentValue, deleteInvestment } from "@/actions/finances";
import { format, parseISO } from "date-fns";

type InvestmentRow = {
  id: string;
  name: string;
  type: string;
  lastKnownValueGbp: number;
  lastUpdated: string;
  notes?: string | null;
};

const TYPE_COLORS: Record<string, string> = {
  isa:   "bg-blue-100 text-blue-700",
  stock: "bg-green-100 text-green-700",
  crypto:"bg-orange-100 text-orange-700",
  etf:   "bg-purple-100 text-purple-700",
  other: "bg-gray-100 text-gray-600",
};

export function InvestmentRow({ inv }: { inv: InvestmentRow }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(String(inv.lastKnownValueGbp));
  const [, startTransition]   = useTransition();
  const router = useRouter();

  function save() {
    const n = Number(val);
    if (isNaN(n) || n < 0) { toast.error("Invalid value"); return; }
    startTransition(async () => {
      try {
        await updateInvestmentValue(inv.id, n);
        toast.success("Value updated");
        setEditing(false);
        router.refresh();
      } catch {
        toast.error("Failed");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${inv.name}"?`)) return;
    startTransition(async () => {
      try {
        await deleteInvestment(inv.id);
        toast.success("Deleted");
        router.refresh();
      } catch {
        toast.error("Failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-white rounded-xl border">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{inv.name}</p>
        <p className="text-xs text-gray-400">Updated {format(parseISO(inv.lastUpdated), "d MMM yyyy")}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${TYPE_COLORS[inv.type] ?? "bg-gray-100 text-gray-600"}`}>
        {inv.type}
      </span>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <span className="text-sm text-gray-500">£</span>
            <input
              type="number"
              step="0.01"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
              className="w-24 border border-[#0d9488] rounded-lg px-2 py-1 text-sm text-right focus:outline-none"
              autoFocus
            />
            <button onClick={save} className="p-1 text-green-500 hover:text-green-600"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </>
        ) : (
          <>
            <span className="text-sm font-semibold text-gray-900 tabular-nums">£{inv.lastKnownValueGbp.toLocaleString()}</span>
            <button onClick={() => setEditing(true)} className="p-1 text-gray-300 hover:text-gray-500"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={handleDelete} className="p-1 text-gray-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </>
        )}
      </div>
    </div>
  );
}
