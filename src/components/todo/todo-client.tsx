"use client";

import { useState, useTransition, useRef } from "react";
import { Check, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { addTodo, toggleTodo, deleteTodo, clearCompleted, TodoCategory } from "@/actions/todos";

type Todo = {
  id: string;
  text: string;
  category: TodoCategory;
  done: boolean;
  createdAt: Date;
};

type Tab = "all" | TodoCategory;

const TABS: { id: Tab; label: string }[] = [
  { id: "all",        label: "All"        },
  { id: "opspot",     label: "OpSpot"     },
  { id: "personal",   label: "Personal"   },
  { id: "nice-cubes", label: "Nice Cubes" },
  { id: "other",      label: "Other"      },
];

export function TodoClient({ todos }: { todos: Todo[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [input, setInput]         = useState("");
  const [, start]                 = useTransition();
  const inputRef                  = useRef<HTMLInputElement>(null);

  const defaultCat: TodoCategory = activeTab === "all" ? "personal" : activeTab;

  const filtered  = activeTab === "all" ? todos : todos.filter((t) => t.category === activeTab);
  const pending   = filtered.filter((t) => !t.done);
  const completed = filtered.filter((t) => t.done);

  const pendingByTab: Record<string, number> = { all: todos.filter((t) => !t.done).length };
  for (const cat of ["opspot", "personal", "nice-cubes", "other"] as TodoCategory[]) {
    pendingByTab[cat] = todos.filter((t) => !t.done && t.category === cat).length;
  }

  function handleAdd() {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    start(async () => { await addTodo(text, defaultCat); });
    inputRef.current?.focus();
  }

  function handleToggle(id: string, done: boolean) {
    start(async () => { await toggleTodo(id, done); });
  }

  function handleDelete(id: string) {
    start(async () => { await deleteTodo(id); });
  }

  function handleClear() {
    start(async () => {
      await clearCompleted(activeTab === "all" ? undefined : activeTab);
      toast.success("Cleared completed items");
    });
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const count = pendingByTab[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-1 justify-center ${
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center ${
                  activeTab === tab.id ? "bg-teal-100 text-teal-700" : "bg-gray-200 text-gray-500"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Add input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          autoFocus
          type="text"
          placeholder={`Add to ${activeTab === "all" ? "Personal" : TABS.find((t) => t.id === activeTab)?.label}…`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white shadow-sm"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="px-4 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Pending items */}
      {pending.length === 0 ? (
        <div className="rounded-xl border bg-white shadow-sm px-4 py-10 text-center text-gray-400 text-sm">
          {completed.length > 0 ? "All done! 🎉" : "Nothing here — add something above ☝️"}
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm divide-y divide-gray-50 overflow-hidden">
          {pending.map((t) => (
            <TodoRow
              key={t.id}
              todo={t}
              showCategory={activeTab === "all"}
              onToggle={() => handleToggle(t.id, t.done)}
              onDelete={() => handleDelete(t.id)}
            />
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Completed · {completed.length}
            </p>
            <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-600 transition-colors">
              Clear all
            </button>
          </div>
          <div className="rounded-xl border bg-white shadow-sm divide-y divide-gray-50 overflow-hidden opacity-60">
            {completed.map((t) => (
              <TodoRow
                key={t.id}
                todo={t}
                showCategory={activeTab === "all"}
                onToggle={() => handleToggle(t.id, t.done)}
                onDelete={() => handleDelete(t.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const CAT_COLOURS: Record<TodoCategory, string> = {
  "opspot":     "bg-blue-100 text-blue-600",
  "personal":   "bg-purple-100 text-purple-600",
  "nice-cubes": "bg-amber-100 text-amber-700",
  "other":      "bg-gray-100 text-gray-500",
};

const CAT_LABELS: Record<TodoCategory, string> = {
  "opspot":     "OpSpot",
  "personal":   "Personal",
  "nice-cubes": "Nice Cubes",
  "other":      "Other",
};

function TodoRow({ todo, showCategory, onToggle, onDelete }: {
  todo: Todo;
  showCategory: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 px-4 py-3.5">
      <button
        onClick={onToggle}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          todo.done
            ? "bg-teal-500 border-teal-500 text-white"
            : "border-gray-300 hover:border-teal-400"
        }`}
      >
        {todo.done && <Check className="w-3 h-3" />}
      </button>

      <span className={`flex-1 text-sm leading-snug ${todo.done ? "line-through text-gray-400" : "text-gray-800"}`}>
        {todo.text}
      </span>

      {showCategory && (
        <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CAT_COLOURS[todo.category]}`}>
          {CAT_LABELS[todo.category]}
        </span>
      )}

      <button
        onClick={onDelete}
        className="shrink-0 p-1 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
