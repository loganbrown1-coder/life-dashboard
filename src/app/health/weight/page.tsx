import { HealthNav } from "@/components/health/health-nav";
import { WeightDashboard } from "@/components/health/weight-dashboard";
import { getAllWeightLogs } from "@/db/queries/weight";

export default async function WeightPage() {
  const allLogs = await getAllWeightLogs();

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Weight</h1>
        <p className="text-gray-500 mt-1">Track your progress over time</p>
      </div>
      <HealthNav />
      <WeightDashboard allLogs={allLogs.map((l) => ({ date: l.date, weightKg: l.weightKg }))} />
    </div>
  );
}
