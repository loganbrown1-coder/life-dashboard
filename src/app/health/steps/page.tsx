import { HealthNav } from "@/components/health/health-nav";
import { StepsDashboard } from "@/components/health/steps-dashboard";
import { getAllSteps, getTodaySteps } from "@/db/queries/steps";

export default async function StepsPage() {
  const [allSteps, todaySteps] = await Promise.all([
    getAllSteps(),
    getTodaySteps(),
  ]);

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Steps</h1>
        <p className="text-gray-500 mt-1">Daily step tracking</p>
      </div>
      <HealthNav />
      <StepsDashboard
        allSteps={allSteps.map((s) => ({ date: s.date, stepCount: s.stepCount }))}
        todaySteps={todaySteps}
      />
    </div>
  );
}
