"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteWorkout } from "@/actions/health";

export function WorkoutDeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("Delete this workout?")) return;
    startTransition(async () => {
      try {
        await deleteWorkout(id);
        toast.success("Workout deleted");
        router.refresh();
      } catch {
        toast.error("Failed to delete workout");
      }
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
      title="Delete workout"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
