import { NextRequest } from "next/server";
import { requireSession } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { histories as Histories } from "../../../lib/db/schema";
import { and, desc, eq, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const userId = session.user!.email!;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    // fallback: return recent 14
    const rows = await db
      .select()
      .from(Histories)
      .where(eq(Histories.userId, userId))
      .orderBy(desc(Histories.date))
      .limit(14)
      .catch(() => []);
    return Response.json({ items: rows });
  }

  const rows = await db
    .select()
    .from(Histories)
    .where(and(eq(Histories.userId, userId), gte(Histories.date, from), lte(Histories.date, to)))
    .catch(() => []);

  return Response.json({ items: rows });
}
