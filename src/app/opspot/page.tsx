import { db } from "@/db";
import { workTodos, workHabits, workHabitLogs, workFocus } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { OpSpotDashboard } from "@/components/opspot/opspot-dashboard";
import { WorkTools } from "@/components/opspot/work-tools";
import { format } from "date-fns";

export default async function OpSpotPage() {
  const today = format(new Date(), "yyyy-MM-dd");

  const [todos, habits, habitLogs, focusRow] = await Promise.all([
    db.select().from(workTodos).orderBy(desc(workTodos.createdAt)).all(),
    db.select().from(workHabits).where(eq(workHabits.active, true)).orderBy(workHabits.sortOrder).all(),
    db.select().from(workHabitLogs).where(eq(workHabitLogs.date, today)).all(),
    db.select().from(workFocus).where(eq(workFocus.date, today)).limit(1).get(),
  ]);

  const habitsDoneToday = habitLogs.filter((l) => l.done).map((l) => l.habitId);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">OpSpot</h1>
        <p className="text-gray-500 mt-1 text-sm">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
      </div>

      {/* Work tools — focus, tasks, habits */}
      <WorkTools
        todos={todos.map((t) => ({ id: t.id, text: t.text, done: t.done }))}
        habits={habits.map((h) => ({ id: h.id, title: h.title }))}
        habitsDoneToday={habitsDoneToday}
        todayFocus={focusRow?.text ?? ""}
      />

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Pipeline</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* OpSpot pipeline dashboard */}
      <OpSpotDashboard />
    </div>
  );
}
