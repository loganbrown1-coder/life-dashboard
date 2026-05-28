"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { meals, mealIngredients, mealPlans, groceryLists } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { getMealPlansForWeek, getMealWithIngredients } from "@/db/queries/food";

function uuid()  { return crypto.randomUUID(); }
function now()   { return new Date(); }

// ---------------------------------------------------------------------------
// Meals library
// ---------------------------------------------------------------------------

const IngredientSchema = z.object({
  name:     z.string().min(1),
  quantity: z.coerce.number().positive().optional(),
  unit:     z.enum(["g","ml","piece","cup","tbsp","tsp"]).optional(),
  aisle:    z.enum(["produce","protein","dairy","pantry","frozen","other"]).default("other"),
});

const MealSchema = z.object({
  name:             z.string().min(1),
  description:      z.string().optional(),
  mealType:         z.enum(["breakfast","lunch","dinner","snack"]),
  tags:             z.array(z.string()).default([]),
  caloriesEstimate: z.coerce.number().int().positive().optional(),
  proteinG:         z.coerce.number().positive().optional(),
  carbsG:           z.coerce.number().positive().optional(),
  fatG:             z.coerce.number().positive().optional(),
  prepTimeMinutes:  z.coerce.number().int().positive().optional(),
  recipeNotes:      z.string().optional(),
  ingredients:      z.array(IngredientSchema).default([]),
});

export async function addMeal(data: z.infer<typeof MealSchema>) {
  const parsed = MealSchema.parse(data);
  const mealId = uuid();

  await db.insert(meals).values({
    id: mealId, createdAt: now(), updatedAt: now(),
    name:             parsed.name,
    description:      parsed.description,
    mealType:         parsed.mealType,
    tags:             JSON.stringify(parsed.tags),
    caloriesEstimate: parsed.caloriesEstimate,
    proteinG:         parsed.proteinG,
    carbsG:           parsed.carbsG,
    fatG:             parsed.fatG,
    prepTimeMinutes:  parsed.prepTimeMinutes,
    recipeNotes:      parsed.recipeNotes,
  });

  for (const ing of parsed.ingredients) {
    await db.insert(mealIngredients).values({
      id: uuid(), createdAt: now(), updatedAt: now(),
      mealId, name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      aisle: ing.aisle,
    });
  }

  revalidatePath("/food/meals");
  revalidatePath("/food");
}

export async function updateMeal(id: string, data: z.infer<typeof MealSchema>) {
  const parsed = MealSchema.parse(data);

  await db.update(meals).set({
    updatedAt: now(),
    name:             parsed.name,
    description:      parsed.description,
    mealType:         parsed.mealType,
    tags:             JSON.stringify(parsed.tags),
    caloriesEstimate: parsed.caloriesEstimate,
    proteinG:         parsed.proteinG,
    carbsG:           parsed.carbsG,
    fatG:             parsed.fatG,
    prepTimeMinutes:  parsed.prepTimeMinutes,
    recipeNotes:      parsed.recipeNotes,
  }).where(eq(meals.id, id));

  // Replace ingredients
  await db.delete(mealIngredients).where(eq(mealIngredients.mealId, id));
  for (const ing of parsed.ingredients) {
    await db.insert(mealIngredients).values({
      id: uuid(), createdAt: now(), updatedAt: now(),
      mealId: id, name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      aisle: ing.aisle,
    });
  }

  revalidatePath("/food/meals");
  revalidatePath("/food/plan");
}

export async function deleteMeal(id: string) {
  await db.delete(meals).where(eq(meals.id, id));
  revalidatePath("/food/meals");
  revalidatePath("/food/plan");
}

// ---------------------------------------------------------------------------
// Meal plans
// ---------------------------------------------------------------------------

export async function planMeal(
  date: string,
  mealId: string,
  slot: "breakfast" | "lunch" | "dinner" | "snack"
) {
  // Remove existing plan for this date+slot, then insert
  const existing = await db
    .select()
    .from(mealPlans)
    .where(and(eq(mealPlans.date, date), eq(mealPlans.mealSlot, slot)))
    .limit(1)
    .get();
  if (existing) await db.delete(mealPlans).where(eq(mealPlans.id, existing.id));

  await db.insert(mealPlans).values({
    id: uuid(), createdAt: now(), updatedAt: now(),
    date, mealId, mealSlot: slot, eaten: false,
  });

  revalidatePath("/food/plan");
  revalidatePath("/food");
}

export async function removeMealPlan(planId: string) {
  await db.delete(mealPlans).where(eq(mealPlans.id, planId));
  revalidatePath("/food/plan");
  revalidatePath("/food");
}

export async function markMealEaten(planId: string, eaten: boolean) {
  await db.update(mealPlans).set({ eaten, updatedAt: now() }).where(eq(mealPlans.id, planId));
  revalidatePath("/food/plan");
  revalidatePath("/food");
}

