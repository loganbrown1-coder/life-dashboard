"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, addWeeks, subWeeks, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X, Check, Copy, Flame, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { planMeal, removeMealPlan, markMealEaten, copyWeekPlan } from "@/actions/food";

type MealRow = {
  id: string;
  name: string;
  mealType: string;
  tags: string;
  caloriesEstimate?: number | null;
  proteinG?: number | null;
};

type PlanRow = {
  id: string;
  date: string;
  mealSlot: string;
  mealId: string;
  eaten: boolean;
  meal: MealRow | null;
};

type Props = {
  weekStart: string;
  plans: PlanRow[];
  allMeals: MealRow[];
  workoutsByDate: Record<string, string>;
  suggestedByDate: Record<string, (MealRow & Record<string, unknown>)[]>;
};

const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;

const SLOT_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const TAG_STYLES: Record<string, string> = {
  high_protein:  "bg-green-100 text-green-700",
  post_workout:  "bg-blue-100 text-blue-700",
  low_carb:      "bg-yellow-100 text-yellow-700",
  weekend_treat: "bg-pink-100 text-pink-700",
  quick:         "bg-purple-100 text-purple-700",
};

const TAG_LABELS: Record<string, string> = {
  high_protein:  "High Protein",
  post_workout:  "Post Workout",
  low_carb:      "Low Carb",
  weekend_treat: "Weekend Treat",
  quick:         "Quick",
};

