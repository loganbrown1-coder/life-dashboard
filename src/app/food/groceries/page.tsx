import { FoodNav } from "@/components/food/food-nav";
import { GroceryClient } from "@/components/food/grocery-client";
import { getGroceryListForWeek } from "@/db/queries/food";
import { startOfWeek, format } from "date-fns";

export default async function GroceriesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const weekStart = params.week ?? format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const groceryList = await getGroceryListForWeek(weekStart);

  type GroceryItem = {
    name: string;
    totalQuantity: number | null;
    unit: string | null;
    aisle: string;
    checked: boolean;
  };

  const items: GroceryItem[] = groceryList
    ? (() => { try { return JSON.parse(groceryList.items); } catch { return []; } })()
    : [];

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Food</h1>
        <p className="text-gray-500 mt-1">Grocery list</p>
      </div>

      <FoodNav />

      <GroceryClient
        weekStart={weekStart}
        items={items}
        generatedAt={groceryList?.generatedAt ?? null}
      />
    </div>
  );
}
