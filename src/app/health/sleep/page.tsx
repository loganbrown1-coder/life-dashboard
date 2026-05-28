import { HealthNav } from "@/components/health/health-nav";
import { getSleepLogs, getLastNightSleep, getAverageSleep } from "@/db/queries/sleep";
import { SleepChart } from "@/components/health/sleep-chart";
import { LogSleepForm } from "@/components/health/log-sleep-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon } from "lucide-react";

function fmtDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default async function SleepPage() {
  const [logs, lastNight, avg7] = await Promise.all([
    getSleepLogs(30),
    getLastNightSleep(),
    getAverageSleep(7),
  ]);

  const avgHours = avg7 ? (avg7 / 60).toFixed(1) : null;
  const lastHours = lastNight ? fmtDuration(lastNight.durationMinutes) : null;

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Health</h1>
        <p className="text-gray-500 mt-1">Sleep tracking</p>
      </div>

      <HealthNav />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-500" />
              <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last night</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-gray-900">{lastHours ?? "—"}</div>
            <div className="text-xs text-gray-400 mt-0.5">{lastNight?.date ?? "not logged"}</div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-500" />
              <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">7-day average</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-gray-900">
              {avgHours ? `${avgHours}h` : "—"}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">per night</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {logs.length > 0 ? (
        <Card className="rounded-xl shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-base">Last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <SleepChart data={logs.map((l) => ({ date: l.date, hours: +(l.durationMinutes / 60).toFixed(2) }))} />
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm mb-6">
          No sleep logs yet — use the form below to log your first entry.
        </div>
      )}

      {/* Log form */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Log sleep</CardTitle>
        </CardHeader>
        <CardContent>
          <LogSleepForm />
        </CardContent>
      </Card>
    </div>
  );
}
