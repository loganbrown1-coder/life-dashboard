/**
 * Workout-aware meal suggestion rules (from BUILD_SPEC.md § Phase 2).
 * Returns up to 3 meal IDs ordered by relevance.
 */

type WorkoutType =
  | "push" | "pull" | "legs" | "core" | "arms_shoulders"
  | "run" | "swim" | "walk" | "stretch" | "rest" | "other"
  | null;

type MealRow = {
  id: string;
  tags: string; // JSON array string e.g. '["high_protein","post_workout"]'
};

// Parse the JSON tags column safely
function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasTags(meal: MealRow, wanted: string[]): boolean {
  const t = parseTags(meal.tags);
  return wanted.some((w) => t.includes(w));
}

function scoreMeal(meal: MealRow, primary: string[], secondary: string[], weekend: boolean): number {
  const t = parseTags(meal.tags);
  let score = 0;
  for (const tag of primary)   if (t.includes(tag)) score += 2;
  for (const tag of secondary) if (t.includes(tag)) score += 1;
  if (weekend && t.includes("weekend_treat")) score += 1;
  return score;
}

export function suggestMeals(
  allMeals: MealRow[],
  workoutType: WorkoutType,
  dayOfWeek: number // 0 = Sunday, 1 = Monday … 6 = Saturday
): MealRow[] {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let primary: string[] = ["high_protein"];
  let secondary: string[] = [];

  if (isWeekend) {
    // Flex day — softer suggestions
    primary = ["high_protein", "weekend_treat"];
    secondary = ["low_carb", "post_workout"];
  } else if (
    workoutType === "push" || workoutType === "pull" || workoutType === "legs" ||
    workoutType === "core" || workoutType === "arms_shoulders"
  ) {
    // Lifting day — high protein + post-workout carbs
    primary = ["high_protein", "post_workout"];
    secondary = ["low_carb"];
  } else if (workoutType === "run" || workoutType === "swim") {
    // Cardio day — high protein + moderate carbs
    primary = ["high_protein"];
    secondary = ["post_workout", "low_carb"];
  } else {
    // Walk / rest / stretch / null — low carb default
    primary = ["high_protein", "low_carb"];
    secondary = [];
  }

  // Score and rank
  const scored = allMeals
    .map((m) => ({ meal: m, score: scoreMeal(m, primary, secondary, isWeekend) }))
    .sort((a, b) => b.score - a.score);

  let top3 = scored.slice(0, 3).map((s) => s.meal);

  // Fallback: if fewer than 3 matched (score > 0), fill with high-protein meals
  if (top3.filter((_, i) => scored[i]?.score > 0).length < 3) {
    const highProtein = allMeals.filter((m) => hasTags(m, ["high_protein"]));
    for (const m of highProtein) {
      if (top3.length >= 3) break;
      if (!top3.find((t) => t.id === m.id)) top3.push(m);
    }
  }

  // Final fallback: just return any meals
  if (top3.length < 3) {
    for (const m of allMeals) {
      if (top3.length >= 3) break;
      if (!top3.find((t) => t.id === m.id)) top3.push(m);
    }
  }

  return top3.slice(0, 3);
}
