"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logRevenue } from "@/actions/hustles";
import { format } from "date-fns";

type FormValues = {
  date: string;
  amount: string;
  source: string;
  notes: string;
};

const CURRENCIES = ["GBP", "AUD", "USD", "EUR"];

export function LogRevenueDialog({ hustleId }: { hustleId: string }) {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<string>("GBP");
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { date: format(new Date(), "yyyy-MM-dd") },
  });

  async function onSubmit(data: FormValues) {
    if (!data.amount || Number(data.amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    await logRevenue({
      hustleId,
      date: data.date,
      amount: Number(data.amount),
      currency,
      source: data.source || undefined,
      notes: data.notes || undefined,
    });
    toast.success("Revenue logged");
    reset({ date: format(new Date(), "yyyy-MM-dd") });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">
        <DollarSign className="h-4 w-4" /> Log Revenue
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Log Revenue</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
          <Input type="date" {...register("date")} />
          <div className="flex gap-2">
            <Select value={currency} onValueChange={(v) => { if (v) setCurrency(v); }}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" step="0.01" placeholder="Amount" className="flex-1" {...register("amount")} />
          </div>
          <Input placeholder="Source (e.g. client name, platform)" {...register("source")} />
          <Input placeholder="Notes (optional)" {...register("notes")} />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
