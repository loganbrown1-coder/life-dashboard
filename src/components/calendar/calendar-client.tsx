"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  format, parseISO, addWeeks, subWeeks, addMonths, subMonths,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, UtensilsCrossed, ListTodo, Plus, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { addTask } from "@/actions/projects";
import { logWorkout } from "@/actions/health";
import { addCalendarEvent, deleteCalendarEvent } from "@/actions/calendar-events";
import { workoutDotColor } from "@/lib/workout-colors";

type ScheduleEntry = { dayOfWeek: number; workoutType: string; slot: string };

type WorkoutRow = {
  id: string; date: string; type: string; durationMinutes?: number | null; completed: boolean;
};
type PlanRow = {
  id: string; date: string; mealSlot: string; meal: { name: string } | null;
};
type TaskRow = {
  id: string; title: string; dueDate?: string | null; priority: string; status: string;
};
type EventRow = {
  id: string; date: string; title: string; type: string; notes?: string | null; time?: string | null; colour: string;
};

export type CalendarWorkoutType = { value: string; label: string };

type Props = {
  anchor:       string;
  view:         "week" | "month";
  workouts:     WorkoutRow[];
  plans:        PlanRow[];
  tasks:        TaskRow[];
  events:       EventRow[];
  showWorkouts: boolean;
  showMeals:    boolean;
  showTasks:    boolean;
  showEvents:   boolean;
  workoutTypes: CalendarWorkoutType[];
  schedule:     ScheduleEntry[];
  goals:        { id: string; title: string }[];
};

const EVENT_TYPE_COLOURS: Record<string, string> = {
  social:      "#6366f1",
  appointment: "#f59e0b",
  travel:      "#0d9488",
  other:       "#8b5cf6",
};

