import type { Course, Goal, GoalPeriod, PlannerTask, Reward } from "../types";
export { RecurrenceRuleMatcher as RecurrenceRule } from "./RecurrenceEngine";

export type ScheduledTask = PlannerTask & {
  startTime: string;
  endTime: string;
  priorityScore: number;
  computedImportance: number;
};

export type ScheduledReward = Reward & {
  id: string;
  startTime: string;
  endTime: string;
  affordable: boolean;
  autoInserted: true;
};

export type ScheduleItem =
  | { type: "course"; startTime: string; endTime: string; data: Course }
  | { type: "task"; startTime: string; endTime: string; data: ScheduledTask }
  | { type: "reward"; startTime: string; endTime: string; data: ScheduledReward }
  | { type: "void"; startTime: string; endTime: string; data: { name: string } };

export type ScheduleAdvisory = {
  id: string;
  level: "info" | "warning";
  kind: "reward_locked" | "task_unplaced";
  taskId?: string;
  taskName?: string;
};

export type AutoScheduleResult = {
  items: ScheduleItem[];
  advisories: ScheduleAdvisory[];
};

type TimeRange = { start: number; end: number };

type ScheduleOptions = {
  goals?: Goal[];
  dayStart?: string;
  dayEnd?: string;
  bufferMinutes?: number;
  rewardDurationMinutes?: number;
  rewardEveryMinutes?: number;
  walletPoints?: number;
};

const DEFAULT_DAY_START = "06:30";
const DEFAULT_DAY_END = "23:10";

function parseTime(value: string | undefined, fallback: string) {
  const source = (value ?? fallback).trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(source);
  if (!match) return parseTime(fallback, fallback);
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function mergeRanges(ranges: TimeRange[]) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: TimeRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) {
      merged.push({ ...range });
      continue;
    }
    last.end = Math.max(last.end, range.end);
  }
  return merged;
}

function findEarliestSlot(duration: number, window: TimeRange, busy: TimeRange[]) {
  const mergedBusy = mergeRanges(busy.filter((range) => range.end > window.start && range.start < window.end));
  let cursor = window.start;
  for (const range of mergedBusy) {
    if (range.start - cursor >= duration) return { start: cursor, end: cursor + duration };
    cursor = Math.max(cursor, range.end);
  }
  if (window.end - cursor >= duration) return { start: cursor, end: cursor + duration };
  return null;
}

function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function daysUntil(deadline: string) {
  const parsed = parseLocalDate(deadline);
  if (!parsed) return 60;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const end = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  return Math.max(0, Math.round((end - start) / 86400000));
}

function goalLayerWeight(period: GoalPeriod) {
  if (period === "daily") return 1;
  if (period === "weekly") return 0.85;
  if (period === "monthly") return 0.7;
  return 0.55;
}

function goalUrgencyWeight(days: number) {
  if (days <= 1) return 1;
  if (days <= 3) return 0.9;
  if (days <= 7) return 0.78;
  if (days <= 30) return 0.62;
  if (days <= 90) return 0.48;
  return 0.35;
}

export function computeGoalDrivenImportance(task: PlannerTask, goals: Goal[]) {
  if (!task.goalId) return task.importance;
  const goal = goals.find((item) => item.id === task.goalId);
  if (!goal) return task.importance;
  const importance = goalLayerWeight(goal.period) * 0.6 + goalUrgencyWeight(daysUntil(goal.deadline)) * 0.4;
  return Number(Math.max(0.35, Math.min(1, importance)).toFixed(2));
}

function chooseReward(rewards: Reward[]) {
  return rewards.find((reward) => /喜欢|favorite/i.test(reward.name)) ?? rewards[0] ?? { name: "喜欢的事", requiredPoints: 60, icon: "Star" };
}

function rewardId(reward: Reward, start: number) {
  return `reward-${encodeURIComponent(reward.name)}-${start}`;
}

function isHardNeedTask(task: PlannerTask) {
  return task.hardBoundary === true || /网课|健身|专业课|course|workout|gym/i.test(task.name);
}

