import { getProjectsWithTasks, getStandaloneTasks } from "@/db/queries/projects";
import { getHustles, getTimeLogsInRange } from "@/db/queries/hustles";
import { WorkBoard } from "@/components/work/work-board";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default async function WorkPage() {
  const now  = new Date();
  const from = format(startOfMonth(now), "yyyy-MM-dd");
  const to   = format(endOfMonth(now),   "yyyy-MM-dd");
  const today = format(now, "yyyy-MM-dd");

  const [projects, standaloneTasks, hustles, timeLogs] = await Promise.all([
    getProjectsWithTasks(),
    getStandaloneTasks(),
    getHustles(),
    getTimeLogsInRange(from, to),
  ]);

  // Attach month hours to each hustle
  const hustlesWithHours = hustles.map((h) => ({
    ...h,
    monthMinutes: timeLogs.filter((l) => l.hustleId === h.id).reduce((s, l) => s + l.minutes, 0),
  }));

  return (
    <WorkBoard
      projects={projects}
      hustles={hustlesWithHours}
      standaloneTasks={standaloneTasks}
      today={today}
    />
  );
}
