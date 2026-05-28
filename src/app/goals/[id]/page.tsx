import Link from "next/link";
import { notFound } from "next/navigation";
import { format, subDays } from "date-fns";
import { ArrowLeft, Calendar } from "lucide-react";
import { getGoalWithSavings, getGoalSteps } from "@/db/queries/goal-steps";
import { getAllTasksWithGoalId } from "@/db/queries/tasks";
import { getCalendarEventsForRange } from "@/db/queries/calendar-events";
import { GoalStepsList } from "@/components/goals/goal-steps-list";
import { GoalDetailHeader } from "@/components/goals/goal-detail-header";

const CATEGORY_COLOURS: Record<string, string> = {
  life: "bg-teal-100 text-teal-800",
  career: "bg-blue-100 text-blue-800",
  relationships: "bg-pink-100 text-pink-800",
  travel: "bg-amber-100 text-amber-800",
  learning: "bg-purple-100 text-purple-800",
  other: "bg-gray-100 text-gray-800",
};

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const data = await getGoalWithSavings(id);
  if (!data) notFound();
  const { goal, savings } = data;

  const [steps, allTasks, linkedEvents] = await Promise.all([
    getGoalSteps(id),
    getAllTasksWithGoalId(),
    getCalendarEventsForRange("2000-01-01", "2099-12-31"),
  ]);

  const tasks = allTasks.filter((t) => t.goalId === id);
  const events = linkedEvents.filter((e) => (e as { goalId?: string | null }).goalId === id);

  const catClass = CATEGORY_COLOURS[goal.category] ?? CATEGORY_COLOURS.other;
  const doneSteps = steps.filter((s) => s.done).length;
  const stepProgress = steps.length > 0 ? Math.round((doneSteps / steps.length) * 100) : null;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Back */}
      <Link href="/goals" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        All goals
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium mb-2 ${catClass}`}>
              {goal.category}
            </span>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{goal.title}</h1>
            {goal.description && (
              <p className="text-gray-500 mt-1.5 text-sm">{goal.description}</p>
            )}
          </div>
          <GoalDetailHeader goal={goal} />
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Overall progress</span>
            <span className="font-medium text-gray-700">{goal.progressPct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${goal.progressPct}%` }} />
          </div>
        </div>

        {/* Step progress */}
        {steps.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium text-gray-800">{doneSteps}/{steps.length}</span>
            <span>steps completed</span>
            {stepProgress !== null && (
              <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                stepProgress === 100 ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-600"
              }`}>
                {stepProgress}%
              </span>
            )}
          </div>
        )}

        {/* Savings */}
        {savings && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <div className="flex justify-between mb-1.5 text-gray-600">
              <span className="font-medium">{savings.name}</span>
              <span>£{savings.currentAmountGbp.toFixed(0)} / £{savings.targetAmountGbp.toFixed(0)}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.min(100, (savings.currentAmountGbp / savings.targetAmountGbp) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="flex gap-4 text-xs text-gray-400 pt-1 border-t">
          {goal.targetDate && <span>Target: {goal.targetDate}</span>}
          <span className="capitalize">{goal.status}</span>
        </div>
      </div>

      {/* Steps */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Steps</h2>
        <GoalStepsList goalId={id} steps={steps} />
      </section>

      {/* Linked tasks */}
      {tasks.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3 text-gray-700">Linked Tasks</h2>
          <div className="bg-white rounded-xl border shadow-sm divide-y">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  t.priority === "high" ? "bg-red-400" : t.priority === "med" ? "bg-amber-400" : "bg-gray-300"
                }`} />
                <span className={`text-sm flex-1 ${t.status === "done" ? "line-through text-gray-300" : "text-gray-700"}`}>
                  {t.title}
                </span>
                {t.dueDate && <span className="text-xs text-gray-400">{t.dueDate}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Linked calendar events */}
      {events.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3 text-gray-700">Calendar Actions</h2>
          <div className="bg-white rounded-xl border shadow-sm divide-y">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{e.title}</p>
                  {e.notes && <p className="text-xs text-gray-400 truncate">{e.notes}</p>}
                </div>
                <span className="text-xs text-gray-400 shrink-0">{e.date}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
