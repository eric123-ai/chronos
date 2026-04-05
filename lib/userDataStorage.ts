import type { Course, Goal, PlannerTask, RecurrenceRule, Reward, Weekday } from "../types";
import { readJSON, readNumber, writeJSON, writeNumber } from "./storage";

const COURSES_KEY = "vibeflow.courses.v1";
const REWARDS_KEY = "vibeflow.rewards.v1";
const WALLET_KEY = "vibeflow.walletPoints.v1";
const TASKS_KEY = "vibeflow.tasks.v1";
const GOALS_KEY = "chronos.goals.v1";
const RECURRENCE_KEY = "chronos.recurrence-rules.v1";

function isCourseArray(payload: unknown): payload is Course[] {
  return (
    Array.isArray(payload) &&
    payload.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Course).name === "string" &&
        typeof (item as Course).startTime === "string" &&
        typeof (item as Course).endTime === "string" &&
        Number.isFinite((item as Course).weekday),
    )
  );
}

function isRewardArray(payload: unknown): payload is Reward[] {
  return (
    Array.isArray(payload) &&
    payload.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Reward).name === "string" &&
        Number.isFinite((item as Reward).requiredPoints),
    )
  );
}

function isTaskArray(payload: unknown): payload is PlannerTask[] {
  return (
    Array.isArray(payload) &&
    payload.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as PlannerTask).id === "string" &&
        typeof (item as PlannerTask).name === "string" &&
        Number.isFinite((item as PlannerTask).estimatedMinutes) &&
        Number.isFinite((item as PlannerTask).priority) &&
        Number.isFinite((item as PlannerTask).rewardPoints) &&
        Number.isFinite((item as PlannerTask).importance) &&
        Number.isFinite((item as PlannerTask).urgency) &&
        typeof (item as PlannerTask).completed === "boolean" &&
        ((item as PlannerTask).completedAt === undefined ||
          typeof (item as PlannerTask).completedAt === "string") &&
        ((item as PlannerTask).energyCost === undefined ||
          typeof (item as PlannerTask).energyCost === "string") &&
        ((item as PlannerTask).weekday === undefined ||
          Number.isFinite((item as PlannerTask).weekday)) &&
        ((item as PlannerTask).plannedDate === undefined ||
          typeof (item as PlannerTask).plannedDate === "string") &&
        ((item as PlannerTask).goalId === undefined ||
          typeof (item as PlannerTask).goalId === "string") &&
        ((item as PlannerTask).sourceRuleId === undefined ||
          typeof (item as PlannerTask).sourceRuleId === "string") &&
        ((item as PlannerTask).hardBoundary === undefined ||
          typeof (item as PlannerTask).hardBoundary === "boolean") &&
        typeof (item as PlannerTask).pinned === "boolean" &&
        typeof (item as PlannerTask).deleted === "boolean" &&
        typeof (item as PlannerTask).createdAt === "string",
    )
  );
}

function isGoalArray(payload: unknown): payload is Goal[] {
  return (
    Array.isArray(payload) &&
    payload.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Goal).id === "string" &&
        typeof (item as Goal).title === "string" &&
        typeof (item as Goal).deadline === "string" &&
        typeof (item as Goal).createdAt === "string" &&
        ((item as Goal).period === "daily" ||
          (item as Goal).period === "weekly" ||
          (item as Goal).period === "monthly" ||
          (item as Goal).period === "yearly"),
    )
  );
}

function isRecurrenceArray(payload: unknown): payload is RecurrenceRule[] {
  return (
    Array.isArray(payload) &&
    payload.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as RecurrenceRule).id === "string" &&
        typeof (item as RecurrenceRule).title === "string" &&
        typeof (item as RecurrenceRule).category === "string" &&
        typeof (item as RecurrenceRule).estimatedMinutes === "number" &&
        typeof (item as RecurrenceRule).seedMinutes === "number" &&
        typeof (item as RecurrenceRule).urgency === "number" &&
        typeof (item as RecurrenceRule).energyCost === "string" &&
        typeof (item as RecurrenceRule).createdAt === "string" &&
        typeof (item as RecurrenceRule).startsOn === "string" &&
        typeof (item as RecurrenceRule).active === "boolean",
    )
  );
}

export function loadCourses(): Course[] {
  return readJSON<Course[]>(COURSES_KEY, [], isCourseArray);
}

export function saveCourses(courses: Course[]) {
  writeJSON(COURSES_KEY, courses);
}

export function loadRewards(): Reward[] {
  return readJSON<Reward[]>(REWARDS_KEY, [], isRewardArray);
}

export function saveRewards(rewards: Reward[]) {
  writeJSON(REWARDS_KEY, rewards);
}

export function loadTasks(): PlannerTask[] {
  return readJSON<PlannerTask[]>(TASKS_KEY, [], isTaskArray);
}

export function saveTasks(tasks: PlannerTask[]) {
  writeJSON(TASKS_KEY, tasks);
}

export function loadGoals(): Goal[] {
  return readJSON<Goal[]>(GOALS_KEY, [], isGoalArray);
}

export function saveGoals(goals: Goal[]) {
  writeJSON(GOALS_KEY, goals);
}

export function loadRecurrenceRules(): RecurrenceRule[] {
  return readJSON<RecurrenceRule[]>(RECURRENCE_KEY, [], isRecurrenceArray);
}

export function saveRecurrenceRules(rules: RecurrenceRule[]) {
  writeJSON(RECURRENCE_KEY, rules);
}

export function loadWalletPoints(): number {
  return readNumber(WALLET_KEY, 0);
}

export function saveWalletPoints(points: number) {
  writeNumber(WALLET_KEY, Math.max(0, Math.floor(points)));
}

export function weekdayFromDate(date: Date): Weekday {
  const js = date.getDay();
  return ((js === 0 ? 7 : js) as unknown) as Weekday;
}
