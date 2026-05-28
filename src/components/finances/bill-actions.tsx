"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { MoreHorizontal, Check, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { markBillPaid, updateBill, deleteBill } from "@/actions/finances";

const schema = z.object({
  name:        z.string().min(1),
  amount:      z.string().min(1),
  currency:    z.string().default("GBP"),
  frequency:   z.enum(["weekly","monthly","quarterly","yearly"]),
  nextDueDate: z.string().min(1),
  category:    z.string().min(1),
  autoPay:     z.boolean().default(false),
});
type Form = z.infer<typeof schema>;

type BillRow = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: string;
  nextDueDate: string;
  category: string;
  autoPay: boolean;
};

type RateRow = { currencyCode: string; rateToGbp: number };

const CATEGORIES = ["Rent","Groceries","Eating Out","Transport","Subscriptions","Health","Shopping","Travel","Bills","Savings","Other"];

export function BillActions({ bill, rates }: { bill: BillRow; rates: RateRow[] }) {
  const [editOpen, setEditOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const { register, control, handleSubmit, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema) as unknown as Resolver<Form>,
    defaultValues: {
      name:        bill.name,
      amount:      String(bill.amount),
      currency:    bill.currency,
      frequency:   bill.frequency as Form["frequency"],
      nextDueDate: bill.nextDueDate,
      category:    bill.category,
      autoPay:     bill.autoPay,
    },
  });

  function handleMarkPaid() {
    const rate = rates.find((r) => r.currencyCode === bill.currency)?.rateToGbp ?? 1;
    startTransition(async () => {
      try {
        await markBillPaid(bill.id, rate);
        toast.success("Marked as paid — due date rolled forward");
        router.refresh();
      } catch {
        toast.error("Failed");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${bill.name}"?`)) return;
    startTransition(async () => {
      try {
        await deleteBill(bill.id);
        toast.success("Deleted");
        router.refresh();
      } catch {
        toast.error("Failed");
      }
    });
  }

  async function onSubmit(v: Form) {
    try {
      await updateBill(bill.id, { name: v.name, amount: Number(v.amount), currency: v.currency, frequency: v.frequency, nextDueDate: v.nextDueDate, category: v.category, autoPay: v.autoPay });
      toast.success("Bill updated");
      setEditOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to update");
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleMarkPaid}
          className="flex items-center gap-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded-lg px-2.5 py-1.5 font-medium transition-colors"
        >
          <Check className="w-3 h-3" /> Paid
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <MoreHorizontal className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}><Pencil className="w-3 h-3 mr-2" /> Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600"><Trash2 className="w-3 h-3 mr-2" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Bill</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1"><Label>Name</Label><Input {...register("name")} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Amount</Label><Input type="number" step="0.01" {...register("amount")} /></div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Controller control={control} name="currency" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["GBP","AUD","USD","EUR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Frequency</Label>
              <Controller control={control} name="frequency" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["weekly","monthly","quarterly","yearly"] as const).map((f) => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1"><Label>Next due date</Label><Input type="date" {...register("nextDueDate")} /></div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Controller control={control} name="category" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#0d9488] hover:bg-[#0f766e] text-white">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
