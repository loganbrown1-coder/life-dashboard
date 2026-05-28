import { FinancesNav } from "@/components/finances/finances-nav";
import { BillActions } from "@/components/finances/bill-actions";
import { AddBillDialog } from "@/components/finances/add-bill-dialog";
import { getBills, getAccounts, getCurrencyRates } from "@/db/queries/finances";
import { Receipt } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

export default async function BillsPage() {
  const [bills, accounts, rates] = await Promise.all([
    getBills(),
    getAccounts(),
    getCurrencyRates(),
  ]);

  const today = format(new Date(), "yyyy-MM-dd");
  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]));

  const overdue   = bills.filter((b) => b.nextDueDate < today);
  const upcoming  = bills.filter((b) => b.nextDueDate >= today);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Finances</h1>
          <p className="text-gray-500 mt-1">Recurring bills</p>
        </div>
        <AddBillDialog accounts={accounts} />
      </div>

      <FinancesNav />

      {bills.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
          <Receipt className="w-12 h-12 text-gray-200 mb-4" />
          <h2 className="text-lg font-medium text-gray-700 mb-1">No bills yet</h2>
          <p className="text-sm text-gray-400 mb-4">Add your recurring bills to track payment dates</p>
          <AddBillDialog accounts={accounts} />
        </div>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Overdue</h2>
              <div className="space-y-2">
                {overdue.map((b) => <BillRow key={b.id} bill={b} accountMap={accountMap} rates={rates} today={today} />)}
              </div>
            </div>
          )}
          <div>
            {overdue.length > 0 && <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Upcoming</h2>}
            <div className="space-y-2">
              {upcoming.map((b) => <BillRow key={b.id} bill={b} accountMap={accountMap} rates={rates} today={today} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type RateRow = { currencyCode: string; rateToGbp: number };

function BillRow({
  bill, accountMap, rates, today,
}: {
  bill: { id: string; name: string; amount: number; currency: string; frequency: string; nextDueDate: string; category: string; autoPay: boolean; accountId?: string | null };
  accountMap: Record<string, string>;
  rates: RateRow[];
  today: string;
}) {
  const daysUntil = differenceInDays(parseISO(bill.nextDueDate), parseISO(today));
  const isOverdue = daysUntil < 0;
  const isDueSoon = !isOverdue && daysUntil <= 7;
  const rateToGbp = rates.find((r) => r.currencyCode === bill.currency)?.rateToGbp ?? 1;
  const gbpAmount = +(bill.amount * rateToGbp).toFixed(2);

  return (
    <div className={`rounded-xl border bg-white p-4 flex items-center gap-4 ${isOverdue ? "border-red-200 bg-red-50/30" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-800">{bill.name}</h3>
          {bill.autoPay && (
            <span className="text-xs bg-blue-100 text-blue-600 rounded-full px-2 py-0.5 font-medium">Auto-pay</span>
          )}
          <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 capitalize">{bill.frequency}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
          <span>{bill.category}</span>
          {bill.accountId && accountMap[bill.accountId] && <span>· {accountMap[bill.accountId]}</span>}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-gray-900 tabular-nums">
          {bill.currency !== "GBP" ? `${bill.currency} ${bill.amount.toFixed(2)}` : `£${bill.amount.toFixed(2)}`}
        </p>
        {bill.currency !== "GBP" && (
          <p className="text-xs text-gray-400 tabular-nums">£{gbpAmount.toFixed(2)}</p>
        )}
        <p className={`text-xs font-medium ${isOverdue ? "text-red-500" : isDueSoon ? "text-amber-500" : "text-gray-400"}`}>
          {isOverdue
            ? `${Math.abs(daysUntil)}d overdue`
            : daysUntil === 0
            ? "Due today"
            : `Due in ${daysUntil}d (${format(parseISO(bill.nextDueDate), "d MMM")})`}
        </p>
      </div>

      <BillActions bill={bill} rates={rates} />
    </div>
  );
}
