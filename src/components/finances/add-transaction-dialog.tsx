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
import { addTransaction } from "@/actions/finances";

const schema = z.object({
  date:        z.string().min(1),
  accountId:   z.string().min(1, "Select an account"),
  type:        z.enum(["income","expense","transfer"]),
  amount:      z.string().min(1, "Required"),
  currency:    z.string().min(1).default("GBP"),
  category:    z.string().min(1, "Required"),
  description: z.string().optional(),
  isRecurring: z.boolean().default(false),
});
type Form = z.infer<typeof schema>;

type AccountRow = { id: string; name: string; currency: string };
type RateRow    = { currencyCode: string; rateToGbp: number };

type Props = {
  accounts:   AccountRow[];
  rates:      RateRow[];
  categories: string[];
  trigger?:   React.ReactNode;
};

export function AddTransactionDialog({ accounts, rates, categories, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const { register, control, handleSubmit, watch, setValue, reset, formState: { isSubmitting, errors } } =
    useForm<Form>({
      resolver: zodResolver(schema) as unknown as Resolver<Form>,
      defaultValues: { date: today, type: "expense", amount: "", currency: "GBP", category: "", isRecurring: false },
    });

  const watchedAmount   = watch("amount");
  const watchedCurrency = watch("currency");
  const watchedAccountId = watch("accountId");

  // Auto-set currency when account changes
  function handleAccountChange(id: string | null) {
    if (!id) return;
    setValue("accountId", id);
    const acc = accounts.find((a) => a.id === id);
    if (acc) setValue("currency", acc.currency);
  }

  // Live conversion preview
  const rateToGbp = rates.find((r) => r.currencyCode === watchedCurrency)?.rateToGbp ?? 1;
  const gbpAmount = watchedAmount && !isNaN(Number(watchedAmount)) ? +(Number(watchedAmount) * rateToGbp).toFixed(2) : null;
  const showConversion = watchedCurrency !== "GBP" && gbpAmount !== null;

  async function onSubmit(v: Form) {
    try {
      const rate = rates.find((r) => r.currencyCode === v.currency)?.rateToGbp ?? 1;
      await addTransaction({
        date:                 v.date,
        accountId:            v.accountId,
        amount:               Number(v.amount),
        currency:             v.currency,
        type:                 v.type,
        category:             v.category,
        description:          v.description,
        isRecurring:          v.isRecurring,
        amountInBaseCurrency: +(Number(v.amount) * rate).toFixed(2),
      });
      toast.success("Transaction added");
      reset({ date: today, type: "expense", amount: "", currency: "GBP", category: "", isRecurring: false });
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to add transaction");
    }
  }

  const allCurrencies = ["GBP", ...rates.map((r) => r.currencyCode).filter((c) => c !== "GBP")];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger className="contents">{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add transaction
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Account *</Label>
            <Controller control={control} name="accountId" render={({ field }) => (
              <Select onValueChange={handleAccountChange} value={field.value ?? ""}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
            {errors.accountId && <p className="text-xs text-red-500">{errors.accountId.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <Label>Amount *</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} />
              {showConversion && (
                <p className="text-xs text-gray-400">= £{gbpAmount}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Controller control={control} name="currency" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allCurrencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Category *</Label>
            <Controller control={control} name="category" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
            {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Input placeholder="Optional note" {...register("description")} />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="recurring" {...register("isRecurring")} className="w-4 h-4 accent-[#0d9488]" />
            <Label htmlFor="recurring" className="cursor-pointer text-sm">Recurring transaction</Label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || accounts.length === 0} className="bg-[#0d9488] hover:bg-[#0f766e] text-white">Add</Button>
          </div>
          {accounts.length === 0 && (
            <p className="text-xs text-amber-600 text-center">Add an account first</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
