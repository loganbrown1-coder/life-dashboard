"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  ChevronDown, ChevronRight, Plus, Circle, CircleDot, CheckCircle2,
  Trash2, ExternalLink, Clock, Zap, FolderOpen, Rocket, ListTodo,
  MoreVertical, Pencil, Check, X,
} from "lucide-react";
import { updateTaskStatus, deleteTask, addTask, addProject, deleteProject, setProjectStatus } from "@/actions/projects";
import { addHustle } from "@/actions/hustles";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// ── Types ────────────────────────────────────────────────────────────────────

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  notes: string | null;
};

type Project = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  colour: string;
  tasks: Task[];
};

type Hustle = {
  id: string;
  name: string;
  description: string | null;
  colour: string;
  monthMinutes: number;
};

type StandaloneTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  notes: string | null;
};

type Props = {
  projects: Project[];
  hustles: Hustle[];
  standaloneTasks: StandaloneTask[];
  today: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function nextStatus(s: string): "todo" | "doing" | "done" {
  if (s === "todo")  return "doing";
  if (s === "doing") return "done";
  return "todo";
}

const PRIORITY_COLOURS: Record<string, string> = {
  high: "text-red-500 bg-red-50",
  med:  "text-amber-500 bg-amber-50",
  low:  "text-gray-400 bg-gray-50",
};

const PALETTE = ["#0d9488","#3b82f6","#8b5cf6","#ec4899","#f59e0b","#ef4444","#10b981","#6b7280"];

function StatusIcon({ status }: { status: string }) {
  if (status === "done")  return <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0" />;
  if (status === "doing") return <CircleDot className="h-4 w-4 text-blue-500 shrink-0" />;
  return <Circle className="h-4 w-4 text-gray-300 shrink-0" />;
}

// ── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onStatusChange,
  onDelete,
  today,
}: {
  task: Task;
  onStatusChange: (id: string, cur: string) => void;
  onDelete: (id: string) => void;
  today: string;
}) {
  const isOverdue = task.dueDate && task.dueDate < today && task.status !== "done";
  return (
    <div className={`flex items-center gap-2 py-1.5 group ${task.status === "done" ? "opacity-50" : ""}`}>
      <button
        onClick={() => onStatusChange(task.id, task.status)}
        className="shrink-0 hover:scale-110 transition-transform"
        title="Click to advance status"
      >
        <StatusIcon status={task.status} />
      </button>
      <span className={`flex-1 text-sm min-w-0 truncate ${task.status === "done" ? "line-through text-gray-400" : "text-gray-800"}`}>
        {task.title}
      </span>
      {task.dueDate && (
        <span className={`text-[10px] shrink-0 ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
          {isOverdue ? "⚠ " : ""}{task.dueDate}
        </span>
      )}
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase shrink-0 ${PRIORITY_COLOURS[task.priority] ?? ""}`}>
        {task.priority}
      </span>
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 shrink-0 text-gray-300 hover:text-red-400 transition-opacity"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── Project card ──────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  today,
  onTaskStatusChange,
  onTaskDelete,
  onTaskAdd,
  onStatusChange,
  onDelete,
}: {
  project: Project;
  today: string;
  onTaskStatusChange: (taskId: string, cur: string, projectId: string) => void;
  onTaskDelete: (taskId: string, projectId: string) => void;
  onTaskAdd: (projectId: string, title: string) => void;
  onStatusChange: (id: string, status: "active" | "paused" | "done") => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const total = project.tasks.length;
  const done  = project.tasks.filter((t) => t.status === "done").length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const activeTasks = project.tasks.filter((t) => t.status !== "done");
  const doneTasks   = project.tasks.filter((t) => t.status === "done");

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onTaskAdd(project.id, newTaskTitle.trim());
    setNewTaskTitle("");
    setAddingTask(false);
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden" style={{ borderLeftColor: project.colour, borderLeftWidth: 4 }}>
      {/* Card header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start gap-2">
          <button onClick={() => setExpanded(!expanded)} className="mt-0.5 text-gray-400 hover:text-gray-600 shrink-0">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/projects/${project.id}`} className="font-semibold text-sm hover:underline truncate" title={project.title}>
                {project.title}
              </Link>
              <Link href={`/projects/${project.id}`} className="text-gray-300 hover:text-teal-500 shrink-0">
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            {project.description && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{project.description}</p>
            )}
          </div>
          {confirmDelete ? (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-red-500">Delete?</span>
              <button onClick={() => onDelete(project.id)} className="text-xs font-medium text-red-500 hover:text-red-700 px-1">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 hover:text-gray-600 px-1">No</button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger className="p-1 rounded hover:bg-gray-100 shrink-0">
                <MoreVertical className="h-3.5 w-3.5 text-gray-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onStatusChange(project.id, "active")}>Mark Active</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onStatusChange(project.id, "paused")}>Mark Paused</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onStatusChange(project.id, "done")}>Mark Done ✓</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="text-red-600">Delete…</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#10b981" : project.colour }}
              />
            </div>
            <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">{done}/{total}</span>
          </div>
        )}
        {total === 0 && (
          <p className="text-xs text-gray-300 mt-1 ml-6">No tasks yet</p>
        )}
        {project.deadline && (
          <p className="text-[10px] text-gray-400 mt-1 ml-6">Deadline: {project.deadline}</p>
        )}
      </div>

      {/* Task list */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-gray-50">
          <div className="pt-2 space-y-0.5">
            {activeTasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                today={today}
                onStatusChange={(id, cur) => onTaskStatusChange(id, cur, project.id)}
                onDelete={(id) => onTaskDelete(id, project.id)}
              />
            ))}
            {doneTasks.length > 0 && (
              <div>
                {doneTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    today={today}
                    onStatusChange={(id, cur) => onTaskStatusChange(id, cur, project.id)}
                    onDelete={(id) => onTaskDelete(id, project.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Quick add task */}
          {addingTask ? (
            <form onSubmit={handleAddTask} className="flex gap-1.5 mt-2">
              <input
                ref={inputRef}
                autoFocus
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setAddingTask(false)}
                placeholder="Task title…"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <button type="submit" className="p-1.5 text-teal-500 hover:text-teal-600"><Check className="h-4 w-4" /></button>
              <button type="button" onClick={() => setAddingTask(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </form>
          ) : (
            <button
              onClick={() => setAddingTask(true)}
              className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-teal-500 transition-colors"
            >
              <Plus className="h-3 w-3" /> Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add project dialog ────────────────────────────────────────────────────────

function AddProjectDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [colour, setColour] = useState(PALETTE[0]);
  const [, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      await addProject({ title, description: desc, deadline, colour, status: "active" });
      toast.success("Project added");
      setOpen(false);
      setTitle(""); setDesc(""); setDeadline(""); setColour(PALETTE[0]);
      onAdded();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-100 transition-colors"
      >
        <FolderOpen className="h-3.5 w-3.5" /> New project
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <Input placeholder="Project name" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            <Textarea placeholder="Description (optional)" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
            <div>
              <label className="text-xs text-gray-500 block mb-1">Deadline (optional)</label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Colour</p>
              <div className="flex gap-2 flex-wrap">
                {PALETTE.map((c) => (
                  <button key={c} type="button" onClick={() => setColour(c)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${colour === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Add hustle dialog ─────────────────────────────────────────────────────────

function AddHustleDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [colour, setColour] = useState(PALETTE[1]);
  const [, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await addHustle({ name, description: desc, colour });
      toast.success("Hustle added");
      setOpen(false);
      setName(""); setDesc(""); setColour(PALETTE[1]);
      onAdded();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
      >
        <Rocket className="h-3.5 w-3.5" /> New hustle
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Side Hustle</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <Textarea placeholder="Description (optional)" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Colour</p>
              <div className="flex gap-2 flex-wrap">
                {PALETTE.map((c) => (
                  <button key={c} type="button" onClick={() => setColour(c)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${colour === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Add standalone task dialog ────────────────────────────────────────────────

function AddTaskDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "med" | "high">("med");
  const [dueDate, setDueDate] = useState("");
  const [, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      await addTask({ title, priority, dueDate: dueDate || undefined, status: "todo" });
      toast.success("Task added");
      setOpen(false);
      setTitle(""); setPriority("med"); setDueDate("");
      onAdded();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <ListTodo className="h-3.5 w-3.5" /> Quick task
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Quick Task</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <Input placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            <div className="grid grid-cols-2 gap-2">
              <Select value={priority} onValueChange={(v) => v && setPriority(v as "low" | "med" | "high")}>
                <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="med">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Main WorkBoard ────────────────────────────────────────────────────────────

export function WorkBoard({ projects: initial, hustles, standaloneTasks: initialTasks, today }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [projects, setProjects] = useState(initial);
  const [standaloneTasks, setStandaloneTasks] = useState(initialTasks);
  const [showDoneProjects, setShowDoneProjects] = useState(false);

  function refresh() { router.refresh(); }

  // ── Task mutations ────────────────────────────────────────────────────────

  function handleTaskStatus(taskId: string, cur: string, projectId?: string) {
    const next = nextStatus(cur);
    // Optimistic update
    if (projectId) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, tasks: p.tasks.map((t) => t.id === taskId ? { ...t, status: next } : t) }
            : p
        )
      );
    } else {
      setStandaloneTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: next } : t));
    }
    startTransition(async () => {
      await updateTaskStatus(taskId, next);
    });
  }

  function handleTaskDelete(taskId: string, projectId?: string) {
    if (!confirm("Delete this task?")) return;
    if (projectId) {
      setProjects((prev) =>
        prev.map((p) => p.id === projectId ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) } : p)
      );
    } else {
      setStandaloneTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
    startTransition(async () => {
      await deleteTask(taskId);
      toast.success("Task deleted");
    });
  }

  function handleTaskAdd(projectId: string, title: string) {
    startTransition(async () => {
      await addTask({ title, projectId, priority: "med", status: "todo" });
      toast.success("Task added");
      refresh();
    });
  }

  // ── Project mutations ─────────────────────────────────────────────────────

  function handleProjectStatus(id: string, status: "active" | "paused" | "done") {
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
    startTransition(async () => {
      await setProjectStatus(id, status);
      toast.success(`Moved to ${status}`);
    });
  }

  function handleProjectDelete(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    startTransition(async () => {
      await deleteProject(id);
      toast.success("Project deleted");
    });
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const activeProjects = projects.filter((p) => p.status === "active");
  const pausedProjects = projects.filter((p) => p.status === "paused");
  const doneProjects   = projects.filter((p) => p.status === "done");

  // Focus: tasks due today or "doing" across all projects + standalone
  const allProjectTasks = projects.flatMap((p) => p.tasks.map((t) => ({ ...t, projectTitle: p.title, projectId: p.id, colour: p.colour })));
  const focusTasks = [
    ...allProjectTasks.filter((t) => t.status !== "done" && (t.status === "doing" || t.dueDate === today)),
    ...standaloneTasks.filter((t) => t.status !== "done" && (t.status === "doing" || t.dueDate === today)).map((t) => ({ ...t, projectTitle: "Quick tasks", projectId: undefined as string | undefined, colour: "#6b7280" })),
  ];

  const activeSTasks = standaloneTasks.filter((t) => t.status !== "done");
  const doneSTasksCount = standaloneTasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Work</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {activeProjects.length} active project{activeProjects.length !== 1 ? "s" : ""} · {focusTasks.length} in focus
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AddProjectDialog onAdded={refresh} />
          <AddHustleDialog onAdded={refresh} />
          <AddTaskDialog onAdded={refresh} />
        </div>
      </div>

      {/* Today's Focus */}
      {focusTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-700">Focus now</h2>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{focusTasks.length}</span>
          </div>
          <div className="space-y-1.5">
            {focusTasks.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 shadow-sm group ${t.status === "doing" ? "border-blue-200 bg-blue-50/30" : ""}`}
              >
                <button
                  onClick={() => handleTaskStatus(t.id, t.status, t.projectId)}
                  className="shrink-0 hover:scale-110 transition-transform"
                >
                  <StatusIcon status={t.status} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{t.title}</p>
                  <p className="text-[10px] text-gray-400 truncate">{t.projectTitle}</p>
                </div>
                {t.dueDate === today && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">Due today</span>
                )}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase shrink-0 ${PRIORITY_COLOURS[t.priority] ?? ""}`}>
                  {t.priority}
                </span>
                <button
                  onClick={() => handleTaskDelete(t.id, t.projectId)}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-gray-300 hover:text-red-400 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Projects */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen className="h-4 w-4 text-teal-600" />
          <h2 className="text-sm font-semibold text-gray-700">Active projects</h2>
          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{activeProjects.length}</span>
        </div>
        {activeProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            No active projects — add one above
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {activeProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                today={today}
                onTaskStatusChange={handleTaskStatus}
                onTaskDelete={handleTaskDelete}
                onTaskAdd={handleTaskAdd}
                onStatusChange={handleProjectStatus}
                onDelete={handleProjectDelete}
              />
            ))}
          </div>
        )}
      </section>

      {/* Hustles */}
      {hustles.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="h-4 w-4 text-purple-500" />
            <h2 className="text-sm font-semibold text-gray-700">Side hustles</h2>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{hustles.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {hustles.map((h) => (
              <Link
                key={h.id}
                href={`/hustles/${h.id}`}
                className="rounded-xl border bg-white shadow-sm p-4 hover:shadow-md transition-shadow group"
                style={{ borderLeftColor: h.colour, borderLeftWidth: 4 }}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{h.name}</p>
                    {h.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{h.description}</p>}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-purple-400 shrink-0 mt-0.5 transition-colors" />
                </div>
                {h.monthMinutes > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {(h.monthMinutes / 60).toFixed(1)}h this month
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick / Standalone Tasks */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ListTodo className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Quick tasks</h2>
          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{activeSTasks.length} open</span>
        </div>
        {activeSTasks.length === 0 && doneSTasksCount === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            No quick tasks — use "Quick task" above to add one
          </div>
        ) : (
          <div className="rounded-xl border bg-white shadow-sm divide-y divide-gray-50">
            {standaloneTasks.map((task) => (
              <div key={task.id} className={`flex items-center gap-3 px-4 py-2.5 group ${task.status === "done" ? "opacity-50" : ""}`}>
                <button
                  onClick={() => handleTaskStatus(task.id, task.status)}
                  className="shrink-0 hover:scale-110 transition-transform"
                >
                  <StatusIcon status={task.status} />
                </button>
                <span className={`flex-1 text-sm ${task.status === "done" ? "line-through text-gray-400" : "text-gray-800"}`}>
                  {task.title}
                </span>
                {task.dueDate && (
                  <span className={`text-[10px] shrink-0 ${task.dueDate < today && task.status !== "done" ? "text-red-500 font-medium" : "text-gray-400"}`}>
                    {task.dueDate}
                  </span>
                )}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase shrink-0 ${PRIORITY_COLOURS[task.priority] ?? ""}`}>
                  {task.priority}
                </span>
                <button
                  onClick={() => handleTaskDelete(task.id)}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-gray-300 hover:text-red-400 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Paused & Done projects */}
      {(pausedProjects.length > 0 || doneProjects.length > 0) && (
        <section className="space-y-4">
          {pausedProjects.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-400 mb-2">Paused ({pausedProjects.length})</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {pausedProjects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    today={today}
                    onTaskStatusChange={handleTaskStatus}
                    onTaskDelete={handleTaskDelete}
                    onTaskAdd={handleTaskAdd}
                    onStatusChange={handleProjectStatus}
                    onDelete={handleProjectDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {doneProjects.length > 0 && (
            <div>
              <button
                onClick={() => setShowDoneProjects(!showDoneProjects)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-600 mb-2"
              >
                {showDoneProjects ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Completed ({doneProjects.length})
              </button>
              {showDoneProjects && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 opacity-70">
                  {doneProjects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      today={today}
                      onTaskStatusChange={handleTaskStatus}
                      onTaskDelete={handleTaskDelete}
                      onTaskAdd={handleTaskAdd}
                      onStatusChange={handleProjectStatus}
                      onDelete={handleProjectDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
