"use client";

import { useTransition } from "react";
import { Check, Pill } from "lucide-react";
import { takeSupplement } from "@/actions/health";
import { toast } from "sonner";

type Supp = { id: string; name: string; takenToday: boolean };

export function SupplementChecklist({ supplements }: { supplements: Supp[] }) {
  const [, startTransition] = useTransition();

  if (supplements.length === 0) return null;

  const allDone = supplements.every((s) => s.takenToday);

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          <Pill className="w-3.5 h-3.5 text-purple-400" /> Supplements
        </h3>
        {allDone && <span className="text-xs text-green-600 font-medium">All done ✓</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {supplements.map((s) => (
          <button
            key={s.id}
            disabled={s.takenToday}
            onClick={() => {
              if (s.takenToday) return;
              startTransition(async () => {
                await takeSupplement(s.id);
                toast.success(`${s.name} logged`);
              });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all select-none
              ${s.takenToday
                ? "bg-green-100 text-green-700 cursor-default"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 cursor-pointer"
              }`}
          >
            {s.takenToday && <Check className="w-3 h-3" />}
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
