import { NextRequest } from "next/server";
import { requireSession } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { histories as Histories, summaries as Summaries } from "../../../../lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: { date: string } }) {
  const session = await requireSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const userId = session.user!.email!;
  const date = params.date;
  try {
    const [history] = await db.select().from(Histories).where(and(eq(Histories.userId, userId), eq(Histories.date, date)));
    const [summary] = await db.select().from(Summaries).where(and(eq(Summaries.userId, userId), eq(Summaries.date, date)));
    return Response.json({ history: history ?? null, summary: summary ?? null });
  } catch {
    return Response.json({ history: null, summary: null });
  }
}