function parseTags(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

export function MealPlanClient({ weekStart, plans, allMeals, workoutsByDate, suggestedByDate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState("");
  const [pickerSlot, setPickerSlot] = useState<typeof SLOTS[number]>("dinner");
  const [search, setSearch] = useState("");

  const weekStartDate = parseISO(weekStart);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate);
    d.setDate(weekStartDate.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const planMap: Record<string, PlanRow> = {};
  for (const p of plans) {
    planMap[`${p.date}|${p.mealSlot}`] = p;
  }

  function navigate(dir: "prev" | "next") {
    const target = dir === "prev"
      ? subWeeks(weekStartDate, 1)
      : addWeeks(weekStartDate, 1);
    router.push(`/food/plan?week=${target.toISOString().split("T")[0]}`);
  }

  function openPicker(date: string, slot: typeof SLOTS[number]) {
    setPickerDate(date);
    setPickerSlot(slot);
    setSearch("");
    setPickerOpen(true);
  }

  async function handlePick(mealId: string) {
    try {
      await planMeal(pickerDate, mealId, pickerSlot);
      setPickerOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to plan meal");
    }
  }

  async function handleRemove(planId: string) {
    try {
      await removeMealPlan(planId);
      router.refresh();
    } catch {
      toast.error("Failed to remove");
    }
  }

  async function handleToggleEaten(planId: string, eaten: boolean) {
    try {
      await markMealEaten(planId, !eaten);
      router.refresh();
    } catch {
      toast.error("Failed to update");
    }
  }

  async function handleCopyWeek() {
    const nextStart = addWeeks(weekStartDate, 1).toISOString().split("T")[0];
    startTransition(async () => {
      try {
        await copyWeekPlan(weekStart, nextStart);
        toast.success("Week copied to next week");
        router.refresh();
      } catch {
        toast.error("Failed to copy week");
      }
    });
  }

  const suggestions = suggestedByDate[pickerDate] ?? [];
  const filtered = search.trim()
    ? allMeals.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : allMeals;

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center">
            {format(weekStartDate, "MMM d")} – {format(days[6] ? parseISO(days[6]) : weekStartDate, "MMM d, yyyy")}
          </span>
          <Button variant="outline" size="icon" onClick={() => navigate("next")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyWeek}
          disabled={isPending}
          className="flex items-center gap-1.5 text-xs"
        >
          <Copy className="w-3 h-3" /> Copy to next week
        </Button>
      </div>

      {/* Week grid — stacked cards on mobile, 7-col on lg */}
      <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-7 lg:gap-2">
        {days.map((dateStr) => {
          const d = parseISO(dateStr);
          const dayName = format(d, "EEE");
          const dayNum = format(d, "d");
          const isToday = dateStr === new Date().toISOString().split("T")[0];
          const workoutType = workoutsByDate[dateStr];

          return (
            <div key={dateStr} className="border rounded-xl bg-white overflow-hidden">
              {/* Day header */}
              <div className={`px-3 py-2 text-center border-b ${isToday ? "bg-[#0d9488]/10" : "bg-gray-50"}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-[#0d9488]" : "text-gray-500"}`}>
                  {dayName}
                </p>
                <p className={`text-lg font-bold ${isToday ? "text-[#0d9488]" : "text-gray-900"}`}>{dayNum}</p>
                {workoutType && (
                  <span className="inline-block text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5 mt-1 capitalize">
                    {workoutType}
                  </span>
                )}
              </div>

              {/* Meal slots */}
              <div className="p-2 space-y-1.5">
                {SLOTS.map((slot) => {
                  const plan = planMap[`${dateStr}|${slot}`];
                  return (
                    <div key={slot}>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                        {SLOT_LABELS[slot]}
                      </p>
                      {plan ? (
                        <div className={`rounded-lg p-2 text-xs ${plan.eaten ? "bg-green-50 border border-green-100" : "bg-gray-50 border border-gray-100"}`}>
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-medium text-gray-800 leading-snug line-clamp-2 flex-1">
                              {plan.meal?.name ?? "Unknown meal"}
                            </p>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => handleToggleEaten(plan.id, plan.eaten)}
                                className={`p-0.5 rounded transition-colors ${
                                  plan.eaten
                                    ? "text-green-600 hover:text-green-700"
                                    : "text-gray-300 hover:text-green-500"
                                }`}
                                title={plan.eaten ? "Mark uneaten" : "Mark eaten"}
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleRemove(plan.id)}
                                className="p-0.5 rounded text-gray-300 hover:text-red-400 transition-colors"
                                title="Remove"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          {plan.meal?.caloriesEstimate && (
                            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                              <Flame className="w-2.5 h-2.5" /> {plan.meal.caloriesEstimate} kcal
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => openPicker(dateStr, slot)}
                          className="w-full rounded-lg border border-dashed border-gray-200 py-2 flex items-center justify-center hover:border-[#0d9488] hover:bg-[#0d9488]/5 transition-colors group"
                        >
                          <Plus className="w-3 h-3 text-gray-300 group-hover:text-[#0d9488]" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pick meal dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Pick {SLOT_LABELS[pickerSlot]} — {pickerDate ? format(parseISO(pickerDate), "EEE MMM d") : ""}
            </DialogTitle>
          </DialogHeader>

          {suggestions.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Suggested</p>
              <div className="space-y-2">
                {suggestions.map((meal) => (
                  <MealPickRow key={meal.id} meal={meal} onPick={handlePick} />
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">All meals</p>
            <input
              type="text"
              placeholder="Search meals…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full mb-2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30"
            />
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No meals found</p>
              ) : (
                filtered.map((meal) => (
                  <MealPickRow key={meal.id} meal={meal} onPick={handlePick} />
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MealPickRow({ meal, onPick }: { meal: MealRow; onPick: (id: string) => void }) {
  const tags = parseTags(meal.tags);
  return (
    <button
      onClick={() => onPick(meal.id)}
      className="w-full text-left rounded-lg border border-gray-100 p-3 hover:border-[#0d9488] hover:bg-[#0d9488]/5 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-800">{meal.name}</p>
        <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
          {meal.caloriesEstimate && (
            <span className="flex items-center gap-0.5">
              <Flame className="w-3 h-3" />{meal.caloriesEstimate}
            </span>
          )}
          {meal.proteinG && (
            <span className="flex items-center gap-0.5">
              <Dumbbell className="w-3 h-3" />{meal.proteinG}g
            </span>
          )}
        </div>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TAG_STYLES[tag] ?? "bg-gray-100 text-gray-600"}`}>
              {TAG_LABELS[tag] ?? tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
