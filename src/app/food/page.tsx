import { FoodNav } from "@/components/food/food-nav";
import { getAllMeals, getMealPlansWithMeals, getGroceryListForWeek } from "@/db/queries/food";
import { getWorkoutsThisWeek } from "@/db/queries/workouts";
import { suggestMeals } from "@/lib/meal-suggestions";
import { startOfWeek, format, addDays } from "date-fns";
import { Flame, Dumbbell, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

const SLOT_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch:     "Lunch",
  dinner:    "Dinner",
  snack:     "Snack",
};

const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;

function parseTags(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

export default async function FoodOverviewPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(addDays(new Date(weekStart + "T00:00:00"), 6), "yyyy-MM-dd");

  const [allMeals, plansThisWeek, workoutsThisWeek, groceryList] = await Promise.all([
    getAllMeals(),
    getMealPlansWithMeals(weekStart, weekEnd),
    getWorkoutsThisWeek(weekStart, weekEnd),
    getGroceryListForWeek(weekStart),
  ]);

  // Today's plans
  const todayPlans = plansThisWeek.filter((p) => p.date === today);
  const planMap = Object.fromEntries(todayPlans.map((p) => [p.mealSlot, p]));

  // Macro totals for today (eaten meals only)
  const eatenPlans = todayPlans.filter((p) => p.eaten && p.meal);
  const totalCals = eatenPlans.reduce((s, p) => s + (p.meal?.caloriesEstimate ?? 0), 0);
  const totalProtein = eatenPlans.reduce((s, p) => s + (p.meal?.proteinG ?? 0), 0);

  // Today's workout type for suggestions
  const todayWorkout = workoutsThisWeek.find((w) => w.date === today);
  const wType = (todayWorkout?.type ?? null) as Parameters<typeof suggestMeals>[1];
  const dow = new Date().getDay();
  const suggestedIds = new Set(suggestMeals(allMeals, wType, dow).map((m) => m.id));
  const suggestions = allMeals.filter((m) => suggestedIds.has(m.id));

  // Grocery list stats
  type GroceryItem = { checked: boolean };
  const groceryItems: GroceryItem[] = groceryList
    ? (() => { try { return JSON.parse(groceryList.items); } catch { return []; } })()
    : [];
  const uncheckedCount = groceryItems.filter((i) => !i.checked).length;

  // Week plan completion
  const weekPlansCount = plansThisWeek.length;
  const weekEatenCount = plansThisWeek.filter((p) => p.eaten).length;

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Food</h1>
        <p className="text-gray-500 mt-1">Today's meals and weekly overview</p>
      </div>

      <FoodNav />

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-gray-500">Cals today</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalCals || "—"}</p>
            {totalCals > 0 && <p className="text-xs text-gray-400">kcal eaten</p>}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">Protein today</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalProtein ? `${totalProtein}g` : "—"}</p>
            {totalProtein > 0 && <p className="text-xs text-gray-400">from eaten meals</p>}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <UtensilsCrossed className="w-4 h-4 text-[#0d9488]" />
              <span className="text-xs text-gray-500">Week plan</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{weekPlansCount}</p>
            <p className="text-xs text-gray-400">{weekEatenCount} eaten</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-500">Grocery list</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{uncheckedCount || "—"}</p>
            {uncheckedCount > 0 && (
              <Link href="/food/groceries" className="text-xs text-[#0d9488] hover:underline">
                {uncheckedCount} to get
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's meal slots */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Today</h2>
            <Link href={`/food/plan?week=${weekStart}`} className="text-xs text-[#0d9488] hover:underline">
              Edit plan →
            </Link>
          </div>
          <div className="space-y-2">
            {SLOTS.map((slot) => {
              const plan = planMap[slot];
              return (
                <div key={slot} className="flex items-center gap-3 p-3 rounded-xl border bg-white">
                  <div className="w-20 flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {SLOT_LABELS[slot]}
                    </p>
                  </div>
                  {plan ? (
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${plan.eaten ? "line-through text-gray-400" : "text-gray-800"}`}>
                        {plan.meal?.name ?? "Unknown"}
                      </p>
                      {plan.meal?.caloriesEstimate && (
                        <p className="text-xs text-gray-400">{plan.meal.caloriesEstimate} kcal</p>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={`/food/plan?week=${weekStart}`}
                      className="text-sm text-gray-400 hover:text-[#0d9488] transition-colors"
                    >
                      Not planned
                    </Link>
                  )}
                  {plan?.eaten && (
                    <span className="flex-shrink-0 text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
                      Eaten
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Suggestions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Suggested for today
              {todayWorkout && (
                <span className="ml-2 text-xs font-normal text-orange-600 bg-orange-50 rounded-full px-2 py-0.5 capitalize">
                  {todayWorkout.type} day
                </span>
              )}
            </h2>
          </div>

          {allMeals.length === 0 ? (
            <div className="rounded-xl border bg-white p-6 text-center">
              <p className="text-sm text-gray-400 mb-2">No meals in your library yet</p>
              <Link href="/food/meals" className="text-sm text-[#0d9488] hover:underline">
                Add your first meal →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map((meal) => {
                const tags = parseTags(meal.tags);
                return (
                  <div key={meal.id} className="p-3 rounded-xl border bg-white">
                    <p className="text-sm font-medium text-gray-800">{meal.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {meal.caloriesEstimate && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {meal.caloriesEstimate} kcal
                        </span>
                      )}
                      {tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                          {tag.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
