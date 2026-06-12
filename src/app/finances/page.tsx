import { FinanceClient } from "@/components/finances/finance-client";
import { db } from "@/db";
import { userOptions, potCheckins } from "@/db/schema";
import { and, eq, gte } from "drizzle-orm";
import { format, startOfWeek, subWeeks } from "date-fns";

export default async function FinancesPage() {
  const now       = new Date();
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const since     = format(subWeeks(now, 8), "yyyy-MM-dd");

  const [potSetting, savingsSetting, checkins] = await Promise.all([
    db.select().from(userOptions)
      .where(and(eq(userOptions.type, "finance_setting"), eq(userOptions.value, "weekly_pot_gbp")))
      .limit(1).get(),
    db.select().from(userOptions)
      .where(and(eq(userOptions.type, "finance_setting"), eq(userOptions.value, "savings_pot_gbp")))
      .limit(1).get(),
    db.select().from(potCheckins).where(gte(potCheckins.date, since)).all(),
  ]);

  const weeklyPotGbp  = potSetting     ? Number(potSetting.label)     : null;
  const savingsPotGbp = savingsSetting ? Number(savingsSetting.label) : null;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-gray-900">Finances</h1>
        <p className="text-gray-500 mt-1">{format(now, "MMMM yyyy")}</p>
      </div>

      <FinanceClient
        weeklyPotGbp={weeklyPotGbp}
        savingsPotGbp={savingsPotGbp}
        checkins={checkins.map((c) => ({
          id: c.id, date: c.date, weekStart: c.weekStart, remainingGbp: c.remainingGbp,
        }))}
        currentWeekStart={weekStart}
      />
    </div>
  );
}
