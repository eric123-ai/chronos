import type { DailyHistoryRecord, DailySummary, Reward, Task } from "../types";
import { readJSON, writeJSON } from "./storage";

const HISTORY_KEY = "vibeflow.history.v1";
const DAILY_STATE_PREFIX = "vibeflow.daily.v1:";
const SUMMARY_KEY = "vibeflow_summaries";

export type DailyState = {
  date: string;
  completedTaskIds: string[];
  dailyVibe: string;
  redeemedRewardIds: string[];
  redeemedRewards?: Reward[];
  blockedRewardIds: string[];
  spentPoints: number;
  insightNote: string;
  lastSettledAt?: string;
};

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isHistoryArray(payload: unknown): payload is DailyHistoryRecord[] {
  return Array.isArray(payload);
}

function emptyDailyState(date: string): DailyState {
  return {
    date,
    completedTaskIds: [],
    dailyVibe: "",
    redeemedRewardIds: [],
    redeemedRewards: [],
    blockedRewardIds: [],
    spentPoints: 0,
    insightNote: "",
    lastSettledAt: undefined,
  };
}

export function loadHistory(): DailyHistoryRecord[] {
  return readJSON<DailyHistoryRecord[]>(HISTORY_KEY, [], isHistoryArray);
}

function isSummaryArray(payload: unknown): payload is DailySummary[] {
  return Array.isArray(payload);
}

export function upsertHistory(record: DailyHistoryRecord): DailyHistoryRecord[] {
  const current = loadHistory();
  const next = [
    record,
    ...current.filter((r) => r && typeof r === "object" && r.date !== record.date),
  ].sort((a, b) => b.date.localeCompare(a.date));

  writeJSON(HISTORY_KEY, next);
  return next;
}

export function loadSummaries(): DailySummary[] {
  return readJSON<DailySummary[]>(SUMMARY_KEY, [], isSummaryArray)
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.date === "string" &&
        typeof item.content === "string" &&
        Number.isFinite(item.mood),
    )
    .map((item) => ({
      date: item.date,
      content: item.content,
      mood: Math.max(1, Math.min(5, Number(item.mood))),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function upsertSummary(summary: DailySummary): DailySummary[] {
  const current = loadSummaries();
  const next = [
    {
      date: summary.date,
      content: summary.content,
      mood: Math.max(1, Math.min(5, Number(summary.mood))),
    },
    ...current.filter((item) => item.date !== summary.date),
  ].sort((a, b) => b.date.localeCompare(a.date));

  writeJSON(SUMMARY_KEY, next);
  return next;
}

export function loadDailyState(date: string): DailyState {
  const stored = readJSON<(Partial<DailyState> & { experimentNote?: string }) | null>(
    `${DAILY_STATE_PREFIX}${date}`,
    null,
  );
  if (!stored) {
    return emptyDailyState(date);
  }
  return {
    date,
    completedTaskIds: Array.isArray(stored.completedTaskIds)
      ? stored.completedTaskIds.filter((v): v is string => typeof v === "string")
      : [],
    dailyVibe: typeof stored.dailyVibe === "string" ? stored.dailyVibe : "",
    redeemedRewardIds: Array.isArray(stored.redeemedRewardIds)
      ? stored.redeemedRewardIds.filter(
          (v): v is string => typeof v === "string",
        )
      : [],
    redeemedRewards: Array.isArray(stored.redeemedRewards)
      ? stored.redeemedRewards.filter(
          (reward): reward is Reward =>
            Boolean(reward) &&
            typeof reward === "object" &&
            typeof reward.name === "string" &&
            Number.isFinite(reward.requiredPoints),
        )
      : [],
    blockedRewardIds: Array.isArray(stored.blockedRewardIds)
      ? stored.blockedRewardIds.filter((v): v is string => typeof v === "string")
      : [],
    spentPoints: Number.isFinite(stored.spentPoints)
      ? Math.max(0, Number(stored.spentPoints))
      : 0,
    insightNote:
      typeof stored.insightNote === "string"
        ? stored.insightNote
        : typeof stored.experimentNote === "string"
          ? stored.experimentNote
          : "",
    lastSettledAt:
      typeof stored.lastSettledAt === "string" ? stored.lastSettledAt : undefined,
  };
}

export function saveDailyState(state: DailyState) {
  writeJSON(`${DAILY_STATE_PREFIX}${state.date}`, state);
}

export function computeTotalPoints(completedTasks: Task[]): number {
  return completedTasks.reduce(
    (sum, t) => sum + (Number.isFinite(t.rewardPoints) ? t.rewardPoints : 0),
    0,
  );
}
