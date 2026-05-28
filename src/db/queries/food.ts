import { db } from "@/db";
import { meals, mealIngredients, mealPlans, groceryLists } from "@/db/schema";
import { eq, desc, gte, lte, and, inArray } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Meals library
// ---------------------------------------------------------------------------

export async function getAllMeals() {
  return db.select().from(meals).orderBy(meals.name);
}

export async function getMealById(id: string) {
  return db.select().from(meals).where(eq(meals.id, id)).get();
}

export async function getMealWithIngredients(id: string) {
  const meal = await getMealById(id);
  if (!meal) return null;
  const ingredients = await db
    .select()
    .from(mealIngredients)
    .where(eq(mealIngredients.mealId, id));
  return { ...meal, ingredients };
}

export async function getIngredientsForMeal(mealId: string) {
  return db
    .select()
    .from(mealIngredients)
    .where(eq(mealIngredients.mealId, mealId));
}

// ---------------------------------------------------------------------------
// Meal plans
// ---------------------------------------------------------------------------

export async function getMealPlansForWeek(weekStart: string, weekEnd: string) {
  return db
    .select()
    .from(mealPlans)
    .where(and(gte(mealPlans.date, weekStart), lte(mealPlans.date, weekEnd)))
    .orderBy(mealPlans.date);
}

export async function getMealPlansForDate(date: string) {
  return db.select().from(mealPlans).where(eq(mealPlans.date, date));
}

export async function getMealPlanForDateAndSlot(
  date: string,
  slot: "breakfast" | "lunch" | "dinner" | "snack"
) {
  return db
    .select()
    .from(mealPlans)
    .where(and(eq(mealPlans.date, date), eq(mealPlans.mealSlot, slot)))
    .limit(1)
    .get();
}

// Get all meal plans for a range with their meal details joined
export async function getMealPlansWithMeals(weekStart: string, weekEnd: string) {
  const plans = await getMealPlansForWeek(weekStart, weekEnd);
  const mealIds = [...new Set(plans.map((p) => p.mealId))];
  if (mealIds.length === 0) return [];

  const mealRows = await db
    .select()
    .from(meals)
    .where(inArray(meals.id, mealIds));
  const mealMap = Object.fromEntries(mealRows.map((m) => [m.id, m]));

  return plans.map((p) => ({ ...p, meal: mealMap[p.mealId] ?? null }));
}

// ---------------------------------------------------------------------------
// Grocery lists
// ---------------------------------------------------------------------------

export async function getGroceryListForWeek(weekStart: string) {
  return db
    .select()
    .from(groceryLists)
    .where(eq(groceryLists.weekStartDate, weekStart))
    .orderBy(desc(groceryLists.generatedAt))
    .limit(1)
    .get();
}
