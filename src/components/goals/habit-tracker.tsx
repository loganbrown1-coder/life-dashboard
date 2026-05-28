"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Trash2, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addHabit, toggleHabitLog, deleteHabit } from "@/actions/goals";
import { format, subDays, parseISO } from "date-fns";

type Habit = {
  id: string;
  title: string;
  description: string | null;
  frequency: string;
  targetPerWeek: number | null;
};

type HabitLog = {
  habitId: string;
  date: string;
  completed: boolean;
};

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(format(subDays(new Date(), i), "yyyy-MM-dd"));
  }
  return days;
}

function getLast90Days(): string[] {
  const days: string[] = [];
  for (let i = 89; i >= 0; i--) {
    days.push(format(subDays(new Date(), i), "yyyy-MM-dd"));
  }
  return days;
}

/** Returns current streak (consecutive completed days ending today or yesterday) */
function getStreak(habitId: string, logMap: Map<string, boolean>): number {
  let streak = 0;
  const today = format(new Date(), "yyyy-MM-dd");
  // Start from today; if today not done, start from yesterday
  let startIdx = 0;
  if (!logMap.get(`${habitId}::${today}`)) {
    startIdx = 1; // ignore today, start counting from yesterday
  }
  for (let i = startIdx; i < 365; i++) {
    const date = format(subDays(new Date(), i), "yyyy-MM-dd");
    if (logMap.get(`${habitId}::${date}`)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

type FormValues = {
  title: string;
  description?: string;
  frequency: "daily" | "nx_per_week";
  targetPerWeek?: string;
};

export function HabitTracker({ habits, logs }: { habits: Habit[]; logs: HabitLog[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [freq, setFreq] = useState<"daily" | "nx_per_week">("daily");
  const [gridView, setGridView] = useState<"week" | "grid">("week");
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const router = useRouter();
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: { frequency: "daily" } });

  const days7  = getLast7Days();
  const days90 = getLast90Days();
  const logMap = new Map(logs.map((l) => [`${l.habitId}::${l.date}`, l.completed]));
  const today  = format(new Date(), "yyyy-MM-dd");

  function handleToggle(habitId: string, date: string) {
    const key = `${habitId}::${date}`;
    if (pendingKey === key) return; // prevent double-click
    setPendingKey(key);
    startTransition(async () => {
      await toggleHabitLog(habitId, date);
      router.refresh();
      setPendingKey(null);
    });
  }

  async function handleDelete(id: string) {
    await deleteHabit(id);
    router.refresh();
    toast.success("Habit removed");
  }

  async function onAdd(data: FormValues) {
    await addHabit({
      title: data.title,
      description: data.description,
      frequency: freq,
      targetPerWeek: freq === "nx_per_week" && data.targetPerWeek ? Number(data.targetPerWeek) : undefined,
    });
    toast.success("Habit added");
    reset();
    setAddOpen(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Habits</h2>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border overflow-hidden text-xs">
            <button
              onClick={() => setGridView("week")}
              className={`px-2.5 py-1.5 font-medium transition-colors ${gridView === "week" ? "bg-[#0d9488] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              Week
            </button>
            <button
              onClick={() => setGridView("grid")}
              className={`px-2.5 py-1.5 font-medium border-l transition-colors ${gridView === "grid" ? "bg-[#0d9488] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              90 days
            </button>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              <Plus className="h-3.5 w-3.5" /> Add Habit
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>New Habit</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(onAdd)} className="space-y-3 mt-2">
                <Input placeholder="Habit name" {...register("title", { required: true })} />
                <Input placeholder="Description (optional)" {...register("description")} />
                <Select value={freq} onValueChange={(v) => setFreq(v as typeof freq)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="nx_per_week">N× per week</SelectItem>
                  </SelectContent>
                </Select>
                {freq === "nx_per_week" && (
                  <Input type="number" min={1} max={7} placeholder="Times per week" {...register("targetPerWeek")} />
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {habits.length === 0 && (
        <p className="text-sm text-gray-400 py-4 text-center">No habits yet — add one above.</p>
      )}

      <div className="space-y-3">
        {habits.map((habit) => {
          const streak        = getStreak(habit.id, logMap);
          const completedWeek = days7.filter((d) => logMap.get(`${habit.id}::${d}`)).length;
          const target        = habit.frequency === "daily" ? 7 : (habit.targetPerWeek ?? 7);

          return (
            <div key={habit.id} className="rounded-xl border bg-white shadow-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">{habit.title}</p>
                  {habit.description && <p className="text-xs text-gray-400">{habit.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {streak >= 2 && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-orange-500">
                      <Flame className="w-3 h-3" /> {streak}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{completedWeek}/{target}</span>
                  <button
                    onClick={() => handleDelete(habit.id)}
                    className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Week view — 7 toggle buttons */}
              {gridView === "week" && (
                <div className="flex gap-1.5">
                  {days7.map((date) => {
                    const key     = `${habit.id}::${date}`;
                    const done    = logMap.get(key) ?? false;
                    const isToday = date === today;
                    const loading = pendingKey === key;
                    return (
                      <button
                        key={date}
                        onClick={() => handleToggle(habit.id, date)}
                        disabled={isPending}
                        title={date}
                        className={`flex-1 h-7 rounded text-xs transition-colors border ${
                          loading
                            ? "opacity-50 cursor-wait"
                            : done
                            ? "bg-teal-500 border-teal-500 text-white"
                            : isToday
                            ? "border-teal-300 bg-teal-50"
                            : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        {format(parseISO(date + "T12:00:00"), "EEE").charAt(0)}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 90-day grid view */}
              {gridView === "grid" && (
                <div className="overflow-x-auto">
                  <div className="flex gap-0.5" style={{ minWidth: "max-content" }}>
                    {/* Group by weeks (13 columns of 7) */}
                    {Array.from({ length: 13 }, (_, weekIdx) => (
                      <div key={weekIdx} className="flex flex-col gap-0.5">
                        {Array.from({ length: 7 }, (_, dayIdx) => {
                          const cellIdx = weekIdx * 7 + dayIdx;
                          if (cellIdx >= 90) return <div key={dayIdx} className="w-3 h-3" />;
                          const date = days90[cellIdx];
                          const key  = `${habit.id}::${date}`;
                          const done = logMap.get(key) ?? false;
                          const isT  = date === today;
                          const loading = pendingKey === key;
                          return (
                            <button
                              key={dayIdx}
                              onClick={() => handleToggle(habit.id, date)}
                              disabled={isPending}
                              title={date}
                              className={`w-3 h-3 rounded-sm transition-colors ${
                                loading
                                  ? "opacity-50 cursor-wait"
                                  : done
                                  ? "bg-teal-500"
                                  : isT
                                  ? "bg-teal-100 ring-1 ring-teal-400"
                                  : "bg-gray-100 hover:bg-gray-200"
                              }`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Last 90 days · each cell = 1 day</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
