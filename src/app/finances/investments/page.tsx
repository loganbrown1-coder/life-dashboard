import { FinancesNav } from "@/components/finances/finances-nav";
import { InvestmentRow } from "@/components/finances/investment-row";
import { AddInvestmentDialog } from "@/components/finances/add-investment-dialog";
import { getInvestments } from "@/db/queries/finances";
import { TrendingUp } from "lucide-react";

export default async function InvestmentsPage() {
  const investments = await getInvestments();

  const totalValue = investments.reduce((s, i) => s + i.lastKnownValueGbp, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Finances</h1>
          <p className="text-gray-500 mt-1">Investment portfolio</p>
        </div>
        <AddInvestmentDialog />
      </div>

      <FinancesNav />

      {investments.length > 0 && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-[#0d9488]/5 rounded-xl border border-[#0d9488]/20">
          <TrendingUp className="w-4 h-4 text-[#0d9488]" />
          <span className="text-sm text-gray-600">Total portfolio value:</span>
          <span className="text-lg font-bold text-[#0d9488]">£{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      )}

      {investments.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
          <TrendingUp className="w-12 h-12 text-gray-200 mb-4" />
          <h2 className="text-lg font-medium text-gray-700 mb-1">No investments yet</h2>
          <p className="text-sm text-gray-400 mb-4">Add your ISA, stocks, or other investments</p>
          <AddInvestmentDialog />
        </div>
      ) : (
        <div className="space-y-2">
          {investments.map((inv) => (
            <InvestmentRow key={inv.id} inv={inv} />
          ))}
        </div>
      )}
    </div>
  );
}
