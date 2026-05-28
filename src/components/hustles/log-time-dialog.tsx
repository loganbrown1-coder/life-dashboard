"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { logTime } from "@/actions/hustles";
import { format } from "date-fns";

type FormValues = {
  date: string;
  hours: string;
  minutes: string;
  description: string;
};

export function LogTimeDialog({ hustleId }: { hustleId: string }) {
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { date: format(new Date(), "yyyy-MM-dd"), hours: "", minutes: "" },
  });

  async function onSubmit(data: FormValues) {
    const totalMinutes = (Number(data.hours) || 0) * 60 + (Number(data.minutes) || 0);
    if (totalMinutes <= 0) {
      toast.error("Enter hours or minutes");
      return;
    }
    await logTime({
      hustleId,
      date: data.date,
      minutes: totalMinutes,
      description: data.description || undefined,
    });
    toast.success("Time logged");
    reset({ date: format(new Date(), "yyyy-MM-dd") });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50">
        <Clock className="h-4 w-4" /> Log Time
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Log Time</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
          <Input type="date" {...register("date")} />
          <div className="flex gap-2">
            <div className="flex-1">
              <Input type="number" min={0} placeholder="Hours" {...register("hours")} />
            </div>
            <div className="flex-1">
              <Input type="number" min={0} max={59} placeholder="Minutes" {...register("minutes")} />
            </div>
          </div>
          <Input placeholder="What did you work on?" {...register("description")} />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
