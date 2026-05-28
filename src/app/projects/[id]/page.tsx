import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getProjectWithTasks } from "@/db/queries/projects";
import { AddTaskDialog } from "@/components/projects/add-task-dialog";
import { TaskList } from "@/components/projects/task-list";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectWithTasks(id);
  if (!project) notFound();

  const total = project.tasks.length;
  const done  = project.tasks.filter((t) => t.status === "done").length;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/projects" className="text-gray-400 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: project.colour }}
          />
          {project.title}
        </h1>
      </div>

      {project.description && (
        <p className="text-gray-500">{project.description}</p>
      )}

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="capitalize">{project.status}</span>
        {project.deadline && <span>Deadline: {project.deadline}</span>}
        {total > 0 && (
          <span>{done}/{total} tasks done</span>
        )}
      </div>

      {total > 0 && (
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-teal-500 transition-all"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <AddTaskDialog projectId={project.id} />
      </div>

      <TaskList tasks={project.tasks} />
    </main>
  );
}
