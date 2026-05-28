"use client";

import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { logWorkout } from "@/actions/health";

export type WorkoutTypeOption = { value: string; label: string };

const schema = z.object({
  date: z.string(),
  type: z.string().min(1, "Select a type"),
  durationMinutes: z.string().optional(),
  distanceKm: z.string().optional(),
  notes: z.string().optional(),
  exercises: z.array(z.object({
    name: z.string().min(1, "Name required"),
    sets: z.string().optional(),
    reps: z.string().optional(),
    weightKg: z.string().optional(),
    notes: z.string().optional(),
  })),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  defaultDate?: string;
  workoutTypes: WorkoutTypeOption[];
}

export function LogWorkoutDialog({ defaultDate, workoutTypes }: Props) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const firstType = workoutTypes[0]?.value ?? "other";

  const { register, control, handleSubmit, watch, reset, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        date: defaultDate ?? today,
        type: firstType,
        durationMinutes: "",
        distanceKm: "",
        notes: "",
        exercises: [],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "exercises" });
  const workoutType = watch("type");
  const showDistance = workoutType === "run" || workoutType === "swim";

  async function onSubmit(values: FormValues) {
    try {
      await logWorkout({
        date: values.date,
        type: values.type,
        durationMinutes: values.durationMinutes ? Number(values.durationMinutes) : undefined,
        distanceKm: values.distanceKm ? Number(values.distanceKm) : undefined,
        notes: values.notes,
        completed: true,
        exercises: values.exercises.map((ex) => ({
          name: ex.name,
          sets: ex.sets ? Number(ex.sets) : undefined,
          reps: ex.reps ? Number(ex.reps) : undefined,
          weightKg: ex.weightKg ? Number(ex.weightKg) : undefined,
          notes: ex.notes,
        })),
      });
      toast.success("Workout logged!");
      setOpen(false);
      reset();
    } catch {
      toast.error("Failed to save workout");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-medium transition-colors">
        <Dumbbell className="w-4 h-4" /> Log workout
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Workout</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" {...register("date")} />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {workoutTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Duration (min)</Label>
              <Input type="number" placeholder="60" {...register("durationMinutes")} />
            </div>
            {showDistance && (
              <div className="space-y-1">
                <Label>Distance (km)</Label>
                <Input type="number" step="0.01" placeholder="5.0" {...register("distanceKm")} />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea placeholder="How did it feel?" rows={2} {...register("notes")} />
          </div>

          {/* Exercises */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Exercises (optional)</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => append({ name: "", sets: "", reps: "", weightKg: "", notes: "" })}
              >
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>

            {fields.length > 0 && (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <Input placeholder="Exercise name" className="flex-1" {...register(`exercises.${index}.name`)} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="w-3 h-3 text-gray-400" />
                      </Button>
                    </div>
                    {errors.exercises?.[index]?.name && (
                      <p className="text-xs text-red-500">{errors.exercises[index]?.name?.message}</p>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" placeholder="Sets" {...register(`exercises.${index}.sets`)} />
                      <Input type="number" placeholder="Reps" {...register(`exercises.${index}.reps`)} />
                      <Input type="number" placeholder="kg" {...register(`exercises.${index}.weightKg`)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#0d9488] hover:bg-[#0f766e] text-white">
              Save workout
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
