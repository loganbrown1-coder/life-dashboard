"use client";

import { useState, useTransition, useRef } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  addWorkTodo, toggleWorkTodo, deleteWorkTodo, clearDoneWorkTodos,
  addWorkHabit, toggleWorkHabit, deleteWorkHabit,
  setWorkFocus,
} from "@/actions/work-tools";

type WorkTodo   = { id: string; text: string; done: boolean };
type WorkHabit  = { id: string; title: string };
type HabitState = { habitId: string; done: boolean };

export function WorkTools({
  todos,
  habits,
  habitsDoneToday,
  todayFocus,
}: {
  todos: WorkTodo[];
  habits: WorkHabit[];
  habitsDoneToday: string[]; // habit IDs done today
  todayFocus: string;
}) {
  return (
    <div className="space-y-4">
      <TodayFocus initialFocus={todayFocus} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WorkTodoList todos={todos} />
        <DailyHabits habits={habits} doneIds={habitsDoneToday} />
      </div>
    </div>
  );
}

// ── Today's focus ─────────────────────────────────────────────────────────────

function TodayFocus({ initialFocus }: { initialFocus: string }) {
  const [value, setValue]   = useState(initialFocus);
  const [saved, setSaved]   = useState(!!initialFocus);
  const [editing, setEditing] = useState(!initialFocus);
  const [, start]           = useTransition();
  const ref = useRef<HTMLInputElement>(null);

  function save() {
    if (!value.trim()) return;
    start(async () => {
      await setWorkFocus(value.trim());
      setSaved(true);
      setEditing(false);
    });
  }

  return (
    <div className={`rounded-xl border-2 p-4 transition-colors ${saved && !editing ? "border-teal-200 bg-teal-50/50" : "border-gray-200 bg-white"}`}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">🎯 Today&apos;s #1 priority</p>
      {editing ? (
        <div className="flex gap-2">
          <input
            ref={ref}
            autoFocus
            type="text"
            placeholder="What's the most important thing to get done today?"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setValue(initialFocus); } }}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <button onClick={save} className="px-3 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600">Set</button>
          {saved && <button onClick={() => { setEditing(false); setValue(initialFocus); }} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="w-full text-left">
          <p className="text-base font-semibold text-gray-900 hover:text-teal-700 transition-colors">{value}</p>
          <p className="text-xs text-teal-500 mt-0.5">tap to change</p>
        </button>
      )}
    </div>
  );
}

// ── Work to-dos ───────────────────────────────────────────────────────────────

function WorkTodoList({ todos }: { todos: WorkTodo[] }) {
  const [input, setInput] = useState("");
  const [, start]         = useTransition();
  const inputRef          = useRef<HTMLInputElement>(null);

  const pending   = todos.filter((t) => !t.done);
  const completed = todos.filter((t) => t.done);

  function handleAdd() {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    start(async () => { await addWorkTodo(text); });
    inputRef.current?.focus();
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">📋 Work tasks</h3>
        {completed.length > 0 && (
          <button
            onClick={() => start(async () => { await clearDoneWorkTodos(); toast.success("Cleared"); })}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Clear done
          </button>
        )}
      </div>

      {/* Add input */}
      <div className="flex gap-2 p-3 border-b">
        <input
          ref={inputRef}
          type="text"
          placeholder="Add a task…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="p-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg disabled:opacity-40 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Pending */}
      <div className="divide-y divide-gray-50">
        {pending.length === 0 && completed.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-400">No tasks — add one above</p>
        )}
        {pending.map((t) => (
          <TodoRow key={t.id} todo={t} />
        ))}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div className="border-t bg-gray-50/50 divide-y divide-gray-100">
          <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Done ({completed.length})</p>
          {completed.map((t) => (
            <TodoRow key={t.id} todo={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TodoRow({ todo }: { todo: WorkTodo }) {
  const [, start] = useTransition();
  return (
    <div className="group flex items-center gap-3 px-4 py-3">
      <button
        onClick={() => start(async () => { await toggleWorkTodo(todo.id, todo.done); })}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          todo.done ? "bg-teal-500 border-teal-500" : "border-gray-300 hover:border-teal-400"
        }`}
      >
        {todo.done && <Check className="w-3 h-3 text-white" />}
      </button>
      <span className={`flex-1 text-sm ${todo.done ? "line-through text-gray-400" : "text-gray-800"}`}>
        {todo.text}
      </span>
      <button
        onClick={() => start(async () => { await deleteWorkTodo(todo.id); })}
        className="shrink-0 p-1 text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Daily habits ──────────────────────────────────────────────────────────────

function DailyHabits({ habits, doneIds }: { habits: WorkHabit[]; doneIds: string[] }) {
  const [newHabit, setNewHabit] = useState("");
  const [adding, setAdding]     = useState(false);
  const [, start]               = useTransition();

  const doneSet = new Set(doneIds);
  const doneCount = habits.filter((h) => doneSet.has(h.id)).length;

  function handleAddHabit() {
    if (!newHabit.trim()) return;
    start(async () => {
      await addWorkHabit(newHabit.trim());
      setNewHabit("");
      setAdding(false);
    });
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">🔁 Daily habits</h3>
          {habits.length > 0 && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              doneCount === habits.length ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-500"
            }`}>
              {doneCount}/{habits.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-0.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Add habit input */}
      {adding && (
        <div className="flex gap-2 p-3 border-b">
          <input
            autoFocus
            type="text"
            placeholder="New daily habit…"
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddHabit(); if (e.key === "Escape") { setAdding(false); setNewHabit(""); } }}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <button onClick={handleAddHabit} className="p-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Habit list */}
      <div className="divide-y divide-gray-50">
        {habits.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400">
            No habits yet — add your daily work routine above
          </p>
        ) : (
          habits.map((h) => {
            const done = doneSet.has(h.id);
            return (
              <div key={h.id} className="group flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => start(async () => { await toggleWorkHabit(h.id, done); })}
                  className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    done ? "bg-teal-500 border-teal-500" : "border-gray-300 hover:border-teal-400"
                  }`}
                >
                  {done && <Check className="w-3 h-3 text-white" />}
                </button>
                <span className={`flex-1 text-sm ${done ? "text-gray-400 line-through" : "text-gray-800"}`}>
                  {h.title}
                </span>
                <button
                  onClick={() => start(async () => { await deleteWorkHabit(h.id); })}
                  className="shrink-0 p-1 text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* All done banner */}
      {habits.length > 0 && doneCount === habits.length && (
        <div className="px-4 py-2.5 bg-teal-50 border-t border-teal-100 text-center text-sm font-medium text-teal-700">
          🎉 All habits done for today!
        </div>
      )}
    </div>
  );
}
