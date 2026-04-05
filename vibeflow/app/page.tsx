"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Flame,
  Import,
  Pin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Navigation } from "../components/Navigation";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useI18n } from "../components/I18nProvider";
import { autoSchedule, computeGoalDrivenImportance, computePriorityScore } from "../lib/autoSchedule";
import {
  generateRecurringTasksForDate,
  markRulesGenerated,
  toRecurringDateString,
} from "../lib/RecurrenceEngine";
import {
  computeTotalPoints,
  formatLocalDate,
  loadDailyState,
  loadHistory,
  saveDailyState,
  upsertHistory,
} from "../lib/historyStorage";
import {
  loadCourses,
  loadGoals,
  loadRecurrenceRules,
  loadRewards,
  loadTasks,
  loadWalletPoints,
  saveCourses,
  saveGoals,
  saveRecurrenceRules,
  saveRewards,
  saveTasks,
  saveWalletPoints,
  weekdayFromDate,
} from "../lib/userDataStorage";
import { readJSON, writeJSON } from "../lib/storage";
import type { Course, Goal, GoalPeriod, PlannerTask, RecurrenceRule, Reward, TaskCategory, Weekday } from "../types";

type TabKey = "today" | "blueprint" | "arsenal" | "insight";

type TaskDraft = {
  name: string;
  estimatedMinutes: string;
  urgency: string;
  energyCost: "low" | "medium" | "high";
  category: TaskCategory;
  goalId: string;
  exactTime: string;
  isMandatory: boolean;
  hardBoundary: boolean;
};

type RuleDraft = {
  title: string;
  kind: RecurrenceRule["kind"];
  interval: string;
  weekDays: Weekday[];
  dayOfMonth: string;
  estimatedMinutes: string;
  seedMinutes: string;
  urgency: string;
  energyCost: "low" | "medium" | "high";
  category: TaskCategory;
  goalId: string;
};

type GoalDraft = {
  title: string;
  period: GoalPeriod;
  deadline: string;
};

type Toast = { id: number; message: string };

type FlashNote = {
  id: string;
  content: string;
  category: "robot" | "cpp" | "life";
  createdAt: string;
};

