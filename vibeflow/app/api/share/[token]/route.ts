import { NextRequest } from "next/server";
import { db } from "../../../../lib/db";
import { shareLinks, tasks as Tasks } from "../../../../lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token) return new Response("Bad Request", { status: 400 });
  const [link] = await db.select().from(shareLinks).where(and(eq(shareLinks.token, token), isNull(shareLinks.revokedAt)));
  if (!link) return new Response("Not Found", { status: 404 });
  // Fetch latest tasks for this user (MVP: all non-deleted, limited)
  const items = await db.select({ name: Tasks.name, estimatedMinutes: Tasks.estimatedMinutes, plannedDate: Tasks.plannedDate }).from(Tasks).where(and(eq(Tasks.userId, link.userId), eq(Tasks.deleted, false))).limit(200);
  return Response.json({ items });
}
