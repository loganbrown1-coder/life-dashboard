"use client";

import { toast } from "sonner";
import { Circle, CircleDot, CheckCircle2, Trash2 } from "lucide-react";
import { updateTaskStatus, deleteTask } from "@/actions/projects";

type Task = {
  id: string;
  title: string;
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

export function QuickTasks({ tasks }: { tasks: Task[] }) {
  async function handleStatus(id: string, current: string) {
    await updateTaskStatus(id, nextStatus(current));
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    toast.success("Task deleted");
  }

  if (tasks.length === 0) return <p className="text-sm text-gray-400 py-2">No standalone tasks.</p>;

  return (
    <div className="space-y-1.5">
      {tasks.map((task) => (
        <div key={task.id} className={`flex items-center gap-2 rounded-lg border bg-white p-2.5 group ${task.status === "done" ? "opacity-60" : ""}`}>
          <button onClick={() => handleStatus(task.id, task.status)}>
            <StatusIcon status={task.status} />
          </button>
          <span className={`flex-1 text-sm ${task.status === "done" ? "line-through text-gray-400" : ""}`}>
            {task.title}
          </span>
          {task.dueDate && <span className="text-xs text-gray-400">{task.dueDate}</span>}
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
  );
}
