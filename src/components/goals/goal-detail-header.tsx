"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateGoal, deleteGoal } from "@/actions/goals";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  targetDate: string | null;
  status: string;
  progressPct: number;
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

export function GoalDetailHeader({ goal }: { goal: Goal }) {
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

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

  async function handleDelete() {
    await deleteGoal(goal.id);
    toast.success("Goal deleted");
    router.push("/goals");
  }

  return (
    <>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          title="Edit goal"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
          title="Delete goal"
        >
          <Trash2 className="h-4 w-4" />
        </button>
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
    </>
  );
}
