"use client";

import { useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addAccount } from "@/actions/finances";

const schema = z.object({
  name:           z.string().min(1, "Required"),
  type:           z.enum(["checking","savings","credit","investment","cash"]),
  currency:       z.string().min(1).default("GBP"),
  currentBalance: z.string().default("0"),
});
type Form = z.infer<typeof schema>;

const KNOWN_CURRENCIES = ["GBP","AUD","USD","EUR","CAD","JPY"];

export function AddAccountDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { register, control, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema) as unknown as Resolver<Form>,
    defaultValues: { name: "", type: "checking", currency: "GBP", currentBalance: "0" },
  });

  async function onSubmit(v: Form) {
    try {
      await addAccount({ name: v.name, type: v.type, currency: v.currency, currentBalance: Number(v.currentBalance) });
      toast.success("Account added");
      reset();
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to add account");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-medium transition-colors">
        <PlusCircle className="w-4 h-4" /> Add account
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input placeholder="e.g. Monzo, Savings, Cash" {...register("name")} />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Controller control={control} name="type" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["checking","savings","credit","investment","cash"] as const).map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-1">
            <Label>Currency</Label>
            <Controller control={control} name="currency" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KNOWN_CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-1">
            <Label>Current balance</Label>
            <Input type="number" step="0.01" {...register("currentBalance")} />
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
