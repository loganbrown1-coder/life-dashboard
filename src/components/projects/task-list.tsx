"use client";

import { toast } from "sonner";
import { Trash2, Circle, CircleDot, CheckCircle2 } from "lucide-react";
import { updateTaskStatus, deleteTask } from "@/actions/projects";

type Task = {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
};

const PRIORITY_COLOURS: Record<string, string> = {
  high: "text-red-500",
  med:  "text-amber-500",
  low:  "text-gray-300",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "done")  return <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0" />;
  if (status === "doing") return <CircleDot className="h-4 w-4 text-blue-500 shrink-0" />;
  return <Circle className="h-4 w-4 text-gray-300 shrink-0" />;
}

function nextStatus(s: string): "todo" | "doing" | "done" {
  if (s === "todo")  return "doing";
  if (s === "doing") return "done";
  return "todo";
}

export function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return <p className="text-sm text-gray-400 py-2">No tasks yet.</p>;

  async function handleStatus(id: string, current: string) {
    await updateTaskStatus(id, nextStatus(current));
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    toast.success("Task deleted");
  }

  const grouped: Record<string, Task[]> = { todo: [], doing: [], done: [] };
  tasks.forEach((t) => { (grouped[t.status] ??= []).push(t); });

  const sections = [
    { key: "doing", label: "In Progress" },
    { key: "todo",  label: "To Do" },
    { key: "done",  label: "Done" },
  ];

  return (
    <div className="space-y-4">
      {sections.map(({ key, label }) => {
        const items = grouped[key] ?? [];
        if (items.length === 0) return null;
        return (
          <div key={key}>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{label}</p>
            <div className="space-y-1.5">
              {items.map((task) => (
                <div key={task.id} className={`flex items-start gap-2 rounded-lg border bg-white p-2.5 group ${task.status === "done" ? "opacity-60" : ""}`}>
                  <button onClick={() => handleStatus(task.id, task.status)} className="mt-0.5">
                    <StatusIcon status={task.status} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${task.status === "done" ? "line-through text-gray-400" : ""}`}>{task.title}</span>
                    {task.notes && <p className="text-xs text-gray-400 truncate">{task.notes}</p>}
                    {task.dueDate && <p className="text-xs text-gray-400">Due {task.dueDate}</p>}
                  </div>
                  <span className={`text-xs font-medium uppercase ${PRIORITY_COLOURS[task.priority] ?? ""}`}>{task.priority}</span>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-300 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