type TemplateDefinition = {
  id: string;
  name: string;
  items: string[];
  category: TaskCategory;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const TEMPLATE_LIBRARY: TemplateDefinition[] = [
  { id: "travel-kit", name: "出行必备", items: ["身份证", "充电宝", "代码备份", "竞赛手册"], category: "travel" },
  { id: "robot-check", name: "机器人赛前点检", items: ["电池检查", "传感器校准", "代码编译通过"], category: "competition" },
  { id: "cpp-drills", name: "C++ 刷题清单", items: ["一道动态规划", "一道图论", "一道字符串"], category: "study" },
];

const FOUNDATION_RULES = [
  { id: "wake-sync", title: "06:40 早起", exactTime: "06:40", minutes: 15, category: "habit" as TaskCategory },
  { id: "night-read", title: "22:30 睡前看书", exactTime: "22:30", minutes: 20, category: "habit" as TaskCategory },
];

const FLASH_NOTES_KEY = "chronos.flash-notes.v1";
const SETTINGS_KEY = "chronos.settings.v1";
const SOUL_QUOTES = [
  "The scenery is waiting for you, Eric.",
  "The schedule can wait a moment. Breathe first.",
  "Progress is locked. You can soften now.",
];

const TEXT = {
  cn: {
    brand: "时序 Chronos",
    subtitle: "生物同步、目标导向的个人操作系统。",
    tabs: { today: "今天", blueprint: "蓝图", arsenal: "军械库", insight: "洞察" },
    today: "今天",
    addTask: "新建任务",
    addRule: "新建循环规则",
    importTemplate: "导入模板",
    createGoal: "添加目标",
    taskName: "任务名",
    ruleName: "母版标题",
    urgency: "紧急度 0-1",
    minutes: "预计时长",
    seed: "火种时间",
    exactTime: "固定时间 16:00",
    mandatory: "固定时间任务",
    goalTitle: "目标标题",
    priority: "优先分",
    importance: "系统重要度",
    settle: "结算今日",
    restore: "恢复",
    delete: "删除",
    pin: "置顶",
    unpin: "取消置顶",
    complete: "完成",
    completed: "已完成",
    focus: "专注模式",
    noTasks: "这一天还没有任务。",
    noRules: "还没有循环母版。",
    noGoals: "还没有目标。",
    templates: "模板库",
    curves: "成长曲线",
    heatmap: "28 天习惯热力图",
    saved: "已保存",
    imported: "模板已导入 Today",
    settled: "今日已归档",
    categories: {
      deep_work: "深度工作",
      competition: "竞赛",
      travel: "出行",
      robot: "机器人",
      study: "学习",
      life: "生活",
      personal: "个人",
      habit: "习惯",
    },
    periods: {
      daily: "周目标 / Daily",
      weekly: "短期 / Weekly",
      monthly: "中期 / Monthly",
      yearly: "长期 / Yearly",
    },
  },
  en: {
    brand: "Chronos",
    subtitle: "A bio-synced, goal-driven personal operating system.",
    tabs: { today: "Today", blueprint: "Blueprint", arsenal: "Arsenal", insight: "Insight" },
    today: "Today",
    addTask: "Add task",
    addRule: "Add recurrence rule",
    importTemplate: "Import template",
    createGoal: "Add goal",
    taskName: "Task name",
    ruleName: "Rule title",
    urgency: "Urgency 0-1",
    minutes: "Estimated minutes",
    seed: "Seed minutes",
    exactTime: "Fixed time 16:00",
    mandatory: "Fixed-time task",
    goalTitle: "Goal title",
    priority: "Priority",
    importance: "System importance",
    settle: "Settle today",
    restore: "Restore",
    delete: "Delete",
    pin: "Pin",
    unpin: "Unpin",
    complete: "Complete",
    completed: "Done",
    focus: "Focus mode",
    noTasks: "No tasks for this date.",
    noRules: "No blueprint rules yet.",
    noGoals: "No goals yet.",
    templates: "Template library",
    curves: "Growth curve",
    heatmap: "28-day habit heatmap",
    saved: "Saved",
    imported: "Template imported into Today",
    settled: "Today archived",
    categories: {
      deep_work: "Deep work",
      competition: "Competition",
      travel: "Travel",
      robot: "Robot",
      study: "Study",
      life: "Life",
      personal: "Personal",
      habit: "Habit",
    },
    periods: {
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      yearly: "Yearly",
    },
  },
} as const;

const DEFAULT_TASK_DRAFT: TaskDraft = {
  name: "",
  estimatedMinutes: "45",
  urgency: "0.5",
  energyCost: "medium",
  category: "study",
  goalId: "",
  exactTime: "",
  isMandatory: false,
  hardBoundary: false,
};

const DEFAULT_RULE_DRAFT: RuleDraft = {
  title: "",
  kind: "specific_week_days",
  interval: "1",
  weekDays: [1, 3, 5],
  dayOfMonth: "1",
  estimatedMinutes: "40",
  seedMinutes: "10",
  urgency: "0.45",
  energyCost: "medium",
  category: "habit",
  goalId: "",
};

const DEFAULT_GOAL_DRAFT: GoalDraft = {
  title: "",
  period: "weekly",
  deadline: "",
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function priorityBucket(score: number) {
  if (score >= 0.8) return 1;
  if (score >= 0.65) return 2;
  if (score >= 0.5) return 3;
  if (score >= 0.35) return 4;
  return 5;
}

function createGoal(draft: GoalDraft): Goal {
  return {
    id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: draft.title.trim(),
    period: draft.period,
    deadline: draft.deadline,
    createdAt: new Date().toISOString(),
  };
}

function createTask(draft: TaskDraft, selectedDate: string, weekday: Weekday): PlannerTask {
  const urgency = clamp01(Number(draft.urgency) || 0);
  const importance = draft.goalId ? 0.65 : 0.55;
  const score = computePriorityScore({ importance, urgency });
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: draft.name.trim(),
    estimatedMinutes: Math.max(10, Number(draft.estimatedMinutes) || 10),
    priority: priorityBucket(score),
    completed: false,
    rewardPoints: Math.max(5, Math.round((Number(draft.estimatedMinutes) || 0) * 0.35)),
    importance,
    urgency,
    energyCost: draft.energyCost,
    category: draft.category,
    weekday,
    plannedDate: selectedDate,
    goalId: draft.goalId || undefined,
    isMandatory: draft.isMandatory,
    exactTime: draft.isMandatory ? draft.exactTime || undefined : undefined,
    hardBoundary: draft.hardBoundary,
    pinned: false,
    deleted: false,
    createdAt: new Date().toISOString(),
  };
}

function createRule(draft: RuleDraft, selectedDate: string): RecurrenceRule {
  return {
    id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: draft.title.trim(),
    kind: draft.kind,
    interval: Math.max(1, Number(draft.interval) || 1),
    weekDays: draft.weekDays,
    dayOfMonth: Math.max(1, Math.min(31, Number(draft.dayOfMonth) || 1)),
    category: draft.category,
    goalId: draft.goalId || undefined,
    estimatedMinutes: Math.max(10, Number(draft.estimatedMinutes) || 10),
    seedMinutes: Math.max(5, Number(draft.seedMinutes) || 5),
    urgency: clamp01(Number(draft.urgency) || 0.4),
    energyCost: draft.energyCost,
    createdAt: new Date().toISOString(),
    startsOn: selectedDate,
    active: true,
  };
}

function buildFoundationTasks(date: string, weekday: Weekday): PlannerTask[] {
  return FOUNDATION_RULES.map((item) => ({
    id: `foundation-${item.id}-${date}`,
    name: item.title,
    estimatedMinutes: item.minutes,
    priority: 1,
    completed: false,
    rewardPoints: 8,
    importance: 0.95,
    urgency: 0.9,
    energyCost: "medium",
    category: item.category,
    weekday,
    plannedDate: date,
    isMandatory: true,
    exactTime: item.exactTime,
    pinned: true,
    deleted: false,
    locked: true,
    hardBoundary: true,
    createdAt: new Date().toISOString(),
    sourceRuleId: item.id,
  }));
}

function mergeFoundationTasks(tasks: PlannerTask[], date: string, weekday: Weekday) {
  const next = [...tasks];
  for (const task of buildFoundationTasks(date, weekday)) {
    if (!next.some((item) => item.id === task.id)) next.unshift(task);
  }
  return next;
}

function buildTemplateTasks(template: TemplateDefinition, date: string, weekday: Weekday): PlannerTask[] {
  return template.items.map((item, index) => ({
    id: `template-${template.id}-${date}-${index}`,
    name: item,
    estimatedMinutes: 25,
    priority: 3,
    completed: false,
    rewardPoints: 12,
    importance: 0.55,
    urgency: 0.5,
    energyCost: template.category === "competition" ? "high" : "medium",
    category: template.category,
    weekday,
    plannedDate: date,
    pinned: false,
    deleted: false,
    createdAt: new Date().toISOString(),
    templateSource: template.name,
  }));
}

function buildHeatmap(historyLog: ReturnType<typeof loadHistory>, tasks: PlannerTask[], todayDate: string) {
  const cells: Array<{ date: string; count: number }> = [];
  for (let offset = 27; offset >= 0; offset -= 1) {
    const date = addDays(new Date(), -offset);
    cells.push({ date: formatLocalDate(date), count: 0 });
  }
  const counts = new Map(cells.map((cell) => [cell.date, 0]));
  for (const record of historyLog) {
    if (!counts.has(record.date)) continue;
    counts.set(record.date, record.completedTasks.filter((task) => task.locked).length);
  }
  const todayLocked = tasks.filter((task) => task.plannedDate === todayDate && task.completed && task.locked).length;
  if (counts.has(todayDate)) counts.set(todayDate, todayLocked);
  return cells.map((cell) => ({ ...cell, count: counts.get(cell.date) ?? 0 }));
}

export default function HomePage() {
  const { locale } = useI18n();
  const text = TEXT[locale];
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const [hydrated, setHydrated] = useState(false);
  const [battleLoading, setBattleLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [mode, setMode] = useState<"battle" | "soul">("battle");
  const [plan, setPlan] = useState<"basic" | "pro">("basic");
  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slideDirection, setSlideDirection] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [rules, setRules] = useState<RecurrenceRule[]>([]);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [walletPoints, setWalletPoints] = useState(0);
  const [spentPoints, setSpentPoints] = useState(0);
  const [redeemedRewardIds, setRedeemedRewardIds] = useState<string[]>([]);
  const [redeemedRewards, setRedeemedRewards] = useState<Reward[]>([]);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(DEFAULT_TASK_DRAFT);
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(DEFAULT_RULE_DRAFT);
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(DEFAULT_GOAL_DRAFT);
  const [flashNote, setFlashNote] = useState("");
  const [flashNotes, setFlashNotes] = useState<FlashNote[]>([]);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [breathCount, setBreathCount] = useState(4);
  const [ambientEnabled, setAmbientEnabled] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [revivalCards, setRevivalCards] = useState(3);

  const pushToast = useCallback((message: string) => {
    setToast((current) => ({ id: (current?.id ?? 0) + 1, message }));
  }, []);

  const hydrateForDate = useCallback((date: Date) => {
    const formatted = toRecurringDateString(date);
    const weekday = weekdayFromDate(date);
    const dailyState = loadDailyState(formatted);
    const storedRules = loadRecurrenceRules();
    const baseTasks = mergeFoundationTasks(loadTasks(), formatted, weekday).map((task) => ({
      ...task,
      completed: dailyState.completedTaskIds.includes(task.id) || task.completed,
    }));
    const generated = generateRecurringTasksForDate(storedRules, baseTasks, formatted);

    setToday(formatLocalDate(new Date()));
    setSelectedDate(formatted);
    setCourses(loadCourses());
    setGoals(loadGoals());
    setRules(markRulesGenerated(storedRules, generated.generatedRuleIds, formatted));
    setTasks(generated.tasks);
    setRewards(loadRewards());
    setWalletPoints(loadWalletPoints());
    setSpentPoints(dailyState.spentPoints);
    setRedeemedRewardIds(dailyState.redeemedRewardIds);
    setRedeemedRewards(dailyState.redeemedRewards ?? []);
    const settings = readJSON<{ mode: "battle" | "soul"; plan: "basic" | "pro"; revivalCards: number }>(
      SETTINGS_KEY,
      { mode: "battle", plan: "basic", revivalCards: 3 },
    );
    setMode(settings.mode);
    setPlan(settings.plan);
    setRevivalCards(settings.revivalCards);
    setFlashNotes(readJSON<FlashNote[]>(FLASH_NOTES_KEY, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => hydrateForDate(new Date()), 0);
    return () => window.clearTimeout(timer);
  }, [hydrateForDate]);

  useEffect(() => { if (hydrated) saveCourses(courses); }, [courses, hydrated]);
  useEffect(() => { if (hydrated) saveGoals(goals); }, [goals, hydrated]);
  useEffect(() => { if (hydrated) saveRecurrenceRules(rules); }, [hydrated, rules]);
  useEffect(() => { if (hydrated) saveTasks(tasks); }, [hydrated, tasks]);
  useEffect(() => { if (hydrated) saveRewards(rewards); }, [hydrated, rewards]);
  useEffect(() => { if (hydrated) saveWalletPoints(walletPoints); }, [hydrated, walletPoints]);
  useEffect(() => {
    if (!hydrated) return;
    writeJSON(SETTINGS_KEY, { mode, plan, revivalCards });
  }, [hydrated, mode, plan, revivalCards]);
  useEffect(() => {
    if (!hydrated) return;
    writeJSON(FLASH_NOTES_KEY, flashNotes);
  }, [flashNotes, hydrated]);

  useEffect(() => {
    if (!hydrated || !selectedDate) return;
    saveDailyState({
      date: selectedDate,
      completedTaskIds: tasks.filter((task) => task.completed && task.plannedDate === selectedDate).map((task) => task.id),
      dailyVibe: "",
      redeemedRewardIds,
      redeemedRewards,
      blockedRewardIds: [],
      spentPoints,
      insightNote: "",
    });
  }, [hydrated, redeemedRewardIds, redeemedRewards, selectedDate, spentPoints, tasks]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!hydrated) return;
    if (mode === "soul") return;
    const timer = window.setTimeout(() => setBattleLoading(false), 450);
    return () => window.clearTimeout(timer);
  }, [hydrated, mode, selectedDate]);

  useEffect(() => {
    if (mode !== "soul") return;
    const timer = window.setInterval(() => {
      setBreathCount((current) => (current <= 1 ? 4 : current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const originalWarn = console.warn;
    const originalError = console.error;
    const shouldSuppress = (value: unknown) =>
      typeof value === "string" &&
      (/WebSocket/i.test(value) || /stream disconnected/i.test(value));

    console.warn = (...args) => {
      if (args.some(shouldSuppress)) return;
      originalWarn(...args);
    };
    console.error = (...args) => {
      if (args.some(shouldSuppress)) return;
      originalError(...args);
    };

    return () => {
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !today) return;
    const timer = window.setInterval(() => {
      const now = new Date();
      const currentDate = toRecurringDateString(now);
      if (currentDate === today) return;
      hydrateForDate(now);
    }, 60000);
    return () => window.clearInterval(timer);
  }, [hydrateForDate, hydrated, today]);

  const selectedWeekday = useMemo(() => weekdayFromDate(parseDate(selectedDate || today || formatLocalDate(new Date()))), [selectedDate, today]);
  const todayTasks = useMemo(() => tasks.filter((task) => !task.deleted && task.plannedDate === selectedDate), [selectedDate, tasks]);
  const selectedCourses = useMemo(() => courses.filter((course) => course.weekday === selectedWeekday).sort((a, b) => a.startTime.localeCompare(b.startTime)), [courses, selectedWeekday]);
  const scheduleResult = useMemo(() => autoSchedule(selectedCourses, todayTasks, rewards, { goals, walletPoints, bufferMinutes: 10, rewardDurationMinutes: 20, rewardEveryMinutes: 120 }), [goals, rewards, selectedCourses, todayTasks, walletPoints]);
  const todayCompletedTasks = useMemo(() => todayTasks.filter((task) => task.completed), [todayTasks]);
  const heatmap = useMemo(() => buildHeatmap(loadHistory(), tasks, today), [tasks, today]);
  const skillCurve = useMemo(() => {
    const recent = loadHistory().slice(0, 8).reverse();
    return recent.map((record) => ({
      date: record.date.slice(5),
      robot: record.completedTasks.filter((task) => task.category === "robot" || task.category === "competition").length,
      cpp: record.completedTasks.filter((task) => task.category === "study" || /c\+\+/i.test(task.name)).length,
    }));
  }, []);

  const sortedTodayTasks = useMemo(() => [...todayTasks].sort((a, b) => {
    const importanceA = computeGoalDrivenImportance(a, goals);
    const importanceB = computeGoalDrivenImportance(b, goals);
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return computePriorityScore({ importance: importanceB, urgency: b.urgency }) - computePriorityScore({ importance: importanceA, urgency: a.urgency });
  }), [goals, todayTasks]);

  const visibleTodayTasks = useMemo(
    () => (mode === "soul" ? sortedTodayTasks.filter((task) => task.completed) : sortedTodayTasks),
    [mode, sortedTodayTasks],
  );

  const xp = useMemo(
    () => tasks.filter((task) => task.completed).reduce((sum, task) => sum + Math.max(5, task.rewardPoints), 0),
    [tasks],
  );
  const fuel = useMemo(
    () => Math.max(0, Math.round(walletPoints * 0.35)),
    [walletPoints],
  );
  const focusScore = useMemo(() => Math.min(100, Math.round((todayCompletedTasks.length * 22 + xp * 0.12) % 101)), [todayCompletedTasks.length, xp]);
  const anxietyForecast = useMemo(() => {
    const unfinishedHigh = todayTasks.filter((task) => !task.completed && task.energyCost === "high").length;
    if (mode === "soul") return locale === "cn" ? "已降到低位" : "Low and buffered";
    if (unfinishedHigh >= 3) return locale === "cn" ? "高" : "High";
    if (unfinishedHigh >= 1) return locale === "cn" ? "中" : "Medium";
    return locale === "cn" ? "低" : "Low";
  }, [locale, mode, todayTasks]);

  const aiReport = useMemo(() => {
    const base = locale === "cn"
      ? `22:00 报告：你今天完成了 ${todayCompletedTasks.length} 项任务，XP ${xp}，Fuel ${fuel}。专注力评分 ${focusScore}，焦虑预测 ${anxietyForecast}。`
      : `22:00 report: ${todayCompletedTasks.length} tasks done, XP ${xp}, Fuel ${fuel}. Focus ${focusScore}, anxiety forecast ${anxietyForecast}.`;
    if (plan === "pro") {
      return locale === "cn"
        ? `${base} Pro 建议：机器人任务继续用上午高能时段，C++ 训练保持 25 分钟分块。情绪疏导：先呼吸 3 轮，再只完成火种时间。`
        : `${base} Pro advice: keep robot work in the morning high-energy window, and keep C++ in 25-minute chunks. Emotional support: breathe for 3 rounds, then only do the seed minutes.`;
    }
    return base;
  }, [anxietyForecast, focusScore, fuel, locale, plan, todayCompletedTasks.length, xp]);

  const displayedScheduleItems = useMemo(
    () =>
      mode === "soul"
        ? scheduleResult.items.filter((item) => item.type !== "task" || item.data.completed)
        : scheduleResult.items,
    [mode, scheduleResult.items],
  );

  const changeDate = useCallback((delta: number) => {
    const nextDate = addDays(parseDate(selectedDate || today || formatLocalDate(new Date())), delta);
    setSlideDirection(delta >= 0 ? 1 : -1);
    hydrateForDate(nextDate);
  }, [hydrateForDate, selectedDate, today]);

  const handleToggleComplete = useCallback((taskId: string) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target) return;
    const completing = !target.completed;
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, completed: completing, completedAt: completing ? new Date().toISOString() : undefined } : task));
    setWalletPoints((current) => completing ? current + target.rewardPoints : Math.max(0, current - target.rewardPoints));
  }, [tasks]);

  const handleTogglePin = useCallback((taskId: string) => {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, pinned: !task.pinned } : task));
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((current) => current.map((task) => task.id === taskId && !task.locked ? { ...task, deleted: true, pinned: false } : task));
  }, []);

  const handleAddTask = useCallback(() => {
    if (!taskDraft.name.trim()) return;
    setTasks((current) => [createTask(taskDraft, selectedDate, selectedWeekday), ...current]);
    setTaskDraft(DEFAULT_TASK_DRAFT);
    pushToast(text.saved);
  }, [pushToast, selectedDate, selectedWeekday, taskDraft, text.saved]);

  const handleAddRule = useCallback(() => {
    if (!ruleDraft.title.trim()) return;
    setRules((current) => [createRule(ruleDraft, selectedDate), ...current]);
    setRuleDraft(DEFAULT_RULE_DRAFT);
    pushToast(text.saved);
  }, [pushToast, ruleDraft, selectedDate, text.saved]);

  const handleAddGoal = useCallback(() => {
    if (!goalDraft.title.trim() || !goalDraft.deadline) return;
    setGoals((current) => [createGoal(goalDraft), ...current]);
    setGoalDraft(DEFAULT_GOAL_DRAFT);
    pushToast(text.saved);
  }, [goalDraft, pushToast, text.saved]);

  const handleImportTemplate = useCallback((template: TemplateDefinition) => {
    setTasks((current) => [...buildTemplateTasks(template, selectedDate, selectedWeekday), ...current]);
    setActiveTab("today");
    pushToast(text.imported);
  }, [pushToast, selectedDate, selectedWeekday, text.imported]);

  const handleRedeemReward = useCallback((rewardId: string, reward: Reward) => {
    if (redeemedRewardIds.includes(rewardId) || walletPoints < reward.requiredPoints) return;
    setRedeemedRewardIds((current) => [...current, rewardId]);
    setRedeemedRewards((current) => [...current, reward]);
    setWalletPoints((current) => Math.max(0, current - reward.requiredPoints));
    setSpentPoints((current) => current + reward.requiredPoints);
  }, [redeemedRewardIds, walletPoints]);

  const handleSettleToday = useCallback(() => {
    if (!selectedDate) return;
    upsertHistory({
      date: selectedDate,
      completedTasks: todayCompletedTasks,
      totalPoints: computeTotalPoints(todayCompletedTasks),
      dailyVibe: "",
      insight: "",
      spentPoints,
      redeemedRewards,
      settledAt: new Date().toISOString(),
    });
    pushToast(text.settled);
  }, [pushToast, redeemedRewards, selectedDate, spentPoints, text.settled, todayCompletedTasks]);

  const handleSaveFlashNote = useCallback(() => {
    if (!flashNote.trim()) return;
    const content = flashNote.trim();
    const category =
      /robot|sensor|电机|底盘/i.test(content)
        ? "robot"
        : /c\+\+|算法|dp|图论/i.test(content)
          ? "cpp"
          : "life";
    setFlashNotes((current) => [
      { id: `flash-${Date.now()}`, content, category, createdAt: new Date().toISOString() },
      ...current,
    ]);
    setFlashNote("");
    pushToast(text.saved);
  }, [flashNote, pushToast, text.saved]);

  const handleSparkMode = useCallback(() => {
    if (plan === "pro" && revivalCards > 0) {
      setRevivalCards((current) => current - 1);
      pushToast(locale === "cn" ? "已消耗 1 张复活卡，连击保持。" : "Used 1 revival card. Streak protected.");
      return;
    }
    pushToast(locale === "cn" ? "已进入火种模式：只做 5 分钟。" : "Spark mode active: only do 5 minutes.");
  }, [locale, plan, pushToast, revivalCards]);

  const handleExportJson = useCallback(() => {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      mode,
      plan,
      tasks,
      goals,
      rules,
      rewards,
      flashNotes,
    };
    writeJSON("chronos.export.snapshot.v1", snapshot);
    pushToast(locale === "cn" ? "已导出到 localStorage 快照。" : "Snapshot exported to localStorage.");
  }, [flashNotes, goals, locale, mode, plan, pushToast, rewards, rules, tasks]);

  const fabLabel = activeTab === "today" ? text.addTask : activeTab === "blueprint" ? text.addRule : activeTab === "arsenal" ? text.importTemplate : text.createGoal;
  const isSoulMode = mode === "soul";
  const soulQuote = useMemo(() => {
    const seed = selectedDate
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return SOUL_QUOTES[seed % SOUL_QUOTES.length];
  }, [selectedDate]);

  return (
    <motion.div
      initial={false}
      animate={{ backgroundColor: isSoulMode ? "#1A2421" : "#0B0E14" }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
      className="panel-profile min-h-screen w-full pb-28 text-zinc-100"
    >
      <div className={["mx-auto max-w-7xl px-4 py-6 transition-colors duration-700", isSoulMode ? "text-emerald-50" : ""].join(" ")}>
        <header className="glass-surface rounded-[32px] px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-violet-200">
                {isSoulMode ? "Soul Mode" : "Battle Mode"} · {plan === "pro" ? "Pro" : "Basic"}
              </div>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight">{text.brand}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                {!isSoulMode
                  ? text.subtitle
                  : locale === "cn"
                    ? "系统已进入低功耗维护，请专注于呼吸与风景。"
                    : "The system is in low-power maintenance. Stay with the breath and the view."}
              </p>
              {publicApiUrl ? (
                <div className="mt-3 text-xs text-slate-500">API: {publicApiUrl}</div>
              ) : (
                <div className="mt-3 text-xs text-amber-300/80">NEXT_PUBLIC_API_URL not set</div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LanguageSwitcher />
              <button type="button" onClick={() => setMode((current) => { const next = current === "battle" ? "soul" : "battle"; if (next === "soul") setBreathCount(4); if (next === "battle") setBattleLoading(true); return next; })} className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white">
                {isSoulMode ? (locale === "cn" ? "切到战斗模式" : "Battle mode") : (locale === "cn" ? "切到灵魂模式" : "Soul mode")}
              </button>
              <button type="button" onClick={() => setPlan((current) => current === "basic" ? "pro" : "basic")} className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white">
                {plan === "pro" ? "Pro" : "Basic"}
              </button>
              <button type="button" onClick={handleExportJson} className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white">
                Export JSON
              </button>
              <Link href="/history" className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white">History</Link>
              <button type="button" onClick={() => setShowSettleModal(true)} className="rounded-full bg-violet-500 px-4 py-2 text-sm font-medium text-white">{text.settle}</button>
            </div>
          </div>
        </header>

        <main className="mt-4">
          {activeTab === "today" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              <section className="space-y-4">
                <div className="glass-surface rounded-[32px] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => changeDate(-1)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
                    <div className="text-center"><div className="text-sm text-slate-400">{text.today}</div><div className="mt-1 text-xl font-semibold">{selectedDate}</div></div>
                    <button type="button" onClick={() => changeDate(1)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10"><ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="glass-surface rounded-[32px] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{text.today}</div>
                      <div className="mt-1 text-sm text-slate-400">
                        Goal-driven ranking and course-safe scheduling
                      </div>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-2 text-xs text-slate-300">
                      {selectedCourses.length} course blocks
                    </div>
                  </div>
                  <div className="mt-5 min-h-[420px] overflow-hidden">
                    {isSoulMode ? (
                      <div className="grid min-h-[420px] place-items-center">
                        <div className="w-full max-w-xl rounded-[36px] border border-emerald-300/20 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.18),rgba(7,25,30,0.82)_68%)] px-8 py-12 text-center shadow-[0_0_120px_rgba(16,185,129,0.12)]">
                          <div className="mx-auto h-28 w-28 animate-breath rounded-full border border-emerald-200/40 bg-emerald-300/10" />
                          <div className="mt-8 text-sm uppercase tracking-[0.35em] text-emerald-200/80">
                            {locale === "cn" ? "低功耗维护" : "Low Power"}
                          </div>
                          <div className="mt-4 text-5xl font-semibold text-emerald-50">{breathCount}</div>
                          <div className="mt-3 text-sm text-emerald-100/80">
                            {locale === "cn"
                              ? "专注此刻的风景，剩余任务已经被系统隐藏并锁定进度。"
                              : "Stay with the scene. Unfinished tasks are hidden and progress is locked."}
                          </div>
                          <div className="mt-6 rounded-3xl bg-white/6 px-4 py-4 text-sm text-emerald-50/85">
                            {soulQuote}
                          </div>
                          <button type="button" onClick={() => setAmbientEnabled((current) => !current)} className="mt-4 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white">
                            {ambientEnabled ? (locale === "cn" ? "关闭 Lo-fi 占位" : "Disable lo-fi placeholder") : (locale === "cn" ? "开启 Lo-fi 占位" : "Enable lo-fi placeholder")}
                          </button>
                        </div>
                      </div>
                    ) : battleLoading ? (
                      <div className="grid min-h-[420px] place-items-center">
                        <div className="w-full max-w-xl rounded-[36px] border border-violet-400/20 bg-white/6 px-8 py-10 text-center">
                          <div className="mx-auto h-24 w-24 animate-breath rounded-full border border-violet-300/40 bg-violet-400/10" />
                          <div className="mt-6 text-sm uppercase tracking-[0.3em] text-violet-200">Battle Mode</div>
                          <div className="mt-3 text-sm text-slate-300">
                            {locale === "cn" ? "正在加载今日战斗面板..." : "Loading battle dashboard..."}
                          </div>
                        </div>
                      </div>
                    ) : (
                    <AnimatePresence mode="wait" custom={slideDirection}>
                      <motion.div
                        key={selectedDate}
                        custom={slideDirection}
                        initial={{ x: slideDirection > 0 ? 72 : -72, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: slideDirection > 0 ? -72 : 72, opacity: 0 }}
                        transition={{ duration: 0.28, ease: "easeOut" }}
                      >
                        {displayedScheduleItems.length ? (
                          <div className="relative pl-6">
                            <div className="absolute bottom-2 left-2 top-2 w-px bg-white/10" />
                            <div className="space-y-4">
                              {displayedScheduleItems.map((item) => {
                                const isTask = item.type === "task";
                                const isReward = item.type === "reward";
                                return (
                                  <div
                                    key={`${item.type}-${item.startTime}-${item.endTime}-${item.data.name}`}
                                    className="relative"
                                  >
                                    <div
                                      className={[
                                        "absolute -left-[22px] top-7 h-3.5 w-3.5 rounded-full ring-4 ring-[var(--vf-canvas)]",
                                        item.type === "course"
                                          ? "bg-cyan-300"
                                          : item.type === "reward"
                                            ? "bg-violet-400"
                                            : item.type === "task" && item.data.locked
                                              ? "bg-emerald-300"
                                              : item.type === "void"
                                                ? "bg-slate-500"
                                                : "bg-white",
                                      ].join(" ")}
                                    />
                                    <div
                                      className="rounded-3xl border border-white/10 bg-white/6 px-4 py-4"
                                      onClick={isTask ? () => setFocusTaskId(item.data.id) : undefined}
                                    >
                                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                          <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <CalendarClock className="h-4 w-4" />
                                            {item.startTime} - {item.endTime}
                                          </div>
                                          <div className="mt-2 text-base font-semibold text-white">
                                            {item.data.name}
                                          </div>
                                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                                            {isTask ? (
                                              <>
                                                <span className="rounded-full bg-white/10 px-2 py-1">
                                                  {text.priority} {item.data.priorityScore.toFixed(2)}
                                                </span>
                                                <span className="rounded-full bg-white/10 px-2 py-1">
                                                  {text.importance} {item.data.computedImportance.toFixed(2)}
                                                </span>
                                              </>
                                            ) : null}
                                            {isReward ? (
                                              <span className="rounded-full bg-white/10 px-2 py-1">
                                                {item.data.requiredPoints} pts
                                              </span>
                                            ) : null}
                                          </div>
                                        </div>

                                        {isTask ? (
                                          <div className="flex flex-wrap gap-2">
                                            <button
                                              type="button"
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                handleToggleComplete(item.data.id);
                                              }}
                                              className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium"
                                            >
                                              {item.data.completed ? text.completed : text.complete}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                handleTogglePin(item.data.id);
                                              }}
                                              className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium"
                                            >
                                              <Pin className="mr-1 inline h-3.5 w-3.5" />
                                              {item.data.pinned ? text.unpin : text.pin}
                                            </button>
                                            {!item.data.locked ? (
                                              <button
                                                type="button"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  handleDeleteTask(item.data.id);
                                                }}
                                                className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium"
                                              >
                                                <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                                                {text.delete}
                                              </button>
                                            ) : null}
                                          </div>
                                        ) : null}

                                        {isReward ? (
                                          <button
                                            type="button"
                                            disabled={
                                              redeemedRewardIds.includes(item.data.id) ||
                                              !item.data.affordable
                                            }
                                            onClick={() => handleRedeemReward(item.data.id, item.data)}
                                            className={[
                                              "rounded-full px-3 py-2 text-xs font-medium",
                                              item.data.affordable
                                                ? "bg-violet-500 text-white"
                                                : "bg-white/10 text-slate-500",
                                            ].join(" ")}
                                          >
                                            Redeem
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-3xl bg-white/6 px-4 py-10 text-center text-sm text-slate-400">
                            {text.noTasks}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                    )}
                  </div>
                </div>
              </section>
              <aside className="space-y-4">
                <div className="glass-surface rounded-[32px] p-5"><div className="text-sm font-semibold">{text.addTask}</div><div className="mt-4 grid gap-3"><input value={taskDraft.name} onChange={(event) => setTaskDraft((current) => ({ ...current, name: event.target.value }))} placeholder={text.taskName} className="h-11 rounded-2xl px-4 text-sm" /><div className="grid grid-cols-2 gap-2"><input value={taskDraft.estimatedMinutes} onChange={(event) => setTaskDraft((current) => ({ ...current, estimatedMinutes: event.target.value }))} placeholder={text.minutes} className="h-11 rounded-2xl px-4 text-sm" /><input value={taskDraft.urgency} onChange={(event) => setTaskDraft((current) => ({ ...current, urgency: event.target.value }))} placeholder={text.urgency} className="h-11 rounded-2xl px-4 text-sm" /></div><div className="grid grid-cols-2 gap-2"><select value={taskDraft.category} onChange={(event) => setTaskDraft((current) => ({ ...current, category: event.target.value as TaskCategory }))} className="h-11 rounded-2xl px-4 text-sm">{Object.entries(text.categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={taskDraft.energyCost} onChange={(event) => setTaskDraft((current) => ({ ...current, energyCost: event.target.value as TaskDraft["energyCost"] }))} className="h-11 rounded-2xl px-4 text-sm"><option value="low">Low Energy</option><option value="medium">Medium Energy</option><option value="high">High Energy</option></select></div><div className="grid grid-cols-2 gap-2"><input value={taskDraft.exactTime} onChange={(event) => setTaskDraft((current) => ({ ...current, exactTime: event.target.value }))} placeholder={text.exactTime} className="h-11 rounded-2xl px-4 text-sm" /><select value={taskDraft.goalId} onChange={(event) => setTaskDraft((current) => ({ ...current, goalId: event.target.value }))} className="h-11 rounded-2xl px-4 text-sm"><option value="">No linked goal</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></div><div className="flex gap-3 text-sm text-slate-300"><label className="flex items-center gap-2"><input type="checkbox" checked={taskDraft.isMandatory} onChange={(event) => setTaskDraft((current) => ({ ...current, isMandatory: event.target.checked }))} />{text.mandatory}</label><label className="flex items-center gap-2"><input type="checkbox" checked={taskDraft.hardBoundary} onChange={(event) => setTaskDraft((current) => ({ ...current, hardBoundary: event.target.checked }))} />Void Period</label></div><button type="button" onClick={handleAddTask} className="rounded-full bg-violet-500 px-4 py-3 text-sm font-medium text-white">{text.addTask}</button></div></div>
                <div className="glass-surface rounded-[32px] p-5"><div className="text-sm font-semibold">Courses</div><div className="mt-4 space-y-2">{selectedCourses.length ? selectedCourses.map((course, index) => <div key={`${course.name}-${index}`} className="rounded-2xl bg-white/6 px-4 py-3 text-sm">{course.name} · {course.startTime}-{course.endTime}</div>) : <div className="text-sm text-slate-400">No course blocks</div>}</div></div>
                <div className="glass-surface rounded-[32px] p-5"><div className="text-sm font-semibold">Sorted tasks</div><div className="mt-4 space-y-2">{visibleTodayTasks.length ? visibleTodayTasks.map((task) => <div key={task.id} className="rounded-2xl bg-white/6 px-4 py-3"><div className="text-sm font-medium text-white">{task.name}</div><div className="mt-1 text-xs text-slate-400">{text.priority} {computePriorityScore({ importance: computeGoalDrivenImportance(task, goals), urgency: task.urgency }).toFixed(2)}</div><div className="mt-1 text-xs text-slate-500">Energy {task.energyCost ?? "medium"}</div></div>) : <div className="text-sm text-slate-400">{text.noTasks}</div>}</div></div>
              </aside>
            </div>
          ) : null}

          {activeTab === "blueprint" ? (
            <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
              <section className="glass-surface rounded-[32px] p-5">
                <div className="text-sm font-semibold">{text.tabs.blueprint}</div>
                <div className="mt-4 grid gap-3">
                  <input value={ruleDraft.title} onChange={(event) => setRuleDraft((current) => ({ ...current, title: event.target.value }))} placeholder={text.ruleName} className="h-11 rounded-2xl px-4 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={ruleDraft.kind} onChange={(event) => setRuleDraft((current) => ({ ...current, kind: event.target.value as RecurrenceRule["kind"] }))} className="h-11 rounded-2xl px-4 text-sm"><option value="every_x_days">every X days</option><option value="specific_week_days">specific week days</option><option value="day_of_month">day X of month</option></select>
                    <select value={ruleDraft.category} onChange={(event) => setRuleDraft((current) => ({ ...current, category: event.target.value as TaskCategory }))} className="h-11 rounded-2xl px-4 text-sm">{Object.entries(text.categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                  </div>
                  <div className="grid grid-cols-3 gap-2"><input value={ruleDraft.interval} onChange={(event) => setRuleDraft((current) => ({ ...current, interval: event.target.value }))} placeholder="Every X" className="h-11 rounded-2xl px-4 text-sm" /><input value={ruleDraft.dayOfMonth} onChange={(event) => setRuleDraft((current) => ({ ...current, dayOfMonth: event.target.value }))} placeholder="Day X" className="h-11 rounded-2xl px-4 text-sm" /><input value={ruleDraft.seedMinutes} onChange={(event) => setRuleDraft((current) => ({ ...current, seedMinutes: event.target.value }))} placeholder={text.seed} className="h-11 rounded-2xl px-4 text-sm" /></div>
                  <div className="grid grid-cols-3 gap-2"><input value={ruleDraft.estimatedMinutes} onChange={(event) => setRuleDraft((current) => ({ ...current, estimatedMinutes: event.target.value }))} placeholder={text.minutes} className="h-11 rounded-2xl px-4 text-sm" /><input value={ruleDraft.urgency} onChange={(event) => setRuleDraft((current) => ({ ...current, urgency: event.target.value }))} placeholder={text.urgency} className="h-11 rounded-2xl px-4 text-sm" /><select value={ruleDraft.energyCost} onChange={(event) => setRuleDraft((current) => ({ ...current, energyCost: event.target.value as RuleDraft["energyCost"] }))} className="h-11 rounded-2xl px-4 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                  <div className="grid grid-cols-7 gap-2">{WEEKDAY_LABELS.map((label, index) => { const weekday = (index + 1) as Weekday; return <button key={label} type="button" onClick={() => setRuleDraft((current) => ({ ...current, weekDays: current.weekDays.includes(weekday) ? current.weekDays.filter((value) => value !== weekday) : [...current.weekDays, weekday].sort() as Weekday[] }))} className={["rounded-2xl px-2 py-2 text-xs font-medium", ruleDraft.weekDays.includes(weekday) ? "bg-violet-500 text-white" : "bg-white/10 text-slate-300"].join(" ")}>{label.slice(0, 1)}</button>; })}</div>
                  <div className="text-xs text-slate-400">火种时间会作为忙碌时的最低执行时长生成到 Today。</div>
                  <button type="button" onClick={handleAddRule} className="rounded-full bg-violet-500 px-4 py-3 text-sm font-medium text-white">{text.addRule}</button>
                </div>
              </section>
              <section className="glass-surface rounded-[32px] p-5"><div className="text-sm font-semibold">Blueprint masters</div><div className="mt-4 space-y-3">{rules.length ? rules.map((rule) => <div key={rule.id} className="rounded-3xl bg-white/6 px-4 py-4"><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold text-white">{rule.title}</div><div className="mt-1 text-xs text-slate-400">{rule.kind} · seed {rule.seedMinutes} min · {rule.active ? "active" : "paused"}</div></div><button type="button" onClick={() => setRules((current) => current.map((item) => item.id === rule.id ? { ...item, active: !item.active } : item))} className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium">{rule.active ? "Pause" : "Resume"}</button></div></div>) : <div className="text-sm text-slate-400">{text.noRules}</div>}</div></section>
            </div>
          ) : null}

          {activeTab === "arsenal" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
              <section className="glass-surface rounded-[32px] p-5"><div className="text-sm font-semibold">{text.templates}</div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{TEMPLATE_LIBRARY.map((template) => <button key={template.id} type="button" onClick={() => handleImportTemplate(template)} className="rounded-[28px] border border-white/10 bg-white/6 px-4 py-5 text-left transition hover:border-violet-400/50 hover:bg-white/10"><div className="flex items-center justify-between gap-2"><div className="text-sm font-semibold text-white">{template.name}</div><Import className="h-4 w-4 text-violet-300" /></div><div className="mt-3 text-xs text-slate-400">{template.items.join(" · ")}</div></button>)}</div></section>
              <aside className="glass-surface rounded-[32px] p-5"><div className="text-sm font-semibold">Reward bank</div><div className="mt-4 space-y-2">{rewards.length ? rewards.map((reward, index) => <div key={`${reward.name}-${index}`} className="rounded-2xl bg-white/6 px-4 py-3 text-sm">{reward.name} · {reward.requiredPoints} pts</div>) : <div className="text-sm text-slate-400">No rewards</div>}</div></aside>
            </div>
          ) : null}

          {activeTab === "insight" ? (
            <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
              <section className="glass-surface rounded-[32px] p-5">
                <div className="text-sm font-semibold">Goals</div>
                <div className="mt-4 grid gap-3">
                  <input
                    value={goalDraft.title}
                    onChange={(event) => setGoalDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder={text.goalTitle}
                    className="h-11 rounded-2xl px-4 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={goalDraft.period}
                      onChange={(event) => setGoalDraft((current) => ({ ...current, period: event.target.value as GoalPeriod }))}
                      className="h-11 rounded-2xl px-4 text-sm"
                    >
                      {Object.entries(text.periods).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={goalDraft.deadline}
                      onChange={(event) => setGoalDraft((current) => ({ ...current, deadline: event.target.value }))}
                      className="h-11 rounded-2xl px-4 text-sm"
                    />
                  </div>
                  <button type="button" onClick={handleAddGoal} className="rounded-full bg-violet-500 px-4 py-3 text-sm font-medium text-white">
                    {text.createGoal}
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  {goals.length ? goals.map((goal) => (
                    <div key={goal.id} className="rounded-2xl bg-white/6 px-4 py-3">
                      <div className="text-sm font-medium text-white">{goal.title}</div>
                      <div className="mt-1 text-xs text-slate-400">{text.periods[goal.period]} · {goal.deadline}</div>
                    </div>
                  )) : <div className="text-sm text-slate-400">{text.noGoals}</div>}
                </div>
                <div className="mt-5 rounded-3xl bg-white/6 p-4">
                  <div className="text-sm font-semibold text-white">AI Report</div>
                  <div className="mt-2 text-sm text-slate-300">{aiReport}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                    <span className="rounded-full bg-white/10 px-3 py-2">XP {xp}</span>
                    <span className="rounded-full bg-white/10 px-3 py-2">Fuel {fuel}</span>
                    <span className="rounded-full bg-white/10 px-3 py-2">Revival {revivalCards}</span>
                  </div>
                  <button type="button" onClick={handleSparkMode} className="mt-3 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white">
                    Spark Mode
                  </button>
                </div>
                <div className="mt-5 rounded-3xl bg-white/6 p-4">
                  <div className="text-sm font-semibold text-white">Flash Notes</div>
                  <textarea
                    rows={4}
                    value={flashNote}
                    onChange={(event) => setFlashNote(event.target.value)}
                    placeholder="Robot / C++ / life note"
                    className="mt-3 w-full resize-none rounded-3xl px-4 py-3 text-sm"
                  />
                  <button type="button" onClick={handleSaveFlashNote} className="mt-3 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white">
                    Save Flash Note
                  </button>
                  <div className="mt-4 space-y-2">
                    {flashNotes.length ? flashNotes.slice(0, 5).map((note) => (
                      <div key={note.id} className="rounded-2xl bg-white/8 px-4 py-3">
                        <div className="text-xs text-slate-500">{note.category}</div>
                        <div className="mt-1 text-sm text-slate-200">{note.content}</div>
                      </div>
                    )) : <div className="text-sm text-slate-400">No flash notes yet.</div>}
                  </div>
                </div>
              </section>
              <section className="space-y-4">
                <div className="glass-surface rounded-[32px] p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Flame className="h-4 w-4" />
                    {text.heatmap}
                  </div>
                  <div className="mt-4 grid grid-cols-7 gap-2">
                    {heatmap.map((cell) => (
                      <div
                        key={cell.date}
                        className={[
                          "h-10 rounded-2xl border",
                          cell.count >= 2 ? "border-violet-300/60 bg-violet-400/80" : cell.count === 1 ? "border-cyan-300/40 bg-cyan-400/50" : "border-white/10 bg-white/6",
                        ].join(" ")}
                        title={`${cell.date} · ${cell.count}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="glass-surface rounded-[32px] p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Bot className="h-4 w-4" />
                    {text.curves}
                  </div>
                  <div className="mt-4 grid gap-3">
                    {skillCurve.length ? skillCurve.map((point) => (
                      <div key={point.date} className="grid grid-cols-[70px_1fr_1fr] items-center gap-3">
                        <div className="text-xs text-slate-400">{point.date}</div>
                        <div>
                          <div className="h-2 rounded-full bg-white/8">
                            <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.min(100, point.robot * 28)}%` }} />
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">Robot</div>
                        </div>
                        <div>
                          <div className="h-2 rounded-full bg-white/8">
                            <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, point.cpp * 28)}%` }} />
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">C++</div>
                        </div>
                      </div>
                    )) : <div className="text-sm text-slate-400">No growth curve yet.</div>}
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </main>
      </div>

      <Navigation activeTab={activeTab} labels={text.tabs} onChange={(tab) => setActiveTab(tab as TabKey)} />

      <AnimatePresence>
        {showSettleModal ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4">
            <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} className="w-full max-w-md rounded-[32px] border border-white/10 bg-[rgba(12,15,28,0.96)] p-6 shadow-2xl">
              <div className="text-lg font-semibold text-white">{text.settle}</div>
              <div className="mt-3 text-sm text-slate-300">
                {locale === "cn"
                  ? `今日 XP ${xp}，Fuel ${fuel}，已完成 ${todayCompletedTasks.length} 项。`
                  : `Today XP ${xp}, Fuel ${fuel}, ${todayCompletedTasks.length} tasks completed.`}
              </div>
              <div className="mt-4 rounded-3xl bg-white/6 p-4 text-sm text-slate-300">
                {plan === "pro"
                  ? (locale === "cn"
                    ? "AI 深度情绪洞察总结已解锁。"
                    : "AI deep emotional insight is unlocked.")
                  : (locale === "cn"
                    ? "AI 深度情绪洞察总结（仅限订阅用户）"
                    : "AI deep emotional insight summary (subscribers only)")}
              </div>
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => setShowSettleModal(false)} className="flex-1 rounded-full bg-white/10 px-4 py-3 text-sm font-medium text-white">
                  {locale === "cn" ? "取消" : "Cancel"}
                </button>
                <button type="button" onClick={() => { handleSettleToday(); setShowSettleModal(false); }} className="flex-1 rounded-full bg-violet-500 px-4 py-3 text-sm font-medium text-white">
                  {locale === "cn" ? "确认结算" : "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!isSoulMode ? <button type="button" onClick={() => { if (activeTab === "today") handleAddTask(); else if (activeTab === "blueprint") handleAddRule(); else if (activeTab === "arsenal") handleImportTemplate(TEMPLATE_LIBRARY[0]); else handleAddGoal(); }} className="fixed bottom-24 right-6 z-40 rounded-full bg-violet-500 px-5 py-4 text-sm font-medium text-white shadow-[0_20px_50px_rgba(124,58,237,0.45)]"><div className="flex items-center gap-2"><Plus className="h-4 w-4" />{fabLabel}</div></button> : null}

      <AnimatePresence>{focusTaskId ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-slate-950/85 px-4"><motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="relative w-full max-w-2xl rounded-[40px] border border-violet-400/30 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.25),rgba(9,12,24,0.96)_65%)] px-8 py-12 shadow-[0_0_120px_rgba(124,58,237,0.25)]"><button type="button" onClick={() => setFocusTaskId(null)} className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10"><X className="h-4 w-4" /></button>{(() => { const task = tasks.find((item) => item.id === focusTaskId); if (!task) return null; return <div className="text-center"><div className="mx-auto h-24 w-24 animate-breath rounded-full border border-violet-300/50 bg-violet-400/10" /><div className="mt-8 text-sm uppercase tracking-[0.4em] text-violet-200">{text.focus}</div><h2 className="mt-4 text-3xl font-semibold text-white">{task.name}</h2><div className="mt-3 text-slate-300">{task.estimatedMinutes} min · {text.priority} {computePriorityScore({ importance: computeGoalDrivenImportance(task, goals), urgency: task.urgency }).toFixed(2)}</div><button type="button" onClick={() => handleToggleComplete(task.id)} className="mt-8 rounded-full bg-violet-500 px-5 py-3 text-sm font-medium text-white">{task.completed ? text.completed : text.complete}</button></div>; })()}</motion.div></motion.div> : null}</AnimatePresence>

      {toast ? <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2"><div className="rounded-full bg-violet-500 px-4 py-2 text-sm font-medium text-white shadow-lg">{toast.message}</div></div> : null}
    </motion.div>
  );
}
