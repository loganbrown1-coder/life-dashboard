import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthNav } from "@/components/health/health-nav";
import { StepsChart } from "@/components/health/steps-chart";
import { LogStepsForm } from "@/components/health/log-steps-form";
import { getLast30DaysSteps, getTodaySteps } from "@/db/queries/steps";
import { Footprints } from "lucide-react";

export default async function StepsPage() {
  const [stepsData, todaySteps] = await Promise.all([
    getLast30DaysSteps(),
    getTodaySteps(),
  ]);

  const avg7 = stepsData.slice(-7).reduce((s, r) => s + r.stepCount, 0) /
    Math.max(1, Math.min(7, stepsData.slice(-7).length));
  const avg30 = stepsData.reduce((s, r) => s + r.stepCount, 0) /
    Math.max(1, stepsData.length);

  const chartData = stepsData.map((s) => ({ date: s.date, stepCount: s.stepCount }));

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Steps</h1>
        <p className="text-gray-500 mt-1">Daily step tracking</p>
      </div>

      <HealthNav />

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="rounded-xl shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {todaySteps > 0 ? todaySteps.toLocaleString() : "—"}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">today</div>
        </Card>
        <Card className="rounded-xl shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {stepsData.length >= 1 ? Math.round(avg7).toLocaleString() : "—"}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">7-day avg</div>
        </Card>
        <Card className="rounded-xl shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {stepsData.length >= 1 ? Math.round(avg30).toLocaleString() : "—"}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">30-day avg</div>
        </Card>
      </div>

      {/* Chart */}
      <Card className="rounded-xl shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-base">Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <div className="text-center">
                <Footprints className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No steps logged yet</p>
              </div>
            </div>
          ) : (
            <StepsChart data={chartData} />
          )}
        </CardContent>
      </Card>

      {/* Manual entry */}
      <Card className="rounded-xl shadow-sm mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Log Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <LogStepsForm />
        </CardContent>
      </Card>

      {/* CSV import info */}
      <Card className="rounded-xl shadow-sm border-dashed border-gray-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="bg-gray-100 rounded-lg p-2">
              <Footprints className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Import from Apple Health</p>
              <p className="text-sm text-gray-500 mt-1">
                On your iPhone: open <strong>Health</strong> app → tap your profile picture (top right) →{" "}
                <strong>Export All Health Data</strong> → share the zip to yourself. The step count CSV
                import feature will be added in a future update.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
