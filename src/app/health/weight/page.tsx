import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthNav } from "@/components/health/health-nav";
import { WeightChart } from "@/components/health/weight-chart";
import { LogWeightForm } from "@/components/health/log-weight-form";
import { getAllWeightLogs, getLatestWeight, getWeightNDaysAgo } from "@/db/queries/weight";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

function formatDelta(delta: number | null, label: string) {
  if (delta === null) return null;
  const abs = Math.abs(delta).toFixed(1);
  const up = delta > 0;
  const neutral = Math.abs(delta) < 0.05;
  return (
    <div className="text-center">
      <div className={`flex items-center justify-center gap-1 text-lg font-semibold ${
        neutral ? "text-gray-500" : up ? "text-[#f59e0b]" : "text-[#10b981]"
      }`}>
        {neutral ? <Minus className="w-4 h-4" /> : up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        {neutral ? "unchanged" : `${up ? "+" : "−"}${abs} kg`}
      </div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

export default async function WeightPage() {
  const [allLogs, latest, w7, w30] = await Promise.all([
    getAllWeightLogs(),
    getLatestWeight(),
    getWeightNDaysAgo(7),
    getWeightNDaysAgo(30),
  ]);

  const first = allLogs[0] ?? null;

  const delta7  = latest && w7  ? latest.weightKg - w7.weightKg  : null;
  const delta30 = latest && w30 ? latest.weightKg - w30.weightKg : null;
  const deltaStart = latest && first && first.id !== latest.id
    ? latest.weightKg - first.weightKg
    : null;

  // Chart data sorted oldest→newest
  const chartData = allLogs.map((l) => ({ date: l.date, weightKg: l.weightKg }));

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Weight</h1>
        <p className="text-gray-500 mt-1">
          {latest ? `Current: ${latest.weightKg} kg` : "No logs yet"}
        </p>
      </div>

      <HealthNav />

      {/* Quick log */}
      <Card className="rounded-xl shadow-sm mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Log Today&apos;s Weight</CardTitle>
        </CardHeader>
        <CardContent>
          <LogWeightForm />
        </CardContent>
      </Card>

      {/* Deltas */}
      {latest && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="rounded-xl shadow-sm p-4">
            {formatDelta(delta7, "vs 7 days ago") ?? (
              <div className="text-center text-sm text-gray-400">no 7d data</div>
            )}
          </Card>
          <Card className="rounded-xl shadow-sm p-4">
            {formatDelta(delta30, "vs 30 days ago") ?? (
              <div className="text-center text-sm text-gray-400">no 30d data</div>
            )}
          </Card>
          <Card className="rounded-xl shadow-sm p-4">
            {formatDelta(deltaStart, "vs starting weight") ?? (
              <div className="text-center text-sm text-gray-400">only 1 log</div>
            )}
          </Card>
        </div>
      )}

      {/* Chart */}
      <Card className="rounded-xl shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-base">Weight Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightChart data={chartData} />
        </CardContent>
      </Card>

      {/* Log history */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">All Logs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {allLogs.length === 0 ? (
            <p className="text-sm text-gray-400 p-6">No weight logs yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {[...allLogs].reverse().map((l) => (
                <div key={l.id} className="flex items-center justify-between px-6 py-3">
                  <span className="text-sm text-gray-500">{l.date}</span>
                  <span className="font-medium text-gray-900">{l.weightKg} kg</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
