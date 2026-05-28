import { FinancesNav } from "@/components/finances/finances-nav";
import { SavingsGoalCard } from "@/components/finances/savings-goal-card";
import { AddSavingsGoalDialog } from "@/components/finances/add-savings-goal-dialog";
import { getSavingsGoals, getAccounts } from "@/db/queries/finances";
import { PiggyBank } from "lucide-react";

export default async function SavingsPage() {
  const [goals, accounts] = await Promise.all([getSavingsGoals(), getAccounts()]);

  const totalCurrent = goals.reduce((s, g) => s + g.currentAmountGbp, 0);
  const totalTarget  = goals.reduce((s, g) => s + g.targetAmountGbp, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Finances</h1>
          <p className="text-gray-500 mt-1">Savings goals</p>
        </div>
        <AddSavingsGoalDialog />
      </div>

      <FinancesNav />

      {goals.length > 0 && (
        <div className="flex items-center gap-6 mb-4 text-sm">
          <div>
            <span className="text-gray-500">Total saved: </span>
            <span className="font-semibold text-gray-900">£{totalCurrent.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500">Target: </span>
            <span className="font-semibold text-gray-900">£{totalTarget.toLocaleString()}</span>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
          <PiggyBank className="w-12 h-12 text-gray-200 mb-4" />
          <h2 className="text-lg font-medium text-gray-700 mb-1">No savings goals yet</h2>
          <p className="text-sm text-gray-400 mb-4">Add a goal to start tracking your progress</p>
          <AddSavingsGoalDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((g) => (
            <SavingsGoalCard key={g.id} goal={g} accounts={accounts} />
          ))}
        </div>
      )}
    </div>
  );
}
