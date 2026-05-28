import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FoodNav } from "@/components/food/food-nav";
import { MealFormDialog } from "@/components/food/meal-form-dialog";
import { MealActions } from "@/components/food/meal-actions";
import { getAllMeals, getMealWithIngredients } from "@/db/queries/food";
import { Clock, Flame, Dumbbell, UtensilsCrossed } from "lucide-react";

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

export default async function MealsPage() {
  const allMeals = await getAllMeals();

  // Fetch ingredients for each meal (for edit pre-fill)
  const mealsWithIngredients = await Promise.all(
    allMeals.map(async (m) => {
      const data = await getMealWithIngredients(m.id);
      return data ?? { ...m, ingredients: [] };
    })
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Food</h1>
          <p className="text-gray-500 mt-1">Your meal library</p>
        </div>
        <MealFormDialog />
      </div>

      <FoodNav />

      {allMeals.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <UtensilsCrossed className="w-12 h-12 text-gray-200 mb-4" />
          <h2 className="text-lg font-medium text-gray-700 mb-1">No meals yet</h2>
          <p className="text-sm text-gray-400 mb-4">
            Add your first meal to start planning your week
          </p>
          <MealFormDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mealsWithIngredients.map((meal) => {
            const tags = parseTags(meal.tags);
            return (
              <Card key={meal.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 leading-tight">{meal.name}</h3>
                      {meal.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{meal.description}</p>
                      )}
                    </div>
                    <MealActions meal={meal} />
                  </div>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_STYLES[tag] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {TAG_LABELS[tag] ?? tag}
                        </span>
                      ))}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                        {meal.mealType}
                      </span>
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="flex gap-3 text-xs text-gray-500">
                    {meal.caloriesEstimate && (
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3" /> {meal.caloriesEstimate} kcal
                      </span>
                    )}
                    {meal.proteinG && (
                      <span className="flex items-center gap-1">
                        <Dumbbell className="w-3 h-3" /> {meal.proteinG}g protein
                      </span>
                    )}
                    {meal.prepTimeMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {meal.prepTimeMinutes} min
                      </span>
                    )}
                  </div>

                  {/* Ingredient count */}
                  {meal.ingredients.length > 0 && (
                    <p className="text-xs text-gray-400 mt-2">
                      {meal.ingredients.length} ingredient{meal.ingredients.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