function bufferForTask(task: PlannerTask, fallback: number) {
  if (isHardNeedTask(task)) return Math.max(fallback, 20);
  if (task.energyCost === "high") return Math.max(fallback, 15);
  if (task.energyCost === "medium") return Math.max(fallback, 10);
  return Math.max(fallback, 5);
}

function schedulingWeight(task: PlannerTask, goals: Goal[]) {
  const computedImportance = computeGoalDrivenImportance(task, goals);
  let score = computePriorityScore({ importance: computedImportance, urgency: task.urgency });
  if (task.category === "competition") score += 0.12;
  if (task.energyCost === "high") score += 0.05;
  if (task.pinned) score += 0.15;
  if (task.locked) score += 1;
  return Number(score.toFixed(2));
}

function taskWindows(task: PlannerTask, dayWindow: TimeRange) {
  const morning: TimeRange = { start: Math.max(dayWindow.start, parseTime("06:40", "06:40")), end: Math.min(dayWindow.end, parseTime("11:30", "11:30")) };
  const afternoon: TimeRange = { start: Math.max(dayWindow.start, parseTime("13:00", "13:00")), end: Math.min(dayWindow.end, parseTime("18:40", "18:40")) };
  const evening: TimeRange = { start: Math.max(dayWindow.start, parseTime("19:20", "19:20")), end: dayWindow.end };
  if (task.anchor === "morning") return [morning, dayWindow];
  if (task.anchor === "after_class") return [afternoon, evening, dayWindow];
  if (task.anchor === "night") return [evening, dayWindow];
  if (task.category === "deep_work" || task.category === "competition") return [morning, afternoon, evening, dayWindow];
  return [afternoon, morning, evening, dayWindow];
}

export function computePriorityScore(task: Pick<PlannerTask, "importance" | "urgency">) {
  const importance = Math.max(0, Math.min(1, Number(task.importance) || 0));
  const urgency = Math.max(0, Math.min(1, Number(task.urgency) || 0));
  return Number((importance * 0.7 + urgency * 0.3).toFixed(2));
}

