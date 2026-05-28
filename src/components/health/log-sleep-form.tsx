"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { logSleep } from "@/actions/health";

export function LogSleepForm() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [date, setDate]         = useState(format(subDays(new Date(), 1), "yyyy-MM-dd"));
  const [hours, setHours]       = useState("");
  const [minutes, setMinutes]   = useState("");
  const [saving, setSaving]     = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const totalMins = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
    if (totalMins <= 0) { toast.error("Enter hours and/or minutes"); return; }
    setSaving(true);
    startTransition(async () => {
      try {
        await logSleep(date, totalMins);
        const display = hours ? `${hours}h${minutes ? ` ${minutes}m` : ""}` : `${minutes}m`;
        toast.success(`${display} sleep logged for ${date}`);
        setHours("");
        setMinutes("");
        router.refresh();
      } catch {
        toast.error("Failed to save");
      } finally {
        setSaving(false);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs text-gray-500 block mb-1">Date (woke up)</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Hours</label>
        <input
          type="number"
          placeholder="e.g. 7"
          min={0}
          max={24}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Mins</label>
        <input
          type="number"
          placeholder="e.g. 30"
          min={0}
          max={59}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Log sleep"}
      </button>
    </form>
  );
}
