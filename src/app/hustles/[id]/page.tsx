import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Trash2 } from "lucide-react";
import { format, subMonths, subWeeks, startOfMonth } from "date-fns";
import { getHustleById, getRevenueForHustle, getTimeLogsForHustle } from "@/db/queries/hustles";
import { getCurrencyRates } from "@/db/queries/finances";
import { LogRevenueDialog } from "@/components/hustles/log-revenue-dialog";
import { LogTimeDialog } from "@/components/hustles/log-time-dialog";
import { RevenueChart } from "@/components/hustles/revenue-chart";
import { TimeChart } from "@/components/hustles/time-chart";
import { deleteRevenue, deleteTimeLog } from "@/actions/hustles";

function toGbp(amount: number, currency: string, rates: Record<string, number>) {
  if (currency === "GBP") return amount;
  return amount * (rates[currency] ?? 1);
}

export default async function HustleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hustle = await getHustleById(id);
  if (!hustle) notFound();

  const chartFrom = format(startOfMonth(subMonths(new Date(), 11)), "yyyy-MM-dd");
  const today     = format(new Date(), "yyyy-MM-dd");

  const [revenue, timeLogs, rateRows] = await Promise.all([
    getRevenueForHustle(id, chartFrom, today),
    getTimeLogsForHustle(hustle.id, chartFrom, today),
    getCurrencyRates(),
  ]);

  const rates: Record<string, number> = {};
  rateRows.forEach((r) => { rates[r.currencyCode] = r.rateToGbp; });

  const totalRevenue = revenue.reduce((sum, r) => sum + toGbp(r.amount, r.currency, rates), 0);
  const totalMinutes = timeLogs.reduce((sum, l) => sum + l.minutes, 0);
  const totalHours   = totalMinutes / 60;
  const effectiveRate = totalHours > 0 ? totalRevenue / totalHours : 0;

  const recentRevenue  = revenue.slice(0, 10);
  const recentTimeLogs = timeLogs.slice(0, 10);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-2">
        <Link href="/hustles" className="text-gray-400 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: hustle.colour }} />
          <h1 className="text-2xl font-bold">{hustle.name}</h1>
        </div>
      </div>

      {hustle.description && (
        <p className="text-gray-500">{hustle.description}</p>
      )}

      {/* All-time stats for shown range */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Revenue (12 mo)</p>
          <p className="text-xl font-bold text-teal-600">£{totalRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border bg-white shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Hours (12 mo)</p>
          <p className="text-xl font-bold">{totalHours.toFixed(1)}h</p>
        </div>
        <div className="rounded-xl border bg-white shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Effective £/hr</p>
          <p className="text-xl font-bold">{effectiveRate > 0 ? `£${effectiveRate.toFixed(2)}` : "—"}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <LogRevenueDialog hustleId={hustle.id} />
        <LogTimeDialog hustleId={hustle.id} />
      </div>

      {/* Revenue chart */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Monthly Revenue</h2>
        <div className="rounded-xl border bg-white shadow-sm p-4">
          <RevenueChart revenue={revenue} rates={rates} />
        </div>
      </section>

      {/* Time chart */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Weekly Hours</h2>
        <div className="rounded-xl border bg-white shadow-sm p-4">
          <TimeChart logs={timeLogs} />
        </div>
      </section>

      {/* Recent revenue table */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Recent Revenue</h2>
        {recentRevenue.length === 0 ? (
          <p className="text-sm text-gray-400">No revenue logged yet.</p>
        ) : (
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Amount</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Source</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Notes</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentRevenue.map((r) => (
                  <tr key={r.id} className="group hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500">{r.date}</td>
                    <td className="px-4 py-2.5 font-medium">
                      {r.currency !== "GBP" ? `${r.currency} ${r.amount.toFixed(2)} ` : ""}
                      £{toGbp(r.amount, r.currency, rates).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{r.source ?? "—"}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{r.notes ?? ""}</td>
                    <td className="px-2 py-2.5">
                      <form action={async () => { "use server"; await deleteRevenue(r.id, hustle.id); }}>
                        <button type="submit" className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent time logs table */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Recent Time Logs</h2>
        {recentTimeLogs.length === 0 ? (
          <p className="text-sm text-gray-400">No time logged yet.</p>
        ) : (
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Time</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Description</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentTimeLogs.map((l) => (
                  <tr key={l.id} className="group hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500">{l.date}</td>
                    <td className="px-4 py-2.5 font-medium">
                      {l.minutes >= 60
                        ? `${Math.floor(l.minutes / 60)}h ${l.minutes % 60 > 0 ? `${l.minutes % 60}m` : ""}`
                        : `${l.minutes}m`}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{l.description ?? "—"}</td>
                    <td className="px-2 py-2.5">
                      <form action={async () => { "use server"; await deleteTimeLog(l.id, hustle.id); }}>
                        <button type="submit" className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
