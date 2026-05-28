"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dumbbell, Scale, UtensilsCrossed, ListTodo, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logWorkout } from "@/actions/health";
import { logWeight } from "@/actions/health";
import { addTask } from "@/actions/tasks";

// ── Schemas ──────────────────────────────────────────────────────────────────

const workoutSchema = z.object({
  date:            z.string().min(1),
  type:            z.enum(["push","pull","legs","core","arms_shoulders","run","swim","walk","stretch","rest","other"]),
  durationMinutes: z.string().optional(),
  notes:           z.string().optional(),
});
type WorkoutForm = z.infer<typeof workoutSchema>;

const weightSchema = z.object({
  date:     z.string().min(1),
  weightKg: z.string().min(1, "Required"),
});
type WeightForm = z.infer<typeof weightSchema>;

const taskSchema = z.object({
  title:    z.string().min(1, "Required"),
  dueDate:  z.string().optional(),
  priority: z.enum(["low","med","high"]).default("med"),
});
type TaskForm = z.infer<typeof taskSchema>;

// ── Main component ────────────────────────────────────────────────────────────

type AccountRow = { id: string; name: string; currency: string };

export function QuickActions({ accounts }: { accounts: AccountRow[] }) {
  const [open, setOpen] = useState<"workout"|"weight"|"task"|null>(null);
  const router = useRouter();

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <ActionBtn icon={<Dumbbell className="w-5 h-5" />} label="Log workout"  onClick={() => setOpen("workout")} color="bg-orange-50 text-orange-700 hover:bg-orange-100" />
        <ActionBtn icon={<Scale className="w-5 h-5" />}    label="Log weight"   onClick={() => setOpen("weight")}  color="bg-blue-50 text-blue-700 hover:bg-blue-100" />
        <ActionBtn icon={<UtensilsCrossed className="w-5 h-5" />} label="Plan a meal" onClick={() => router.push("/food/plan")} color="bg-teal-50 text-teal-700 hover:bg-teal-100" />
        <ActionBtn icon={<ListTodo className="w-5 h-5" />} label="Add task"     onClick={() => setOpen("task")}   color="bg-purple-50 text-purple-700 hover:bg-purple-100" />
        <ActionBtn
          icon={<Receipt className="w-5 h-5" />}
          label="Log expense"
          onClick={() => {
            if (accounts.length === 0) {
              toast.info("Add an account in Finances first");
            } else {
              router.push("/finances/transactions");
            }
          }}
          color="bg-green-50 text-green-700 hover:bg-green-100"
        />
      </div>

      <WorkoutDialog open={open === "workout"} onClose={() => setOpen(null)} />
      <WeightDialog  open={open === "weight"}  onClose={() => setOpen(null)} />
      <TaskDialog    open={open === "task"}    onClose={() => setOpen(null)} />
    </div>
  );
}

function ActionBtn({ icon, label, onClick, color }: { icon: React.ReactNode; label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-xl p-4 transition-colors font-medium text-sm ${color}`}
    >
      {icon}
      <span className="text-xs text-center leading-tight">{label}</span>
    </button>
  );
}

// ── Log Workout dialog ────────────────────────────────────────────────────────

function WorkoutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const { register, control, handleSubmit, reset, formState: { isSubmitting } } = useForm<WorkoutForm>({
    resolver: zodResolver(workoutSchema) as unknown as Resolver<WorkoutForm>,
    defaultValues: { date: today, type: "push" },
  });

  async function onSubmit(v: WorkoutForm) {
    try {
      await logWorkout({
        date: v.date,
        type: v.type,
        durationMinutes: v.durationMinutes ? Number(v.durationMinutes) : undefined,
        notes: v.notes,
        completed: true,
      });
      toast.success("Workout logged");
      reset({ date: today, type: "push" });
      onClose();
      router.refresh();
    } catch {
      toast.error("Failed to log workout");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Log Workout</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" {...register("date")} />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Controller control={control} name="type" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["push","pull","legs","core","arms_shoulders","run","swim","walk","stretch","rest","other"] as const).map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t.replace("_"," ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-1">
            <Label>Duration (min)</Label>
            <Input type="number" placeholder="e.g. 45" {...register("durationMinutes")} />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input placeholder="Optional notes" {...register("notes")} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#0d9488] hover:bg-[#0f766e] text-white">Log</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Log Weight dialog ─────────────────────────────────────────────────────────

function WeightDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<WeightForm>({
    resolver: zodResolver(weightSchema) as unknown as Resolver<WeightForm>,
    defaultValues: { date: today, weightKg: "" },
  });

  async function onSubmit(v: WeightForm) {
    try {
      await logWeight({ date: v.date, weightKg: Number(v.weightKg) });
      toast.success("Weight logged");
      reset({ date: today, weightKg: "" });
      onClose();
      router.refresh();
    } catch {
      toast.error("Failed to log weight");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Log Weight</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" {...register("date")} />
          </div>
          <div className="space-y-1">
            <Label>Weight (kg)</Label>
            <Input type="number" step="0.1" placeholder="e.g. 82.5" {...register("weightKg")} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#0d9488] hover:bg-[#0f766e] text-white">Log</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Task dialog ───────────────────────────────────────────────────────────

function TaskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { register, control, handleSubmit, reset, formState: { isSubmitting } } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema) as unknown as Resolver<TaskForm>,
    defaultValues: { title: "", dueDate: "", priority: "med" },
  });

  async function onSubmit(v: TaskForm) {
    try {
      await addTask({ title: v.title, dueDate: v.dueDate || undefined, priority: v.priority });
      toast.success("Task added");
      reset({ title: "", dueDate: "", priority: "med" });
      onClose();
      router.refresh();
    } catch {
      toast.error("Failed to add task");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input placeholder="What needs doing?" {...register("title")} />
          </div>
          <div className="space-y-1">
            <Label>Due date</Label>
            <Input type="date" {...register("dueDate")} />
          </div>
          <div className="space-y-1">
            <Label>Priority</Label>
            <Controller control={control} name="priority" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="med">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#0d9488] hover:bg-[#0f766e] text-white">Add</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
