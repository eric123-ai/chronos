import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { histories as Histories, summaries as Summaries } from "../../../../lib/db/schema";
import { requireSession } from "../../../../lib/auth";

const SettleBody = z.object({
  date: z.string(),
  totalPoints: z.number().default(0),
  spentPoints: z.number().optional(),
  insight: z.string().optional(),
  summary: z.string().optional(),
  mood: z.number().min(1).max(5).optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const userId = session.user!.email!; // dev: email as user id

  const json = await req.json().catch(() => null);
  const parsed = SettleBody.safeParse(json);
  if (!parsed.success) return new Response("Bad Request", { status: 400 });
  const { date, totalPoints, spentPoints, insight, summary, mood } = parsed.data;

  const id = date; // use date as PK for now
  const now = new Date().toISOString();

  // Upsert history meta
  await db
    .insert(Histories)
    .values({ id, userId, date, totalPoints, spentPoints: spentPoints ?? 0, insight: insight ?? null as any, settledAt: now })
    .onConflictDoUpdate({ target: Histories.id, set: { totalPoints, spentPoints: spentPoints ?? 0, insight: insight ?? null as any, settledAt: now } });

  // Upsert summary if provided
  if (summary !== undefined || mood !== undefined) {
    await db
      .insert(Summaries)
      .values({ id, userId, date, content: summary ?? "", mood: Math.max(1, Math.min(5, Number(mood ?? 3))) })
      .onConflictDoUpdate({ target: Summaries.id, set: { content: summary ?? "", mood: Math.max(1, Math.min(5, Number(mood ?? 3))) } });
  }

  return Response.json({ ok: true });
}
