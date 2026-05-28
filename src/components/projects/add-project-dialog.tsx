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
import { addProject } from "@/actions/projects";

const schema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string().optional(),
  status: z.enum(["active", "paused", "done"]).default("active"),
  deadline: z.string().optional(),
  colour: z.string().default("#0d9488"),
});
type FormValues = z.infer<typeof schema>;

const PALETTE = ["#0d9488","#3b82f6","#8b5cf6","#ec4899","#f59e0b","#ef4444","#10b981","#6b7280"];

export function AddProjectDialog() {
  const [open, setOpen] = useState(false);
  const [colour, setColour] = useState("#0d9488");
  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(schema) as unknown as Resolver<FormValues>, defaultValues: { colour: "#0d9488", status: "active" } });

  async function onSubmit(data: FormValues) {
    await addProject({ ...data, colour });
    toast.success("Project created");
    reset();
    setColour("#0d9488");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
        <Plus className="h-4 w-4" /> New Project
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
          <div>
            <Input placeholder="Project title" {...register("title")} />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>
          <Textarea placeholder="Description (optional)" rows={2} {...register("description")} />
          <Input type="date" {...register("deadline")} />
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Colour</p>
            <div className="flex gap-2 flex-wrap">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColour(c)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${colour === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
