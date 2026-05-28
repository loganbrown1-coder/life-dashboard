import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthNav } from "@/components/health/health-nav";
import { SupplementTakeButton } from "@/components/health/supplement-take-button";
import { getActiveSupplements, isTakenToday, getWeeklyAdherence, getSupplementLogsLast30Days } from "@/db/queries/supplements";
import { Pill } from "lucide-react";

export default async function SupplementsPage() {
  const supplements = await getActiveSupplements();
  const adherencePct = await getWeeklyAdherence();

  // Check taken status for each supplement
  const takenStatus = await Promise.all(
    supplements.map(async (s) => ({
      id: s.id,
      takenToday: await isTakenToday(s.id),
    }))
  );
  const takenMap = Object.fromEntries(takenStatus.map((t) => [t.id, t.takenToday]));

  const takenCount = Object.values(takenMap).filter(Boolean).length;

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Supplements</h1>
        <p className="text-gray-500 mt-1">Daily supplement tracking</p>
      </div>

      <HealthNav />

      {/* Today's progress */}
      <Card className="rounded-xl shadow-sm mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-medium text-gray-900">Today</p>
              <p className="text-sm text-gray-500">
                {takenCount} of {supplements.length} taken
              </p>
            </div>
            <div
              className="text-2xl font-bold"
              style={{ color: takenCount === supplements.length ? "#10b981" : "#0d9488" }}
            >
              {supplements.length > 0 ? Math.round((takenCount / supplements.length) * 100) : 0}%
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: supplements.length > 0 ? `${(takenCount / supplements.length) * 100}%` : "0%",
                backgroundColor: takenCount === supplements.length ? "#10b981" : "#0d9488",
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Supplement list */}
      <Card className="rounded-xl shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-base">Active Supplements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {supplements.length === 0 ? (
            <div className="p-6 text-center">
              <Pill className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No supplements yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {supplements.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0d9488]/10 flex items-center justify-center">
                      <Pill className="w-4 h-4 text-[#0d9488]" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{s.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {s.dosage && <span className="text-xs text-gray-500">{s.dosage}</span>}
                        <Badge className="text-xs capitalize bg-gray-100 text-gray-600">
                          {s.timeOfDay}
                        </Badge>
                        <Badge className="text-xs capitalize bg-gray-100 text-gray-600">
                          {s.schedule}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <SupplementTakeButton
                    supplementId={s.id}
                    takenToday={takenMap[s.id] ?? false}
                    name={s.name}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly adherence */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Weekly Adherence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div
              className="text-4xl font-bold"
              style={{ color: adherencePct >= 80 ? "#10b981" : adherencePct >= 50 ? "#f59e0b" : "#ef4444" }}
            >
              {adherencePct}%
            </div>
            <div>
              <div className="text-sm text-gray-700">
                {adherencePct >= 80 ? "Great consistency! 🎉" : adherencePct >= 50 ? "Getting there — keep it up" : "Let's build the habit"}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Last 7 days</div>
            </div>
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${adherencePct}%`,
                backgroundColor: adherencePct >= 80 ? "#10b981" : adherencePct >= 50 ? "#f59e0b" : "#ef4444",
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
