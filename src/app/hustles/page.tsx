import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { getHustles } from "@/db/queries/hustles";
import { getRevenueInRange, getTimeLogsInRange } from "@/db/queries/hustles";
import { getCurrencyRates } from "@/db/queries/finances";
import { AddHustleDialog } from "@/components/hustles/add-hustle-dialog";

function toGbp(amount: number, currency: string, rates: Record<string, number>) {
  if (currency === "GBP") return amount;
  return amount * (rates[currency] ?? 1);
}

export default async function HustlesPage() {
  const now = new Date();
  const from = format(startOfMonth(now), "yyyy-MM-dd");
  const to   = format(endOfMonth(now),   "yyyy-MM-dd");

  const [hustles, allRevenue, allTimeLogs, rateRows] = await Promise.all([
    getHustles(),
    getRevenueInRange(from, to),
    getTimeLogsInRange(from, to),
    getCurrencyRates(),
  ]);

  const rates: Record<string, number> = {};
  rateRows.forEach((r) => { rates[r.currencyCode] = r.rateToGbp; });

  const totalRevenue = allRevenue.reduce((sum, r) => sum + toGbp(r.amount, r.currency, rates), 0);
  const totalMinutes = allTimeLogs.reduce((sum, l) => sum + l.minutes, 0);
  const totalHours   = totalMinutes / 60;
  const effectiveRate = totalHours > 0 ? totalRevenue / totalHours : 0;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Side Hustles</h1>
        <AddHustleDialog />
      </div>

      {/* Month summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Revenue this month</p>
          <p className="text-2xl font-bold text-teal-600">£{totalRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Hours this month</p>
          <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
        </div>
        <div className="rounded-xl border bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Effective £/hour</p>
          <p className="text-2xl font-bold">{effectiveRate > 0 ? `£${effectiveRate.toFixed(2)}` : "—"}</p>
        </div>
      </div>

      {hustles.length === 0 && (
        <p className="text-gray-400 text-center py-12">No hustles yet — add one above.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {hustles.map((hustle) => {
          const monthRevenue = allRevenue
            .filter((r) => r.hustleId === hustle.id)
            .reduce((sum, r) => sum + toGbp(r.amount, r.currency, rates), 0);
          const monthMinutes = allTimeLogs
            .filter((l) => l.hustleId === hustle.id)
            .reduce((sum, l) => sum + l.minutes, 0);
          const monthHours = monthMinutes / 60;

          return (
            <Link
              key={hustle.id}
              href={`/hustles/${hustle.id}`}
              className="rounded-xl border bg-white shadow-sm p-4 hover:shadow-md transition-shadow group"
              style={{ borderLeftColor: hustle.colour, borderLeftWidth: 4 }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{hustle.name}</h3>
                  {hustle.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{hustle.description}</p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-teal-500 shrink-0 mt-0.5 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">This month</p>
                  <p className="text-lg font-bold text-teal-600">£{monthRevenue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Hours</p>
                  <p className="text-lg font-bold">{monthHours.toFixed(1)}h</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
