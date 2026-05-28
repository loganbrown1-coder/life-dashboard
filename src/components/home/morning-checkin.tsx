"use client";

import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Moon, Footprints, X, ChevronRight, PoundSterling } from "lucide-react";
import { logSteps, logSleep } from "@/actions/health";
import { logQuickSpend } from "@/actions/finances";
import { upsertCheckIn } from "@/actions/check-in";
import { toast } from "sonner";

type Props = {
  /** Passed from server — null means no record yet for today */
  checkInDismissed: boolean;
  today: string;
};

type Step = "steps" | "sleep" | "spend" | "done";

export function MorningCheckIn({ checkInDismissed, today }: Props) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>("steps");
  const [stepsValue, setStepsValue]     = useState("");
  const [sleepHours, setSleepHours]     = useState("");
  const [sleepMinutes, setSleepMinutes] = useState("");
  const [spendValue, setSpendValue]     = useState("");
  const [saving, setSaving]             = useState(false);

  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  useEffect(() => {
    if (!checkInDismissed) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [checkInDismissed]);

  async function dismiss() {
    await upsertCheckIn(today, { dismissed: true });
    setVisible(false);
  }

  async function handleStepsDone() {
    if (stepsValue && Number(stepsValue) > 0) {
      setSaving(true);
      await logSteps({ date: yesterday, stepCount: Number(stepsValue) });
      await upsertCheckIn(today, { stepsLogged: true });
      setSaving(false);
      toast.success(`${Number(stepsValue).toLocaleString()} steps logged`);
    }
    setStep("sleep");
  }

  async function handleSleepDone() {
    const totalMins = (Number(sleepHours) || 0) * 60 + (Number(sleepMinutes) || 0);
    if (totalMins > 0) {
      setSaving(true);
      await logSleep(yesterday, totalMins);
      await upsertCheckIn(today, { sleepLogged: true });
      setSaving(false);
      const display = sleepHours
        ? `${sleepHours}h${sleepMinutes ? ` ${sleepMinutes}m` : ""}`
        : `${sleepMinutes}m`;
      toast.success(`${display} sleep logged`);
    }
    setStep("spend");
  }

  async function handleSpendDone() {
    const amount = Number(spendValue);
    if (amount > 0) {
      setSaving(true);
      const result = await logQuickSpend(yesterday, amount);
      if (result.ok) {
        await upsertCheckIn(today, { spendLogged: true, dismissed: true });
        toast.success(`£${amount.toFixed(2)} spending logged`);
      } else {
        // No bank account set up yet — warn instead of silently dropping the data
        toast.warning("No bank account set up yet — go to Finances → Settings to add one, then re-enter this amount.");
        await upsertCheckIn(today, { dismissed: true });
      }
      setSaving(false);
    } else {
      await upsertCheckIn(today, { dismissed: true });
    }
    setVisible(false);
  }

  if (!visible) return null;

  const stepNum   = step === "steps" ? 1 : step === "sleep" ? 2 : 3;
  const stepTotal = 3;

  return (
    <div className="rounded-xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-white shadow-sm p-5 relative">
      {/* Dismiss */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-gray-300 hover:text-gray-500"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Step dots */}
      <div className="flex items-center gap-1.5 mb-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1.5 rounded-full transition-all ${n === stepNum ? "w-6 bg-teal-500" : n < stepNum ? "w-3 bg-teal-300" : "w-3 bg-gray-200"}`}
          />
        ))}
        <span className="text-[10px] text-gray-400 ml-1">{stepNum}/{stepTotal}</span>
      </div>

      {/* Step 1: Steps */}
      {step === "steps" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Footprints className="w-5 h-5 text-teal-600" />
            <h3 className="font-semibold text-gray-900">Good morning! 👋</h3>
          </div>
          <p className="text-sm text-gray-600">How many steps did you do yesterday?</p>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="e.g. 9500"
              value={stepsValue}
              onChange={(e) => setStepsValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleStepsDone(); }}
              autoFocus
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <button
              onClick={handleStepsDone}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={() => setStep("sleep")} className="text-xs text-gray-400 hover:text-gray-500">
            Skip
          </button>
        </div>
      )}

      {/* Step 2: Sleep */}
      {step === "sleep" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-gray-900">How long did you sleep?</h3>
          </div>
          <p className="text-sm text-gray-500">Last night&apos;s sleep duration</p>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Hours"
              min={0}
              max={24}
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              autoFocus
              className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <span className="text-sm text-gray-500">h</span>
            <input
              type="number"
              placeholder="Mins"
              min={0}
              max={59}
              value={sleepMinutes}
              onChange={(e) => setSleepMinutes(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSleepDone(); }}
              className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <span className="text-sm text-gray-500">m</span>
            <button
              onClick={handleSleepDone}
              disabled={saving}
              className="ml-auto inline-flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={() => setStep("spend")} className="text-xs text-gray-400 hover:text-gray-500">
            Skip
          </button>
        </div>
      )}

      {/* Step 3: Spending */}
      {step === "spend" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <PoundSterling className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">How much did you spend?</h3>
          </div>
          <p className="text-sm text-gray-500">Yesterday&apos;s rough total spending</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">£</span>
              <input
                type="number"
                placeholder="0.00"
                min={0}
                step={0.01}
                value={spendValue}
                onChange={(e) => setSpendValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSpendDone(); }}
                autoFocus
                className="w-full rounded-lg border border-gray-200 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <button
              onClick={handleSpendDone}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              Done
            </button>
          </div>
          <p className="text-[10px] text-gray-400">Logged as &quot;Other&quot; — go to Finances to categorise</p>
          <button onClick={dismiss} className="text-xs text-gray-400 hover:text-gray-500">
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
