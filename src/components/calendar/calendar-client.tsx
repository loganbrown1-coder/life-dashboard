"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Dumbbell, UtensilsCrossed, ListTodo, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { addTask } from "@/actions/projects";
import { logWorkout } from "@/actions/health";

type WorkoutRow = {
  id: string;
  date: string;
  type: string;
  durationMinutes?: number | null;
  completed: boolean;
};

type PlanRow = {
  id: string;
  date: string;
  mealSlot: string;
  meal: { name: string } | null;
};

type TaskRow = {
  id: string;
  title: string;
  dueDate?: string | null;
  priority: string;
  status: string;
};

export type CalendarWorkoutType = { value: string; label: string };

type Props = {
  anchor: string;
  view: "week" | "month";
  workouts: WorkoutRow[];
  plans: PlanRow[];
  tasks: TaskRow[];
  showWorkouts: boolean;
  showMeals: boolean;
  showTasks: boolean;
  workoutTypes: CalendarWorkoutType[];
};

const WORKOUT_COLORS: Record<string, string> = {
  push:           "bg-orange-500",
  pull:           "bg-blue-500",
  legs:           "bg-purple-500",
  core:           "bg-pink-500",
  arms_shoulders: "bg-yellow-500",
  run:            "bg-green-500",
  swim:           "bg-cyan-500",
  walk:           "bg-teal-400",
  stretch:        "bg-indigo-400",
  rest:           "bg-gray-400",
  other:          "bg-gray-500",
};

