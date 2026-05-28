import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// Every table gets id, created_at, updated_at via these columns
const baseColumns = {
  id: text("id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
};

// ---------------------------------------------------------------------------
// HEALTH
// ---------------------------------------------------------------------------

export const workouts = sqliteTable("workouts", {
  ...baseColumns,
  date: text("date").notNull(), // YYYY-MM-DD
  type: text("type").notNull(), // user-configurable via user_options table
  durationMinutes: integer("duration_minutes"),
  distanceKm: real("distance_km"), // only for run / swim
  notes: text("notes"),
  planned: integer("planned", { mode: "boolean" }).notNull().default(false),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
});

export const workoutExercises = sqliteTable("workout_exercises", {
  ...baseColumns,
  workoutId: text("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sets: integer("sets"),
  reps: integer("reps"),
  weightKg: real("weight_kg"),
  notes: text("notes"),
  orderIndex: integer("order_index").notNull().default(0),
});

export const weightLogs = sqliteTable("weight_logs", {
  ...baseColumns,
  date: text("date").notNull(), // YYYY-MM-DD
  weightKg: real("weight_kg").notNull(),
  bodyFatPct: real("body_fat_pct"),
  notes: text("notes"),
});

export const stepsLogs = sqliteTable("steps_logs", {
  ...baseColumns,
  date: text("date").notNull(), // YYYY-MM-DD
  stepCount: integer("step_count").notNull(),
  source: text("source", { enum: ["manual", "import"] }).notNull().default("manual"),
});

export const sleepLogs = sqliteTable("sleep_logs", {
  ...baseColumns,
  date: text("date").notNull(), // YYYY-MM-DD — the date you woke up
  durationMinutes: integer("duration_minutes").notNull(), // total sleep in minutes
  notes: text("notes"),
});

export const supplements = sqliteTable("supplements", {
  ...baseColumns,
  name: text("name").notNull(),
  dosage: text("dosage"),
  schedule: text("schedule", { enum: ["daily", "weekly", "as_needed"] }).notNull().default("daily"),
  timeOfDay: text("time_of_day", { enum: ["morning", "evening", "anytime"] }).notNull().default("morning"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const supplementLogs = sqliteTable("supplement_logs", {
  ...baseColumns,
  supplementId: text("supplement_id")
    .notNull()
    .references(() => supplements.id, { onDelete: "cascade" }),
  takenAt: integer("taken_at", { mode: "timestamp" }).notNull(),
});

// ---------------------------------------------------------------------------
// FOOD
// ---------------------------------------------------------------------------

export const meals = sqliteTable("meals", {
  ...baseColumns,
  name: text("name").notNull(),
  description: text("description"),
  mealType: text("meal_type", {
    enum: ["breakfast", "lunch", "dinner", "snack"],
  }).notNull(),
  // JSON array of tags e.g. ["high_protein","post_workout","low_carb"]
  tags: text("tags").notNull().default("[]"),
  caloriesEstimate: integer("calories_estimate"),
  proteinG: real("protein_g"),
  carbsG: real("carbs_g"),
  fatG: real("fat_g"),
  prepTimeMinutes: integer("prep_time_minutes"),
  recipeNotes: text("recipe_notes"),
});

export const mealIngredients = sqliteTable("meal_ingredients", {
  ...baseColumns,
  mealId: text("meal_id")
    .notNull()
    .references(() => meals.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: real("quantity"),
  unit: text("unit", {
    enum: ["g", "ml", "piece", "cup", "tbsp", "tsp"],
  }),
  aisle: text("aisle", {
    enum: ["produce", "protein", "dairy", "pantry", "frozen", "other"],
  }).notNull().default("other"),
});

export const mealPlans = sqliteTable("meal_plans", {
  ...baseColumns,
  date: text("date").notNull(), // YYYY-MM-DD
  mealId: text("meal_id")
    .notNull()
    .references(() => meals.id, { onDelete: "cascade" }),
  mealSlot: text("meal_slot", {
    enum: ["breakfast", "lunch", "dinner", "snack"],
  }).notNull(),
  eaten: integer("eaten", { mode: "boolean" }).notNull().default(false),
});

export const groceryLists = sqliteTable("grocery_lists", {
  ...baseColumns,
  weekStartDate: text("week_start_date").notNull(), // YYYY-MM-DD (Monday)
  // JSON: Array<{ name, total_quantity, unit, aisle, checked }>
  items: text("items").notNull().default("[]"),
  generatedAt: integer("generated_at", { mode: "timestamp" }).notNull(),
});

// ---------------------------------------------------------------------------
// FINANCES
// ---------------------------------------------------------------------------

export const accounts = sqliteTable("accounts", {
  ...baseColumns,
  name: text("name").notNull(),
  type: text("type", {
    enum: ["checking", "savings", "credit", "investment", "cash"],
  }).notNull(),
  currency: text("currency").notNull().default("GBP"),
  currentBalance: real("current_balance").notNull().default(0),
});

export const transactions = sqliteTable("transactions", {
  ...baseColumns,
  date: text("date").notNull(), // YYYY-MM-DD
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("GBP"),
  amountInBaseCurrency: real("amount_in_base_currency").notNull(),
  type: text("type", { enum: ["income", "expense", "transfer"] }).notNull(),
  category: text("category").notNull(),
  description: text("description"),
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
});

export const currencyRates = sqliteTable("currency_rates", {
  ...baseColumns,
  currencyCode: text("currency_code").notNull().unique(),
  rateToGbp: real("rate_to_gbp").notNull(),
  // updatedAt from baseColumns serves as the rate-last-updated field
});

export const budgets = sqliteTable("budgets", {
  ...baseColumns,
  category: text("category").notNull(),
  monthlyLimitGbp: real("monthly_limit_gbp").notNull(),
  activeFrom: text("active_from").notNull(), // YYYY-MM-DD
});

export const bills = sqliteTable("bills", {
  ...baseColumns,
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("GBP"),
  frequency: text("frequency", {
    enum: ["weekly", "monthly", "quarterly", "yearly"],
  }).notNull(),
  nextDueDate: text("next_due_date").notNull(), // YYYY-MM-DD
  category: text("category").notNull(),
  autoPay: integer("auto_pay", { mode: "boolean" }).notNull().default(false),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
});

export const savingsGoals = sqliteTable("savings_goals", {
  ...baseColumns,
  name: text("name").notNull(),
  targetAmountGbp: real("target_amount_gbp").notNull(),
  currentAmountGbp: real("current_amount_gbp").notNull().default(0),
  targetDate: text("target_date"), // YYYY-MM-DD, nullable
  notes: text("notes"),
  linkedLifeGoalId: text("linked_life_goal_id"), // FK added below via soft ref
});

export const investments = sqliteTable("investments", {
  ...baseColumns,
  name: text("name").notNull(),
  type: text("type", {
    enum: ["isa", "stock", "crypto", "etf", "other"],
  }).notNull(),
  lastKnownValueGbp: real("last_known_value_gbp").notNull().default(0),
  lastUpdated: text("last_updated").notNull(), // YYYY-MM-DD
  notes: text("notes"),
});

// ---------------------------------------------------------------------------
// ROUTINES & HABITS
// ---------------------------------------------------------------------------

export const routines = sqliteTable("routines", {
  ...baseColumns,
  name: text("name").notNull(),
  timeOfDay: text("time_of_day", {
    enum: ["morning", "evening", "anytime"],
  }).notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

export const routineItems = sqliteTable("routine_items", {
  ...baseColumns,
  routineId: text("routine_id")
    .notNull()
    .references(() => routines.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  // Ticking this item also logs the supplement (optional link)
  linkedSupplementId: text("linked_supplement_id").references(() => supplements.id, {
    onDelete: "set null",
  }),
  linkedHabitId: text("linked_habit_id"), // FK to habits, soft ref
});

export const routineLogs = sqliteTable("routine_logs", {
  ...baseColumns,
  routineItemId: text("routine_item_id")
    .notNull()
    .references(() => routineItems.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
});

export const habits = sqliteTable("habits", {
  ...baseColumns,
  title: text("title").notNull(),
  description: text("description"),
  frequency: text("frequency", { enum: ["daily", "nx_per_week"] }).notNull().default("daily"),
  targetPerWeek: integer("target_per_week"), // used when frequency = nx_per_week
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const habitLogs = sqliteTable("habit_logs", {
  ...baseColumns,
  habitId: text("habit_id")
    .notNull()
    .references(() => habits.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
});

// ---------------------------------------------------------------------------
// GOALS, PROJECTS, TASKS
// ---------------------------------------------------------------------------

export const goals = sqliteTable("goals", {
  ...baseColumns,
  title: text("title").notNull(),
  description: text("description"),
  category: text("category", {
    enum: ["life", "career", "relationships", "travel", "learning", "other"],
  }).notNull().default("life"),
  targetDate: text("target_date"), // YYYY-MM-DD, nullable
  status: text("status", {
    enum: ["active", "done", "paused", "abandoned"],
  }).notNull().default("active"),
  progressPct: integer("progress_pct").notNull().default(0), // 0–100
  linkedSavingsGoalId: text("linked_savings_goal_id").references(() => savingsGoals.id, {
    onDelete: "set null",
  }),
});

export const projects = sqliteTable("projects", {
  ...baseColumns,
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["active", "paused", "done"] }).notNull().default("active"),
  deadline: text("deadline"), // YYYY-MM-DD, nullable
  colour: text("colour").notNull().default("#0d9488"),
});

export const tasks = sqliteTable("tasks", {
  ...baseColumns,
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  goalId: text("goal_id").references(() => goals.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  notes: text("notes"),
  status: text("status", { enum: ["todo", "doing", "done"] }).notNull().default("todo"),
  dueDate: text("due_date"), // YYYY-MM-DD, nullable
  priority: text("priority", { enum: ["low", "med", "high"] }).notNull().default("med"),
});

// ---------------------------------------------------------------------------
// SIDE HUSTLES
// ---------------------------------------------------------------------------

export const sideHustles = sqliteTable("side_hustles", {
  ...baseColumns,
  name: text("name").notNull(),
  description: text("description"),
  colour: text("colour").notNull().default("#0d9488"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const hustleRevenue = sqliteTable("hustle_revenue", {
  ...baseColumns,
  hustleId: text("hustle_id")
    .notNull()
    .references(() => sideHustles.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("GBP"),
  source: text("source"),
  notes: text("notes"),
});

export const hustleTimeLogs = sqliteTable("hustle_time_logs", {
  ...baseColumns,
  hustleId: text("hustle_id")
    .notNull()
    .references(() => sideHustles.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  minutes: integer("minutes").notNull(),
  description: text("description"),
});

// ---------------------------------------------------------------------------
// USER OPTIONS (editable dropdown lists)
// ---------------------------------------------------------------------------

// Generic table for user-managed dropdown lists.
// type examples: 'workout_type' | 'transaction_category'
export const userOptions = sqliteTable("user_options", {
  ...baseColumns,
  type: text("type").notNull(),         // which list this belongs to
  value: text("value").notNull(),        // stored value (snake_case for workout types)
  label: text("label").notNull(),        // display label
  orderIndex: integer("order_index").notNull().default(0),
});

// ---------------------------------------------------------------------------
// WORKOUT SCHEDULE (weekly recurring plan)
// ---------------------------------------------------------------------------

// Defines which workout type is planned for each day of the week.
// dayOfWeek: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
export const workoutSchedule = sqliteTable("workout_schedule", {
  ...baseColumns,
  dayOfWeek: integer("day_of_week").notNull(), // 1–7
  workoutType: text("workout_type").notNull(),  // matches user_options value
  slot: text("slot", { enum: ["morning", "afternoon"] }).notNull().default("morning"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

// ---------------------------------------------------------------------------
// CALENDAR EVENTS (social, appointments, travel, etc.)
// ---------------------------------------------------------------------------

export const calendarEvents = sqliteTable("calendar_events", {
  ...baseColumns,
  date: text("date").notNull(),   // YYYY-MM-DD
  title: text("title").notNull(),
  type: text("type", {
    enum: ["social", "appointment", "travel", "other"],
  }).notNull().default("other"),
  notes: text("notes"),
  time: text("time"),             // HH:MM, optional
  colour: text("colour").notNull().default("#6366f1"),
});

// ---------------------------------------------------------------------------
// CHECK-IN LOGS
// ---------------------------------------------------------------------------

export const checkInLogs = sqliteTable("check_in_logs", {
  ...baseColumns,
  date: text("date").notNull().unique(), // YYYY-MM-DD — one check-in per day
  stepsLogged: integer("steps_logged", { mode: "boolean" }).notNull().default(false),
  sleepLogged: integer("sleep_logged", { mode: "boolean" }).notNull().default(false),
  spendLogged: integer("spend_logged", { mode: "boolean" }).notNull().default(false),
  dismissed: integer("dismissed", { mode: "boolean" }).notNull().default(false),
});
