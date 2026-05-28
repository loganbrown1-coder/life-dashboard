import { FoodNav } from "@/components/food/food-nav";
import { MealPlanClient } from "@/components/food/meal-plan-client";
import { getAllMeals, getMealPlansWithMeals } from "@/db/queries/food";
import { getWorkoutsThisWeek } from "@/db/queries/workouts";
import { suggestMeals } from "@/lib/meal-suggestions";
import { startOfWeek, addDays, format } from "date-fns";

function getWeekStart(weekParam?: string): string {
  if (weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)) return weekParam;
  // Default: Monday of current week
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

export default async function MealPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const weekStart = getWeekStart(params.week);
  const weekStartDate = new Date(weekStart + "T00:00:00");
  const weekEnd = format(addDays(weekStartDate, 6), "yyyy-MM-dd");

  const [allMeals, plans, workoutsThisWeek] = await Promise.all([
    getAllMeals(),
    getMealPlansWithMeals(weekStart, weekEnd),
    getWorkoutsThisWeek(weekStart, weekEnd),
  ]);

  // Build a map of date → workout type
  const workoutsByDate: Record<string, string> = {};
  for (const w of workoutsThisWeek) {
    if (!workoutsByDate[w.date]) workoutsByDate[w.date] = w.type;
  }

  // Pre-compute suggestions for each day (look up full meal rows after getting IDs)
  const suggestedByDate: Record<string, typeof allMeals> = {};
  for (let i = 0; i < 7; i++) {
    const d = format(addDays(weekStartDate, i), "yyyy-MM-dd");
    const dow = addDays(weekStartDate, i).getDay();
    const wType = (workoutsByDate[d] ?? null) as Parameters<typeof suggestMeals>[1];
    const ids = new Set(suggestMeals(allMeals, wType, dow).map((m) => m.id));
    suggestedByDate[d] = allMeals.filter((m) => ids.has(m.id));
  }

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Food</h1>
        <p className="text-gray-500 mt-1">Plan your week</p>
      </div>

      <FoodNav />

      <MealPlanClient
        weekStart={weekStart}
        plans={plans as Parameters<typeof MealPlanClient>[0]["plans"]}
        allMeals={allMeals}
        workoutsByDate={workoutsByDate}
        suggestedByDate={suggestedByDate as Parameters<typeof MealPlanClient>[0]["suggestedByDate"]}
      />
    </div>
  );
}
