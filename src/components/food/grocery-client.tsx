"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Plus, ShoppingCart, RefreshCw, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateGroceryList, toggleGroceryItem, addManualGroceryItem } from "@/actions/food";

type GroceryItem = {
  name: string;
  totalQuantity: number | null;
  unit: string | null;
  aisle: string;
  checked: boolean;
};

type Props = {
  weekStart: string;
  items: GroceryItem[];
  generatedAt: Date | null;
};

const AISLE_ORDER = ["produce", "protein", "dairy", "pantry", "frozen", "other"];
const AISLE_LABELS: Record<string, string> = {
  produce: "Produce",
  protein: "Protein & Meat",
  dairy: "Dairy",
  pantry: "Pantry",
  frozen: "Frozen",
  other: "Other",
};
const AISLE_COLORS: Record<string, string> = {
  produce: "text-green-700 bg-green-50 border-green-100",
  protein: "text-red-700 bg-red-50 border-red-100",
  dairy: "text-blue-700 bg-blue-50 border-blue-100",
  pantry: "text-amber-700 bg-amber-50 border-amber-100",
  frozen: "text-cyan-700 bg-cyan-50 border-cyan-100",
  other: "text-gray-700 bg-gray-50 border-gray-100",
};

export function GroceryClient({ weekStart, items, generatedAt }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleGenerate() {
    startTransition(async () => {
      try {
        await generateGroceryList(weekStart);
        toast.success("Grocery list generated");
        router.refresh();
      } catch {
        toast.error("Failed to generate list");
      }
    });
  }

  async function handleToggle(itemName: string, checked: boolean) {
    try {
      await toggleGroceryItem(weekStart, itemName, !checked);
      router.refresh();
    } catch {
      toast.error("Failed to update item");
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim()) return;
    setAdding(true);
    try {
      await addManualGroceryItem(weekStart, newItem.trim());
      setNewItem("");
      router.refresh();
    } catch {
      toast.error("Failed to add item");
    } finally {
      setAdding(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  // Group by aisle
  const byAisle: Record<string, GroceryItem[]> = {};
  for (const item of items) {
    const aisle = item.aisle || "other";
    if (!byAisle[aisle]) byAisle[aisle] = [];
    byAisle[aisle].push(item);
  }

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Button
          onClick={handleGenerate}
          disabled={isPending}
          className="bg-[#0d9488] hover:bg-[#0f766e] text-white flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
          {items.length === 0 ? "Generate list from meal plan" : "Regenerate from meal plan"}
        </Button>
        {items.length > 0 && (
          <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="w-4 h-4" /> Print
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
          <ShoppingCart className="w-12 h-12 text-gray-200 mb-4" />
          <h2 className="text-lg font-medium text-gray-700 mb-1">No grocery list yet</h2>
          <p className="text-sm text-gray-400 mb-4">Plan some meals first, then generate your grocery list</p>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-[#0d9488] transition-all"
                style={{ width: totalCount ? `${(checkedCount / totalCount) * 100}%` : "0%" }}
              />
            </div>
            <span className="text-sm text-gray-500 flex-shrink-0">
              {checkedCount} / {totalCount} items
            </span>
          </div>

          {generatedAt && (
            <p className="text-xs text-gray-400 mb-4">
              Generated {generatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}

          {/* Items by aisle */}
          <div className="space-y-6 print:space-y-4">
            {AISLE_ORDER.filter((a) => byAisle[a]?.length).map((aisle) => (
              <div key={aisle}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded-md border inline-block mb-2 ${AISLE_COLORS[aisle]}`}>
                  {AISLE_LABELS[aisle]}
                </h3>
                <div className="space-y-1">
                  {byAisle[aisle].map((item) => (
                    <button
                      key={item.name}
                      onClick={() => handleToggle(item.name, item.checked)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        item.checked ? "opacity-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        item.checked
                          ? "bg-[#0d9488] border-[#0d9488]"
                          : "border-gray-300"
                      }`}>
                        {item.checked && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <span className={`flex-1 text-sm ${item.checked ? "line-through text-gray-400" : "text-gray-800"}`}>
                        {item.name}
                      </span>
                      {(item.totalQuantity || item.unit) && (
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {item.totalQuantity ?? ""}{item.unit ? ` ${item.unit}` : ""}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add manual item */}
      <form onSubmit={handleAddItem} className="mt-6 flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add item manually…"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30"
        />
        <Button type="submit" disabled={adding || !newItem.trim()} variant="outline" size="icon">
          <Plus className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
