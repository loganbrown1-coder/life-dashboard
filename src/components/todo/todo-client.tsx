"use client";

import { useState, useTransition, useRef } from "react";
import { Check, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { addTodo, toggleTodo, deleteTodo, clearCompleted } from "@/actions/todos";

type Todo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: Date;
};

export function TodoClient({ pending, completed }: { pending: Todo[]; completed: Todo[] }) {
  const [input, setInput]   = useState("");
  const [, start]           = useTransition();
  const inputRef            = useRef<HTMLInputElement>(null);

  function handleAdd() {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    start(async () => {
      await addTodo(text);
    });
    inputRef.current?.focus();
  }

  function handleToggle(id: string, done: boolean) {
    start(async () => {
      await toggleTodo(id, done);
    });
  }

  function handleDelete(id: string) {
    start(async () => {
      await deleteTodo(id);
    });
  }

  function handleClearCompleted() {
    start(async () => {
      await clearCompleted();
      toast.success("Cleared completed items");
    });
  }

  return (
    <div className="space-y-4">
      {/* Add input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          autoFocus
          type="text"
          placeholder="Add something to do…"
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
          Nothing here — add something above ☝️
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm divide-y divide-gray-50 overflow-hidden">
          {pending.map((t) => (
            <TodoRow
              key={t.id}
              todo={t}
              onToggle={() => handleToggle(t.id, t.done)}
              onDelete={() => handleDelete(t.id)}
            />
          ))}
        </div>
      )}

      {/* Completed items */}
      {completed.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Completed · {completed.length}
            </p>
            <button
              onClick={handleClearCompleted}
              className="text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="rounded-xl border bg-white shadow-sm divide-y divide-gray-50 overflow-hidden opacity-60">
            {completed.map((t) => (
              <TodoRow
                key={t.id}
                todo={t}
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

function TodoRow({
  todo,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 px-4 py-3.5">
      {/* Checkbox */}
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

      {/* Text */}
      <span className={`flex-1 text-sm leading-snug ${
        todo.done ? "line-through text-gray-400" : "text-gray-800"
      }`}>
        {todo.text}
      </span>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="shrink-0 p-1 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
