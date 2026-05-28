"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addSavingsGoal } from "@/actions/finances";

const schema = z.object({
  name:            z.string().min(1, "Required"),
  targetAmountGbp: z.string().min(1, "Required"),
  targetDate:      z.string().optional(),
  notes:           z.string().optional(),
});
type Form = z.infer<typeof schema>;

export function AddSavingsGoalDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<Form>({
    resolver: zodResolver(schema) as unknown as Resolver<Form>,
    defaultValues: { name: "", targetAmountGbp: "", targetDate: "", notes: "" },
  });

  async function onSubmit(v: Form) {
    try {
      await addSavingsGoal({ name: v.name, targetAmountGbp: Number(v.targetAmountGbp), currentAmountGbp: 0, targetDate: v.targetDate || undefined, notes: v.notes || undefined });
      toast.success("Goal added");
      reset();
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to add goal");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-medium transition-colors">
        <Plus className="w-4 h-4" /> Add goal
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New Savings Goal</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input placeholder="e.g. Emergency fund, Holiday" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Target amount (£) *</Label>
            <Input type="number" step="0.01" placeholder="e.g. 5000" {...register("targetAmountGbp")} />
            {errors.targetAmountGbp && <p className="text-xs text-red-500">{errors.targetAmountGbp.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Target date (optional)</Label>
            <Input type="date" {...register("targetDate")} />
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Input placeholder="Any notes…" {...register("notes")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#0d9488] hover:bg-[#0f766e] text-white">Add</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
