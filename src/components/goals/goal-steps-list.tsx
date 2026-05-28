"use client";

import { useState } from "react";
import { Check, Trash2, Plus, CalendarPlus, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { addGoalStep, toggleGoalStep, deleteGoalStep, updateGoalStep } from "@/actions/goal-steps";
import { addCalendarEvent } from "@/actions/calendar-events";

type Step = {
  id: string;
  goalId: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  position: number;
};

function StepRow({ step, goalId }: { step: Step; goalId: string }) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(step.title);
  const [editDate, setEditDate] = useState(step.dueDate ?? "");
  const [scheduling, setScheduling] = useState(false);
  const [schedDate, setSchedDate] = useState(step.dueDate ?? "");

  async function handleToggle() {
    await toggleGoalStep(step.id, goalId, step.done);
  }

  async function handleDelete() {
    await deleteGoalStep(step.id, goalId);
    toast.success("Step removed");
  }

  async function handleEdit() {
    if (!editTitle.trim()) return;
    await updateGoalStep(step.id, goalId, editTitle, editDate);
    setEditing(false);
    toast.success("Step updated");
  }

  async function handleSchedule() {
    if (!schedDate) return;
    await addCalendarEvent({
      title: step.title,
      date: schedDate,
      type: "other",
      goalId,
    });
    setScheduling(false);
    toast.success("Added to calendar");
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg">
        <input
          autoFocus
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleEdit(); if (e.key === "Escape") setEditing(false); }}
          className="flex-1 text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <input
          type="date"
          value={editDate}
          onChange={(e) => setEditDate(e.target.value)}
          className="text-xs border rounded px-1.5 py-1 text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button onClick={handleEdit} className="text-teal-600 hover:text-teal-700 font-medium text-xs px-2 py-1 rounded bg-teal-50 hover:bg-teal-100">
          Save
        </button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex flex-col gap-1">
      <div className="flex items-center gap-3 px-1 py-2">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            step.done
              ? "bg-teal-500 border-teal-500 text-white"
              : "border-gray-300 hover:border-teal-400"
          }`}
        >
          {step.done && <Check className="w-3 h-3" />}
        </button>

        {/* Title */}
        <span className={`flex-1 text-sm ${step.done ? "line-through text-gray-400" : "text-gray-800"}`}>
          {step.title}
        </span>

        {/* Due date badge */}
        {step.dueDate && (
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border hidden sm:block">
            {step.dueDate}
          </span>
        )}

        {/* Actions — show on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => { setEditing(true); setEditTitle(step.title); setEditDate(step.dueDate ?? ""); }}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            title="Edit step"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setScheduling(!scheduling)}
            className={`p-1 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-500 ${scheduling ? "text-indigo-500 bg-indigo-50" : ""}`}
            title="Schedule on calendar"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
            title="Remove step"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline schedule panel */}
      {scheduling && (
        <div className="ml-8 flex items-center gap-2 pb-2">
          <CalendarPlus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <input
            type="date"
            value={schedDate}
            onChange={(e) => setSchedDate(e.target.value)}
            className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={handleSchedule}
            disabled={!schedDate}
            className="text-xs px-2.5 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add to calendar
          </button>
          <button onClick={() => setScheduling(false)} className="text-gray-400 hover:text-gray-600 text-xs">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export function GoalStepsList({ goalId, steps }: { goalId: string; steps: Step[] }) {
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!newTitle.trim()) return;
    await addGoalStep(goalId, newTitle, newDate);
    setNewTitle("");
    setNewDate("");
    setAdding(false);
    toast.success("Step added");
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm">
      {/* Steps list */}
      {steps.length === 0 && !adding ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400">
          No steps yet — break your goal down into actions below.
        </div>
      ) : (
        <div className="divide-y px-4">
          {steps.map((s) => (
            <StepRow key={s.id} step={s} goalId={goalId} />
          ))}
        </div>
      )}

      {/* Add step form */}
      {adding ? (
        <div className="border-t px-4 py-3 flex items-center gap-2 bg-gray-50">
          <input
            autoFocus
            placeholder="Step title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
            className="flex-1 text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="text-xs border rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
            title="Optional due date"
          />
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className="px-3 py-1.5 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </button>
          <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="border-t px-4 py-3">
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add a step
          </button>
        </div>
      )}
    </div>
  );
}
