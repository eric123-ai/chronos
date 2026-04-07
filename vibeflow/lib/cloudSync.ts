import { readJSON, writeJSON } from "./storage";
import { loadCourses, loadGoals, loadRecurrenceRules, loadRewards, loadTasks, loadWalletPoints } from "./userDataStorage";

const SYNC_SINCE_KEY = "chronos.sync.since";

export type SyncPayload = {
  since?: string;
  tasks?: any[];
  courses?: any[];
  goals?: any[];
  rules?: any[];
  histories?: any[];
  summaries?: any[];
};

export async function backgroundSync() {
  try {
    const since = readJSON<string | null>(SYNC_SINCE_KEY, null);
    const payload: SyncPayload = { since: since || undefined };
    payload.tasks = loadTasks();
    payload.courses = loadCourses();
    payload.goals = loadGoals();
    payload.rules = loadRecurrenceRules();

    const res = await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    if (data?.serverTime) writeJSON(SYNC_SINCE_KEY, data.serverTime);

    // Merge-down (simple LWW by updatedAt string compare where present)
    if (Array.isArray(data?.tasks)) writeJSON("vibeflow.tasks.v1", data.tasks);
    if (Array.isArray(data?.courses)) writeJSON("vibeflow.courses.v1", data.courses);
    if (Array.isArray(data?.goals)) writeJSON("chronos.goals.v1", data.goals);
    if (Array.isArray(data?.rules)) writeJSON("chronos.recurrence-rules.v1", data.rules);

    return true;
  } catch {
    return false;
  }
}

export async function migrateLocalToCloud() {
  const keys = [
    "vibeflow.courses.v1",
    "vibeflow.rewards.v1",
    "vibeflow.walletPoints.v1",
    "vibeflow.tasks.v1",
    "chronos.goals.v1",
    "chronos.recurrence-rules.v1",
    "vibeflow.history.v1",
    "vibeflow_summaries",
  ];
  const backup: Record<string, unknown> = { version: "1" };
  for (const key of keys) {
    backup[key] = readJSON(key, null as any);
  }
  const res = await fetch("/api/import/local-json", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(backup) });
  return res.ok;
}
