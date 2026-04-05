import type { PlannerTask, RecurrenceRule, Weekday } from "../types";

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetween(start: Date, end: Date) {
  const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return Math.floor((endTime - startTime) / 86400000);
}

function weekdayFromDate(date: Date): Weekday {
  const jsDay = date.getDay();
  return ((jsDay === 0 ? 7 : jsDay) as Weekday);
}

export class RecurrenceRuleMatcher {
  constructor(private rule: RecurrenceRule) {}

  matches(targetDate: Date) {
    const startsOn = parseDate(this.rule.startsOn);
    if (!startsOn) return false;
    if (daysBetween(startsOn, targetDate) < 0) return false;

    if (this.rule.kind === "every_x_days") {
      const interval = Math.max(1, this.rule.interval ?? 1);
      return daysBetween(startsOn, targetDate) % interval === 0;
    }

    if (this.rule.kind === "specific_week_days") {
      return (this.rule.weekDays ?? []).includes(weekdayFromDate(targetDate));
    }

    if (this.rule.kind === "day_of_month") {
      return targetDate.getDate() === Math.max(1, Math.min(31, this.rule.dayOfMonth ?? 1));
    }

    return false;
  }
}

export function buildRecurringInstance(rule: RecurrenceRule, date: string, weekday: Weekday): PlannerTask {
  return {
    id: `recurrence-${rule.id}-${date}`,
    name: rule.title,
    estimatedMinutes: Math.max(5, rule.seedMinutes),
    priority: 3,
    completed: false,
    rewardPoints: Math.max(5, Math.round(rule.seedMinutes * 0.4)),
    importance: 0.55,
    urgency: rule.urgency,
    category: rule.category,
    weekday,
    goalId: rule.goalId,
    pinned: false,
    deleted: false,
    locked: false,
    createdAt: new Date().toISOString(),
    sourceRuleId: rule.id,
  };
}

export function generateRecurringTasksForDate(
  rules: RecurrenceRule[],
  existingTasks: PlannerTask[],
  date: string,
) {
  const targetDate = parseDate(date);
  if (!targetDate) {
    return { tasks: existingTasks, generatedRuleIds: [] as string[] };
  }

  const generatedRuleIds: string[] = [];
  const nextTasks = [...existingTasks];
  const weekday = weekdayFromDate(targetDate);

  for (const rule of rules.filter((item) => item.active)) {
    const matcher = new RecurrenceRuleMatcher(rule);
    const taskId = `recurrence-${rule.id}-${date}`;
    if (!matcher.matches(targetDate)) continue;
    if (nextTasks.some((task) => task.id === taskId || task.sourceRuleId === rule.id && task.id.endsWith(date))) continue;
    nextTasks.unshift(buildRecurringInstance(rule, date, weekday));
    generatedRuleIds.push(rule.id);
  }

  return { tasks: nextTasks, generatedRuleIds };
}

export function markRulesGenerated(
  rules: RecurrenceRule[],
  ruleIds: string[],
  date: string,
) {
  if (!ruleIds.length) return rules;
  const idSet = new Set(ruleIds);
  return rules.map((rule) =>
    idSet.has(rule.id) ? { ...rule, lastGeneratedOn: date } : rule,
  );
}

export function toRecurringDateString(date: Date) {
  return toDateString(date);
}
