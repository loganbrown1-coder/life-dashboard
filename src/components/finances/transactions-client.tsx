"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteTransaction } from "@/actions/finances";

type TxRow = {
  id: string;
  date: string;
  description?: string | null;
  category: string;
  type: string;
  amount: number;
  currency: string;
  amountInBaseCurrency: number;
  accountId: string;
};

type AccountRow = { id: string; name: string };
type RateRow    = { currencyCode: string; rateToGbp: number };

type Props = {
  transactions: TxRow[];
  accounts:     AccountRow[];
};

const TYPE_COLORS: Record<string, string> = {
  income:   "text-green-600 bg-green-50",
  expense:  "text-red-600 bg-red-50",
  transfer: "text-blue-600 bg-blue-50",
};

export function TransactionsClient({ transactions, accounts }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filterType, setFilterType]         = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterAccount, setFilterAccount]   = useState<string>("all");
  const [search, setSearch]                 = useState("");

  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]));
  const categories = [...new Set(transactions.map((t) => t.category))].sort();

  const filtered = transactions.filter((t) => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (filterAccount !== "all" && t.accountId !== filterAccount) return false;
    if (search && !t.description?.toLowerCase().includes(search.toLowerCase()) &&
        !t.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function handleDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    startTransition(async () => {
      try {
        await deleteTransaction(id);
        toast.success("Deleted");
        router.refresh();
      } catch {
        toast.error("Failed to delete");
      }
    });
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30 w-40"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none"
        >
          <option value="all">All types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none"
        >
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterAccount}
          onChange={(e) => setFilterAccount(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none"
        >
          <option value="all">All accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <span className="text-xs text-gray-400 self-center ml-1">{filtered.length} rows</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No transactions found</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">GBP</th>
                  <th className="px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 group">
                    <td className="px-4 py-3 text-gray-600 tabular-nums whitespace-nowrap">{t.date}</td>
                    <td className="px-4 py-3 text-gray-800 max-w-[200px] truncate">{t.description || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[t.type] ?? "bg-gray-100 text-gray-600"}`}>
                        {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{accountMap[t.accountId] ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                      <span className={t.type === "income" ? "text-green-600" : t.type === "expense" ? "text-red-600" : "text-blue-600"}>
                        {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}
                        {t.currency !== "GBP" ? t.currency + " " : "£"}{t.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-400 whitespace-nowrap">
                      {t.currency !== "GBP" ? `£${t.amountInBaseCurrency.toFixed(2)}` : ""}
                    </td>
                    <td className="px-2 py-3">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