export function CalendarClient({
  anchor, view: initialView,
  workouts, plans, tasks, events,
  showWorkouts: sw, showMeals: sm, showTasks: st, showEvents: se,
  workoutTypes, schedule, goals,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [view, setView]               = useState<"week" | "month">(initialView);
  const [showWorkouts, setShowWorkouts] = useState(sw);
  const [showMeals, setShowMeals]       = useState(sm);
  const [showTasks, setShowTasks]       = useState(st);
  const [showEvents, setShowEvents]     = useState(se);
  const [sheetDate, setSheetDate]       = useState<string | null>(null);

  // Form state
  const [showTaskForm, setShowTaskForm]       = useState(false);
  const [taskTitle, setTaskTitle]             = useState("");
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [workoutType, setWorkoutType]         = useState(() => workoutTypes[0]?.value ?? "other");
  const [workoutDuration, setWorkoutDuration] = useState("");
  const [showEventForm, setShowEventForm]     = useState(false);
  const [eventTitle, setEventTitle]           = useState("");
  const [eventType, setEventType]             = useState<"social"|"appointment"|"travel"|"other">("social");
  const [eventTime, setEventTime]             = useState("");
  const [eventGoalId, setEventGoalId]         = useState("");

  const anchorDate = parseISO(anchor);
  const today = format(new Date(), "yyyy-MM-dd");

  // Build day list
  let days: string[] = [];
  if (view === "week") {
    const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
    days = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd"));
  } else {
    const monthStart = startOfMonth(anchorDate);
    const monthEnd   = endOfMonth(anchorDate);
    const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 1 });
    let cur = gridStart;
    while (cur <= gridEnd) { days.push(format(cur, "yyyy-MM-dd")); cur = addDays(cur, 1); }
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

  // Lookup maps
  const workoutsByDate: Record<string, WorkoutRow[]> = {};
  for (const w of workouts) {
    if (!workoutsByDate[w.date]) workoutsByDate[w.date] = [];
    workoutsByDate[w.date].push(w);
  }
  const plansByDate: Record<string, number> = {};
  for (const p of plans) plansByDate[p.date] = (plansByDate[p.date] ?? 0) + 1;

  const tasksByDate: Record<string, TaskRow[]> = {};
  for (const t of tasks) {
    if (!t.dueDate) continue;
    if (!tasksByDate[t.dueDate]) tasksByDate[t.dueDate] = [];
    tasksByDate[t.dueDate].push(t);
  }
  const eventsByDate: Record<string, EventRow[]> = {};
  for (const e of events) {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  }

  // For each day in the range, add schedule entries that haven't been logged yet
  const plannedByDate: Record<string, ScheduleEntry[]> = {};
  for (const dateStr of days) {
    const dow = new Date(dateStr + "T00:00:00").getDay(); // 0=Sun
    const dayNum = dow === 0 ? 7 : dow; // convert to 1=Mon..7=Sun
    const entries = schedule.filter((s) => s.dayOfWeek === dayNum);
    const loggedTypes = new Set((workoutsByDate[dateStr] ?? []).map((w) => w.type));
    plannedByDate[dateStr] = entries.filter((s) => !loggedTypes.has(s.workoutType));
  }

  const sheetWorkouts = sheetDate ? (workoutsByDate[sheetDate] ?? []) : [];
  const sheetPlans    = sheetDate ? plans.filter((p) => p.date === sheetDate) : [];
  const sheetTasks    = sheetDate ? (tasksByDate[sheetDate] ?? []) : [];
  const sheetEvents   = sheetDate ? (eventsByDate[sheetDate] ?? []) : [];

  const periodLabel = view === "week"
    ? `${format(parseISO(days[0]), "MMM d")} – ${format(parseISO(days[6]), "MMM d, yyyy")}`
    : format(anchorDate, "MMMM yyyy");

  function openSheet(dateStr: string) {
    setSheetDate(dateStr);
    setShowTaskForm(false); setShowWorkoutForm(false); setShowEventForm(false);
    setTaskTitle(""); setEventTitle(""); setEventTime("");
    setWorkoutType(workoutTypes[0]?.value ?? "other"); setWorkoutDuration("");
  }

  function handleAddTask() {
    if (!taskTitle.trim() || !sheetDate) return;
    startTransition(async () => {
      await addTask({ title: taskTitle.trim(), dueDate: sheetDate, status: "todo", priority: "med" });
      setTaskTitle(""); setShowTaskForm(false); router.refresh();
    });
  }

  function handleLogWorkout() {
    if (!sheetDate) return;
    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await logWorkout({ date: sheetDate, type: workoutType as any, durationMinutes: workoutDuration ? Number(workoutDuration) : undefined, notes: "", completed: true, exercises: [] });
      setWorkoutDuration(""); setShowWorkoutForm(false); router.refresh();
    });
  }

  function handleAddEvent() {
    if (!eventTitle.trim() || !sheetDate) return;
    startTransition(async () => {
      await addCalendarEvent({ date: sheetDate, title: eventTitle.trim(), type: eventType, time: eventTime || undefined, colour: EVENT_TYPE_COLOURS[eventType] ?? "#6366f1", goalId: eventGoalId || undefined });
      setEventTitle(""); setEventTime(""); setEventGoalId(""); setShowEventForm(false); router.refresh();
    });
  }

  function handleDeleteEvent(id: string) {
    startTransition(async () => { await deleteCalendarEvent(id); router.refresh(); });
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate("prev")}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">{periodLabel}</span>
          <Button variant="outline" size="icon" onClick={() => navigate("next")}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border overflow-hidden text-xs">
            <button onClick={() => { setView("week"); router.push(`/calendar?view=week&anchor=${anchor}`); }} className={`px-3 py-1.5 font-medium transition-colors ${view === "week" ? "bg-[#0d9488] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Week</button>
            <button onClick={() => { setView("month"); router.push(`/calendar?view=month&anchor=${anchor}`); }} className={`px-3 py-1.5 font-medium transition-colors border-l ${view === "month" ? "bg-[#0d9488] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Month</button>
          </div>
          <ToggleChip active={showWorkouts} onChange={setShowWorkouts} color="bg-orange-400" label="Workouts" />
          <ToggleChip active={showMeals}    onChange={setShowMeals}    color="bg-teal-400"   label="Meals" />
          <ToggleChip active={showTasks}    onChange={setShowTasks}    color="bg-purple-400" label="Tasks" />
          <ToggleChip active={showEvents}   onChange={setShowEvents}   color="bg-indigo-400" label="Events" />
        </div>
      </div>

      {/* Month day headers */}
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
            const dayEvents   = showEvents ? (eventsByDate[dateStr] ?? []) : [];
            return (
              <button key={dateStr} onClick={() => openSheet(dateStr)} className={`rounded-xl border p-3 text-left hover:border-[#0d9488] transition-colors ${isToday ? "border-[#0d9488] bg-[#0d9488]/5" : "bg-white"}`}>
                <p className="text-xs font-semibold text-gray-400 uppercase">{format(parseISO(dateStr), "EEE")}</p>
                <p className={`text-lg font-bold mb-2 ${isToday ? "text-[#0d9488]" : "text-gray-900"}`}>{format(parseISO(dateStr), "d")}</p>
                <div className="space-y-1">
                  {dayWorkouts.map((w) => (
                    <div key={w.id} className={`text-[10px] text-white rounded-full px-1.5 py-0.5 capitalize truncate ${workoutDotColor(w.type)}`}>
                      {workoutTypes.find((t) => t.value === w.type)?.label ?? w.type.replace(/_/g, " ")}
                    </div>
                  ))}
                  {(showWorkouts ? (plannedByDate[dateStr] ?? []) : []).map((s) => (
                    <div key={`plan-${s.slot}-${s.workoutType}`} className={`text-[10px] rounded-full px-1.5 py-0.5 capitalize truncate opacity-60 border ${workoutDotColor(s.workoutType)} bg-white`} style={{ color: "inherit" }}>
                      {workoutTypes.find((t) => t.value === s.workoutType)?.label ?? s.workoutType}
                    </div>
                  ))}
                  {mealCount > 0 && <div className="text-[10px] text-teal-700 bg-teal-50 rounded-full px-1.5 py-0.5 flex items-center gap-0.5"><UtensilsCrossed className="w-2.5 h-2.5" /> {mealCount}/4</div>}
                  {dayTasks.map((t) => <div key={t.id} className="text-[10px] text-purple-700 bg-purple-50 rounded-full px-1.5 py-0.5 truncate">{t.title}</div>)}
                  {dayEvents.map((e) => <div key={e.id} className="text-[10px] text-white rounded-full px-1.5 py-0.5 truncate" style={{ backgroundColor: e.colour }}>{e.time ? `${e.time} ` : ""}{e.title}</div>)}
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
            const dayEvents   = showEvents ? (eventsByDate[dateStr] ?? []) : [];
            return (
              <button key={dateStr} onClick={() => openSheet(dateStr)} className={`rounded-lg border p-1.5 min-h-[80px] text-left hover:border-[#0d9488] transition-colors ${isToday ? "border-[#0d9488] bg-[#0d9488]/5" : isThisMonth ? "bg-white" : "bg-gray-50"}`}>
                <p className={`text-xs font-semibold mb-1 ${isToday ? "text-[#0d9488]" : isThisMonth ? "text-gray-700" : "text-gray-300"}`}>{format(parseISO(dateStr), "d")}</p>
                <div className="space-y-0.5">
                  {dayWorkouts.slice(0, 1).map((w) => <div key={w.id} className={`w-2 h-2 rounded-full ${workoutDotColor(w.type)}`} title={w.type} />)}
                  {(showWorkouts ? (plannedByDate[dateStr] ?? []) : []).map((s) => (
                    <div key={`plan-${s.slot}`} className={`w-2 h-2 rounded-full opacity-40 ${workoutDotColor(s.workoutType)}`} />
                  ))}
                  {mealCount > 0 && <div className="w-2 h-2 rounded-full bg-teal-400" />}
                  {dayTasks.length > 0 && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                  {dayEvents.slice(0, 2).map((e) => <div key={e.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: e.colour }} title={e.title} />)}
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
              <SheetHeader className="px-6 pt-12 pb-4 border-b shrink-0">
                <SheetTitle className="text-lg font-semibold text-gray-900">{format(parseISO(sheetDate), "EEEE, d MMMM")}</SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                {/* Events section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Events</p>
                    <button onClick={() => { setShowEventForm(!showEventForm); setShowTaskForm(false); setShowWorkoutForm(false); }} className="text-sm text-[#0d9488] hover:underline flex items-center gap-1">
                      <Plus className="w-4 h-4" /> Add event
                    </button>
                  </div>
                  {showEventForm && (
                    <div className="mb-3 rounded-lg border bg-gray-50 p-3 space-y-2">
                      <Input placeholder="e.g. Dinner with Sam, Doctor's appointment" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddEvent(); }} autoFocus className="bg-white" />
                      <div className="flex gap-2">
                        <Select value={eventType} onValueChange={(v) => setEventType(v as typeof eventType)}>
                          <SelectTrigger className="bg-white flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="social">🎉 Social</SelectItem>
                            <SelectItem value="appointment">📅 Appointment</SelectItem>
                            <SelectItem value="travel">✈️ Travel</SelectItem>
                            <SelectItem value="other">📌 Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="bg-white w-28" />
                      </div>
                      <Select value={eventGoalId} onValueChange={(v) => setEventGoalId(v ?? "")}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Link to goal (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No goal</SelectItem>
                          {goals.map((g) => (
                            <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddEvent} disabled={!eventTitle.trim()} className="flex-1">Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowEventForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                  {sheetEvents.length > 0 ? sheetEvents.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 py-2.5 border-b border-gray-100 last:border-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.colour }} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{e.title}</p>
                        {e.time && <p className="text-xs text-gray-400">{e.time}</p>}
                      </div>
                      <span className="text-xs text-gray-400 capitalize">{e.type}</span>
                      <button onClick={() => handleDeleteEvent(e.id)} className="text-gray-300 hover:text-red-400 ml-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )) : (!showEventForm && <p className="text-sm text-gray-300 py-1">No events. Tap &quot;Add event&quot; to add a dinner, appointment, etc.</p>)}
                </div>

                {/* Workouts section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Workouts</p>
                    <button onClick={() => { setShowWorkoutForm(!showWorkoutForm); setShowTaskForm(false); setShowEventForm(false); }} className="text-sm text-[#0d9488] hover:underline flex items-center gap-1">
                      <Plus className="w-4 h-4" /> Log workout
                    </button>
                  </div>
                  {showWorkoutForm && (
                    <div className="mb-3 rounded-lg border bg-gray-50 p-3 space-y-2">
                      <Select value={workoutType} onValueChange={(v) => { if (v) setWorkoutType(v); }}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{workoutTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" placeholder="Duration (minutes, optional)" value={workoutDuration} onChange={(e) => setWorkoutDuration(e.target.value)} className="bg-white" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleLogWorkout} className="flex-1">Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowWorkoutForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                  {sheetWorkouts.length > 0 ? sheetWorkouts.map((w) => (
                    <div key={w.id} className="flex items-center gap-2 py-2.5 border-b border-gray-100 last:border-0">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${workoutDotColor(w.type)}`} />
                      <span className="text-sm text-gray-800 flex-1 capitalize">{workoutTypes.find((t) => t.value === w.type)?.label ?? w.type.replace(/_/g, " ")}</span>
                      {w.durationMinutes && <span className="text-xs text-gray-400">{w.durationMinutes} min</span>}
                      {w.completed && <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">Done</span>}
                    </div>
                  )) : (!showWorkoutForm && <p className="text-sm text-gray-300 py-1">None logged.</p>)}
                  <Link href="/health/workouts" className="text-sm text-[#0d9488] hover:underline mt-2 block">View workout plan →</Link>
                </div>

                {/* Meals section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Meals</p>
                    <Link href={`/food/plan?week=${sheetDate}`} className="text-sm text-[#0d9488] hover:underline flex items-center gap-1"><Plus className="w-4 h-4" /> Plan meals</Link>
                  </div>
                  {sheetPlans.length > 0 ? sheetPlans.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 py-2.5 border-b border-gray-100 last:border-0">
                      <UtensilsCrossed className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      <span className="text-xs text-gray-400 capitalize w-20 flex-shrink-0">{p.mealSlot}</span>
                      <span className="text-sm text-gray-800">{p.meal?.name ?? "—"}</span>
                    </div>
                  )) : <p className="text-sm text-gray-300 py-1">Nothing planned.</p>}
                </div>

                {/* Tasks section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Tasks</p>
                    <button onClick={() => { setShowTaskForm(!showTaskForm); setShowWorkoutForm(false); setShowEventForm(false); }} className="text-sm text-[#0d9488] hover:underline flex items-center gap-1">
                      <Plus className="w-4 h-4" /> Add task
                    </button>
                  </div>
                  {showTaskForm && (
                    <div className="mb-3 rounded-lg border bg-gray-50 p-3 space-y-2">
                      <Input placeholder="Task title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }} className="bg-white" autoFocus />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddTask} disabled={!taskTitle.trim()} className="flex-1">Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowTaskForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                  {sheetTasks.length > 0 ? sheetTasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 py-2.5 border-b border-gray-100 last:border-0">
                      <ListTodo className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <span className={`text-sm flex-1 ${t.status === "done" ? "line-through text-gray-400" : "text-gray-800"}`}>{t.title}</span>
                    </div>
                  )) : (!showTaskForm && <p className="text-sm text-gray-300 py-1">No tasks due.</p>)}
                </div>

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
    <button onClick={() => onChange(!active)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${active ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"}`}>
      <span className={`w-2 h-2 rounded-full ${active ? color : "bg-gray-300"}`} />
      {label}
    </button>
  );
}
