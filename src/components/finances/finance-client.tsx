"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, TrendingUp, TrendingDown, ChevronDown, ChevronUp, PiggyBank, PoundSterling } from "lucide-react";
import { setFinanceSetting } from "@/actions/finances";
import { logPotRemaining } from "@/actions/check-in";
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, isSameWeek, differenceInDays, subWeeks } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

type Checkin = { id: string; date: string; weekStart: string; remainingGbp: number };

type Props = {
  weeklyPotGbp:  number | null;
  savingsPotGbp: number | null;
  checkins:      Checkin[];
  currentWeekStart: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() { return format(new Date(), "yyyy-MM-dd"); }

function latestCheckinForWeek(checkins: Checkin[], weekStart: string): Checkin | null {
  const week = checkins.filter((c) => c.weekStart === weekStart);
  if (!week.length) return null;
  return week.sort((a, b) => b.date.localeCompare(a.date))[0];
}

function daysLeftInWeek(): number {
  const now = new Date(); now.setHours(0,0,0,0);
  const end = endOfWeek(now, { weekStartsOn: 1 }); end.setHours(0,0,0,0);
  return Math.max(0, differenceInDays(end, now));
}

function weekLabel(weekStart: string): string {
  const s = parseISO(weekStart);
  const e = endOfWeek(s, { weekStartsOn: 1 });
  return `${format(s, "d MMM")} – ${format(e, "d MMM")}`;
}

// ── Main component ────────────────────────────────────────────────────────────

export function FinanceClient({ weeklyPotGbp, savingsPotGbp, checkins, currentWeekStart }: Props) {
  // Build list of the last 8 weeks (most recent first)
  const recentWeeks: string[] = [];
  for (let i = 0; i < 8; i++) {
    recentWeeks.push(format(startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 }), "yyyy-MM-dd"));
  }

  const pot = weeklyPotGbp ?? 200;
  const latestThisWeek = latestCheckinForWeek(checkins, currentWeekStart);

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-12">

      {/* ── This week hero ── */}
      <ThisWeekCard
        pot={pot}
        latestCheckin={latestThisWeek}
        weeklyPotGbp={weeklyPotGbp}
      />

      {/* ── Quick update ── */}
      <QuickUpdateCard pot={pot} />

      {/* ── Savings pot ── */}
      <SavingsPotCard savingsPotGbp={savingsPotGbp} />

      {/* ── Settings: change pot ── */}
      <SetPotRow current={pot} hasBeenSet={weeklyPotGbp !== null} />

      {/* ── History: last 8 weeks ── */}
      <WeekHistory weeks={recentWeeks} checkins={checkins} pot={pot} currentWeekStart={currentWeekStart} />
    </div>
  );
}

// ── This week hero ─────────────────────────────────────────────────────────────

