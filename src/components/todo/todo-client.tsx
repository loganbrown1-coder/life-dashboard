"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Plus, Check, Trash2, Pencil, X, Save } from "lucide-react";
import {
  addTodo, toggleTodo, updateTodo, deleteTodo, clearCompleted,
  type TodoCategory, type TodoBucket,
} from "@/actions/todos";

type Todo = {
  id: string;
  text: string;
  category: TodoCategory;
  bucket: TodoBucket;
  done: boolean;
  createdAt: Date;
};

type Tab = "all" | TodoCategory;

const TABS: { key: Tab; label: string }[] = [
  { key: "all",        label: "All"        },
  { key: "opspot",     label: "OpSpot"     },
  { key: "personal",   label: "Personal"   },
  { key: "nice-cubes", label: "Nice Cubes" },
  { key: "other",      label: "Other"      },
];

export function TodoClient({ todos }: { todos: Todo[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("all");

  const filtered = activeTab === "all"
    ? todos
    : todos.filter((t) => t.category === activeTab);

  const todayItems   = filtered.filter((t) => t.bucket === "today");
  const generalItems = filtered.filter((t) => t.bucket === "general");

  const pendingToday   = todayItems.filter((t) => !t.done).length;
  const pendingGeneral = generalItems.filter((t) => !t.done).length;

  return (
    <div>
      {/* Category tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "bg-teal-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Column
          title="Today"
          bucket="today"
          category={activeTab === "all" ? undefined : activeTab}
          todos={todayItems}
          pendingCount={pendingToday}
        />
        <Column
          title="General"
          bucket="general"
          category={activeTab === "all" ? undefined : activeTab}
          todos={generalItems}
          pendingCount={pendingGeneral}
        />
      </div>
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

function Column({
  title,
  bucket,
  category,
  todos,
  pendingCount,
}: {
  title: string;
  bucket: TodoBucket;
  category: TodoCategory | undefined;
  todos: Todo[];
  pendingCount: number;
}) {
  const [inputText, setInputText] = useState("");
  const [, start]                 = useTransition();
  const inputRef                  = useRef<HTMLInputElement>(null);

  const pending   = todos.filter((t) => !t.done);
  const completed = todos.filter((t) => t.done);

  function handleAdd() {
    const text = inputText.trim();
    if (!text) return;
    const cat: TodoCategory = category ?? "personal";
    start(async () => { await addTodo(text, cat, bucket); });
    setInputText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd();
  }

  function handleClearCompleted() {
    start(async () => {
      await clearCompleted(category, bucket);
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {pendingCount === 0 ? "All done" : `${pendingCount} pending`}
          </p>
        </div>
        {completed.length > 0 && (
          <button
            onClick={handleClearCompleted}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            Clear done
          </button>
        )}
      </div>

      {/* Add input */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Add to ${title.toLowerCase()}…`}
          className="flex-1 text-sm text-gray-700 placeholder-gray-300 focus:outline-none bg-transparent"
        />
        <button
          onClick={handleAdd}
          disabled={!inputText.trim()}
          className="p-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 disabled:opacity-30 text-white transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Todo list */}
      <div className="divide-y divide-gray-50">
        {pending.length === 0 && completed.length === 0 && (
          <p className="px-4 py-8 text-center text-xs text-gray-300">Nothing here yet</p>
        )}
        {pending.map((t) => (
          <TodoRow key={t.id} todo={t} />
        ))}
        {completed.map((t) => (
          <TodoRow key={t.id} todo={t} />
        ))}
      </div>
    </div>
  );
}

// ── TodoRow ───────────────────────────────────────────────────────────────────

function TodoRow({ todo }: { todo: Todo }) {
  const [editing, setEditing]   = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [editCat, setEditCat]   = useState<TodoCategory>(todo.category);
  const [editBucket, setEditBucket] = useState<TodoBucket>(todo.bucket);
  const [, start]               = useTransition();
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function handleToggle() {
    start(async () => { await toggleTodo(todo.id, todo.done); });
  }

  function handleDelete() {
    start(async () => { await deleteTodo(todo.id); });
  }

  function handleSave() {
    if (!editText.trim()) return;
    start(async () => { await updateTodo(todo.id, editText.trim(), editCat, editBucket); });
    setEditing(false);
  }

  function handleCancel() {
    setEditText(todo.text);
    setEditCat(todo.category);
    setEditBucket(todo.bucket);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  }

  if (editing) {
    return (
      <div className="px-4 py-3 bg-teal-50/60">
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full text-sm text-gray-800 bg-white border border-teal-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400 mb-2"
        />
        <div className="flex items-center gap-2">
          <select
            value={editCat}
            onChange={(e) => setEditCat(e.target.value as TodoCategory)}
            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white text-gray-600"
          >
            <option value="opspot">OpSpot</option>
            <option value="personal">Personal</option>
            <option value="nice-cubes">Nice Cubes</option>
            <option value="other">Other</option>
          </select>
          <select
            value={editBucket}
            onChange={(e) => setEditBucket(e.target.value as TodoBucket)}
            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white text-gray-600"
          >
            <option value="today">Today</option>
            <option value="general">General</option>
          </select>
          <button
            onClick={handleSave}
            className="p-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors ${todo.done ? "opacity-50" : ""}`}>
      <button
        onClick={handleToggle}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          todo.done
            ? "bg-teal-500 border-teal-500"
            : "border-gray-300 hover:border-teal-400"
        }`}
      >
        {todo.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>

      <span className={`flex-1 text-sm text-gray-700 leading-snug ${todo.done ? "line-through" : ""}`}>
        {todo.text}
      </span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="p-1 rounded text-gray-300 hover:text-teal-500 hover:bg-teal-50 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
