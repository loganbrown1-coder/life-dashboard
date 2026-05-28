"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addMoneyToGoal, updateSavingsGoal, deleteSavingsGoal } from "@/actions/finances";
import { format, parseISO } from "date-fns";

type GoalRow = {
  id: string;
  name: string;
  targetAmountGbp: number;
  currentAmountGbp: number;
  targetDate?: string | null;
  notes?: string | null;
};

type AccountRow = { id: string; name: string };

const editSchema = z.object({
  name:             z.string().min(1),
  targetAmountGbp:  z.string().min(1),
  currentAmountGbp: z.string().default("0"),
  targetDate:       z.string().optional(),
  notes:            z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

export function SavingsGoalCard({ goal, accounts }: { goal: GoalRow; accounts: AccountRow[] }) {
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addAccount, setAddAccount] = useState(accounts[0]?.id ?? "");
  const [, startTransition] = useTransition();
  const router = useRouter();

  const pct = goal.targetAmountGbp > 0
    ? Math.min((goal.currentAmountGbp / goal.targetAmountGbp) * 100, 100)
    : 0;

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<EditForm>({
    resolver: zodResolver(editSchema) as unknown as Resolver<EditForm>,
    defaultValues: {
      name:             goal.name,
      targetAmountGbp:  String(goal.targetAmountGbp),
      currentAmountGbp: String(goal.currentAmountGbp),
      targetDate:       goal.targetDate ?? "",
      notes:            goal.notes ?? "",
    },
  });

  function handleDelete() {
    if (!confirm(`Delete "${goal.name}"?`)) return;
    startTransition(async () => {
      try {
        await deleteSavingsGoal(goal.id);
        toast.success("Deleted");
        router.refresh();
      } catch {
        toast.error("Failed");
      }
    });
  }

  function handleAddMoney() {
    const amt = Number(addAmount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    startTransition(async () => {
      try {
        await addMoneyToGoal(goal.id, amt, addAccount || undefined);
        toast.success(`£${amt} added to ${goal.name}`);
        setAddMoneyOpen(false);
        setAddAmount("");
        router.refresh();
      } catch {
        toast.error("Failed");
      }
    });
  }

  async function onEdit(v: EditForm) {
    try {
      await updateSavingsGoal(goal.id, {
        name: v.name,
        targetAmountGbp:  Number(v.targetAmountGbp),
        currentAmountGbp: Number(v.currentAmountGbp),
        targetDate:       v.targetDate || undefined,
        notes:            v.notes || undefined,
      });
      toast.success("Updated");
      setEditOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to update");
    }
  }

  return (
    <>
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{goal.name}</h3>
            {goal.targetDate && (
              <p className="text-xs text-gray-400 mt-0.5">
                Target: {format(parseISO(goal.targetDate), "d MMM yyyy")}
              </p>
            )}
          </div>
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

        <div className="flex items-end justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900">£{goal.currentAmountGbp.toLocaleString()}</span>
          <span className="text-sm text-gray-400">of £{goal.targetAmountGbp.toLocaleString()}</span>
        </div>

        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-2.5 rounded-full bg-[#0d9488] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#0d9488]">{pct.toFixed(0)}% there</span>
          <button
            onClick={() => setAddMoneyOpen(true)}
            className="flex items-center gap-1 text-xs bg-[#0d9488]/10 text-[#0d9488] hover:bg-[#0d9488]/20 rounded-lg px-2.5 py-1.5 font-medium transition-colors"
          >
            <Plus className="w-3 h-3" /> Add money
          </button>
        </div>
        {goal.notes && <p className="text-xs text-gray-400 mt-2 border-t pt-2">{goal.notes}</p>}
      </div>

      {/* Add money dialog */}
      <Dialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Add money to {goal.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Amount (£)</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} autoFocus />
            </div>
            {accounts.length > 0 && (
              <div className="space-y-1">
                <Label>From account (optional)</Label>
                <select
                  value={addAccount}
                  onChange={(e) => setAddAccount(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none"
                >
                  <option value="">No account</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddMoneyOpen(false)}>Cancel</Button>
              <Button onClick={handleAddMoney} className="bg-[#0d9488] hover:bg-[#0f766e] text-white">Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Goal</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onEdit)} className="space-y-3">
            <div className="space-y-1"><Label>Name</Label><Input {...register("name")} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Target (£)</Label><Input type="number" step="0.01" {...register("targetAmountGbp")} /></div>
              <div className="space-y-1"><Label>Current (£)</Label><Input type="number" step="0.01" {...register("currentAmountGbp")} /></div>
            </div>
            <div className="space-y-1"><Label>Target date</Label><Input type="date" {...register("targetDate")} /></div>
            <div className="space-y-1"><Label>Notes</Label><Input {...register("notes")} /></div>
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