export function CalendarClient({ anchor, view: initialView, workouts, plans, tasks, showWorkouts: sw, showMeals: sm, showTasks: st, workoutTypes }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [view, setView] = useState<"week" | "month">(initialView);
  const [showWorkouts, setShowWorkouts] = useState(sw);
  const [showMeals, setShowMeals] = useState(sm);
  const [showTasks, setShowTasks] = useState(st);
  const [sheetDate, setSheetDate] = useState<string | null>(null);

  // Add-task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");

  // Add-workout form state
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [workoutType, setWorkoutType] = useState(() => workoutTypes[0]?.value ?? "other");
  const [workoutDuration, setWorkoutDuration] = useState("");

  const anchorDate = parseISO(anchor);
  const today = format(new Date(), "yyyy-MM-dd");

  // Build days for display
  let days: string[] = [];
  if (view === "week") {
    const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
    days = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd"));
  } else {
    const monthStart = startOfMonth(anchorDate);
    const monthEnd   = endOfMonth(anchorDate);
    const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd    = endOfWeek(monthEnd, { weekStartsOn: 1 });
    let cur = gridStart;
    while (cur <= gridEnd) {
      days.push(format(cur, "yyyy-MM-dd"));
      cur = addDays(cur, 1);
    }
  }

  function navigate(dir: "prev" | "next") {
    let newAnchor: Date;
    if (view === "week") {
      newAnchor = dir === "prev" ? subWeeks(anchorDate, 1) : addWeeks(anchorDate, 1);
    } else {
      newAnchor = dir === "prev" ? subMonths(anchorDate, 1) : addMonths(anchorDate, 1);
    }
    router.push(`/calendar?view=${view}&anchor=${format(newAnchor, "yyyy-MM-dd")}`);
  }

  // Build lookup maps
  const workoutsByDate: Record<string, WorkoutRow[]> = {};
  for (const w of workouts) {
    if (!workoutsByDate[w.date]) workoutsByDate[w.date] = [];
    workoutsByDate[w.date].push(w);
  }

  const plansByDate: Record<string, number> = {};
  for (const p of plans) {
    plansByDate[p.date] = (plansByDate[p.date] ?? 0) + 1;
  }

  const tasksByDate: Record<string, TaskRow[]> = {};
  for (const t of tasks) {
    if (!t.dueDate) continue;
    if (!tasksByDate[t.dueDate]) tasksByDate[t.dueDate] = [];
    tasksByDate[t.dueDate].push(t);
  }

  const sheetWorkouts = sheetDate ? (workoutsByDate[sheetDate] ?? []) : [];
  const sheetPlans    = sheetDate ? plans.filter((p) => p.date === sheetDate) : [];
  const sheetTasks    = sheetDate ? (tasksByDate[sheetDate] ?? []) : [];

  const periodLabel = view === "week"
    ? `${format(parseISO(days[0]), "MMM d")} – ${format(parseISO(days[6]), "MMM d, yyyy")}`
    : format(anchorDate, "MMMM yyyy");

  function openSheet(dateStr: string) {
    setSheetDate(dateStr);
    setShowTaskForm(false);
    setShowWorkoutForm(false);
    setTaskTitle("");
    setWorkoutType("push");
    setWorkoutDuration("");
  }

  function handleAddTask() {
    if (!taskTitle.trim() || !sheetDate) return;
    startTransition(async () => {
      await addTask({ title: taskTitle.trim(), dueDate: sheetDate, status: "todo", priority: "med" });
      setTaskTitle("");
      setShowTaskForm(false);
      router.refresh();
    });
  }

  function handleLogWorkout() {
    if (!sheetDate) return;
    startTransition(async () => {
      await logWorkout({
        date: sheetDate,
        type: workoutType as "push" | "pull" | "legs" | "core" | "arms_shoulders" | "run" | "swim" | "walk" | "stretch" | "rest" | "other",
        durationMinutes: workoutDuration ? Number(workoutDuration) : undefined,
        notes: "",
        completed: true,
        exercises: [],
      });
      setWorkoutDuration("");
      setShowWorkoutForm(false);
      router.refresh();
    });
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">{periodLabel}</span>
          <Button variant="outline" size="icon" onClick={() => navigate("next")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border overflow-hidden text-xs">
            <button
              onClick={() => { setView("week"); router.push(`/calendar?view=week&anchor=${anchor}`); }}
              className={`px-3 py-1.5 font-medium transition-colors ${view === "week" ? "bg-[#0d9488] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >Week</button>
            <button
              onClick={() => { setView("month"); router.push(`/calendar?view=month&anchor=${anchor}`); }}
              className={`px-3 py-1.5 font-medium transition-colors border-l ${view === "month" ? "bg-[#0d9488] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >Month</button>
          </div>
          <ToggleChip active={showWorkouts} onChange={setShowWorkouts} color="bg-orange-500" label="Workouts" />
          <ToggleChip active={showMeals}    onChange={setShowMeals}    color="bg-teal-500"   label="Meals" />
          <ToggleChip active={showTasks}    onChange={setShowTasks}    color="bg-purple-500" label="Tasks" />
        </div>
      </div>

      {/* Day headers (month only) */}
      {view === "month" && (
        <div className="grid grid-cols-7 mb-1">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>
      )}

      {/* Week view */}
      {view === "week" ? (
        <div className="grid grid-cols-7 gap-2">
          {days.map((dateStr) => {
            const isToday     = dateStr === today;
            const dayWorkouts = showWorkouts ? (workoutsByDate[dateStr] ?? []) : [];
            const mealCount   = showMeals ? (plansByDate[dateStr] ?? 0) : 0;
            const dayTasks    = showTasks ? (tasksByDate[dateStr] ?? []) : [];

            return (
              <button
                key={dateStr}
                onClick={() => openSheet(dateStr)}
                className={`rounded-xl border p-3 text-left hover:border-[#0d9488] transition-colors ${isToday ? "border-[#0d9488] bg-[#0d9488]/5" : "bg-white"}`}
              >
                <p className="text-xs font-semibold text-gray-400 uppercase">{format(parseISO(dateStr), "EEE")}</p>
                <p className={`text-lg font-bold mb-2 ${isToday ? "text-[#0d9488]" : "text-gray-900"}`}>
                  {format(parseISO(dateStr), "d")}
                </p>
                <div className="space-y-1">
                  {dayWorkouts.map((w) => (
                    <div key={w.id} className={`text-[10px] text-white rounded-full px-1.5 py-0.5 capitalize truncate ${WORKOUT_COLORS[w.type] ?? "bg-gray-500"}`}>
                      {w.type.replace("_", " ")}
                    </div>
                  ))}
                  {mealCount > 0 && (
                    <div className="text-[10px] text-teal-700 bg-teal-50 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                      <UtensilsCrossed className="w-2.5 h-2.5" /> {mealCount}/4
                    </div>
                  )}
                  {dayTasks.map((t) => (
                    <div key={t.id} className="text-[10px] text-purple-700 bg-purple-50 rounded-full px-1.5 py-0.5 truncate">
                      {t.title}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Month view */
        <div className="grid grid-cols-7 gap-1">
          {days.map((dateStr) => {
            const isToday     = dateStr === today;
            const isThisMonth = isSameMonth(parseISO(dateStr), anchorDate);
            const dayWorkouts = showWorkouts ? (workoutsByDate[dateStr] ?? []) : [];
            const mealCount   = showMeals ? (plansByDate[dateStr] ?? 0) : 0;
            const dayTasks    = showTasks ? (tasksByDate[dateStr] ?? []) : [];

            return (
              <button
                key={dateStr}
                onClick={() => openSheet(dateStr)}
                className={`rounded-lg border p-1.5 min-h-[80px] text-left hover:border-[#0d9488] transition-colors ${
                  isToday ? "border-[#0d9488] bg-[#0d9488]/5" : isThisMonth ? "bg-white" : "bg-gray-50"
                }`}
              >
                <p className={`text-xs font-semibold mb-1 ${
                  isToday ? "text-[#0d9488]" : isThisMonth ? "text-gray-700" : "text-gray-300"
                }`}>
                  {format(parseISO(dateStr), "d")}
                </p>
                <div className="space-y-0.5">
                  {dayWorkouts.slice(0, 1).map((w) => (
                    <div key={w.id} className={`w-2 h-2 rounded-full ${WORKOUT_COLORS[w.type] ?? "bg-gray-500"}`} title={w.type} />
                  ))}
                  {mealCount > 0 && <div className="w-2 h-2 rounded-full bg-teal-400" title={`${mealCount} meals`} />}
                  {dayTasks.length > 0 && <div className="w-2 h-2 rounded-full bg-purple-400" title={`${dayTasks.length} tasks`} />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Day detail sheet */}
      <Sheet open={!!sheetDate} onOpenChange={(o) => { if (!o) setSheetDate(null); }}>
        <SheetContent side="right" className="w-[440px] max-w-full flex flex-col p-0">
          {sheetDate && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header — sits below the × button */}
              <SheetHeader className="px-6 pt-12 pb-4 border-b shrink-0">
                <SheetTitle className="text-lg font-semibold text-gray-900">
                  {format(parseISO(sheetDate), "EEEE, d MMMM")}
                </SheetTitle>
              </SheetHeader>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Workouts */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Workouts</p>
                  <button
                    onClick={() => { setShowWorkoutForm(!showWorkoutForm); setShowTaskForm(false); }}
                    className="text-sm text-[#0d9488] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Log workout
                  </button>
                </div>

                {showWorkoutForm && (
                  <div className="mb-3 rounded-lg border bg-gray-50 p-3 space-y-2">
                    <Select value={workoutType} onValueChange={(v) => { if (v) setWorkoutType(v); }}>
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {workoutTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Duration (minutes, optional)"
                      value={workoutDuration}
                      onChange={(e) => setWorkoutDuration(e.target.value)}
                      className="bg-white"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleLogWorkout} className="flex-1">Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowWorkoutForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {sheetWorkouts.length > 0 ? sheetWorkouts.map((w) => (
                  <div key={w.id} className="flex items-center gap-2 py-2.5 border-b border-gray-100 last:border-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${WORKOUT_COLORS[w.type] ?? "bg-gray-400"}`} />
                    <span className="text-base capitalize text-gray-800">{w.type.replace("_", " ")}</span>
                    {w.durationMinutes && <span className="text-sm text-gray-400 ml-auto">{w.durationMinutes} min</span>}
                    {w.completed && <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 ml-1">Done</span>}
                  </div>
                )) : (
                  !showWorkoutForm && <p className="text-sm text-gray-300 py-1">None logged.</p>
                )}
                <Link href="/health/workouts" className="text-sm text-[#0d9488] hover:underline mt-2 block">
                  View all workouts →
                </Link>
              </div>

              {/* Meals */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Meals</p>
                  <Link
                    href={`/food/plan?week=${sheetDate}`}
                    className="text-sm text-[#0d9488] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Plan meals
                  </Link>
                </div>
                {sheetPlans.length > 0 ? sheetPlans.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 py-2.5 border-b border-gray-100 last:border-0">
                    <UtensilsCrossed className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    <span className="text-sm text-gray-400 capitalize w-20 flex-shrink-0">{p.mealSlot}</span>
                    <span className="text-base text-gray-800">{p.meal?.name ?? "—"}</span>
                  </div>
                )) : (
                  <p className="text-sm text-gray-300 py-1">Nothing planned.</p>
                )}
              </div>

              {/* Tasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Tasks</p>
                  <button
                    onClick={() => { setShowTaskForm(!showTaskForm); setShowWorkoutForm(false); }}
                    className="text-sm text-[#0d9488] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add task
                  </button>
                </div>

                {showTaskForm && (
                  <div className="mb-3 rounded-lg border bg-gray-50 p-3 space-y-2">
                    <Input
                      placeholder="Task title"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }}
                      className="bg-white"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddTask} disabled={!taskTitle.trim()} className="flex-1">Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowTaskForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {sheetTasks.length > 0 ? sheetTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 py-2.5 border-b border-gray-100 last:border-0">
                    <ListTodo className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className={`text-base flex-1 ${t.status === "done" ? "line-through text-gray-400" : "text-gray-800"}`}>{t.title}</span>
                  </div>
                )) : (
                  !showTaskForm && <p className="text-sm text-gray-300 py-1">No tasks due.</p>
                )}
              </div>

              {sheetWorkouts.length === 0 && sheetPlans.length === 0 && sheetTasks.length === 0 && !showTaskForm && !showWorkoutForm && (
                <p className="text-base text-gray-400 pt-2">Nothing scheduled — use the buttons above to add something.</p>
              )}

              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ToggleChip({ active, onChange, color, label }: { active: boolean; onChange: (v: boolean) => void; color: string; label: string }) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
        active ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${active ? color : "bg-gray-300"}`} />
      {label}
    </button>
  );
}
