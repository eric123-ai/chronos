import { NextRequest } from "next/server";
import { db } from "../../../lib/db";
import { shareLinks } from "../../../lib/db/schema";
import { requireSession } from "../../../lib/auth";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const userId = session.user!.email!;
  const body = await req.json().catch(() => ({}));
  const type = String(body.type || "list");
  const listId = body.listId ? String(body.listId) : null;
  const token = randomBytes(16).toString("hex");
  await db.insert(shareLinks).values({ id: `share-${Date.now()}`, userId, token, type, listId: listId ?? undefined });
  return Response.json({ url: `/share/${token}` });
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const userId = session.user!.email!;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return new Response("Bad Request", { status: 400 });
  await db.update(shareLinks).set({ revokedAt: new Date() }).where(eq(shareLinks.userId, userId));
  return Response.json({ ok: true });
}
