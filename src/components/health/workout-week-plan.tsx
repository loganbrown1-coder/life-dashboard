"use client";

import { useState, useTransition } from "react";
import { Check, Settings2 } from "lucide-react";
import { toggleWorkoutDay, saveWorkoutSchedule } from "@/actions/workout-schedule";
import { workoutBadgeColor } from "@/lib/workout-colors";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ScheduleEntry = { dayOfWeek: number; workoutType: string };
type WorkoutRow    = { id: string; date: string; type: string; completed: boolean };
type Option        = { value: string; label: string };

type Props = {
  schedule:     ScheduleEntry[];     // from workout_schedule table
  weekDates:    string[];            // ["2024-05-27", ...] Mon–Sun for current week
  completions:  WorkoutRow[];        // workouts logged this week
  workoutTypes: Option[];
};

export function WorkoutWeekPlan({ schedule, weekDates, completions, workoutTypes }: Props) {
  const [, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  // Build a map: dayOfWeek (1-7) → workoutType
  const scheduleMap: Record<number, string> = {};
  for (const s of schedule) scheduleMap[s.dayOfWeek] = s.workoutType;

  // Build a map: date → completed workout(s)
  const completionMap: Record<string, WorkoutRow[]> = {};
  for (const w of completions) {
    if (!completionMap[w.date]) completionMap[w.date] = [];
    completionMap[w.date].push(w);
  }

  const today = new Date().toISOString().slice(0, 10);

  function handleToggle(date: string, workoutType: string) {
    startTransition(async () => {
      await toggleWorkoutDay(date, workoutType);
      const done = !completionMap[date]?.some((w) => w.completed);
      toast.success(done ? "Workout logged ✓" : "Workout removed");
    });
  }

  const hasSchedule = schedule.length > 0;

  return (
    <div className="rounded-xl border bg-white shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-800">This week's plan</h2>
        <SetupScheduleDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          schedule={schedule}
          workoutTypes={workoutTypes}
        />
      </div>

      {!hasSchedule ? (
        <p className="text-sm text-gray-400">
          No weekly plan set up yet.{" "}
          <button
            onClick={() => setEditOpen(true)}
            className="text-[#0d9488] underline"
          >
            Set up your schedule
          </button>
        </p>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, i) => {
            const dayNum = i + 1; // 1=Mon...7=Sun
            const plannedType = scheduleMap[dayNum];
            const isDone = completionMap[date]?.some((w) => w.completed) ?? false;
            const isPast = date < today;
            const isToday = date === today;
            const dayLabel = DAY_NAMES[dayNum];
            const dateNum = parseInt(date.slice(8), 10);

            return (
              <div
                key={date}
                className={`flex flex-col items-center gap-1 rounded-xl p-2 text-center
                  ${isToday ? "ring-2 ring-[#0d9488] bg-teal-50" : ""}
                `}
              >
                <span className={`text-[10px] font-semibold uppercase tracking-wide
                  ${isToday ? "text-[#0d9488]" : "text-gray-400"}`}>
                  {dayLabel}
                </span>
                <span className={`text-sm font-medium ${isToday ? "text-[#0d9488]" : "text-gray-700"}`}>
                  {dateNum}
                </span>

                {plannedType ? (
                  <button
                    onClick={() => handleToggle(date, plannedType)}
                    disabled={!isToday && !isPast}
                    title={`${plannedType.replace(/_/g, " ")} — click to toggle`}
                    className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center transition-all
                      ${isDone
                        ? "bg-[#0d9488] text-white shadow-sm"
                        : isPast || isToday
                          ? `${workoutBadgeColor(plannedType)} opacity-80 hover:opacity-100`
                          : "bg-gray-100 text-gray-300 cursor-default"
                      }`}
                  >
                    {isDone ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="text-[9px] font-bold uppercase leading-none">
                        {plannedType.slice(0, 3)}
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="mt-1 w-8 h-8 rounded-full bg-gray-50 text-gray-200 flex items-center justify-center">
                    <span className="text-xs">–</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Schedule setup dialog ─────────────────────────────────────────────────────

function SetupScheduleDialog({
  open,
  onOpenChange,
  schedule,
  workoutTypes,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schedule: ScheduleEntry[];
  workoutTypes: Option[];
}) {
  const [, startTransition] = useTransition();

  // Local state: one entry per day (1=Mon … 7=Sun), empty string = rest day
  const initial = Array.from({ length: 7 }, (_, i) => {
    const found = schedule.find((s) => s.dayOfWeek === i + 1);
    return found?.workoutType ?? "";
  });
  const [days, setDays] = useState<string[]>(initial);

  function handleSave() {
    startTransition(async () => {
      const entries = days
        .map((type, i) => ({ dayOfWeek: i + 1, workoutType: type }))
        .filter((e) => e.workoutType);
      await saveWorkoutSchedule(entries);
      toast.success("Weekly schedule saved");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-gray-500">
          <Settings2 className="w-3.5 h-3.5" /> Edit plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Weekly workout plan</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 mb-4">
          Set the workout type for each day. Leave blank for rest days.
        </p>
        <div className="space-y-3">
          {DAY_NAMES.slice(1).map((day, i) => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-8 text-sm font-medium text-gray-600">{day}</span>
              <Select
                value={days[i] ?? ""}
                onValueChange={(v) => {
                  const next = [...days];
                  next[i] = v === "rest" ? "" : v;
                  setDays(next);
                }}
              >
                <SelectTrigger className="flex-1 h-9 text-sm">
                  <SelectValue placeholder="Rest day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rest">Rest day</SelectItem>
                  {workoutTypes.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <Button onClick={handleSave} className="w-full mt-4 bg-[#0d9488] hover:bg-teal-700">
          Save schedule
        </Button>
      </DialogContent>
    </Dialog>
  );
}
