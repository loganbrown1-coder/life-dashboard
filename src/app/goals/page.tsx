import { getGoals, getActiveHabits, getHabitLogsForRange } from "@/db/queries/goals";
import { getAllTasksWithGoalId } from "@/db/queries/tasks";
import { getEventCountByGoal } from "@/db/queries/calendar-events";
import { getStepCountsByGoal } from "@/db/queries/goal-steps";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { format, subDays } from "date-fns";
import { AddGoalDialog } from "@/components/goals/add-goal-dialog";
import { GoalCard } from "@/components/goals/goal-card";
import { HabitTracker } from "@/components/goals/habit-tracker";

export default async function GoalsPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const ninetyDaysAgo = format(subDays(new Date(), 89), "yyyy-MM-dd");

  const [allGoals, habits, logs, allTasks, actionCounts] = await Promise.all([
    getGoals(),
    getActiveHabits(),
    getHabitLogsForRange(ninetyDaysAgo, today),
    getAllTasksWithGoalId(),
    getEventCountByGoal(),
  ]);

  const goalIds = allGoals.map((g) => g.id);
  const stepCounts = await getStepCountsByGoal(goalIds);

  const savingsIds = allGoals
    .map((g) => g.linkedSavingsGoalId)
    .filter((id): id is string => !!id);

  const savingsMap = new Map<string, { id: string; name: string; currentAmountGbp: number; targetAmountGbp: number }>();
  if (savingsIds.length > 0) {
    const rows = await db.select().from(savingsGoals).where(inArray(savingsGoals.id, savingsIds));
    rows.forEach((r) => savingsMap.set(r.id, r));
  }

  const active    = allGoals.filter((g) => g.status === "active");
  const paused    = allGoals.filter((g) => g.status === "paused");
  const done      = allGoals.filter((g) => g.status === "done");
  const abandoned = allGoals.filter((g) => g.status === "abandoned");

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Goals</h1>
        <AddGoalDialog />
      </div>

      {allGoals.length === 0 && (
        <p className="text-gray-400 text-center py-12">No goals yet — add your first one above.</p>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Active</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                savings={goal.linkedSavingsGoalId ? savingsMap.get(goal.linkedSavingsGoalId) : undefined}
                tasks={allTasks.filter((t) => t.goalId === goal.id)}
                actionCount={actionCounts[goal.id] ?? 0}
                stepCount={stepCounts[goal.id]}
              />
            ))}
          </div>
        </section>
      )}

      {paused.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-gray-500">Paused</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
            {paused.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                savings={goal.linkedSavingsGoalId ? savingsMap.get(goal.linkedSavingsGoalId) : undefined}
                tasks={allTasks.filter((t) => t.goalId === goal.id)}
                actionCount={actionCounts[goal.id] ?? 0}
                stepCount={stepCounts[goal.id]}
              />
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-gray-400">Completed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
            {done.map((goal) => (
              <GoalCard key={goal.id} goal={goal} tasks={allTasks.filter((t) => t.goalId === goal.id)} actionCount={actionCounts[goal.id] ?? 0} stepCount={stepCounts[goal.id]} />
            ))}
          </div>
        </section>
      )}

      {abandoned.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-gray-300">Abandoned</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-40">
            {abandoned.map((goal) => (
              <GoalCard key={goal.id} goal={goal} tasks={allTasks.filter((t) => t.goalId === goal.id)} actionCount={actionCounts[goal.id] ?? 0} stepCount={stepCounts[goal.id]} />
            ))}
          </div>
        </section>
      )}

      <section>
        <HabitTracker habits={habits} logs={logs} />
      </section>
    </main>
  );
}
