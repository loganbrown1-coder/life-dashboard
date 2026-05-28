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
import { addBill } from "@/actions/finances";
import { format } from "date-fns";

const schema = z.object({
  name:        z.string().min(1, "Required"),
  amount:      z.string().min(1, "Required"),
  currency:    z.string().default("GBP"),
  frequency:   z.enum(["weekly","monthly","quarterly","yearly"]),
  nextDueDate: z.string().min(1, "Required"),
  category:    z.string().min(1, "Required"),
  autoPay:     z.boolean().default(false),
  accountId:   z.string().optional(),
});
type Form = z.infer<typeof schema>;

const CATEGORIES = ["Rent","Groceries","Eating Out","Transport","Subscriptions","Health","Shopping","Travel","Bills","Savings","Other"];
type AccountRow = { id: string; name: string };

export function AddBillDialog({ accounts }: { accounts: AccountRow[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");

  const { register, control, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<Form>({
    resolver: zodResolver(schema) as unknown as Resolver<Form>,
    defaultValues: { name: "", amount: "", currency: "GBP", frequency: "monthly", nextDueDate: today, category: "Bills", autoPay: false },
  });

  async function onSubmit(v: Form) {
    try {
      await addBill({ name: v.name, amount: Number(v.amount), currency: v.currency, frequency: v.frequency, nextDueDate: v.nextDueDate, category: v.category, autoPay: v.autoPay, accountId: v.accountId || undefined });
      toast.success("Bill added");
      reset();
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to add bill");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-medium transition-colors">
        <Plus className="w-4 h-4" /> Add bill
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Bill</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input placeholder="e.g. Rent, Netflix" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Amount *</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} />
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Controller control={control} name="currency" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["GBP","AUD","USD","EUR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Frequency</Label>
              <Controller control={control} name="frequency" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["weekly","monthly","quarterly","yearly"] as const).map((f) => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1">
              <Label>Next due</Label>
              <Input type="date" {...register("nextDueDate")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Controller control={control} name="category" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>
          {accounts.length > 0 && (
            <div className="space-y-1">
              <Label>Account (optional)</Label>
              <Controller control={control} name="accountId" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <SelectTrigger><SelectValue placeholder="No account" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No account</SelectItem>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="autoPay" {...register("autoPay")} className="w-4 h-4 accent-[#0d9488]" />
            <Label htmlFor="autoPay" className="cursor-pointer text-sm">Auto-pay</Label>
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
