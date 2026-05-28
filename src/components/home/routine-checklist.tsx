"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronUp, Settings, Plus, Trash2 } from "lucide-react";
import { toggleRoutineItem, addRoutineItem, removeRoutineItem } from "@/actions/routines";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type RoutineItem = {
  id: string;
  label: string;
  displayOrder: number;
};

type Log = {
  routineItemId: string;
  completed: boolean;
};

type Props = {
  routineId: string;
  label: string;
  items: RoutineItem[];
  logs: Log[];
  date: string;
  collapsedByDefault?: boolean;
  dimmed?: boolean;
};

export function RoutineChecklist({ routineId, label, items, logs, date, collapsedByDefault, dimmed }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState(collapsedByDefault ?? false);
  const [manageOpen, setManageOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  const logMap = Object.fromEntries(logs.map((l) => [l.routineItemId, l.completed]));
  const doneCount = items.filter((i) => logMap[i.id]).length;
  const allDone = doneCount === items.length && items.length > 0;

  function handleToggle(itemId: string) {
    const current = logMap[itemId] ?? false;
    startTransition(async () => {
      await toggleRoutineItem(itemId, date, !current);
      router.refresh();
    });
  }

  async function handleAdd() {
    if (!newLabel.trim()) return;
    setAdding(true);
    await addRoutineItem(routineId, newLabel.trim());
    setNewLabel("");
    setAdding(false);
    router.refresh();
  }

  async function handleRemove(itemId: string) {
    await removeRoutineItem(itemId);
    router.refresh();
  }

  return (
    <>
      <div className={`rounded-xl border bg-white overflow-hidden transition-opacity ${dimmed ? "opacity-50" : ""}`}>
        <div className="flex items-center">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">{label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                allDone ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}>
                {doneCount}/{items.length}
              </span>
            </div>
            {collapsed
              ? <ChevronDown className="w-4 h-4 text-gray-400" />
              : <ChevronUp className="w-4 h-4 text-gray-400" />
            }
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setManageOpen(true); }}
            className="px-3 py-3 text-gray-300 hover:text-gray-500 transition-colors"
            title="Manage items"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {!collapsed && (
          <div className="px-4 pb-3 space-y-1 border-t border-gray-50">
            {items.map((item) => {
              const done = logMap[item.id] ?? false;
              return (
                <button
                  key={item.id}
                  onClick={() => handleToggle(item.id)}
                  className="w-full flex items-center gap-3 py-2 text-left group"
                >
                  <span className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    done
                      ? "bg-[#0d9488] border-[#0d9488]"
                      : "border-gray-300 group-hover:border-[#0d9488]"
                  }`}>
                    {done && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className={`text-sm transition-colors ${done ? "line-through text-gray-400" : "text-gray-700"}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Manage {label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 mt-2 max-h-64 overflow-y-auto">
            {items.length === 0 && (
              <p className="text-sm text-gray-400 py-2 text-center">No items yet.</p>
            )}
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 py-1.5 group">
                <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Input
              placeholder="New item…"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              className="flex-1"
            />
            <Button onClick={handleAdd} disabled={adding || !newLabel.trim()} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
