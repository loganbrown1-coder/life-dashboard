"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteMeal, updateMeal } from "@/actions/food";
import { useForm, useFieldArray, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 as Trash } from "lucide-react";

const MEAL_TAGS = [
  { value: "high_protein",  label: "High Protein"  },
  { value: "post_workout",  label: "Post Workout"  },
  { value: "low_carb",      label: "Low Carb"      },
  { value: "weekend_treat", label: "Weekend Treat" },
  { value: "quick",         label: "Quick"         },
];

const schema = z.object({
  name:             z.string().min(1),
  description:      z.string().optional(),
  mealType:         z.enum(["breakfast","lunch","dinner","snack"]),
  tags:             z.array(z.string()).default([]),
  caloriesEstimate: z.string().optional(),
  proteinG:         z.string().optional(),
  carbsG:           z.string().optional(),
  fatG:             z.string().optional(),
  prepTimeMinutes:  z.string().optional(),
  recipeNotes:      z.string().optional(),
  ingredients: z.array(z.object({
    name:     z.string().min(1),
    quantity: z.string().optional(),
    unit:     z.enum(["g","ml","piece","cup","tbsp","tsp"]).optional(),
    aisle:    z.enum(["produce","protein","dairy","pantry","frozen","other"]).default("other"),
  })).default([]),
});

type FormValues = z.infer<typeof schema>;

export type MealProp = {
  id: string;
  name: string;
  description?: string | null;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  tags: string;
  caloriesEstimate?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  prepTimeMinutes?: number | null;
  recipeNotes?: string | null;
  ingredients: Array<{
    name: string;
    quantity?: number | null;
    unit?: string | null;
    aisle: string;
  }>;
};

export function MealActions({ meal }: { meal: MealProp }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const parsedTags = (() => { try { return JSON.parse(meal.tags); } catch { return []; } })();

  const { register, control, handleSubmit, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      name: meal.name,
      description: meal.description ?? "",
      mealType: meal.mealType,
      tags: parsedTags,
      caloriesEstimate: meal.caloriesEstimate?.toString() ?? "",
      proteinG: meal.proteinG?.toString() ?? "",
      carbsG: meal.carbsG?.toString() ?? "",
      fatG: meal.fatG?.toString() ?? "",
      prepTimeMinutes: meal.prepTimeMinutes?.toString() ?? "",
      recipeNotes: meal.recipeNotes ?? "",
      ingredients: meal.ingredients.map((i) => ({
        name: i.name,
        quantity: i.quantity?.toString() ?? "",
        unit: (i.unit as FormValues["ingredients"][0]["unit"]) ?? undefined,
        aisle: (i.aisle as FormValues["ingredients"][0]["aisle"]) ?? "other",
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "ingredients" });
  const selectedTags = watch("tags") ?? [];

  function toggleTag(tag: string) {
    const cur = selectedTags;
    setValue("tags", cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]);
  }

  async function onSubmit(values: FormValues) {
    try {
      await updateMeal(meal.id, {
        name: values.name,
        description: values.description,
        mealType: values.mealType,
        tags: values.tags,
        caloriesEstimate: values.caloriesEstimate ? Number(values.caloriesEstimate) : undefined,
        proteinG: values.proteinG ? Number(values.proteinG) : undefined,
        carbsG:   values.carbsG   ? Number(values.carbsG)   : undefined,
        fatG:     values.fatG     ? Number(values.fatG)     : undefined,
        prepTimeMinutes: values.prepTimeMinutes ? Number(values.prepTimeMinutes) : undefined,
        recipeNotes: values.recipeNotes,
        ingredients: values.ingredients.map((i) => ({
          name: i.name,
          quantity: i.quantity ? Number(i.quantity) : undefined,
          unit: i.unit,
          aisle: i.aisle,
        })),
      });
      toast.success("Meal updated");
      setEditOpen(false);
    } catch {
      toast.error("Failed to update");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${meal.name}"?`)) return;
    setDeleting(true);
    try {
      await deleteMeal(meal.id);
      toast.success("Meal deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex-shrink-0">
          <MoreHorizontal className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="w-3 h-3 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} disabled={deleting} className="text-red-600 focus:text-red-600">
            <Trash2 className="w-3 h-3 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Meal</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input {...register("name")} />
              </div>
              <div className="space-y-1">
                <Label>Meal type</Label>
                <Controller control={control} name="mealType" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["breakfast","lunch","dinner","snack"] as const).map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input {...register("description")} />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {MEAL_TAGS.map((tag) => (
                  <button key={tag.value} type="button" onClick={() => toggleTag(tag.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedTags.includes(tag.value)
                        ? "bg-[#0d9488] text-white border-[#0d9488]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-[#0d9488]"
                    }`}>
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1"><Label>Calories</Label><Input type="number" placeholder="kcal" {...register("caloriesEstimate")} /></div>
              <div className="space-y-1"><Label>Protein (g)</Label><Input type="number" {...register("proteinG")} /></div>
              <div className="space-y-1"><Label>Carbs (g)</Label><Input type="number" {...register("carbsG")} /></div>
              <div className="space-y-1"><Label>Fat (g)</Label><Input type="number" {...register("fatG")} /></div>
            </div>
            <div className="space-y-1">
              <Label>Prep time (min)</Label>
              <Input type="number" className="w-28" {...register("prepTimeMinutes")} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Ingredients</Label>
                <Button type="button" variant="ghost" size="sm"
                  onClick={() => append({ name: "", quantity: "", unit: undefined, aisle: "other" })}>
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
              {fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-12 gap-2 mb-2 bg-gray-50 rounded-lg p-2">
                  <div className="col-span-4"><Input placeholder="Name" {...register(`ingredients.${i}.name`)} /></div>
                  <div className="col-span-2"><Input type="number" placeholder="Qty" {...register(`ingredients.${i}.quantity`)} /></div>
                  <div className="col-span-2">
                    <Controller control={control} name={`ingredients.${i}.unit`} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Unit" /></SelectTrigger>
                        <SelectContent>{(["g","ml","piece","cup","tbsp","tsp"] as const).map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div className="col-span-3">
                    <Controller control={control} name={`ingredients.${i}.aisle`} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{(["produce","protein","dairy","pantry","frozen","other"] as const).map((a) => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
                      <Trash className="w-3 h-3 text-gray-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label>Recipe notes</Label>
              <Textarea rows={2} {...register("recipeNotes")} />
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#0d9488] hover:bg-[#0f766e] text-white">Save changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
