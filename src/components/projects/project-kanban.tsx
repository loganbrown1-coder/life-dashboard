"use client";

import Link from "next/link";
import { toast } from "sonner";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Resolver } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteProject, setProjectStatus, updateProject } from "@/actions/projects";

type Project = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  colour: string;
};

const editSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["active", "paused", "done"]).default("active"),
  deadline: z.string().optional(),
  colour: z.string().default("#0d9488"),
});
type EditForm = z.infer<typeof editSchema>;

const PALETTE = ["#0d9488","#3b82f6","#8b5cf6","#ec4899","#f59e0b","#ef4444","#10b981","#6b7280"];

function ProjectCard({
  project,
  onDragStart,
}: {
  project: Project;
  onDragStart: (id: string) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [colour, setColour] = useState(project.colour);
  const { register, handleSubmit, watch, setValue, reset } = useForm<EditForm>({
    resolver: zodResolver(editSchema) as unknown as Resolver<EditForm>,
    defaultValues: {
      title: project.title,
      description: project.description ?? "",
      status: project.status as EditForm["status"],
      deadline: project.deadline ?? "",
      colour: project.colour,
    },
  });
  const status = watch("status");

  async function onEdit(data: EditForm) {
    await updateProject(project.id, { ...data, colour });
    toast.success("Project updated");
    setEditOpen(false);
  }

  async function handleDelete() {
    await deleteProject(project.id);
    toast.success("Project deleted");
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(project.id);
      }}
      className="rounded-xl border bg-white shadow-sm p-4 cursor-grab active:cursor-grabbing select-none"
      style={{ borderLeftColor: project.colour, borderLeftWidth: 4 }}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/projects/${project.id}`}
          className="flex-1 min-w-0 hover:underline"
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-semibold text-sm truncate">{project.title}</p>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger className="p-1 rounded hover:bg-gray-100">
            <MoreVertical className="h-4 w-4 text-gray-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleDelete} className="text-red-600">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {project.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{project.description}</p>
      )}
      {project.deadline && (
        <p className="text-xs text-gray-400 mt-1">Deadline: {project.deadline}</p>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onEdit)} className="space-y-3 mt-2">
            <Input placeholder="Title" {...register("title")} />
            <Textarea placeholder="Description" rows={2} {...register("description")} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={status} onValueChange={(v) => setValue("status", v as EditForm["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" {...register("deadline")} />
            </div>
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
              <Button type="button" variant="outline" onClick={() => { reset(); setEditOpen(false); }}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const COLUMNS: { key: "active" | "paused" | "done"; label: string; bg: string; border: string }[] = [
  { key: "active", label: "Active", bg: "bg-teal-50",  border: "border-teal-200" },
  { key: "paused", label: "Paused", bg: "bg-amber-50", border: "border-amber-200" },
  { key: "done",   label: "Done",   bg: "bg-gray-50",  border: "border-gray-200" },
];

export function ProjectKanban({ projects: initialProjects }: { projects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const draggingId = useRef<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const grouped: Record<string, Project[]> = { active: [], paused: [], done: [] };
  projects.forEach((p) => { (grouped[p.status] ??= []).push(p); });

  function handleDragStart(id: string) {
    draggingId.current = id;
  }

  function handleDragOver(e: React.DragEvent, colKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(colKey);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  async function handleDrop(e: React.DragEvent, newStatus: "active" | "paused" | "done") {
    e.preventDefault();
    setDragOverColumn(null);
    const id = draggingId.current;
    if (!id) return;
    draggingId.current = null;

    const project = projects.find((p) => p.id === id);
    if (!project || project.status === newStatus) return;

    // Optimistic update
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, status: newStatus } : p));

    await setProjectStatus(id, newStatus);
    toast.success(`Moved to ${newStatus}`);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map(({ key, label, bg, border }) => (
        <div
          key={key}
          onDragOver={(e) => handleDragOver(e, key)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, key)}
          className={`rounded-xl border p-3 transition-colors ${bg} ${border} ${
            dragOverColumn === key ? "ring-2 ring-[#0d9488] ring-offset-1" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
            <span className="text-xs text-gray-400 bg-white rounded-full px-2 py-0.5 border">
              {grouped[key]?.length ?? 0}
            </span>
          </div>
          <div className="space-y-2 min-h-[60px]">
            {(grouped[key] ?? []).map((p) => (
              <ProjectCard key={p.id} project={p} onDragStart={handleDragStart} />
            ))}
            {(grouped[key] ?? []).length === 0 && dragOverColumn !== key && (
              <p className="text-xs text-gray-400 text-center py-4">None</p>
            )}
            {dragOverColumn === key && (
              <div className="rounded-xl border-2 border-dashed border-[#0d9488] bg-teal-50/50 h-16 flex items-center justify-center">
                <p className="text-xs text-teal-500">Drop here</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
