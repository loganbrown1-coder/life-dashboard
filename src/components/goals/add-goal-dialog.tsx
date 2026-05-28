"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addGoal } from "@/actions/goals";

const schema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string().optional(),
  category: z.enum(["life", "career", "relationships", "travel", "learning", "other"]),
  targetDate: z.string().optional(),
  status: z.enum(["active", "done", "paused", "abandoned"]).default("active"),
  progressPct: z.string().optional(),
  linkSavings: z.boolean().optional(),
  savingsName: z.string().optional(),
  savingsTarget: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function AddGoalDialog() {
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(schema) as unknown as Resolver<FormValues>, defaultValues: { category: "life", status: "active" } });

  const linkSavings = watch("linkSavings");
  const category = watch("category");

  async function onSubmit(data: FormValues) {
    const linkedSavings = data.linkSavings && data.savingsName && data.savingsTarget
      ? { name: data.savingsName, targetAmountGbp: Number(data.savingsTarget) }
      : undefined;
    await addGoal({
      title: data.title,
      description: data.description,
      category: data.category,
      targetDate: data.targetDate,
      status: data.status,
      progressPct: Number(data.progressPct ?? 0),
    }, linkedSavings);
    toast.success("Goal added");
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
        <Plus className="h-4 w-4" /> Add Goal
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Goal</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
          <div>
            <Input placeholder="Goal title" {...register("title")} />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>
          <Textarea placeholder="Description (optional)" rows={2} {...register("description")} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={category} onValueChange={(v) => setValue("category", v as FormValues["category"])}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {["life","career","relationships","travel","learning","other"].map(c => (
                  <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" {...register("targetDate")} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("linkSavings")} className="rounded" />
            Link a savings goal
          </label>
          {linkSavings && (
            <div className="space-y-2 rounded-lg border p-3">
              <Input placeholder="Savings goal name" {...register("savingsName")} />
              <Input type="number" placeholder="Target amount (£)" step="0.01" {...register("savingsTarget")} />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