// Copy this week's plan to next week (skip slots already planned next week)
export async function copyWeekPlan(thisWeekStart: string, nextWeekStart: string) {
  const thisStart = new Date(thisWeekStart);
  const nextStart = new Date(nextWeekStart);

  const thisEnd = new Date(thisStart); thisEnd.setDate(thisStart.getDate() + 6);
  const nextEnd = new Date(nextStart); nextEnd.setDate(nextStart.getDate() + 6);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const [thisWeek, nextWeek] = await Promise.all([
    getMealPlansForWeek(fmt(thisStart), fmt(thisEnd)),
    getMealPlansForWeek(fmt(nextStart), fmt(nextEnd)),
  ]);

  const existingSlots = new Set(nextWeek.map((p) => `${p.date}|${p.mealSlot}`));

  for (const plan of thisWeek) {
    const dayOffset = Math.round(
      (new Date(plan.date).getTime() - thisStart.getTime()) / 86400000
    );
    const newDate = new Date(nextStart);
    newDate.setDate(nextStart.getDate() + dayOffset);
    const slot = `${fmt(newDate)}|${plan.mealSlot}`;
    if (!existingSlots.has(slot)) {
      await db.insert(mealPlans).values({
        id: uuid(), createdAt: now(), updatedAt: now(),
        date: fmt(newDate), mealId: plan.mealId,
        mealSlot: plan.mealSlot, eaten: false,
      });
    }
  }

  revalidatePath("/food/plan");
}

// ---------------------------------------------------------------------------
// Grocery list generation
// ---------------------------------------------------------------------------

type GroceryItem = {
  name: string;
  totalQuantity: number | null;
  unit: string | null;
  aisle: string;
  checked: boolean;
};

export async function generateGroceryList(weekStart: string) {
  const start = new Date(weekStart);
  const end   = new Date(weekStart);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const plans = await getMealPlansForWeek(fmt(start), fmt(end));
  const mealIds = [...new Set(plans.map((p) => p.mealId))];

  // Gather all ingredients across all planned meals
  const allIngredients: GroceryItem[] = [];

  for (const mealId of mealIds) {
    const mealData = await getMealWithIngredients(mealId);
    if (!mealData) continue;
    for (const ing of mealData.ingredients) {
      allIngredients.push({
        name: ing.name,
        totalQuantity: ing.quantity ?? null,
        unit: ing.unit ?? null,
        aisle: ing.aisle,
        checked: false,
      });
    }
  }

  // Merge duplicate ingredient names
  const merged: Record<string, GroceryItem> = {};
  for (const ing of allIngredients) {
    const key = ing.name.toLowerCase();
    if (!merged[key]) {
      merged[key] = { ...ing };
    } else {
      // Add quantities if same unit, else keep first
      if (merged[key].unit === ing.unit && merged[key].totalQuantity !== null && ing.totalQuantity !== null) {
        merged[key].totalQuantity! += ing.totalQuantity;
      }
    }
  }

  const items = Object.values(merged);

  // Upsert grocery list for the week
  const existing = await db
    .select()
    .from(groceryLists)
    .where(eq(groceryLists.weekStartDate, weekStart))
    .limit(1)
    .get();

  if (existing) {
    await db.update(groceryLists).set({
      items: JSON.stringify(items),
      generatedAt: now(),
      updatedAt: now(),
    }).where(eq(groceryLists.id, existing.id));
  } else {
    await db.insert(groceryLists).values({
      id: uuid(), createdAt: now(), updatedAt: now(),
      weekStartDate: weekStart,
      items: JSON.stringify(items),
      generatedAt: now(),
    });
  }

  revalidatePath("/food/groceries");
}

export async function toggleGroceryItem(weekStart: string, itemName: string, checked: boolean) {
  const row = await db
    .select()
    .from(groceryLists)
    .where(eq(groceryLists.weekStartDate, weekStart))
    .limit(1)
    .get();
  if (!row) return;

  const items: GroceryItem[] = JSON.parse(row.items);
  const updated = items.map((i) =>
    i.name.toLowerCase() === itemName.toLowerCase() ? { ...i, checked } : i
  );

  await db.update(groceryLists).set({
    items: JSON.stringify(updated),
    updatedAt: now(),
  }).where(eq(groceryLists.id, row.id));

  revalidatePath("/food/groceries");
}

export async function addManualGroceryItem(weekStart: string, name: string) {
  const row = await db
    .select()
    .from(groceryLists)
    .where(eq(groceryLists.weekStartDate, weekStart))
    .limit(1)
    .get();

  const newItem: GroceryItem = { name, totalQuantity: null, unit: null, aisle: "other", checked: false };

  if (row) {
    const items: GroceryItem[] = JSON.parse(row.items);
    items.push(newItem);
    await db.update(groceryLists).set({ items: JSON.stringify(items), updatedAt: now() })
      .where(eq(groceryLists.id, row.id));
  } else {
    await db.insert(groceryLists).values({
      id: uuid(), createdAt: now(), updatedAt: now(),
      weekStartDate: weekStart,
      items: JSON.stringify([newItem]),
      generatedAt: now(),
    });
  }

  revalidatePath("/food/groceries");
}