export function autoSchedule(courses: Course[], tasks: PlannerTask[], rewards: Reward[], options: ScheduleOptions = {}): AutoScheduleResult {
  const goals = options.goals ?? [];
  const dayWindow: TimeRange = { start: parseTime(options.dayStart, DEFAULT_DAY_START), end: parseTime(options.dayEnd, DEFAULT_DAY_END) };
  const bufferMinutes = Math.max(0, options.bufferMinutes ?? 10);
  const rewardDurationMinutes = Math.max(10, options.rewardDurationMinutes ?? 30);
  const rewardEveryMinutes = Math.max(30, options.rewardEveryMinutes ?? 120);
  const walletPoints = Math.max(0, options.walletPoints ?? 0);

  const advisories: ScheduleAdvisory[] = [];
  const items: ScheduleItem[] = [];
  const busy: TimeRange[] = [];

  const safeCourses = [...courses]
    .filter((course) => course.name)
    .map((course) => ({ ...course, start: parseTime(course.startTime, DEFAULT_DAY_START), end: parseTime(course.endTime, DEFAULT_DAY_END) }))
    .filter((course) => course.end > course.start)
    .sort((a, b) => a.start - b.start);

  for (const course of safeCourses) {
    busy.push({ start: course.start, end: course.end });
    items.push({ type: "course", startTime: formatTime(course.start), endTime: formatTime(course.end), data: { name: course.name, weekday: course.weekday, startTime: formatTime(course.start), endTime: formatTime(course.end) } });
    if (/网课|健身|专业课|course|workout|gym/i.test(course.name)) {
      items.push({ type: "void", startTime: formatTime(Math.max(dayWindow.start, course.start - 10)), endTime: formatTime(Math.min(dayWindow.end, course.end + 20)), data: { name: "Void Period" } });
      busy.push({ start: Math.max(dayWindow.start, course.start - 10), end: Math.min(dayWindow.end, course.end + 20) });
    }
  }

  const safeTasks = [...tasks].filter((task) => !task.deleted);
  const placedTaskIds = new Set<string>();
  let minutesSinceReward = 0;

  const insertReward = (searchFrom: number) => {
    const reward = chooseReward(rewards);
    const slot = findEarliestSlot(rewardDurationMinutes, { start: searchFrom, end: dayWindow.end }, busy);
    if (!slot) return;
    busy.push({ start: slot.start, end: slot.end + bufferMinutes });
    items.push({ type: "reward", startTime: formatTime(slot.start), endTime: formatTime(slot.end), data: { ...reward, id: rewardId(reward, slot.start), startTime: formatTime(slot.start), endTime: formatTime(slot.end), affordable: walletPoints >= reward.requiredPoints, autoInserted: true } });
    if (walletPoints < reward.requiredPoints) advisories.push({ id: `reward-locked-${slot.start}`, level: "info", kind: "reward_locked", taskName: reward.name });
  };

  const placeTask = (task: PlannerTask, slot: TimeRange) => {
    const computedImportance = computeGoalDrivenImportance(task, goals);
    const priorityScore = computePriorityScore({ importance: computedImportance, urgency: task.urgency });
    const postBuffer = bufferForTask(task, bufferMinutes);
    const preBuffer = isHardNeedTask(task) ? 10 : 0;

    busy.push({ start: Math.max(dayWindow.start, slot.start - preBuffer), end: slot.end + postBuffer });
    items.push({ type: "task", startTime: formatTime(slot.start), endTime: formatTime(slot.end), data: { ...task, importance: computedImportance, startTime: formatTime(slot.start), endTime: formatTime(slot.end), priorityScore, computedImportance } });
    if (isHardNeedTask(task)) {
      items.push({ type: "void", startTime: formatTime(Math.max(dayWindow.start, slot.start - preBuffer)), endTime: formatTime(Math.min(dayWindow.end, slot.end + postBuffer)), data: { name: "Void Period" } });
    }
    placedTaskIds.add(task.id);
    minutesSinceReward += Math.max(10, task.estimatedMinutes);
    if (minutesSinceReward >= rewardEveryMinutes) {
      insertReward(slot.end + postBuffer);
      minutesSinceReward = 0;
    }
  };

  const mandatoryTasks = safeTasks.filter((task) => task.isMandatory && task.exactTime).sort((a, b) => parseTime(a.exactTime, DEFAULT_DAY_START) - parseTime(b.exactTime, DEFAULT_DAY_START));
  for (const task of mandatoryTasks) {
    const start = parseTime(task.exactTime, DEFAULT_DAY_START);
    const duration = Math.max(10, task.estimatedMinutes);
    const slot = { start, end: start + duration };
    if (slot.end <= dayWindow.end) placeTask(task, slot);
  }

  const flexibleTasks = safeTasks.filter((task) => !placedTaskIds.has(task.id)).sort((a, b) => {
    const byWeight = schedulingWeight(b, goals) - schedulingWeight(a, goals);
    if (byWeight !== 0) return byWeight;
    return a.createdAt.localeCompare(b.createdAt);
  });

  for (const task of flexibleTasks) {
    const duration = Math.max(10, task.estimatedMinutes);
    const windows = taskWindows(task, dayWindow).filter((window) => window.end > window.start);
    let slot: TimeRange | null = null;
    for (const window of windows) {
      slot = findEarliestSlot(duration, window, busy);
      if (slot) break;
    }
    if (!slot) {
      advisories.push({ id: `task-unplaced-${task.id}`, level: "warning", kind: "task_unplaced", taskId: task.id, taskName: task.name });
      continue;
    }
    placeTask(task, slot);
  }

  return {
    items: items.sort((a, b) => parseTime(a.startTime, DEFAULT_DAY_START) - parseTime(b.startTime, DEFAULT_DAY_START)),
    advisories,
  };
}
