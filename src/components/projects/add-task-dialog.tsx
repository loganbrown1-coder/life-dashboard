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
import { addTask } from "@/actions/projects";

const schema = z.object({
  title: z.string().min(1, "Title required"),
  notes: z.string().optional(),
  priority: z.enum(["low", "med", "high"]).default("med"),
  dueDate: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function AddTaskDialog({ projectId, label = "Add Task" }: { projectId?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState<"low" | "med" | "high">("med");
  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(schema) as unknown as Resolver<FormValues>, defaultValues: { priority: "med" } });

  async function onSubmit(data: FormValues) {
    await addTask({
      title: data.title,
      notes: data.notes,
      priority,
      dueDate: data.dueDate,
      projectId,
      status: "todo",
    });
    toast.success("Task added");
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
        <Plus className="h-3.5 w-3.5" /> {label}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
          <div>
            <Input placeholder="Task title" {...register("title")} />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>
          <Textarea placeholder="Notes (optional)" rows={2} {...register("notes")} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="med">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" {...register("dueDate")} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
