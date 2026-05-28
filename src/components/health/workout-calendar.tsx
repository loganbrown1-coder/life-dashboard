"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const DOT_COLOURS: Record<string, string> = {
  push:           "bg-blue-400",
  pull:           "bg-purple-400",
  legs:           "bg-red-400",
  core:           "bg-orange-400",
  arms_shoulders: "bg-cyan-400",
  run:            "bg-green-400",
  swim:           "bg-teal-400",
  walk:           "bg-gray-400",
  stretch:        "bg-yellow-400",
  rest:           "bg-gray-200",
  other:          "bg-gray-300",
};

type WorkoutRow = { id: string; date: string; type: string; completed: boolean };

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7; // Mon=0 … Sun=6
}

export function WorkoutCalendar({ allWorkouts }: { allWorkouts: WorkoutRow[] }) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // Filter to the visible month
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const workouts = allWorkouts.filter((w) => w.date.startsWith(monthStr));

  const byDate: Record<string, WorkoutRow[]> = {};
  for (const w of workouts) {
    if (!byDate[w.date]) byDate[w.date] = [];
    byDate[w.date].push(w);
  }

  const totalDays  = daysInMonth(year, month);
  const startOffset = firstDayOfMonth(year, month);
  const monthName  = new Date(year, month).toLocaleString("en-GB", { month: "long", year: "numeric" });

  const cells: Array<number | null> = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" onClick={prev}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="font-medium text-gray-900">{monthName}</span>
        <Button variant="ghost" size="icon" onClick={next}><ChevronRight className="w-4 h-4" /></Button>
      </div>

      <div className="grid grid-cols-7 gap-px text-center">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="text-xs text-gray-400 font-medium py-1">{d}</div>
        ))}

        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayWorkouts = byDate[dateStr] ?? [];
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

          return (
            <div key={dateStr} className={`py-1 rounded-lg ${isToday ? "bg-[#0d9488]/10" : ""}`}>
              <span className={`text-xs ${isToday ? "text-[#0d9488] font-semibold" : "text-gray-600"}`}>{day}</span>
              <div className="flex flex-wrap justify-center gap-0.5 mt-0.5 min-h-[10px]">
                {dayWorkouts.slice(0, 3).map((w) => (
                  <span
                    key={w.id}
                    title={w.type.replace("_", " ")}
                    className={`w-2 h-2 rounded-full ${DOT_COLOURS[w.type] ?? "bg-gray-300"} ${!w.completed ? "opacity-40" : ""}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-gray-100">
        {Object.entries(DOT_COLOURS)
          .filter(([k]) => k !== "rest" && k !== "other")
          .map(([type, colour]) => (
            <span key={type} className="flex items-center gap-1 text-xs text-gray-500 capitalize">
              <span className={`w-2 h-2 rounded-full ${colour}`} />
              {type.replace("_", " ")}
            </span>
          ))}
      </div>
    </div>
  );
}
