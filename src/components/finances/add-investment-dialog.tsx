"use client";

import { useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addInvestment } from "@/actions/finances";

const schema = z.object({
  name:              z.string().min(1, "Required"),
  type:              z.enum(["isa","stock","crypto","etf","other"]),
  lastKnownValueGbp: z.string().default("0"),
  notes:             z.string().optional(),
});
type Form = z.infer<typeof schema>;

export function AddInvestmentDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { register, control, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<Form>({
    resolver: zodResolver(schema) as unknown as Resolver<Form>,
    defaultValues: { name: "", type: "isa", lastKnownValueGbp: "0", notes: "" },
  });

  async function onSubmit(v: Form) {
    try {
      await addInvestment({ name: v.name, type: v.type, lastKnownValueGbp: Number(v.lastKnownValueGbp), notes: v.notes || undefined });
      toast.success("Investment added");
      reset();
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to add investment");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-medium transition-colors">
        <Plus className="w-4 h-4" /> Add investment
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Investment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input placeholder="e.g. Vanguard ISA, Bitcoin" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Controller control={control} name="type" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["isa","stock","crypto","etf","other"] as const).map((t) => (
                    <SelectItem key={t} value={t} className="uppercase">{t.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-1">
            <Label>Current value (£)</Label>
            <Input type="number" step="0.01" placeholder="0.00" {...register("lastKnownValueGbp")} />
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Input placeholder="Provider, account number, etc." {...register("notes")} />
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
