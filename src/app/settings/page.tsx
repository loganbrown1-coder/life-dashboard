import { db } from "@/db";
import { currencyRates, accounts as accountsTable, budgets as budgetsTable } from "@/db/schema";
import { getRoutinesWithItems } from "@/db/queries/routines";
import { getUserOptions } from "@/db/queries/user-options";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const [rates, accounts, budgets, routinesRaw, workoutTypes, txCategories] = await Promise.all([
    db.select().from(currencyRates).orderBy(currencyRates.currencyCode),
    db.select().from(accountsTable).orderBy(accountsTable.name),
    db.select().from(budgetsTable).orderBy(budgetsTable.category),
    getRoutinesWithItems(),
    getUserOptions("workout_type"),
    getUserOptions("transaction_category"),
  ]);

  const routines = routinesRaw.map((r) => ({
    id: r.id,
    name: r.name,
    timeOfDay: r.timeOfDay,
    items: r.items.map((i) => ({ id: i.id, label: i.label })),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your accounts, budgets, routines, and data</p>
      </div>

      <SettingsClient
        rates={rates}
        accounts={accounts}
        budgets={budgets}
        routines={routines}
        workoutTypes={workoutTypes}
        txCategories={txCategories}
      />
    </div>
  );
}
