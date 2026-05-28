import { FinancesNav } from "@/components/finances/finances-nav";
import { AddTransactionDialog } from "@/components/finances/add-transaction-dialog";
import { TransactionsClient } from "@/components/finances/transactions-client";
import { getAccounts, getTransactionsForRange, getCurrencyRates } from "@/db/queries/finances";
import { getUserOptions } from "@/db/queries/user-options";
import { format, subMonths } from "date-fns";

export default async function TransactionsPage() {
  const end   = format(new Date(), "yyyy-MM-dd");
  const start = format(subMonths(new Date(), 3), "yyyy-MM-dd");

  const [accounts, txns, rates, categoryOptions] = await Promise.all([
    getAccounts(),
    getTransactionsForRange(start, end),
    getCurrencyRates(),
    getUserOptions("transaction_category"),
  ]);
  const categories = categoryOptions.map((o) => o.label);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Finances</h1>
          <p className="text-gray-500 mt-1">Last 3 months of transactions</p>
        </div>
        <AddTransactionDialog accounts={accounts} rates={rates} categories={categories} />
      </div>

      <FinancesNav />

      <TransactionsClient transactions={txns} accounts={accounts} />
    </div>
  );
}
