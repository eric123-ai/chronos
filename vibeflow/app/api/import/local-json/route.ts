import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { tasks as Tasks, courses as Courses, goals as Goals, recurrenceRules as Rules, histories as Histories, summaries as Summaries, wallet as Wallet } from "../../../../lib/db/schema";
import { requireSession } from "../../../../lib/auth";

const Backup = z.object({
  version: z.string().optional(),
  "vibeflow.courses.v1": z.any().optional(),
  "vibeflow.rewards.v1": z.any().optional(),
  "vibeflow.walletPoints.v1": z.number().optional(),
  "vibeflow.tasks.v1": z.any().optional(),
  "chronos.goals.v1": z.any().optional(),
  "chronos.recurrence-rules.v1": z.any().optional(),
  "vibeflow.history.v1": z.any().optional(),
  "vibeflow_summaries": z.any().optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const userId = session.user!.email!;

  const json = await req.json().catch(() => null);
  const parsed = Backup.safeParse(json);
  if (!parsed.success) return new Response("Bad backup format", { status: 400 });
  const data = parsed.data;

  // Upsert wallet
  if (typeof data["vibeflow.walletPoints.v1"] === "number") {
    await db
      .insert(Wallet)
      .values({ userId, points: data["vibeflow.walletPoints.v1"] as number })
      .onConflictDoUpdate({ target: Wallet.userId, set: { points: data["vibeflow.walletPoints.v1"] as number } });
  }

  // Tasks
  const tasksArr = Array.isArray(data["vibeflow.tasks.v1"]) ? (data["vibeflow.tasks.v1"] as any[]) : [];
  for (const t of tasksArr) {
    if (!t?.id || !t?.name) continue;
    await db.insert(Tasks).values({
      id: String(t.id), userId,
      name: String(t.name),
      estimatedMinutes: Number(t.estimatedMinutes) || 0,
      priority: Number(t.priority) || 1,
      completed: Boolean(t.completed),
      completedAt: t.completedAt ? String(t.completedAt) : null as any,
      rewardPoints: Number(t.rewardPoints) || 0,
      importance: Math.round((Number(t.importance) || 0) * 100),
      urgency: Math.round((Number(t.urgency) || 0) * 100),
      energyCost: t.energyCost ? String(t.energyCost) : null as any,
      category: t.category ? String(t.category) : null as any,
      weekday: Number(t.weekday) || null as any,
      plannedDate: t.plannedDate ? String(t.plannedDate) : null as any,
      goalId: t.goalId ? String(t.goalId) : null as any,
      deadline: t.deadline ? String(t.deadline) : null as any,
      anchor: t.anchor ? String(t.anchor) : null as any,
      isMandatory: Boolean(t.isMandatory),
      exactTime: t.exactTime ? String(t.exactTime) : null as any,
      locked: Boolean(t.locked),
      hardBoundary: Boolean(t.hardBoundary),
      templateSource: t.templateSource ? String(t.templateSource) : null as any,
      pinned: Boolean(t.pinned),
      deleted: Boolean(t.deleted),
      sourceRuleId: t.sourceRuleId ? String(t.sourceRuleId) : null as any,
      createdAt: String(t.createdAt || new Date().toISOString()),
      updatedAt: String(t.updatedAt || new Date().toISOString()),
      deletedAt: t.deletedAt ? String(t.deletedAt) : null as any,
    }).onConflictDoUpdate({ target: Tasks.id, set: {
      name: String(t.name), estimatedMinutes: Number(t.estimatedMinutes) || 0, priority: Number(t.priority) || 1,
      completed: Boolean(t.completed), completedAt: t.completedAt ? String(t.completedAt) : null as any,
      rewardPoints: Number(t.rewardPoints) || 0, importance: Math.round((Number(t.importance) || 0) * 100), urgency: Math.round((Number(t.urgency) || 0) * 100),
      energyCost: t.energyCost ? String(t.energyCost) : null as any, category: t.category ? String(t.category) : null as any, weekday: Number(t.weekday) || null as any, plannedDate: t.plannedDate ? String(t.plannedDate) : null as any, goalId: t.goalId ? String(t.goalId) : null as any, deadline: t.deadline ? String(t.deadline) : null as any, anchor: t.anchor ? String(t.anchor) : null as any, isMandatory: Boolean(t.isMandatory), exactTime: t.exactTime ? String(t.exactTime) : null as any, locked: Boolean(t.locked), hardBoundary: Boolean(t.hardBoundary), templateSource: t.templateSource ? String(t.templateSource) : null as any, pinned: Boolean(t.pinned), deleted: Boolean(t.deleted), sourceRuleId: t.sourceRuleId ? String(t.sourceRuleId) : null as any, updatedAt: String(t.updatedAt || new Date().toISOString()), deletedAt: t.deletedAt ? String(t.deletedAt) : null as any,
    }});
  }

  // Courses
  const coursesArr = Array.isArray(data["vibeflow.courses.v1"]) ? (data["vibeflow.courses.v1"] as any[]) : [];
  for (const c of coursesArr) {
    if (!c?.name || !c?.startTime || !c?.endTime || !c?.weekday) continue;
    const id = `${c.name}-${c.weekday}-${c.startTime}-${c.endTime}`;
    await db.insert(Courses).values({
      id, userId, name: String(c.name), location: c.location ? String(c.location) : null as any,
      weekday: Number(c.weekday), startTime: String(c.startTime), endTime: String(c.endTime),
      weeks: c.weeks ?? null, weekMode: c.weekMode ? String(c.weekMode) : null as any, source: c.source ? String(c.source) : null as any, sourceLabel: c.sourceLabel ? String(c.sourceLabel) : null as any,
    }).onConflictDoUpdate({ target: Courses.id, set: { name: String(c.name), location: c.location ? String(c.location) : null as any, weekday: Number(c.weekday), startTime: String(c.startTime), endTime: String(c.endTime), weeks: c.weeks ?? null, weekMode: c.weekMode ? String(c.weekMode) : null as any, source: c.source ? String(c.source) : null as any, sourceLabel: c.sourceLabel ? String(c.sourceLabel) : null as any } });
  }

  // Goals
  const goalsArr = Array.isArray(data["chronos.goals.v1"]) ? (data["chronos.goals.v1"] as any[]) : [];
  for (const g of goalsArr) {
    if (!g?.id || !g?.title) continue;
    await db.insert(Goals).values({
      id: String(g.id), userId, title: String(g.title), period: String(g.period), deadline: String(g.deadline),
      createdAt: String(g.createdAt || new Date().toISOString()), updatedAt: String(g.updatedAt || new Date().toISOString()), deletedAt: g.deletedAt ? String(g.deletedAt) : null as any,
    }).onConflictDoUpdate({ target: Goals.id, set: { title: String(g.title), period: String(g.period), deadline: String(g.deadline), updatedAt: String(g.updatedAt || new Date().toISOString()), deletedAt: g.deletedAt ? String(g.deletedAt) : null as any } });
  }

  // Rules
  const rulesArr = Array.isArray(data["chronos.recurrence-rules.v1"]) ? (data["chronos.recurrence-rules.v1"] as any[]) : [];
  for (const r of rulesArr) {
    if (!r?.id || !r?.title) continue;
    await db.insert(Rules).values({
      id: String(r.id), userId, title: String(r.title), kind: String(r.kind), interval: r.interval ?? null, weekDays: r.weekDays ?? null, dayOfMonth: r.dayOfMonth ?? null, category: String(r.category), goalId: r.goalId ? String(r.goalId) : null as any, estimatedMinutes: Number(r.estimatedMinutes) || 0, seedMinutes: Number(r.seedMinutes) || 0, urgency: Number(r.urgency) || 0, energyCost: String(r.energyCost), startsOn: String(r.startsOn), lastGeneratedOn: r.lastGeneratedOn ? String(r.lastGeneratedOn) : null as any, active: Boolean(r.active), createdAt: String(r.createdAt || new Date().toISOString()), updatedAt: String(r.updatedAt || new Date().toISOString()), deletedAt: r.deletedAt ? String(r.deletedAt) : null as any,
    }).onConflictDoUpdate({ target: Rules.id, set: { title: String(r.title), kind: String(r.kind), interval: r.interval ?? null, weekDays: r.weekDays ?? null, dayOfMonth: r.dayOfMonth ?? null, category: String(r.category), goalId: r.goalId ? String(r.goalId) : null as any, estimatedMinutes: Number(r.estimatedMinutes) || 0, seedMinutes: Number(r.seedMinutes) || 0, urgency: Number(r.urgency) || 0, energyCost: String(r.energyCost), startsOn: String(r.startsOn), lastGeneratedOn: r.lastGeneratedOn ? String(r.lastGeneratedOn) : null as any, active: Boolean(r.active), updatedAt: String(r.updatedAt || new Date().toISOString()), deletedAt: r.deletedAt ? String(r.deletedAt) : null as any } });
  }

  // Histories
  const historiesArr = Array.isArray(data["vibeflow.history.v1"]) ? (data["vibeflow.history.v1"] as any[]) : [];
  for (const h of historiesArr) {
    if (!h?.date) continue;
    const id = String(h.date);
    await db.insert(Histories).values({
      id, userId, date: String(h.date), totalPoints: Number(h.totalPoints) || 0, spentPoints: Number(h.spentPoints) || 0, insight: h.insight ? String(h.insight) : null as any, settledAt: h.settledAt ? String(h.settledAt) : null as any,
    }).onConflictDoUpdate({ target: Histories.id, set: { totalPoints: Number(h.totalPoints) || 0, spentPoints: Number(h.spentPoints) || 0, insight: h.insight ? String(h.insight) : null as any, settledAt: h.settledAt ? String(h.settledAt) : null as any } });
  }

  // Summaries
  const summariesArr = Array.isArray(data["vibeflow_summaries"]) ? (data["vibeflow_summaries"] as any[]) : [];
  for (const s of summariesArr) {
    if (!s?.date) continue;
    const id = String(s.date);
    await db.insert(Summaries).values({ id, userId, date: String(s.date), content: String(s.content || ""), mood: Number(s.mood) || 3 }).onConflictDoUpdate({ target: Summaries.id, set: { content: String(s.content || ""), mood: Number(s.mood) || 3 } });
  }

  return Response.json({ ok: true });
}
