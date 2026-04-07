import { NextRequest } from "next/server";
import { generateIcsForDay } from "../../../lib/ics";
import { autoSchedule, type ScheduleItem } from "../../../lib/autoSchedule";
import { loadCourses, loadTasks, loadRewards, loadGoals, loadWalletPoints } from "../../../lib/userDataStorage";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") || "day"; // day|week|all (MVP only day)
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

  if (scope !== "day") {
    return new Response("Only day scope is supported in MVP", { status: 400 });
  }

  // Recompute schedule for the day using existing local stores
  // NOTE: In MVP server route still reads client-side storage wrappers which fall back to localStorage -> not available on server.
  // For MVP we keep API for future use, and return 400 to avoid confusion when called server-side.
  return new Response("Server-side ICS generation requires cloud data; use client export button for now.", { status: 400 });
}
