import { CalendarClient } from "@/components/calendar/calendar-client";
import { getWorkoutsThisWeek, getWorkoutsForMonth } from "@/db/queries/workouts";
import { getMealPlansWithMeals } from "@/db/queries/food";
import { getTasksDueInRange } from "@/db/queries/tasks";
import { getUserOptions } from "@/db/queries/user-options";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from "date-fns";

function getAnchor(anchorParam?: string): string {
  if (anchorParam && /^\d{4}-\d{2}-\d{2}$/.test(anchorParam)) return anchorParam;
  return format(new Date(), "yyyy-MM-dd");
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; anchor?: string }>;
}) {
  const params = await searchParams;
  const view   = params.view === "month" ? "month" : "week";
  const anchor = getAnchor(params.anchor);
  const anchorDate = new Date(anchor + "T00:00:00");

  let rangeStart: string;
  let rangeEnd: string;

  if (view === "week") {
    const ws = startOfWeek(anchorDate, { weekStartsOn: 1 });
    const we = endOfWeek(anchorDate,   { weekStartsOn: 1 });
    rangeStart = format(ws, "yyyy-MM-dd");
    rangeEnd   = format(we, "yyyy-MM-dd");
  } else {
    const ms = startOfMonth(anchorDate);
    const me = endOfMonth(anchorDate);
    const gridStart = startOfWeek(ms, { weekStartsOn: 1 });
    const gridEnd   = endOfWeek(me,   { weekStartsOn: 1 });
    rangeStart = format(gridStart, "yyyy-MM-dd");
    rangeEnd   = format(gridEnd,   "yyyy-MM-dd");
  }

  const [workouts, plans, taskRows, workoutTypeOptions] = await Promise.all([
    getWorkoutsThisWeek(rangeStart, rangeEnd),
    getMealPlansWithMeals(rangeStart, rangeEnd),
    getTasksDueInRange(rangeStart, rangeEnd),
    getUserOptions("workout_type"),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
        <p className="text-gray-500 mt-1">Your workouts, meals, and tasks at a glance</p>
      </div>

      <CalendarClient
        anchor={anchor}
        view={view}
        workouts={workouts}
        plans={plans as Parameters<typeof CalendarClient>[0]["plans"]}
        tasks={taskRows}
        showWorkouts={true}
        showMeals={true}
        showTasks={true}
        workoutTypes={workoutTypeOptions}
      />
    </div>
  );
}
