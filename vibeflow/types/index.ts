export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type WeekMode = "all" | "odd" | "even";

export interface Course {
  name: string;
  location?: string;
  startTime: string;
  endTime: string;
  weekday: Weekday;
  weeks?: number[];
  weekMode?: WeekMode;
  source?: "manual" | "imported";
  sourceLabel?: string;
}

export type HabitAnchor = "morning" | "break" | "after_class" | "night";

export type GoalPeriod = "daily" | "weekly" | "monthly" | "yearly";
export type EnergyCost = "low" | "medium" | "high";

export type TaskCategory =
  | "deep_work"
  | "competition"
  | "travel"
  | "robot"
  | "study"
  | "life"
  | "personal"
  | "habit"
  | "fixed_timeline";

export interface Goal {
  id: string;
  title: string;
  period: GoalPeriod;
  deadline: string;
  createdAt: string;
}

export type RecurrenceKind = "every_x_days" | "specific_week_days" | "day_of_month";

export interface RecurrenceRule {
  id: string;
  title: string;
  kind: RecurrenceKind;
  interval?: number;
  weekDays?: Weekday[];
  dayOfMonth?: number;
  category: TaskCategory;
  goalId?: string;
  estimatedMinutes: number;
  seedMinutes: number;
  urgency: number;
  energyCost: EnergyCost;
  createdAt: string;
  startsOn: string;
  lastGeneratedOn?: string;
  active: boolean;
}

export interface Task {
  name: string;
  estimatedMinutes: number;
  priority: 1 | 2 | 3 | 4 | 5;
  completed: boolean;
  completedAt?: string;
  rewardPoints: number;
  importance: number;
  urgency: number;
  energyCost?: EnergyCost;
  category?: TaskCategory;
  weekday?: Weekday;
  plannedDate?: string;
  goalId?: string;
  deadline?: string;
  anchor?: HabitAnchor;
  isDeadlineTask?: boolean;
  isMandatory?: boolean;
  exactTime?: string;
  remindAt?: string; // YYYY-MM-DDTHH:MM local reminder
  notes?: string;
  steps?: string[];
  tags?: string[];
  listId?: string;
  projectId?: string;
  isPreSleep?: boolean;
  isAutoInserted?: boolean;
  locked?: boolean;
  hardBoundary?: boolean;
  templateSource?: string;
}

export interface PlannerTask extends Task {
  id: string;
  pinned: boolean;
  deleted: boolean;
  createdAt: string;
  sourceRuleId?: string;
}

export interface Reward {
  name: string;
  requiredPoints: number;
  icon: string;
}

export interface DailyHistoryRecord {
  date: string;
  completedTasks: Task[];
  totalPoints: number;
  dailyVibe: string;
  insight?: string;
  spentPoints?: number;
  redeemedRewards?: Reward[];
  settledAt?: string;
}

export interface DailySummary {
  date: string;
  content: string;
  mood: number;
}
