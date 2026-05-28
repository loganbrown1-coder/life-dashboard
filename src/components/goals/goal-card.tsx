"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Resolver } from "react-hook-form";
import { toast } from "sonner";
import Link from "next/link";
import { Pencil, Trash2, CheckSquare, Square, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateGoal, updateGoalProgress, deleteGoal } from "@/actions/goals";
import { completeTask } from "@/actions/tasks";

const CATEGORY_COLOURS: Record<string, string> = {
  life: "bg-teal-100 text-teal-800",
  career: "bg-blue-100 text-blue-800",
  relationships: "bg-pink-100 text-pink-800",
  travel: "bg-amber-100 text-amber-800",
  learning: "bg-purple-100 text-purple-800",
  other: "bg-gray-100 text-gray-800",
};

type Goal = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  targetDate: string | null;
  status: string;
  progressPct: number;
  linkedSavingsGoalId: string | null;
};

type SavingsGoal = {
  id: string;
  name: string;
  currentAmountGbp: number;
  targetAmountGbp: number;
} | null;

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  goalId?: string | null;
};

const editSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["life", "career", "relationships", "travel", "learning", "other"]),
  targetDate: z.string().optional(),
  status: z.enum(["active", "done", "paused", "abandoned"]).default("active"),
  progressPct: z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

export function GoalCard({ goal, savings, tasks = [], actionCount = 0, stepCount }: { goal: Goal; savings?: SavingsGoal; tasks?: Task[]; actionCount?: number; stepCount?: { total: number; done: number } }) {
  const [editOpen, setEditOpen] = useState(false);
  const [progressInput, setProgressInput] = useState(String(goal.progressPct));

  const { register, handleSubmit, watch, setValue, reset } = useForm<EditForm>({
    resolver: zodResolver(editSchema) as unknown as Resolver<EditForm>,
    defaultValues: {
      title: goal.title,
      description: goal.description ?? "",
      category: goal.category as EditForm["category"],
      targetDate: goal.targetDate ?? "",
      status: goal.status as EditForm["status"],
      progressPct: String(goal.progressPct),
    },
  });
  const status = watch("status");
  const category = watch("category");

  async function onEdit(data: EditForm) {
    await updateGoal(goal.id, {
      title: data.title,
      description: data.description,
      category: data.category,
      targetDate: data.targetDate,
      status: data.status,
      progressPct: Number(data.progressPct ?? goal.progressPct),
    });
    toast.success("Goal updated");
    setEditOpen(false);
  }

  async function handleProgressBlur() {
    const pct = Math.min(100, Math.max(0, Number(progressInput) || 0));
    if (pct !== goal.progressPct) {
      await updateGoalProgress(goal.id, pct);
      toast.success("Progress updated");
    }
  }

  async function handleDelete() {
    await deleteGoal(goal.id);
    toast.success("Goal deleted");
  }

  const catClass = CATEGORY_COLOURS[goal.category] ?? CATEGORY_COLOURS.other;

  return (
    <div className="rounded-xl border bg-white shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium mb-1 ${catClass}`}>
            {goal.category}
          </span>
          <Link href={`/goals/${goal.id}`} className="hover:text-teal-700 transition-colors">
            <h3 className="font-semibold text-sm leading-snug">{goal.title}</h3>
          </Link>
          {goal.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{goal.description}</p>}
          <div className="flex flex-wrap gap-1 mt-1">
            {stepCount && stepCount.total > 0 && (
              <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                {stepCount.done}/{stepCount.total} steps
              </span>
            )}
            {actionCount > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                {actionCount} action{actionCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            title="Edit goal"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
            title="Delete goal"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-500">Progress</span>
          <input
            type="number"
            min={0}
            max={100}
            value={progressInput}
            onChange={(e) => setProgressInput(e.target.value)}
            onBlur={handleProgressBlur}
            className="ml-auto w-12 text-right text-xs border rounded px-1 py-0.5"
          />
          <span className="text-xs text-gray-500">%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-teal-500 transition-all"
            style={{ width: `${goal.progressPct}%` }}
          />
        </div>
      </div>

      {savings && (
        <div className="rounded-lg bg-gray-50 p-2 text-xs">
          <div className="flex justify-between mb-1 text-gray-600">
            <span>{savings.name}</span>
            <span>£{savings.currentAmountGbp.toFixed(0)} / £{savings.targetAmountGbp.toFixed(0)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.min(100, (savings.currentAmountGbp / savings.targetAmountGbp) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Linked tasks */}
      {tasks.length > 0 && (
        <div className="border-t pt-2 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Contributing tasks</p>
          {tasks.slice(0, 4).map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <button
                onClick={async () => { await completeTask(t.id); }}
                className="flex-shrink-0 text-gray-400 hover:text-teal-500 transition-colors"
                title="Mark done"
              >
                {t.status === "done"
                  ? <CheckSquare className="w-3.5 h-3.5 text-teal-500" />
                  : <Square className="w-3.5 h-3.5" />
                }
              </button>
              <span className={`text-xs flex-1 truncate ${t.status === "done" ? "line-through text-gray-300" : "text-gray-700"}`}>
                {t.title}
              </span>
            </div>
          ))}
          {tasks.length > 4 && (
            <p className="text-xs text-gray-400 pl-5">+{tasks.length - 4} more</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t mt-1">
        {goal.targetDate
          ? <p className="text-xs text-gray-400">Target: {goal.targetDate}</p>
          : <span />
        }
        <Link
          href={`/goals/${goal.id}`}
          className="flex items-center gap-0.5 text-xs text-teal-600 hover:text-teal-800 font-medium"
        >
          View steps <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Goal</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onEdit)} className="space-y-3 mt-2">
            <Input placeholder="Title" {...register("title")} />
            <Textarea placeholder="Description" rows={2} {...register("description")} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={category} onValueChange={(v) => setValue("category", v as EditForm["category"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["life","career","relationships","travel","learning","other"].map(c => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => setValue("status", v as EditForm["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["active","done","paused","abandoned"].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" {...register("targetDate")} />
              <Input type="number" min={0} max={100} placeholder="Progress %" {...register("progressPct")} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => { reset(); setEditOpen(false); }}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
