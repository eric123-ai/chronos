import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  name: text("name").notNull(),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  priority: integer("priority").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: varchar("completed_at", { length: 32 }),
  rewardPoints: integer("reward_points").notNull().default(0),
  importance: integer("importance").notNull().default(0),
  urgency: integer("urgency").notNull().default(0),
  energyCost: varchar("energy_cost", { length: 16 }),
  category: varchar("category", { length: 24 }),
  weekday: integer("weekday"),
  plannedDate: varchar("planned_date", { length: 16 }),
  goalId: varchar("goal_id", { length: 64 }),
  deadline: varchar("deadline", { length: 16 }),
  anchor: varchar("anchor", { length: 24 }),
  isMandatory: boolean("is_mandatory").default(false).notNull(),
  exactTime: varchar("exact_time", { length: 8 }),
  remindAt: varchar("remind_at", { length: 19 }),
  notes: text("notes"),
  steps: jsonb("steps"),
  tags: jsonb("tags"),
  listId: varchar("list_id", { length: 64 }),
  projectId: varchar("project_id", { length: 64 }),
  locked: boolean("locked").default(false).notNull(),
  hardBoundary: boolean("hard_boundary").default(false).notNull(),
  templateSource: varchar("template_source", { length: 64 }),
  pinned: boolean("pinned").default(false).notNull(),
  deleted: boolean("deleted").default(false).notNull(),
  sourceRuleId: varchar("source_rule_id", { length: 64 }),
  createdAt: varchar("created_at", { length: 32 }).notNull(),
  updatedAt: varchar("updated_at", { length: 32 }).notNull(),
  deletedAt: varchar("deleted_at", { length: 32 }),
});

export const courses = pgTable("courses", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  name: text("name").notNull(),
  location: text("location"),
  weekday: integer("weekday").notNull(),
  startTime: varchar("start_time", { length: 8 }).notNull(),
  endTime: varchar("end_time", { length: 8 }).notNull(),
  weeks: jsonb("weeks"),
  weekMode: varchar("week_mode", { length: 8 }),
  source: varchar("source", { length: 16 }),
  sourceLabel: text("source_label"),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: false }),
});

export const goals = pgTable("goals", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  title: text("title").notNull(),
  period: varchar("period", { length: 16 }).notNull(),
  deadline: varchar("deadline", { length: 16 }).notNull(),
  createdAt: varchar("created_at", { length: 32 }).notNull(),
  updatedAt: varchar("updated_at", { length: 32 }).notNull(),
  deletedAt: varchar("deleted_at", { length: 32 }),
});

export const recurrenceRules = pgTable("recurrence_rules", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  title: text("title").notNull(),
  kind: varchar("kind", { length: 24 }).notNull(),
  interval: integer("interval"),
  weekDays: jsonb("week_days"),
  dayOfMonth: integer("day_of_month"),
  category: varchar("category", { length: 24 }).notNull(),
  goalId: varchar("goal_id", { length: 64 }),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  seedMinutes: integer("seed_minutes").notNull(),
  urgency: integer("urgency").notNull(),
  energyCost: varchar("energy_cost", { length: 16 }).notNull(),
  startsOn: varchar("starts_on", { length: 16 }).notNull(),
  lastGeneratedOn: varchar("last_generated_on", { length: 16 }),
  active: boolean("active").notNull().default(true),
  createdAt: varchar("created_at", { length: 32 }).notNull(),
  updatedAt: varchar("updated_at", { length: 32 }).notNull(),
  deletedAt: varchar("deleted_at", { length: 32 }),
});

export const histories = pgTable("histories", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  date: varchar("date", { length: 16 }).notNull(),
  totalPoints: integer("total_points").notNull().default(0),
  spentPoints: integer("spent_points").notNull().default(0),
  insight: text("insight"),
  settledAt: varchar("settled_at", { length: 32 }),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export const summaries = pgTable("summaries", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  date: varchar("date", { length: 16 }).notNull(),
  content: text("content").notNull(),
  mood: integer("mood").notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export const wallet = pgTable("wallet", {
  userId: varchar("user_id", { length: 36 }).primaryKey(),
  points: integer("points").notNull().default(0),
});

export const devices = pgTable("devices", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  pushSubscription: jsonb("push_subscription"),
  platform: varchar("platform", { length: 24 }),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export const shareLinks = pgTable("share_links", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  type: varchar("type", { length: 24 }).notNull(), // e.g., 'list'
  listId: varchar("list_id", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: false }),
});
