"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import {
  Plus, X, Dumbbell, Scale, Footprints, Moon,
  PoundSterling, CheckSquare,
} from "lucide-react";
import { logWorkout, logWeight, logSteps, logSleep } from "@/actions/health";
import { logQuickSpend } from "@/actions/finances";
import { addTask } from "@/actions/projects";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Panel = "menu" | "workout" | "weight" | "steps" | "sleep" | "spend" | "task";

export type WorkoutTypeOption = { value: string; label: string };

interface Props {
  workoutTypes: WorkoutTypeOption[];
}

export function QuickLog({ workoutTypes }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("menu");

  // per-panel state
  const [workoutType, setWorkoutType] = useState<string>(workoutTypes[0]?.value ?? "other");
  const [workoutDur, setWorkoutDur] = useState("");
  const [weightVal, setWeightVal] = useState("");
  const [stepsVal, setStepsVal] = useState("");
  const [sleepH, setSleepH] = useState("");
  const [sleepM, setSleepM] = useState("");
  const [spendVal, setSpendVal] = useState("");
  const [taskTitle, setTaskTitle] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");

  function close() {
    setOpen(false);
    setPanel("menu");
    setWorkoutDur(""); setWeightVal(""); setStepsVal("");
    setSleepH(""); setSleepM(""); setSpendVal(""); setTaskTitle("");
  }

  function submit(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
      close();
    });
  }

  const selectedTypeLabel = workoutTypes.find((t) => t.value === workoutType)?.label ?? workoutType;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* Floating button */}
      <button
        onClick={() => { setOpen(!open); setPanel("menu"); }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#0d9488] text-white shadow-lg hover:bg-teal-600 transition-all flex items-center justify-center active:scale-95"
        aria-label="Quick log"
      >
        {open ? <X className="w-5 h-5" /> : <Plus className="w-6 h-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-72 rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">

          {/* Menu */}
          {panel === "menu" && (
            <div className="p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1.5">Quick Log</p>
              {[
                { icon: Dumbbell,      label: "Workout",  panel: "workout" as Panel, color: "text-orange-500" },
                { icon: Scale,         label: "Weight",   panel: "weight"  as Panel, color: "text-blue-500" },
                { icon: Footprints,    label: "Steps",    panel: "steps"   as Panel, color: "text-green-500" },
                { icon: Moon,          label: "Sleep",    panel: "sleep"   as Panel, color: "text-indigo-500" },
                { icon: PoundSterling, label: "Spending", panel: "spend"   as Panel, color: "text-amber-500" },
                { icon: CheckSquare,   label: "Task",     panel: "task"    as Panel, color: "text-purple-500" },
              ].map(({ icon: Icon, label, panel: p, color }) => (
                <button
                  key={p}
                  onClick={() => setPanel(p)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Workout */}
          {panel === "workout" && (
            <div className="p-4 space-y-3">
              <PanelHeader title="Log Workout" onBack={() => setPanel("menu")} />
              <select
                value={workoutType}
                onChange={(e) => setWorkoutType(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {workoutTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Duration (mins, optional)"
                value={workoutDur}
                onChange={(e) => setWorkoutDur(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <SaveButton onClick={() => submit(async () => {
                await logWorkout({ date: today, type: workoutType, durationMinutes: workoutDur ? Number(workoutDur) : undefined, completed: true, exercises: [] });
                toast.success(`${selectedTypeLabel} workout logged`);
              })} />
            </div>
          )}

          {/* Weight */}
          {panel === "weight" && (
            <div className="p-4 space-y-3">
              <PanelHeader title="Log Weight" onBack={() => setPanel("menu")} />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 82.5"
                  value={weightVal}
                  autoFocus
                  onChange={(e) => setWeightVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && weightVal) document.getElementById("ql-weight-save")?.click(); }}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <span className="text-sm text-gray-500">kg</span>
              </div>
              <SaveButton id="ql-weight-save" disabled={!weightVal} onClick={() => submit(async () => {
                await logWeight({ date: today, weightKg: Number(weightVal) });
                toast.success(`${weightVal} kg logged`);
              })} />
            </div>
          )}

          {/* Steps */}
          {panel === "steps" && (
            <div className="p-4 space-y-3">
              <PanelHeader title="Log Steps" onBack={() => setPanel("menu")} />
              <input
                type="number"
                placeholder="e.g. 8500"
                value={stepsVal}
                autoFocus
                onChange={(e) => setStepsVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && stepsVal) document.getElementById("ql-steps-save")?.click(); }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <SaveButton id="ql-steps-save" disabled={!stepsVal} onClick={() => submit(async () => {
                await logSteps({ date: today, stepCount: Number(stepsVal) });
                toast.success(`${Number(stepsVal).toLocaleString()} steps logged`);
              })} />
            </div>
          )}

          {/* Sleep */}
          {panel === "sleep" && (
            <div className="p-4 space-y-3">
              <PanelHeader title="Log Sleep" onBack={() => setPanel("menu")} />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0} max={24}
                  placeholder="Hours"
                  value={sleepH}
                  autoFocus
                  onChange={(e) => setSleepH(e.target.value)}
                  className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <span className="text-sm text-gray-500">h</span>
                <input
                  type="number"
                  min={0} max={59}
                  placeholder="Mins"
                  value={sleepM}
                  onChange={(e) => setSleepM(e.target.value)}
                  className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <span className="text-sm text-gray-500">m</span>
              </div>
              <SaveButton disabled={!sleepH && !sleepM} onClick={() => submit(async () => {
                const mins = (Number(sleepH) || 0) * 60 + (Number(sleepM) || 0);
                if (mins > 0) {
                  await logSleep(today, mins);
                  toast.success(`${sleepH ? `${sleepH}h ` : ""}${sleepM ? `${sleepM}m` : ""} sleep logged`);
                }
              })} />
            </div>
          )}

          {/* Spend */}
          {panel === "spend" && (
            <div className="p-4 space-y-3">
              <PanelHeader title="Log Spending" onBack={() => setPanel("menu")} />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">£</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={spendVal}
                  autoFocus
                  onChange={(e) => setSpendVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && spendVal) document.getElementById("ql-spend-save")?.click(); }}
                  className="w-full rounded-lg border border-gray-200 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <SaveButton id="ql-spend-save" disabled={!spendVal} onClick={() => submit(async () => {
                await logQuickSpend(today, Number(spendVal));
                toast.success(`£${Number(spendVal).toFixed(2)} spending logged`);
              })} />
            </div>
          )}

          {/* Task */}
          {panel === "task" && (
            <div className="p-4 space-y-3">
              <PanelHeader title="Quick Task" onBack={() => setPanel("menu")} />
              <input
                type="text"
                placeholder="What needs doing?"
                value={taskTitle}
                autoFocus
                onChange={(e) => setTaskTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && taskTitle.trim()) document.getElementById("ql-task-save")?.click(); }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <SaveButton id="ql-task-save" disabled={!taskTitle.trim()} onClick={() => submit(async () => {
                await addTask({ title: taskTitle.trim(), status: "todo", priority: "med" });
                toast.success("Task added");
              })} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

function PanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-xs">← Back</button>
      <p className="text-sm font-semibold text-gray-800">{title}</p>
    </div>
  );
}

function SaveButton({ onClick, disabled, id }: { onClick: () => void; disabled?: boolean; id?: string }) {
  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-lg bg-[#0d9488] text-white py-2 text-sm font-medium hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      Save
    </button>
  );
}
