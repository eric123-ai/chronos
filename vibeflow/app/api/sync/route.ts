import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "../../../lib/db";
import { tasks as Tasks, courses as Courses, goals as Goals, recurrenceRules as Rules, histories as Histories, summaries as Summaries } from "../../../lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "../../../lib/auth";

const TaskUpsert = z.object({
  id: z.string(),
  name: z.string(),
  estimatedMinutes: z.number(),
  priority: z.number(),
  completed: z.boolean(),
  completedAt: z.string().optional(),
  rewardPoints: z.number().optional(),
  importance: z.number().optional(),
  urgency: z.number().optional(),
  energyCost: z.string().optional(),
  category: z.string().optional(),
  weekday: z.number().optional(),
  plannedDate: z.string().optional(),
  goalId: z.string().optional(),
  deadline: z.string().optional(),
  anchor: z.string().optional(),
  isMandatory: z.boolean().optional(),
  exactTime: z.string().optional(),
  locked: z.boolean().optional(),
  hardBoundary: z.boolean().optional(),
  templateSource: z.string().optional(),
  pinned: z.boolean().optional(),
  deleted: z.boolean().optional(),
  sourceRuleId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
});

const CourseUpsert = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string().nullable().optional(),
  weekday: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  weeks: z.any().optional(),
  weekMode: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  sourceLabel: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().optional(),
});

const GoalUpsert = z.object({
  id: z.string(),
  title: z.string(),
  period: z.string(),
  deadline: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
});

const RuleUpsert = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.string(),
  interval: z.number().optional(),
  weekDays: z.any().optional(),
  dayOfMonth: z.number().optional(),
  category: z.string(),
  goalId: z.string().optional(),
  estimatedMinutes: z.number(),
  seedMinutes: z.number(),
  urgency: z.number(),
  energyCost: z.string(),
  startsOn: z.string(),
  lastGeneratedOn: z.string().optional(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
});

const HistoryUpsert = z.object({
  id: z.string(),
  date: z.string(),
  totalPoints: z.number(),
  spentPoints: z.number().optional(),
  insight: z.string().optional(),
  settledAt: z.string().optional(),
});

const SummaryUpsert = z.object({
  id: z.string(),
  date: z.string(),
  content: z.string(),
  mood: z.number(),
});

const SyncRequest = z.object({
  since: z.string().optional(),
  tasks: z.array(TaskUpsert).optional(),
  courses: z.array(CourseUpsert).optional(),
  goals: z.array(GoalUpsert).optional(),
  rules: z.array(RuleUpsert).optional(),
  histories: z.array(HistoryUpsert).optional(),
  summaries: z.array(SummaryUpsert).optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const userId = session.user!.email!; // dev: use email as user id

  const body = await req.json().catch(() => null);
  const parsed = SyncRequest.safeParse(body);
  if (!parsed.success) return new Response("Bad Request", { status: 400 });
  const input = parsed.data;

  // Upserts
  if (input.tasks?.length) {
    for (const t of input.tasks) {
      await db.insert(Tasks).values({ ...t, userId }).onConflictDoUpdate({ target: Tasks.id, set: { ...t, userId } });
    }
  }
  if (input.courses?.length) {
    for (const c of input.courses) {
      await db.insert(Courses).values({ ...c, userId }).onConflictDoUpdate({ target: Courses.id, set: { ...c, userId } });
    }
  }
  if (input.goals?.length) {
    for (const g of input.goals) {
      await db.insert(Goals).values({ ...g, userId }).onConflictDoUpdate({ target: Goals.id, set: { ...g, userId } });
    }
  }
  if (input.rules?.length) {
    for (const r of input.rules) {
      await db.insert(Rules).values({ ...r, userId }).onConflictDoUpdate({ target: Rules.id, set: { ...r, userId } });
    }
  }
  if (input.histories?.length) {
    for (const h of input.histories) {
      await db.insert(Histories).values({ ...h, userId }).onConflictDoUpdate({ target: Histories.id, set: { ...h, userId } });
    }
  }
  if (input.summaries?.length) {
    for (const s of input.summaries) {
      await db.insert(Summaries).values({ ...s, userId }).onConflictDoUpdate({ target: Summaries.id, set: { ...s, userId } });
    }
  }

  // Return all current rows for user (MVP simple merge)
  const [t, c, g, r] = await Promise.all([
    db.select().from(Tasks).where(eq(Tasks.userId, userId)),
    db.select().from(Courses).where(eq(Courses.userId, userId)),
    db.select().from(Goals).where(eq(Goals.userId, userId)),
    db.select().from(Rules).where(eq(Rules.userId, userId)),
  ]);

  const serverTime = new Date().toISOString();
  return Response.json({ serverTime, tasks: t, courses: c, goals: g, rules: r });
}