function ThisWeekCard({ pot, latestCheckin, weeklyPotGbp }: { pot: number; latestCheckin: Checkin | null; weeklyPotGbp: number | null }) {
  const daysLeft   = daysLeftInWeek();
  const remaining  = latestCheckin?.remainingGbp ?? null;
  const spent      = remaining !== null ? pot - remaining : null;
  const pct        = remaining !== null ? Math.min(100, Math.round(((pot - remaining) / pot) * 100)) : 0;
  const isOver     = remaining !== null && remaining < 0;
  const barColour  = isOver ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#0d9488";
  const checkinAge = latestCheckin
    ? latestCheckin.date === today()
      ? "Updated today"
      : `Updated ${format(parseISO(latestCheckin.date), "EEE d MMM")}`
    : null;

  return (
    <div className={`rounded-2xl border-2 bg-white shadow-sm overflow-hidden ${isOver ? "border-red-200" : "border-teal-200"}`}>
      <div className={`px-5 py-5 ${isOver ? "bg-red-50/50" : "bg-teal-50/30"}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">This week</span>
          <span className="text-xs text-gray-400">{daysLeft === 0 ? "Last day" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}</span>
        </div>

        {remaining !== null ? (
          <>
            <div className="flex items-end gap-2 mt-2 mb-1">
              <span className={`text-5xl font-bold tabular-nums ${isOver ? "text-red-500" : remaining < pot * 0.2 ? "text-amber-500" : "text-gray-900"}`}>
                £{Math.abs(remaining).toFixed(0)}
              </span>
              <span className="text-xl text-gray-400 mb-1">{isOver ? "over" : "left"}</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {spent !== null && `£${spent.toFixed(0)} spent`} of £{pot} pot
              {daysLeft > 0 && remaining > 0 && ` · ~£${(remaining / daysLeft).toFixed(0)}/day`}
            </p>

            {/* Progress bar */}
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColour }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-gray-400">{pct}% spent</span>
              {checkinAge && <span className="text-xs text-gray-400">{checkinAge}</span>}
            </div>
          </>
        ) : (
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-300">£{pot} pot</p>
            <p className="text-sm text-gray-400 mt-1">
              {weeklyPotGbp ? "No check-in yet this week — update below" : "Set your weekly pot below to get started"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quick update (log how much is left) ───────────────────────────────────────

function QuickUpdateCard({ pot }: { pot: number }) {
  const [value, setValue] = useState("");
  const [, start]         = useTransition();

  function handleSave() {
    const n = parseFloat(value);
    if (isNaN(n) || n < 0) { toast.error("Enter a valid amount"); return; }
    start(async () => {
      await logPotRemaining(n);
      toast.success(`£${n.toFixed(0)} left this week — logged ✓`);
      setValue("");
    });
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <PoundSterling className="w-4 h-4 text-teal-600" />
        <span className="text-sm font-semibold text-gray-700">How much left this week?</span>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">£</span>
          <input
            type="number"
            inputMode="decimal"
            step="1"
            min="0"
            placeholder={`e.g. ${Math.round(pot * 0.6)}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            className="w-full rounded-xl border border-gray-200 pl-7 pr-3 py-3 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <button
          onClick={handleSave}
          className="px-5 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold transition-colors"
        >
          Update
        </button>
      </div>
    </div>
  );
}

// ── Savings pot ───────────────────────────────────────────────────────────────

function SavingsPotCard({ savingsPotGbp }: { savingsPotGbp: number | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(savingsPotGbp !== null ? String(savingsPotGbp) : "");
  const [, start]             = useTransition();

  function handleSave() {
    const n = parseFloat(value);
    if (isNaN(n) || n < 0) { toast.error("Enter a valid amount"); return; }
    start(async () => {
      await setFinanceSetting("savings_pot_gbp", String(n));
      toast.success(`Savings updated to £${n.toLocaleString()} ✓`);
      setEditing(false);
    });
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
            <PiggyBank className="w-4.5 h-4.5 text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Savings pot</p>
            {savingsPotGbp !== null ? (
              <p className="text-2xl font-bold tabular-nums text-gray-900">£{savingsPotGbp.toLocaleString()}</p>
            ) : (
              <p className="text-sm text-gray-400">Not set yet</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium px-3 py-1.5 rounded-lg hover:bg-teal-50"
        >
          <Pencil className="w-3.5 h-3.5" />
          {savingsPotGbp !== null ? "Update" : "Set"}
        </button>
      </div>

      {editing && (
        <div className="border-t px-4 pb-4 pt-3 flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">£</span>
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              step="1"
              placeholder="e.g. 5000"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setEditing(false);
              }}
              className="w-full rounded-xl border border-gray-200 pl-7 pr-3 py-2.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <button onClick={handleSave} className="px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold transition-colors">Save</button>
          <button onClick={() => setEditing(false)} className="px-3 py-2.5 text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
        </div>
      )}
    </div>
  );
}

// ── Set / change weekly pot amount ────────────────────────────────────────────

function SetPotRow({ current, hasBeenSet }: { current: number; hasBeenSet: boolean }) {
  const [editing, setEditing] = useState(!hasBeenSet);
  const [value, setValue]     = useState(String(current));
  const [, start]             = useTransition();

  function handleSave() {
    const n = parseFloat(value);
    if (!n || n <= 0) return;
    start(async () => {
      await setFinanceSetting("weekly_pot_gbp", String(n));
      toast.success(`Weekly pot set to £${n}`);
      setEditing(false);
    });
  }

  if (!hasBeenSet && editing) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50 p-5">
        <p className="font-semibold text-teal-800 mb-1">Set your weekly pot 💰</p>
        <p className="text-sm text-teal-600 mb-4">
          How much do you transfer into your spending account each Monday?
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">£</span>
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              placeholder="200"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              className="w-full rounded-xl border border-teal-200 pl-7 pr-3 py-2.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
            />
          </div>
          <button onClick={handleSave} className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold transition-colors">
            Set
          </button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-white shadow-sm px-4 py-3">
        <span className="text-sm text-gray-500 shrink-0">Weekly pot:</span>
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">£</span>
          <input
            autoFocus type="number" value={value} onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            className="w-full rounded-lg border pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <button onClick={handleSave} className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600">Save</button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full flex items-center justify-between rounded-xl border bg-white shadow-sm px-4 py-3 hover:bg-gray-50 group"
    >
      <span className="text-sm text-gray-500">Weekly pot amount</span>
      <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        £{current.toLocaleString()}/week
        <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
      </span>
    </button>
  );
}

// ── Past weeks history ────────────────────────────────────────────────────────

function WeekHistory({ weeks, checkins, pot, currentWeekStart }: {
  weeks: string[];
  checkins: Checkin[];
  pot: number;
  currentWeekStart: string;
}) {
  const [showAll, setShowAll] = useState(false);
  // Exclude current week from history (it's shown in the hero)
  const pastWeeks = weeks.filter((w) => w !== currentWeekStart);
  const visible   = showAll ? pastWeeks : pastWeeks.slice(0, 4);
  const hasMore   = pastWeeks.length > 4;

  // Only show if there's at least one past check-in
  const hasData = pastWeeks.some((w) => latestCheckinForWeek(checkins, w) !== null);
  if (!hasData) return null;

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h2 className="text-sm font-semibold text-gray-700">Past weeks</h2>
      </div>
      <div className="divide-y">
        {visible.map((weekStart) => {
          const latest  = latestCheckinForWeek(checkins, weekStart);
          const weekCheckins = checkins
            .filter((c) => c.weekStart === weekStart)
            .sort((a, b) => a.date.localeCompare(b.date));

          if (!latest) return (
            <div key={weekStart} className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-400">{weekLabel(weekStart)}</span>
              <span className="text-xs text-gray-300">No check-in</span>
            </div>
          );

          const remaining = latest.remainingGbp;
          const spent     = pot - remaining;
          const pct       = Math.min(100, Math.max(0, Math.round((spent / pot) * 100)));
          const isOver    = remaining < 0;
          const barCol    = isOver ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#0d9488";

          // Trend: first vs last check-in of the week
          const first = weekCheckins[0];
          const trend = weekCheckins.length > 1
            ? first.remainingGbp - latest.remainingGbp
            : null; // positive = spent more over the week (going down is expected)

          return (
            <div key={weekStart} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{weekLabel(weekStart)}</span>
                <div className="flex items-center gap-2">
                  {trend !== null && trend > 0 && (
                    <span className="text-xs text-gray-400 flex items-center gap-0.5">
                      <TrendingDown className="w-3 h-3 text-red-400" />
                      £{trend.toFixed(0)} spent across week
                    </span>
                  )}
                  <span className={`text-sm font-semibold tabular-nums ${isOver ? "text-red-500" : "text-gray-700"}`}>
                    {isOver ? `-£${Math.abs(remaining).toFixed(0)} over` : `£${remaining.toFixed(0)} left`}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barCol }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400">{pct}% spent</span>
                <span className="text-[10px] text-gray-400">
                  Updated {format(parseISO(latest.date), "EEE d MMM")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-3 text-sm text-teal-600 font-medium hover:bg-gray-50 flex items-center justify-center gap-1 border-t"
        >
          {showAll
            ? <><ChevronUp className="w-4 h-4" /> Show less</>
            : <><ChevronDown className="w-4 h-4" /> Show older weeks</>}
        </button>
      )}
    </div>
  );
}
