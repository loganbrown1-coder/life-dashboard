"use client";

import { useState, useTransition } from "react";
import { Check, X, Settings2 } from "lucide-react";
import { toggleWorkoutDay, saveWorkoutSchedule } from "@/actions/workout-schedule";
import { workoutBadgeColor } from "@/lib/workout-colors";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  MeasuringStrategy,
  rectIntersection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type Slot = "morning" | "afternoon";

type ScheduleEntry = { dayOfWeek: number; workoutType: string; slot: Slot };
type WorkoutRow    = { id: string; date: string; type: string; completed: boolean };
type Option        = { value: string; label: string };

type Props = {
  schedule:     ScheduleEntry[];
  weekDates:    string[];        // Mon–Sun ISO dates for this week
  completions:  WorkoutRow[];    // workouts logged this week
  workoutTypes: Option[];
};

export function WorkoutWeekPlan({ schedule, weekDates, completions, workoutTypes }: Props) {
  const [, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  // scheduleMap: "dayOfWeek-slot" → workoutType
  const scheduleMap: Record<string, string> = {};
  for (const s of schedule) scheduleMap[`${s.dayOfWeek}-${s.slot}`] = s.workoutType;

  // doneSet: "date-type"
  const doneSet = new Set(
    completions.filter((w) => w.completed).map((w) => `${w.date}-${w.type}`)
  );

  function handleToggle(date: string, workoutType: string) {
    startTransition(async () => {
      await toggleWorkoutDay(date, workoutType);
    });
  }

  const hasSchedule = schedule.length > 0;

  return (
    <div className="rounded-xl border bg-white shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-800">This week</h2>
        <SetupScheduleDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          schedule={schedule}
          workoutTypes={workoutTypes}
        />
      </div>

      {!hasSchedule ? (
        <p className="text-sm text-gray-400">
          No plan yet.{" "}
          <button onClick={() => setEditOpen(true)} className="text-[#0d9488] underline">
            Set up your schedule →
          </button>
        </p>
      ) : (
        <div className="space-y-1.5">
          {weekDates.map((date, i) => {
            const dayNum   = i + 1;
            const isToday  = date === today;
            const isPast   = date < today;
            const dateNum  = parseInt(date.slice(8), 10);
            const amType   = scheduleMap[`${dayNum}-morning`];
            const pmType   = scheduleMap[`${dayNum}-afternoon`];

            return (
              <div
                key={date}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors
                  ${isToday ? "bg-teal-50 ring-1 ring-teal-200" : "bg-gray-50/60"}`}
              >
                {/* Day label */}
                <div className="w-12 shrink-0">
                  <p className={`text-[11px] font-semibold uppercase tracking-wide
                    ${isToday ? "text-[#0d9488]" : "text-gray-400"}`}>
                    {DAY_NAMES[i]}
                  </p>
                  <p className={`text-base font-bold leading-none mt-0.5
                    ${isToday ? "text-[#0d9488]" : isPast ? "text-gray-400" : "text-gray-700"}`}>
                    {dateNum}
                  </p>
                </div>

                {/* AM slot */}
                <SlotPill
                  workoutType={amType}
                  label={workoutTypes.find((o) => o.value === amType)?.label ?? amType ?? ""}
                  slotLabel="AM"
                  isDone={amType ? doneSet.has(`${date}-${amType}`) : false}
                  onToggle={() => amType && handleToggle(date, amType)}
                />

                {/* PM slot */}
                <SlotPill
                  workoutType={pmType}
                  label={workoutTypes.find((o) => o.value === pmType)?.label ?? pmType ?? ""}
                  slotLabel="PM"
                  isDone={pmType ? doneSet.has(`${date}-${pmType}`) : false}
                  onToggle={() => pmType && handleToggle(date, pmType)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Slot pill ─────────────────────────────────────────────────────────────────

function SlotPill({
  workoutType, label, slotLabel, isDone, onToggle,
}: {
  workoutType?: string;
  label: string;
  slotLabel: string;
  isDone: boolean;
  onToggle: () => void;
}) {
  if (!workoutType) {
    return (
      <div className="flex-1 flex items-center gap-1.5 rounded-lg bg-white border border-dashed border-gray-200 px-2.5 py-1.5 h-9">
        <span className="text-[10px] font-semibold text-gray-300 uppercase">{slotLabel}</span>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 h-9
      ${isDone ? "bg-[#0d9488] text-white shadow-sm" : workoutBadgeColor(workoutType)}`}
    >
      <span className="text-[10px] font-semibold uppercase opacity-70 shrink-0">{slotLabel}</span>
      <span className="text-xs font-semibold truncate flex-1">{label}</span>
      {/* Tick button — always tappable */}
      <button
        onClick={onToggle}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all active:scale-90
          ${isDone
            ? "border-white/60 bg-white/20 hover:bg-white/30"
            : "border-current opacity-50 hover:opacity-100"
          }`}
        title={isDone ? "Mark undone" : "Mark done"}
      >
        {isDone && <Check className="w-3 h-3" />}
      </button>
    </div>
  );
}

// ── Schedule setup dialog (drag-and-drop) ────────────────────────────────────

function SetupScheduleDialog({
  open,
  onOpenChange,
  schedule,
  workoutTypes,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schedule: ScheduleEntry[];
  workoutTypes: Option[];
}) {
  const [, startTransition] = useTransition();

  // slots: key = "dayOfWeek-slot" (e.g. "1-morning"), value = workoutType
  const [slots, setSlots] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const s of schedule) map[`${s.dayOfWeek}-${s.slot}`] = s.workoutType;
    return map;
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over?.id) {
      const workoutType = active.id as string;
      setSlots((prev) => ({ ...prev, [over.id as string]: workoutType }));
    }
    setActiveId(null);
  }

  function clearSlot(key: string) {
    setSlots((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      const entries = Object.entries(slots)
        .filter(([, type]) => !!type)
        .map(([key, workoutType]) => {
          const [day, slot] = key.split("-");
          return {
            dayOfWeek: Number(day),
            workoutType,
            slot: slot as Slot,
          };
        });
      await saveWorkoutSchedule(entries);
      toast.success("Schedule saved");
      onOpenChange(false);
    });
  }

  const activeLabel = activeId
    ? (workoutTypes.find((o) => o.value === activeId)?.label ?? activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger className="inline-flex items-center gap-1.5 h-7 px-2 rounded text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          <Settings2 className="w-3.5 h-3.5" /> Edit plan
        </DialogTrigger>

        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Weekly workout plan</DialogTitle>
          </DialogHeader>

          {/* Palette — drag from here */}
          <div className="mb-5">
            <p className="text-xs text-gray-400 mb-2">Drag into a slot:</p>
            <div className="flex flex-wrap gap-2">
              {workoutTypes.length === 0 ? (
                <p className="text-xs text-gray-400">
                  Add workout types in Settings first.
                </p>
              ) : (
                workoutTypes.map((opt) => (
                  <DraggableChip
                    key={opt.value}
                    id={opt.value}
                    label={opt.label}
                  />
                ))
              )}
            </div>
          </div>

          {/* 7-day grid with AM / PM rows */}
          <div className="space-y-2">
            {DAY_NAMES.map((day, i) => {
              const dayNum = i + 1;
              return (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-8 text-xs font-semibold text-gray-600 shrink-0">
                    {day}
                  </span>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    {(["morning", "afternoon"] as Slot[]).map((slot) => {
                      const key = `${dayNum}-${slot}`;
                      return (
                        <DroppableSlot
                          key={slot}
                          id={key}
                          slot={slot}
                          value={slots[key]}
                          label={
                            slots[key]
                              ? (workoutTypes.find((o) => o.value === slots[key])?.label ?? slots[key])
                              : undefined
                          }
                          onClear={() => clearSlot(key)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            onClick={handleSave}
            className="w-full mt-5 bg-[#0d9488] hover:bg-teal-700"
          >
            Save schedule
          </Button>
          <p className="text-[10px] text-center text-gray-400 -mt-2">
            This plan repeats every week
          </p>
        </DialogContent>
      </Dialog>

      {/* DragOverlay is OUTSIDE the Dialog to avoid portal/transform issues */}
      <DragOverlay dropAnimation={null} modifiers={[restrictToWindowEdges]}>
        {activeId && activeLabel && (
          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg pointer-events-none select-none ${workoutBadgeColor(activeId)}`}
          >
            {activeLabel}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ── Draggable chip ────────────────────────────────────────────────────────────

function DraggableChip({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        touchAction: "none",
      }}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-grab active:cursor-grabbing select-none ${workoutBadgeColor(id)}`}
    >
      {label}
    </div>
  );
}

// ── Droppable slot ────────────────────────────────────────────────────────────

function DroppableSlot({
  id,
  slot,
  value,
  label,
  onClear,
}: {
  id: string;
  slot: Slot;
  value?: string;
  label?: string;
  onClear: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`h-9 rounded-lg flex items-center justify-center text-[10px] relative transition-colors
        ${isOver
          ? "bg-teal-50 ring-2 ring-[#0d9488]"
          : value
            ? "bg-gray-50 ring-1 ring-gray-200"
            : "border-2 border-dashed border-gray-200"
        }`}
    >
      {value ? (
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${workoutBadgeColor(value)}`}
        >
          <span className="truncate max-w-[60px]">{label ?? value}</span>
          <button
            onClick={onClear}
            className="opacity-60 hover:opacity-100 shrink-0"
            aria-label="Remove"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <span className="text-gray-300 font-medium">
          {slot === "morning" ? "AM" : "PM"}
        </span>
      )}
    </div>
  );
}
