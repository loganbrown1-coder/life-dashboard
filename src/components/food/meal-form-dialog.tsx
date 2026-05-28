"use client";

import { useState } from "react";
import { useForm, useFieldArray, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { addMeal } from "@/actions/food";

const MEAL_TAGS = [
  { value: "high_protein",  label: "High Protein"  },
  { value: "post_workout",  label: "Post Workout"  },
  { value: "low_carb",      label: "Low Carb"      },
  { value: "weekend_treat", label: "Weekend Treat" },
  { value: "quick",         label: "Quick"         },
];

const schema = z.object({
  name:             z.string().min(1, "Name is required"),
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
    name:     z.string().min(1, "Required"),
    quantity: z.string().optional(),
    unit:     z.enum(["g","ml","piece","cup","tbsp","tsp"]).optional(),
    aisle:    z.enum(["produce","protein","dairy","pantry","frozen","other"]).default("other"),
  })).default([]),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  name: "", description: "", mealType: "dinner", tags: [],
  caloriesEstimate: "", proteinG: "", carbsG: "", fatG: "",
  prepTimeMinutes: "", recipeNotes: "", ingredients: [],
};

export function MealFormDialog() {
  const [open, setOpen] = useState(false);

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(schema) as unknown as Resolver<FormValues>, defaultValues: DEFAULTS });

  const { fields, append, remove } = useFieldArray({ control, name: "ingredients" });
  const selectedTags = watch("tags") ?? [];

  function toggleTag(tag: string) {
    setValue("tags", selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag]);
  }

  async function onSubmit(values: FormValues) {
    try {
      await addMeal({
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
      toast.success("Meal added!");
      setOpen(false);
      reset(DEFAULTS);
    } catch {
      toast.error("Failed to save meal");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-medium transition-colors">
        <UtensilsCrossed className="w-4 h-4" /> Add meal
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Meal</DialogTitle></DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input placeholder="e.g. Chicken & rice" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
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
            <Input placeholder="Short description" {...register("description")} />
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
                  }`}>{tag.label}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1"><Label>Calories</Label><Input type="number" placeholder="kcal" {...register("caloriesEstimate")} /></div>
            <div className="space-y-1"><Label>Protein (g)</Label><Input type="number" {...register("proteinG")} /></div>
            <div className="space-y-1"><Label>Carbs (g)</Label><Input type="number" {...register("carbsG")} /></div>
            <div className="space-y-1"><Label>Fat (g)</Label><Input type="number" {...register("fatG")} /></div>
          </div>

          <div className="space-y-1">
            <Label>Prep time (min)</Label>
            <Input type="number" placeholder="e.g. 20" className="w-32" {...register("prepTimeMinutes")} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Ingredients</Label>
              <Button type="button" variant="ghost" size="sm"
                onClick={() => append({ name: "", quantity: "", unit: undefined, aisle: "other" })}>
                <Plus className="w-3 h-3 mr-1" /> Add ingredient
              </Button>
            </div>
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 mb-2 bg-gray-50 rounded-lg p-2">
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
                    <Trash2 className="w-3 h-3 text-gray-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label>Recipe notes</Label>
            <Textarea placeholder="Method, tips, links..." rows={3} {...register("recipeNotes")} />
          </div>

          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#0d9488] hover:bg-[#0f766e] text-white">Add meal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
