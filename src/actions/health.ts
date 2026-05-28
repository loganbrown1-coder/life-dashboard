"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { workouts, workoutExercises, weightLogs, stepsLogs, sleepLogs, supplements, supplementLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

function uuid() {
  return crypto.randomUUID();
}
function now() {
  return new Date();
}

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

const ExerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.coerce.number().int().positive().optional(),
  reps: z.coerce.number().int().positive().optional(),
  weightKg: z.coerce.number().positive().optional(),
  notes: z.string().optional(),
});

const WorkoutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.string().min(1), // user-configurable, not a fixed enum
  durationMinutes: z.coerce.number().int().positive().optional(),
  distanceKm: z.coerce.number().positive().optional(),
  notes: z.string().optional(),
  completed: z.boolean().default(true),
  exercises: z.array(ExerciseSchema).optional(),
});

export async function logWorkout(data: z.infer<typeof WorkoutSchema>) {
  const parsed = WorkoutSchema.parse(data);
  const workoutId = uuid();

  await db.insert(workouts).values({
    id: workoutId,
    createdAt: now(),
    updatedAt: now(),
    date: parsed.date,
    type: parsed.type,
    durationMinutes: parsed.durationMinutes,
    distanceKm: parsed.distanceKm,
    notes: parsed.notes,
    planned: false,
    completed: parsed.completed,
  });

  if (parsed.exercises && parsed.exercises.length > 0) {
    for (let i = 0; i < parsed.exercises.length; i++) {
      const ex = parsed.exercises[i];
      await db.insert(workoutExercises).values({
        id: uuid(),
        createdAt: now(),
        updatedAt: now(),
        workoutId,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weightKg: ex.weightKg,
        notes: ex.notes,
        orderIndex: i,
      });
    }
  }

  revalidatePath("/health");
  revalidatePath("/health/workouts");
}

export async function deleteWorkout(id: string) {
  await db.delete(workouts).where(eq(workouts.id, id));
  revalidatePath("/health");
  revalidatePath("/health/workouts");
}

// ---------------------------------------------------------------------------
// Weight
// ---------------------------------------------------------------------------

const WeightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.coerce.number().positive(),
  bodyFatPct: z.coerce.number().min(1).max(60).optional(),
  notes: z.string().optional(),
});

export async function logWeight(data: z.infer<typeof WeightSchema>) {
  const parsed = WeightSchema.parse(data);
  await db.insert(weightLogs).values({
    id: uuid(),
    createdAt: now(),
    updatedAt: now(),
    date: parsed.date,
    weightKg: parsed.weightKg,
    bodyFatPct: parsed.bodyFatPct,
    notes: parsed.notes,
  });
  revalidatePath("/health");
  revalidatePath("/health/weight");
}

export async function deleteWeightLog(id: string) {
  await db.delete(weightLogs).where(eq(weightLogs.id, id));
  revalidatePath("/health/weight");
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

const StepsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  stepCount: z.coerce.number().int().positive(),
});

export async function logSteps(data: z.infer<typeof StepsSchema>) {
  const parsed = StepsSchema.parse(data);
  // Upsert: delete existing entry for the date, then insert fresh
  const existing = await db
    .select()
    .from(stepsLogs)
    .where(eq(stepsLogs.date, parsed.date))
    .limit(1)
    .get();
  if (existing) {
    await db.delete(stepsLogs).where(eq(stepsLogs.id, existing.id));
  }
  await db.insert(stepsLogs).values({
    id: uuid(),
    createdAt: now(),
    updatedAt: now(),
    date: parsed.date,
    stepCount: parsed.stepCount,
    source: "manual",
  });
  revalidatePath("/health");
  revalidatePath("/health/steps");
}

export async function importWeightFromCSV(rows: Array<{ date: string; weightKg: number }>) {
  for (const row of rows) {
    // Only import if no existing entry for this date
    const existing = await db
      .select()
      .from(weightLogs)
      .where(eq(weightLogs.date, row.date))
      .limit(1)
      .get();
    if (!existing) {
      await db.insert(weightLogs).values({
        id: uuid(),
        createdAt: now(),
        updatedAt: now(),
        date: row.date,
        weightKg: row.weightKg,
      });
    }
  }
  revalidatePath("/health");
  revalidatePath("/health/weight");
}

export async function importStepsFromCSV(rows: Array<{ date: string; stepCount: number }>) {
  for (const row of rows) {
    const existing = await db
      .select()
      .from(stepsLogs)
      .where(eq(stepsLogs.date, row.date))
      .limit(1)
      .get();
    if (!existing) {
      await db.insert(stepsLogs).values({
        id: uuid(),
        createdAt: now(),
        updatedAt: now(),
        date: row.date,
        stepCount: row.stepCount,
        source: "import",
      });
    }
  }
  revalidatePath("/health/steps");
}

// ---------------------------------------------------------------------------
// Supplements
// ---------------------------------------------------------------------------

const SupplementSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().optional(),
  schedule: z.enum(["daily","weekly","as_needed"]).default("daily"),
  timeOfDay: z.enum(["morning","evening","anytime"]).default("morning"),
});

export async function addSupplement(data: z.infer<typeof SupplementSchema>) {
  const parsed = SupplementSchema.parse(data);
  await db.insert(supplements).values({
    id: uuid(),
    createdAt: now(),
    updatedAt: now(),
    name: parsed.name,
    dosage: parsed.dosage,
    schedule: parsed.schedule,
    timeOfDay: parsed.timeOfDay,
    active: true,
  });
  revalidatePath("/health/supplements");
}

export async function deactivateSupplement(id: string) {
  await db.update(supplements).set({ active: false, updatedAt: now() }).where(eq(supplements.id, id));
  revalidatePath("/health/supplements");
}

export async function takeSupplement(supplementId: string) {
  await db.insert(supplementLogs).values({
    id: uuid(),
    createdAt: now(),
    updatedAt: now(),
    supplementId,
    takenAt: now(),
  });
  revalidatePath("/health");
  revalidatePath("/health/supplements");
}

// ── Sleep ─────────────────────────────────────────────────────────────────────

export async function logSleep(date: string, durationMinutes: number) {
  // Upsert — replace any existing entry for this date
  const existing = await db
    .select()
    .from(sleepLogs)
    .where(eq(sleepLogs.date, date))
    .limit(1)
    .get();
  if (existing) {
    await db.delete(sleepLogs).where(eq(sleepLogs.id, existing.id));
  }
  await db.insert(sleepLogs).values({
    id: uuid(), createdAt: now(), updatedAt: now(),
    date, durationMinutes, notes: null,
  });
  revalidatePath("/");
  revalidatePath("/health");
  revalidatePath("/health/sleep");
}
