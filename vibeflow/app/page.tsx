"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Briefcase,
  CalendarClock,
  CalendarPlus2,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Code2,
  Flame,
  Import,
  LucideIcon,
  Pin,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CalendarComponent } from "../components/CalendarComponent";
import WeekCalendarView from "../components/WeekCalendarView";
import { CourseImportStatus } from "../components/CourseImportStatus";
import { Navigation } from "../components/Navigation";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { QuickTaskComposer } from "../components/QuickTaskComposer";
import { ScheduleImportPanel } from "../components/ScheduleImportPanel";
import { SecondaryToolsPanel } from "../components/SecondaryToolsPanel";
import { TodayDashboard } from "../components/TodayDashboard";
import { TodayTimeline } from "../components/TodayTimeline";
import TaskListView from "../components/TaskListView";
import SyncBootstrap from "../components/SyncBootstrap";
import { useI18n } from "../components/I18nProvider";
import { autoSchedule, computeGoalDrivenImportance, computePriorityScore, type ScheduleItem } from "../lib/autoSchedule";
import { courseMatchesTeachingWeek, formatWeeksSummary } from "../lib/parseSchedule";
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

type TabKey = "today" | "list" | "calendar" | "tools" | "insight";
type ThemeMode = "paper" | "obsidian";
type SurfaceMode = "default" | "flat";

type TaskDraft = {
  name: string;
  estimatedMinutes: string;
  urgency: string;
  deadline: string;
  plannedDate?: string; // YYYY-MM-DD, explicitly plan to another day
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
  tagline: string;
  description: string;
  items: string[];
  category: TaskCategory;
  icon: LucideIcon;
};

type ManualTemplate = {
  id: string;
  title: string;
  items: string[];
};

type ManualTemplateDraft = {
  title: string;
  itemInput: string;
  items: string[];
  editingId?: string | null;
};

type DropdownOption<T extends string> = {
  value: T;
  label: string;
};

type FreeWindow = {
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const TEMPLATE_LIBRARY: TemplateDefinition[] = [
  // 学业/专注
  {
    id: "pomodoro-25",
    name: "番茄工作 25 分钟",
    tagline: "Focus Sprint",
    description: "一次完整番茄：进入状态→25 分钟专注→3-5 分钟走动补水。",
    items: ["2min 预热", "25min 专注", "5min 走动+补水"],
    category: "deep_work",
    icon: Flame,
  },
  {
    id: "study-evening",
    name: "晚间高效学习",
    tagline: "Night Study",
    description: "低噪环境下的两段学习 + 一次回顾，兼顾输入与输出。",
    items: ["45min 读书/课程", "5min 休息", "35min 练习/整理", "10min 笔记回顾"],
    category: "study",
    icon: Code2,
  },
  // 生活/习惯
  {
    id: "morning-boot",
    name: "晨间启动",
    tagline: "Morning Start",
    description: "快速唤醒：补水、拉伸、清单过目，低成本进入状态。",
    items: ["喝水 300ml", "5min 拉伸", "3min 今日清单过目"],
    category: "habit",
    icon: CalendarClock,
  },
  {
    id: "noon-refresh",
    name: "午间补能",
    tagline: "Midday Reset",
    description: "吃饭不刷屏，闭眼休息，下午更稳。",
    items: ["10min 闭眼休息", "正念 3 轮 呼吸", "喝水 300ml"],
    category: "habit",
    icon: Sparkles,
  },
  {
    id: "evening-shutdown",
    name: "晚间关机",
    tagline: "Night Wind-down",
    description: "放下屏幕，简单收纳，第二天更好启动。",
    items: ["15min 房间收纳", "明日三件事", "20min 睡前阅读"],
    category: "habit",
    icon: CalendarClock,
  },
  {
    id: "dorm-tidy",
    name: "宿舍整理",
    tagline: "Dorm Reset",
    description: "快速整理三步走，让空间保持清爽。",
    items: ["10min 桌面清理", "10min 地面/垃圾", "10min 衣物归位"],
    category: "life",
    icon: Sparkles,
  },
  {
    id: "laundry-quick",
    name: "洗衣流程",
    tagline: "Laundry Flow",
    description: "投洗→晾晒→取回，一次走通。",
    items: ["分类装袋", "投洗 40min", "晾晒/烘干", "回收折叠"],
    category: "life",
    icon: Briefcase,
  },
  {
    id: "groceries-mini",
    name: "采购小清单",
    tagline: "Grocery Mini",
    description: "围绕三餐与补能，轻量补货。",
    items: ["水果 x3", "牛奶/酸奶", "蛋白零食 x2", "纸巾/垃圾袋"],
    category: "life",
    icon: Briefcase,
  },
  // 出行/场景
  {
    id: "library-go",
    name: "自习室出发",
    tagline: "Study Go",
    description: "卡、电脑、电源、耳机四件套，一次到位。",
    items: ["校园卡", "电脑+充电器", "耳机", "水杯"],
    category: "travel",
    icon: Briefcase,
  },
  {
    id: "exam-eve",
    name: "考前一日",
    tagline: "Exam Prep",
    description: "最后检查：范围→错题→睡眠。",
    items: ["30min 大纲回顾", "30min 错题再做", "准备证件+文具", "23:30 前入睡"],
    category: "study",
    icon: CalendarClock,
  },
  {
    id: "club-event",
    name: "社团活动准备",
    tagline: "Club Ready",
    description: "场地、物资、分工、回顾表单。",
    items: ["确认场地时间", "物资清单", "分工排班", "签到/回顾表单"],
    category: "personal",
    icon: Sparkles,
  },
  {
    id: "fitness-gym",
    name: "健身房训练",
    tagline: "Workout Core",
    description: "热身→主训练→拉伸，强度可调。",
    items: ["8min 热身", "x3 组 深蹲", "x3 组 俯卧撑", "5min 拉伸"],
    category: "habit",
    icon: Flame,
  },
  {
    id: "run-lite",
    name: "跑步准备",
    tagline: "Run Light",
    description: "轻装开跑，注意补水与拉伸。",
    items: ["热身 5min", "跑步 20min", "补水 300ml", "拉伸 5min"],
    category: "habit",
    icon: Flame,
  },
  // 竞赛/出行保留原有
  {
    id: "robot-check",
    name: "赛前校准",
    tagline: "Robot Core",
    description: "聚焦机器人上场前的稳定性确认，避免临场故障打断节奏。",
    items: ["电池检查", "传感器校准", "代码编译通过"],
    category: "competition",
    icon: Bot,
  },
  {
    id: "cpp-drills",
    name: "算法演算",
    tagline: "Logic Engine",
    description: "以短促高密度练习刷新思维带宽，维持解题手感。",
    items: ["一道动态规划", "一道图论", "一道字符串"],
    category: "study",
    icon: Code2,
  },
  {
    id: "travel-kit",
    name: "远行协议",
    tagline: "Mobility Stack",
    description: "为移动场景预置证件、电源与竞赛资料的轻量执行清单。",
    items: ["身份证", "充电宝", "代码备份", "竞赛手册"],
    category: "travel",
    icon: Briefcase,
  },
];

const FOUNDATION_RULES = [
  { id: "wake-sync", title: "06:40 早起", exactTime: "06:40", minutes: 15, category: "habit" as TaskCategory },
  { id: "night-read", title: "22:30 睡前看书", exactTime: "22:30", minutes: 20, category: "habit" as TaskCategory },
];

const FLASH_NOTES_KEY = "chronos.flash-notes.v1";
const SETTINGS_KEY = "chronos.settings.v1";
const MANUAL_TEMPLATES_KEY = "chronos.manual-templates.v1";
const SOUL_QUOTES = [
  "The scenery is waiting for you, Eric.",
  "The schedule can wait a moment. Breathe first.",
  "Progress is locked. You can soften now.",
];
const DEFAULT_MANUAL_TEMPLATES: ManualTemplate[] = [
  {
    id: "manual-commute",
    title: "固定流程: 出行清单",
    items: ["校园卡", "电脑", "实验报告"],
  },
];

function ChronosSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  className = "",
}: {
  value: T;
  options: Array<DropdownOption<T>>;
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="chronos-select flex h-11 w-full items-center justify-between rounded-2xl px-4 text-sm backdrop-blur-xl"
      >
        <span className="truncate text-left">{selected?.label ?? placeholder ?? ""}</span>
        <ChevronsUpDown className="h-4 w-4 text-amber-500/80" />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-0 right-0 top-[calc(100%+10px)] z-40 overflow-hidden rounded-2xl glass-mini select-popover p-1"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition",
                  option.value === value
                    ? "bg-amber-500/12 text-amber-700 dark:text-amber-300"
                    : "text-neutral-700 hover:bg-amber-500/10 dark:text-neutral-200",
                ].join(" ")}
              >
                <span>{option.label}</span>
                {option.value === value ? <Check className="h-4 w-4" /> : null}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const TEXT = {
  cn: {
    brand: "时序 Chronos",
    subtitle: "先排课程，再安任务，再把今天真正做完。",
    tabs: { today: "今日", list: "清单", calendar: "主历", tools: "工具", insight: "复盘" },
    today: "今天",
    addTask: "添加任务",
    addRule: "新建循环规则",
    importTemplate: "加入今日",
    createGoal: "新建目标",
    taskName: "任务名",
    ruleName: "母版标题",
    urgency: "紧急度 0-1",
    minutes: "预计时长",
    seed: "最低执行时长",
    exactTime: "固定时间 16:00",
    mandatory: "固定安排",
    goalTitle: "目标标题",
    priority: "优先级",
    importance: "系统重要度",
    settle: "今日复盘",
    restore: "恢复",
    delete: "删除",
    pin: "置顶",
    unpin: "取消置顶",
    complete: "完成",
    completed: "已完成",
    focus: "心流状态",
    noTasks: "这一天还没有任务。",
    noRules: "还没有循环母版。",
    noGoals: "还没有目标。",
    templates: "快捷模板",
    curves: "成长曲线",
    heatmap: "28 天习惯热力图",
    saved: "已保存",
    imported: "模板已导入 Today",
    settled: "今日已归档",
    initializeTitle: "先把今天安排明白。",
    initializeHeading: "今日安排",
    initializeDescription: "课表会先占位，任务再自动落进空档。",
    createTimeline: "开始安排今天",
    flowState: "状态面板",
    soulMode: "安心模式",
    sortedTasks: "执行清单",
    exportJson: "导出 JSON",
    history: "历史复盘",
    energy: "能量",
    blueprintMasters: "循环规则",
    modulesCount: "个模块",
    rewardBank: "奖励库",
    noRewards: "还没有奖励。",
    goalsPanel: "目标",
    aiReport: "AI 报告",
    sparkMode: "专注模式",
    flashNotesTitle: "每日总结",
    flashNotePlaceholder: "今天最重要的一件事 / 一条心得 / 明日TODO",
    saveFlashNote: "保存总结",
    noFlashNotes: "还没有今日总结。",
    robotLabel: "机器人",
    cppLabel: "C++",
    noGrowthCurve: "还没有成长曲线。",
    xpLabel: "XP",
    fuelLabel: "能量",
    revivalLabel: "复活卡",
    toolboxTitle: "能效工具箱",
    toolboxDescription: "以组件化方式调用高频执行模块，让时间系统保持清晰、可组合、可迁移。",
    backgroundLabel: "背景引擎",
    noGoalLink: "未关联目标",
    scheduleImportTitle: "Chrono-Parser",
    scheduleImportDescription: "粘贴原始大学课表文本，系统将识别星期列、节次与地点并同步为课程区块。",
    scheduleImportPlaceholder: "示例:\n周一  第1-2节  大学物理实验IA@北辰虚拟101\n周三  08:30-10:05  高等数学A-理学楼302",
    scheduleImportParse: "预解析",
    scheduleImportSync: "同步学事历",
    scheduleImportEmpty: "尚未解析出课程条目。",
    scheduleImportParsed: "解析预览",
    scheduleImported: "课表已导入并替换当前学事历。",
    scheduleImportModes: {
      file: "Excel / CSV",
      image: "图片识别",
      text: "文本粘贴",
    },
    scheduleImportUploadFile: "上传课表文件",
    scheduleImportUploadImage: "上传课表截图",
    scheduleImportProcessing: "正在解析导入内容，请稍候...",
    scheduleImportRawTextTitle: "识别原文",
    scheduleImportReplaceHint: "确认导入后，将整表替换当前课表。",
    scheduleImportPartialHint: "识别结果可能不完整，导入前请先检查预览。",
    scheduleImportImageHint: "优先支持教务系统手机截图，本地识别不会上传到服务器。",
    scheduleImportFailed: "未能识别出有效课程，请尝试更清晰的图片、Excel 或文本。",
    scheduleImportReset: "重置",
    scheduleImportSourceLabel: "导入来源",
    scheduleImportEditHint: "识别结果可直接修改后再导入。",
    remove: "删除",
    teachingWeek: "教学周",
    courseBlocks: "课程与固定安排",
    noCourseBlocks: "还没有导入课程。",
    manualTemplateTitle: "固定流程（标准操作）",
    manualTemplateDescription: "预设每日高频清单，并一键注入今日时间线。",
    manualTemplateName: "流程标题",
    manualTemplateItems: "当前条目",
    manualTemplateList: "流程条目",
    addManualTemplateItem: "添加条目",
    saveManualTemplate: "保存流程",
    updateManualTemplate: "更新流程",
    addManualTemplate: "一键添加到今日",
    editManualTemplate: "编辑流程",
    deleteManualTemplate: "删除流程",
    noManualTemplates: "尚未创建固定流程。",
    noManualTemplateItems: "还没有添加条目。",
    fixedTimeline: "固定安排",
    editCourse: "编辑固定安排",
    saveCourse: "保存课时",
    dayMode: "晨曦纸境",
    nightMode: "黑曜深空",
    calendarTitle: "主历视图（总览日程）",
    calendarSubtitle: "日/周/月三视图总览密度，可直接跳入当天时间线。",
    calendarDay: "时间线",
    calendarWeek: "周",
    calendarMonth: "月度",
    categories: {
      deep_work: "深度工作",
      competition: "竞赛",
      travel: "出行",
      robot: "机器人",
      study: "学习",
      life: "生活",
      personal: "个人",
      habit: "习惯",
      fixed_timeline: "固定时序",
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
    subtitle: "Classes first, tasks second, and a clearer path through the day.",
    tabs: { today: "Today", list: "List", calendar: "Master", tools: "Tools", insight: "Review" },
    today: "Today",
    addTask: "Add task",
    addRule: "Add recurrence rule",
    importTemplate: "Add to today",
    createGoal: "Add goal",
    taskName: "Task name",
    ruleName: "Rule title",
    urgency: "Urgency 0-1",
    minutes: "Estimated minutes",
    seed: "Seed minutes",
    exactTime: "Fixed time 16:00",
    mandatory: "Fixed slot",
    goalTitle: "Goal title",
    priority: "Priority",
    importance: "System importance",
    settle: "Review today",
    restore: "Restore",
    delete: "Delete",
    pin: "Pin",
    unpin: "Unpin",
    complete: "Complete",
    completed: "Done",
    focus: "Flow state",
    noTasks: "No tasks for this date.",
    noRules: "No blueprint rules yet.",
    noGoals: "No goals yet.",
    templates: "Quick templates",
    curves: "Growth curve",
    heatmap: "28-day habit heatmap",
    saved: "Saved",
    imported: "Template imported into Today",
    settled: "Today archived",
    initializeTitle: "Make today clear first.",
    initializeHeading: "Today's plan",
    initializeDescription: "Classes take priority, then tasks are placed into the remaining windows.",
    createTimeline: "Plan today",
    flowState: "Flow State",
    soulMode: "Soul Mode",
    sortedTasks: "Execution list",
    exportJson: "Export JSON",
    history: "History review",
    energy: "Energy",
    blueprintMasters: "Recurring rules",
    modulesCount: "modules",
    rewardBank: "Reward Bank",
    noRewards: "No rewards yet.",
    goalsPanel: "Goals",
    aiReport: "AI Report",
    sparkMode: "Simple Mode",
    flashNotesTitle: "Daily Summary",
    flashNotePlaceholder: "Top takeaway / one insight / tomorrow TODO",
    saveFlashNote: "Save Summary",
    noFlashNotes: "No daily summary yet.",
    robotLabel: "Robot",
    cppLabel: "C++",
    noGrowthCurve: "No growth curve yet.",
    xpLabel: "XP",
    fuelLabel: "Fuel",
    revivalLabel: "Revival",
    toolboxTitle: "Efficiency Toolbox",
    toolboxDescription: "Deploy reusable execution modules with a cleaner, more adaptable operating rhythm.",
    backgroundLabel: "Background engine",
    noGoalLink: "No linked goal",
    scheduleImportTitle: "Chrono-Parser",
    scheduleImportDescription: "Paste raw university timetable text and Chronos will detect weekday columns, time windows, and locations.",
    scheduleImportPlaceholder: "Example:\nMonday  Period 1-2  Physics Lab IA@Beichen Virtual 101\nWednesday  08:30-10:05  Calculus A - Science Hall 302",
    scheduleImportParse: "Preview parse",
    scheduleImportSync: "Sync academic calendar",
    scheduleImportEmpty: "No course blocks parsed yet.",
    scheduleImportParsed: "Parsed preview",
    scheduleImported: "Schedule imported and replaced the current academic calendar.",
    scheduleImportModes: {
      file: "Excel / CSV",
      image: "Image OCR",
      text: "Paste text",
    },
    scheduleImportUploadFile: "Upload schedule file",
    scheduleImportUploadImage: "Upload schedule screenshot",
    scheduleImportProcessing: "Parsing the import source, please wait...",
    scheduleImportRawTextTitle: "Recognized text",
    scheduleImportReplaceHint: "Import will replace the current timetable.",
    scheduleImportPartialHint: "The OCR result may be incomplete. Review the preview before import.",
    scheduleImportImageHint: "Optimized for registrar screenshots on mobile. OCR runs locally in the browser.",
    scheduleImportFailed: "No valid courses were recognized. Try a clearer image, Excel file, or pasted text.",
    scheduleImportReset: "Reset",
    scheduleImportSourceLabel: "Source",
    scheduleImportEditHint: "You can edit OCR results here before importing.",
    remove: "Remove",
    teachingWeek: "Teaching Week",
    courseBlocks: "Classes and fixed blocks",
    noCourseBlocks: "No classes imported yet.",
    manualTemplateTitle: "Fixed Routines",
    manualTemplateDescription: "Save standard operating checklists and inject them into today's timeline in one tap.",
    manualTemplateName: "Routine title",
    manualTemplateItems: "Current item",
    manualTemplateList: "Routine items",
    addManualTemplateItem: "Add item",
    saveManualTemplate: "Save routine",
    updateManualTemplate: "Update routine",
    addManualTemplate: "Add to today",
    editManualTemplate: "Edit routine",
    deleteManualTemplate: "Delete routine",
    noManualTemplates: "No routines saved yet.",
    noManualTemplateItems: "No items added yet.",
    fixedTimeline: "Fixed routine",
    editCourse: "Edit fixed slot",
    saveCourse: "Save slot",
    dayMode: "Daylight Paper",
    nightMode: "Obsidian Void",
    calendarTitle: "Master Calendar (overview)",
    calendarSubtitle: "Day/Week/Month overview with direct jump back to Today timeline.",
    calendarDay: "Timeline",
    calendarWeek: "Week",
    calendarMonth: "Month",
    categories: {
      deep_work: "Deep work",
      competition: "Competition",
      travel: "Travel",
      robot: "Robot",
      study: "Study",
      life: "Life",
      personal: "Personal",
      habit: "Habit",
      fixed_timeline: "Fixed timeline",
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
  deadline: "",
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

const DEFAULT_MANUAL_TEMPLATE_DRAFT: ManualTemplateDraft = {
  title: "",
  itemInput: "",
  items: [],
  editingId: null,
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

function parseClock(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatClock(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function daysUntilDate(value?: string) {
  if (!value) return 999;
  const parsed = parseDate(value);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const end = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  return Math.max(0, Math.round((end - start) / 86400000));
}

function priorityBucket(score: number) {
  if (score >= 0.8) return 1;
  if (score >= 0.65) return 2;
  if (score >= 0.5) return 3;
  if (score >= 0.35) return 4;
  return 5;
}

function priorityLevel(score: number) {
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "medium";
  return "low";
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
    deadline: draft.deadline || undefined,
    isDeadlineTask: Boolean(draft.deadline),
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
  const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return template.items.map((raw, index) => {
    const item = String(raw || "");
    // Parse simple patterns like "30min 做题" or "x3 俯卧撑"
    const minutesMatch = item.match(/(\d+)\s*min|分钟/i);
    const timesMatch = item.match(/x\s*(\d+)/i);
    const estimatedMinutes = minutesMatch ? Math.max(5, parseInt(minutesMatch[1]!, 10)) : 25;
    const name = item.replace(/(\d+\s*min|\d+\s*分钟|x\s*\d+)/ig, "").trim() || item;
    return {
      id: `template-${template.id}-${date}-${batchId}-${index}`,
      name,
      estimatedMinutes,
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
    } as PlannerTask;
  });
}

function buildManualTemplateTasks(template: ManualTemplate, date: string, weekday: Weekday): PlannerTask[] {
  const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return template.items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) => ({
      id: `manual-template-${template.id}-${date}-${batchId}-${index}`,
      name: item,
      estimatedMinutes: 20,
      priority: 3,
      completed: false,
      rewardPoints: 10,
      importance: 0.52,
      urgency: 0.42,
      energyCost: "low" as const,
      category: "life" as TaskCategory,
      weekday,
      plannedDate: date,
      pinned: false,
      deleted: false,
      createdAt: new Date().toISOString(),
      templateSource: template.title,
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
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>("flat");
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
  const [createSheet, setCreateSheet] = useState<{ open: boolean; date: string | null }>({ open: false, date: null });
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(DEFAULT_RULE_DRAFT);
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(DEFAULT_GOAL_DRAFT);
  const [manualTemplateDraft, setManualTemplateDraft] = useState<ManualTemplateDraft>(DEFAULT_MANUAL_TEMPLATE_DRAFT);
  const [manualTemplates, setManualTemplates] = useState<ManualTemplate[]>(DEFAULT_MANUAL_TEMPLATES);
  const [flashNote, setFlashNote] = useState("");
  const [flashNotes, setFlashNotes] = useState<FlashNote[]>([]);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showCompletedOpen, setShowCompletedOpen] = useState(false);
  const [ambientEnabled, setAmbientEnabled] = useState(false);
  // register service worker for notifications/PWA
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  const [toast, setToast] = useState<Toast | null>(null);
  const [revivalCards, setRevivalCards] = useState(3);
  const [teachingWeek, setTeachingWeek] = useState(1);
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATE_LIBRARY[0]?.id ?? "");
  const taskComposerRef = useRef<HTMLDivElement | null>(null);
  const timelineSectionRef = useRef<HTMLDivElement | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0, active: false });
  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(null);
  const importSectionRef = useRef<HTMLDivElement | null>(null);

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
    const settings = readJSON<{ mode: "battle" | "soul"; plan: "basic" | "pro"; revivalCards: number; surfaceMode?: SurfaceMode; teachingWeek?: number; hasCompletedSetup?: boolean }>(
      SETTINGS_KEY,
      { mode: "battle", plan: "basic", revivalCards: 3, surfaceMode: "flat", teachingWeek: 1, hasCompletedSetup: false },
    );
    setMode("battle");
    setPlan("basic");
    setRevivalCards(settings.revivalCards);
    setSurfaceMode("flat");
    setTeachingWeek(Math.max(1, settings.teachingWeek ?? 1));
    setHasCompletedSetup(Boolean(settings.hasCompletedSetup) || loadCourses().length > 0);
    setFlashNotes(readJSON<FlashNote[]>(FLASH_NOTES_KEY, []));
    setManualTemplates(readJSON<ManualTemplate[]>(MANUAL_TEMPLATES_KEY, DEFAULT_MANUAL_TEMPLATES));
    setHydrated(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => hydrateForDate(new Date()), 0);
    return () => window.clearTimeout(timer);
  }, [hydrateForDate]);

  // Allow bottom-sheet "Add" to trigger existing quick-add flow
  // moved below handleAddTask to avoid TDZ

  useEffect(() => { if (hydrated) saveCourses(courses); }, [courses, hydrated]);
  useEffect(() => { if (hydrated) saveGoals(goals); }, [goals, hydrated]);
  useEffect(() => { if (hydrated) saveRecurrenceRules(rules); }, [hydrated, rules]);
  useEffect(() => { if (hydrated) saveTasks(tasks); }, [hydrated, tasks]);
  useEffect(() => { if (hydrated) saveRewards(rewards); }, [hydrated, rewards]);
  useEffect(() => { if (hydrated) saveWalletPoints(walletPoints); }, [hydrated, walletPoints]);
  useEffect(() => {
    if (!hydrated) return;
    writeJSON(SETTINGS_KEY, { mode, plan, revivalCards, surfaceMode, teachingWeek, hasCompletedSetup });
  }, [hasCompletedSetup, hydrated, mode, plan, revivalCards, surfaceMode, teachingWeek]);
  useEffect(() => {
    if (!hydrated) return;
    writeJSON(FLASH_NOTES_KEY, flashNotes);
  }, [flashNotes, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    writeJSON(MANUAL_TEMPLATES_KEY, manualTemplates);
  }, [hydrated, manualTemplates]);

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
    const onPointerMove = (event: PointerEvent) => {
      setCursor((current) => ({ ...current, x: event.clientX, y: event.clientY }));
    };
    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
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
  const selectedCourses = useMemo(
    () => courses
      .filter((course) => course.weekday === selectedWeekday && courseMatchesTeachingWeek(course, teachingWeek))
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [courses, selectedWeekday, teachingWeek],
  );
  const scheduleResult = useMemo(() => autoSchedule(selectedCourses, todayTasks, rewards, { goals, walletPoints, bufferMinutes: 10, rewardDurationMinutes: 20, rewardEveryMinutes: 120 }), [goals, rewards, selectedCourses, todayTasks, walletPoints]);
  const todayCompletedTasks = useMemo(() => tasks.filter((task) => task.plannedDate === selectedDate && task.completed), [selectedDate, tasks]);
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
    () => sortedTodayTasks,
    [sortedTodayTasks],
  );
  const hasScheduleSetup = hasCompletedSetup || courses.length > 0;
  const nextDeadline = useMemo(() => {
    return [...todayTasks, ...tasks.filter((task) => task.plannedDate !== selectedDate)]
      .filter((task) => !task.completed && task.deadline)
      .sort((a, b) => daysUntilDate(a.deadline) - daysUntilDate(b.deadline))[0] ?? null;
  }, [selectedDate, tasks, todayTasks]);
  const freeWindows = useMemo<FreeWindow[]>(() => {
    const busyItems = scheduleResult.items
      .filter((item) => item.type !== "reward")
      .map((item) => ({ start: parseClock(item.startTime), end: parseClock(item.endTime) }))
      .sort((a, b) => a.start - b.start);
    const dayStart = parseClock("06:30");
    const dayEnd = parseClock("23:10");
    const windows: FreeWindow[] = [];
    let cursor = dayStart;
    for (const block of busyItems) {
      if (block.start - cursor >= 30) {
        windows.push({
          startTime: formatClock(cursor),
          endTime: formatClock(block.start),
          durationMinutes: block.start - cursor,
        });
      }
      cursor = Math.max(cursor, block.end);
    }
    if (dayEnd - cursor >= 30) {
      windows.push({
        startTime: formatClock(cursor),
        endTime: formatClock(dayEnd),
        durationMinutes: dayEnd - cursor,
      });
    }
    return windows;
  }, [scheduleResult.items]);
  const taskBuckets = useMemo(() => {
    const mustDo: PlannerTask[] = [];
    const shouldDo: PlannerTask[] = [];
    const ifPossible: PlannerTask[] = [];

    for (const task of visibleTodayTasks) {
      const score = computePriorityScore({
        importance: computeGoalDrivenImportance(task, goals),
        urgency: task.urgency,
      });
      const daysLeft = daysUntilDate(task.deadline);
      if (task.isMandatory || task.hardBoundary || daysLeft <= 1 || score >= 0.72) {
        mustDo.push(task);
      } else if (daysLeft <= 3 || score >= 0.52) {
        shouldDo.push(task);
      } else {
        ifPossible.push(task);
      }
    }

    return { mustDo, shouldDo, ifPossible };
  }, [goals, visibleTodayTasks]);

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
        ? `${base} 建议：上午放高专注任务，C++ 训练保持 25 分钟分块。情绪疏导：先呼吸 3 轮，再只完成最低执行时长。`
        : `${base} Pro advice: keep robot work in the morning high-energy window, and keep C++ in 25-minute chunks. Emotional support: breathe for 3 rounds, then only do the seed minutes.`;
    }
    return base;
  }, [anxietyForecast, focusScore, fuel, locale, plan, todayCompletedTasks.length, xp]);

  const displayedScheduleItems = useMemo(
    () => scheduleResult.items,
    [scheduleResult.items],
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
    setTasks((current) => current.map((task) => {
      if (task.id !== taskId) return task;
      if (completing) {
        // mark completed and soft-remove from today timeline by deleting
        return { ...task, completed: true, completedAt: new Date().toISOString(), deleted: true };
      }
      // undo completion restores visibility
      return { ...task, completed: false, completedAt: undefined, deleted: false };
    }));
    setWalletPoints((current) => completing ? current + target.rewardPoints : Math.max(0, current - target.rewardPoints));
  }, [tasks]);

  const handleTogglePin = useCallback((taskId: string) => {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, pinned: !task.pinned } : task));
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((current) => current.map((task) => task.id === taskId && !task.locked ? { ...task, deleted: true, pinned: false } : task));
  }, []);

  function parseQuickCommand(draft: TaskDraft): TaskDraft {
    let name = draft.name || "";
    let estimatedMinutes = draft.estimatedMinutes || "";
    let deadline = draft.deadline || "";
    let exactTime = draft.exactTime || "";
    let energyCost = draft.energyCost || "medium";
    let category = draft.category;
    let isMandatory = draft.isMandatory;
    let hardBoundary = draft.hardBoundary;

    // minutes: 30min / 30 分钟
    const m = name.match(/(\d+)\s*(?:min|分钟)/i);
    if (m) {
      estimatedMinutes = String(Math.max(5, parseInt(m[1]!, 10)));
      name = name.replace(m[0]!, "").trim();
    }
    // deadline: ddl YYYY-MM-DD
    const d = name.match(/ddl\s*(\d{4}-\d{2}-\d{2})/i);
    if (d) {
      deadline = d[1]!;
      name = name.replace(d[0]!, "").trim();
    }
    // exact time: @HH:MM
    const t = name.match(/@(\d{1,2}:\d{2})/);
    if (t) {
      exactTime = t[1]!;
      isMandatory = true;
      name = name.replace(t[0]!, "").trim();
    }
    // energy: energy:low|medium|high
    const e = name.match(/energy:(low|medium|high)/i);
    if (e) {
      energyCost = e[1]!.toLowerCase() as TaskDraft["energyCost"];
      name = name.replace(e[0]!, "").trim();
    }
    // flags: !mandatory, !hard
    if (/!mandatory/i.test(name)) {
      isMandatory = true;
      name = name.replace(/!mandatory/ig, "").trim();
    }
    if (/!hard/i.test(name)) {
      hardBoundary = true;
      name = name.replace(/!hard/ig, "").trim();
    }
    // category via #tag
    const c = name.match(/#([a-z_]+)/i);
    if (c) {
      const tag = c[1]!.toLowerCase();
      const map: Record<string, TaskCategory> = {
        deep: "deep_work",
        deep_work: "deep_work",
        study: "study",
        life: "life",
        personal: "personal",
        habit: "habit",
        comp: "competition",
        competition: "competition",
        travel: "travel",
      };
      category = map[tag] ?? category;
      name = name.replace(c[0]!, "").trim();
    }

    return { ...draft, name: name.trim(), estimatedMinutes, deadline, exactTime, energyCost, category, isMandatory, hardBoundary };
  }

  const handleAddTask = useCallback(() => {
    if (!taskDraft.name.trim()) return;
    try {
      // Prefer NLP parser when present to enrich quick add
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { default: quickAddParser } = require("../lib/nlp/quickAddParser");
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mapParsedToRule = require("../lib/nlp/mapRRule").default as typeof import("../lib/nlp/mapRRule").default;

      const nlp = quickAddParser(String(taskDraft.name));
      const pre: TaskDraft = { ...taskDraft, name: nlp.title || taskDraft.name };
      let draft = parseQuickCommand(pre);
      if (nlp.durationMin) draft = { ...draft, estimatedMinutes: String(Math.max(5, nlp.durationMin)) };
      let plannedDateForCreate = taskDraft.plannedDate || selectedDate;
      if (nlp.plannedDate) {
        const [datePart, timePart] = nlp.plannedDate.split("T");
        if (datePart) plannedDateForCreate = datePart;
        if (timePart) {
          const hm = timePart.slice(0, 5);
          draft = { ...draft, exactTime: hm, isMandatory: true };
        }
      }

      // If rrule exists, offer to save as routine rule via a lightweight confirmation.
      if (nlp.rrule) {
        const seedMinutes = Math.max(5, Number(draft.estimatedMinutes) || 10);
        const newRule = mapParsedToRule(nlp, {
          draftTitle: draft.name || nlp.title || "例行事项",
          seedMinutes,
          urgency: Math.max(0, Math.min(1, Number(draft.urgency) || 0.4)),
          energy: draft.energyCost,
          category: draft.category,
          startsOn: plannedDateForCreate,
        });
        if (newRule) {
          setRules((cur) => [newRule, ...cur]);
          pushToast(locale === "cn" ? "已保存为规律" : "Saved as routine");
        }
      }

      setTasks((current) => [createTask(draft, plannedDateForCreate, selectedWeekday), ...current]);
    } catch {
      const parsed = parseQuickCommand(taskDraft);
      const targetDate = taskDraft.plannedDate || selectedDate;
      setTasks((current) => [createTask(parsed, targetDate, selectedWeekday), ...current]);
    }
    setTaskDraft(DEFAULT_TASK_DRAFT);
    pushToast(text.saved);
  }, [locale, pushToast, selectedDate, selectedWeekday, taskDraft, text.saved]);

  // Allow bottom-sheet "Add" to trigger existing quick-add flow
  useEffect(() => {
    function onSheetSubmit() {
      handleAddTask();
      setCreateSheet({ open: false, date: null });
    }
    window.addEventListener('chronos-quick-add-from-sheet' as any, onSheetSubmit);
    return () => window.removeEventListener('chronos-quick-add-from-sheet' as any, onSheetSubmit);
  }, [handleAddTask]);

  const handleAddBreak = useCallback((minutes: number = 15) => {
    const name = locale === "cn" ? "休息" : "Break";
    const task: PlannerTask = {
      id: `break-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      estimatedMinutes: Math.max(5, minutes),
      priority: 3,
      completed: false,
      rewardPoints: 5,
      importance: 0.4,
      urgency: 0.2,
      energyCost: "low",
      category: "habit",
      weekday: selectedWeekday,
      plannedDate: selectedDate,
      anchor: "break",
      isMandatory: false,
      pinned: false,
      deleted: false,
      createdAt: new Date().toISOString(),
    };
    setTasks((current) => [task, ...current]);
    pushToast(text.saved);
  }, [locale, pushToast, selectedDate, selectedWeekday, text.saved]);

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

  const handleImportSchedule = useCallback((nextCourses: Course[]) => {
    if (!nextCourses.length) return;
    setCourses(nextCourses);
    setHasCompletedSetup(true);
    setEditingCourseIndex(null);
    setActiveTab("today");
    pushToast(text.scheduleImported);
  }, [pushToast, text.scheduleImported]);

  const handleSaveManualTemplate = useCallback(() => {
    const title = manualTemplateDraft.title.trim();
    const items = manualTemplateDraft.items
      .map((item) => item.trim())
      .filter(Boolean);
    if (!title || !items.length) return;
    setManualTemplates((current) => {
      if (manualTemplateDraft.editingId) {
        return current.map((template) => template.id === manualTemplateDraft.editingId ? { ...template, title, items } : template);
      }
      return [
        { id: `manual-${Date.now()}`, title, items },
        ...current,
      ];
    });
    setManualTemplateDraft(DEFAULT_MANUAL_TEMPLATE_DRAFT);
    pushToast(text.saved);
  }, [manualTemplateDraft, pushToast, text.saved]);

  const handleAddManualTemplateItem = useCallback(() => {
    const nextItem = manualTemplateDraft.itemInput.trim();
    if (!nextItem) return;
    setManualTemplateDraft((current) => ({
      ...current,
      items: [...current.items, nextItem],
      itemInput: "",
    }));
  }, [manualTemplateDraft.itemInput]);

  const handleRemoveManualTemplateItem = useCallback((itemIndex: number) => {
    setManualTemplateDraft((current) => ({
      ...current,
      items: current.items.filter((_, index) => index !== itemIndex),
    }));
  }, []);

  const handleEditManualTemplate = useCallback((template: ManualTemplate) => {
    setManualTemplateDraft({
      title: template.title,
      itemInput: "",
      items: [...template.items],
      editingId: template.id,
    });
  }, []);

  const handleDeleteManualTemplate = useCallback((templateId: string) => {
    setManualTemplates((current) => current.filter((template) => template.id !== templateId));
    setManualTemplateDraft((current) => current.editingId === templateId ? DEFAULT_MANUAL_TEMPLATE_DRAFT : current);
    pushToast(text.saved);
  }, [pushToast, text.saved]);

  const handleImportManualTemplate = useCallback((template: ManualTemplate) => {
    setTasks((current) => [...buildManualTemplateTasks(template, selectedDate, selectedWeekday), ...current]);
    setActiveTab("today");
    pushToast(text.imported);
  }, [pushToast, selectedDate, selectedWeekday, text.imported]);

  const handleUpdateCourse = useCallback((patch: Partial<Course>) => {
    if (editingCourseIndex === null) return;
    setCourses((current) => current.map((course, index) => index === editingCourseIndex ? { ...course, ...patch } : course));
  }, [editingCourseIndex]);

  const handleRedeemReward = useCallback((rewardId: string, reward: Reward) => {
    if (redeemedRewardIds.includes(rewardId) || walletPoints < reward.requiredPoints) return;
    setRedeemedRewardIds((current) => [...current, rewardId]);
    setRedeemedRewards((current) => [...current, reward]);
    setWalletPoints((current) => Math.max(0, current - reward.requiredPoints));
    setSpentPoints((current) => current + reward.requiredPoints);
  }, [redeemedRewardIds, walletPoints]);

  const handleSettleToday = useCallback(async () => {
    if (!selectedDate) return;
    const record = {
      date: selectedDate,
      completedTasks: todayCompletedTasks,
      totalPoints: computeTotalPoints(todayCompletedTasks),
      dailyVibe: "",
      insight: "",
      spentPoints,
      redeemedRewards,
      settledAt: new Date().toISOString(),
    };
    upsertHistory(record);
    try {
      const res = await fetch("/api/history/settle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date: record.date,
          totalPoints: record.totalPoints,
          spentPoints: record.spentPoints ?? 0,
          insight: record.insight ?? "",
          summary: "",
          mood: 3,
        }),
      });
      // ignore server errors in MVP (local-first)
      void res;
    } catch {}
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
    pushToast(locale === "cn" ? "已进入简化模式：只做 5 分钟即可开始。" : "Simple mode: just do 5 minutes to start.");
  }, [locale, pushToast]);

  // expose quick actions without prop drilling for MVP
  useEffect(() => {
    (window as any).__chronosAddBreak = () => handleAddBreak(15);
    (window as any).__chronosToggleComplete = (id: string) => handleToggleComplete(id);
    (window as any).__chronosMoveToTomorrow = (id: string) => setTasks((current) => current.map((t) => t.id === id ? { ...t, plannedDate: formatLocalDate(new Date(Date.now() + 86400000)) } : t));
    return () => { try {
      delete (window as any).__chronosAddBreak;
      delete (window as any).__chronosToggleComplete;
      delete (window as any).__chronosMoveToTomorrow;
    } catch {}
    };
  }, [handleAddBreak, handleToggleComplete, setTasks]);

  // lightweight reminder scheduler (page-active)
  const reminderTimersRef = useRef<Record<string, number>>({});
  useEffect(() => {
    // clear existing
    Object.values(reminderTimersRef.current).forEach((id) => window.clearTimeout(id));
    reminderTimersRef.current = {};
    const now = Date.now();
    const enabled = localStorage.getItem('chronos.notifications.enabled') !== '0';
    tasks.forEach((t) => {
      if (!enabled) return;
      if (!t.remindAt || t.deleted) return;
      const ts = new Date(t.remindAt.replace(/Z$/, '')).getTime();
      const delay = ts - now;
      if (delay > 500) {
        const timer = window.setTimeout(async () => {
          try {
            const reg = await navigator.serviceWorker.getRegistration();
            reg?.active?.postMessage({ type: 'SHOW_NOTIFICATION', title: locale === 'cn' ? '任务提醒' : 'Task Reminder', body: t.name, data: { taskId: t.id } });
          } catch {}
        }, Math.min(delay, 7 * 24 * 3600 * 1000));
        reminderTimersRef.current[t.id] = timer;
      }
    });

    // listen to SW actions
    function onMessage(e: MessageEvent) {
      const msg = e.data || {};
      if (msg.type === 'NOTIFY_SNOOZE' && msg.taskId) {
        const minutes = Math.max(1, Number(msg.minutes) || 10);
        const when = new Date(Date.now() + minutes * 60000);
        const label = `${when.getFullYear()}-${String(when.getMonth()+1).padStart(2,'0')}-${String(when.getDate()).padStart(2,'0')}T${String(when.getHours()).padStart(2,'0')}:${String(when.getMinutes()).padStart(2,'0')}`;
        setTasks((cur) => cur.map((t) => t.id === msg.taskId ? { ...t, remindAt: label } : t));
      } else if (msg.type === 'NOTIFY_DONE' && msg.taskId) {
        setTasks((cur) => cur.map((t) => t.id === msg.taskId ? { ...t, completed: true, completedAt: new Date().toISOString() } : t));
      }
    }
    navigator.serviceWorker?.addEventListener?.('message', onMessage as any);

    return () => {
      Object.values(reminderTimersRef.current).forEach((id) => window.clearTimeout(id));
      reminderTimersRef.current = {};
      try { navigator.serviceWorker?.removeEventListener?.('message', onMessage as any); } catch {}
    };
  }, [locale, tasks]);

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

  const fabLabel = activeTab === "today" ? text.addTask : activeTab === "list" ? text.addTask : activeTab === "calendar" ? text.addTask : text.createGoal;
  const isSoulMode = mode === "soul";
  const isFlatMode = surfaceMode === "flat";
  const themeMode: ThemeMode = isSoulMode ? "obsidian" : "paper";
  const shellGlassClassName = isFlatMode
    ? "border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.94)] shadow-none"
    : "border border-[rgba(125,142,163,0.14)] bg-[rgba(15,24,35,0.82)] shadow-[0_20px_60px_rgba(1,6,14,0.32)] backdrop-blur-xl";
  const fieldClassName = ["chronos-field h-11 w-full rounded-2xl px-4 text-sm", isFlatMode ? "text-[#201b16] placeholder:text-[#8a7c70]" : "text-[#f6f1e8] placeholder:text-[#7f8a99]"].join(" ");
  const textAreaClassName = ["chronos-field w-full resize-none rounded-3xl px-4 py-3 text-sm", isFlatMode ? "text-[#201b16] placeholder:text-[#8a7c70]" : "text-[#f6f1e8] placeholder:text-[#7f8a99]"].join(" ");
  const primaryButtonClassName = "chronos-button-primary rounded-full px-4 py-3 text-sm font-medium text-white";
  const secondaryButtonClassName = "chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium text-white";
  const titleClassName = isFlatMode ? "text-[#201b16]" : "text-[#f6f1e8]";
  const bodyTextClassName = isFlatMode ? "text-[#3f372f]" : "text-[var(--vf-text)]";
  const mutedTextClassName = isFlatMode ? "text-[#6f655b]" : "text-[var(--vf-text-muted)]";
  const subtleTextClassName = isFlatMode ? "text-[#8a7c70]" : "text-[var(--vf-text-soft)]";
  const panelBadgeClassName = isFlatMode
    ? "rounded-full border border-[rgba(45,35,25,0.08)] bg-[rgba(247,241,232,0.95)] px-3 py-2 font-precision text-xs text-[#6f655b]"
    : "rounded-full border border-[rgba(125,142,163,0.12)] bg-[rgba(19,31,44,0.72)] px-3 py-2 font-precision text-xs text-[var(--vf-text-muted)]";
  const cardSurfaceClassName = isFlatMode
    ? "border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] shadow-none"
    : "border border-[rgba(125,142,163,0.12)] bg-[rgba(15,24,35,0.84)] shadow-[0_18px_50px_rgba(1,6,14,0.28)]";
  const subCardClassName = isFlatMode
    ? "border border-[rgba(45,35,25,0.08)] bg-[rgba(247,241,232,0.88)]"
    : "border border-[rgba(125,142,163,0.12)] bg-[rgba(19,31,44,0.72)]";
  const pillClassName = isFlatMode
    ? "rounded-full border border-[rgba(45,35,25,0.08)] bg-[rgba(247,241,232,0.88)] px-2 py-1 text-[#6f655b]"
    : "rounded-full border border-[rgba(125,142,163,0.12)] bg-[rgba(19,31,44,0.72)] px-2 py-1 text-[var(--vf-text-muted)]";
  const statPanelClassName = isFlatMode
    ? "rounded-3xl border border-[rgba(45,35,25,0.08)] bg-[rgba(247,241,232,0.88)] p-4"
    : "rounded-3xl border border-[rgba(125,142,163,0.12)] bg-[rgba(19,31,44,0.72)] p-4";
  const toolboxCardClassName = isFlatMode
    ? "border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] hover:border-[rgba(191,122,34,0.18)] hover:bg-[rgba(247,241,232,0.96)]"
    : "border border-[rgba(125,142,163,0.12)] bg-[rgba(15,24,35,0.78)] hover:border-[rgba(244,181,68,0.18)] hover:bg-[rgba(18,29,43,0.86)]";
  const toolboxCardSelectedClassName = isFlatMode
    ? "border-[rgba(191,122,34,0.28)] bg-[rgba(247,241,232,0.98)] shadow-none"
    : "border-[rgba(244,181,68,0.26)] bg-[rgba(20,32,46,0.9)] shadow-[0_0_28px_rgba(244,181,68,0.08)]";
  const ghostButtonClassName = isFlatMode
    ? "grid h-10 w-10 place-items-center rounded-full border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.94)] text-[#6f655b]"
    : "grid h-10 w-10 place-items-center rounded-full border border-[rgba(125,142,163,0.12)] bg-[rgba(19,31,44,0.72)] text-[var(--vf-text-muted)]";
  const insightCardClassName = isFlatMode
    ? "rounded-3xl border border-[rgba(45,35,25,0.08)] bg-[rgba(247,241,232,0.88)] p-4"
    : "rounded-3xl border border-[rgba(125,142,163,0.12)] bg-[rgba(15,24,35,0.84)] p-4";
  const insightChipClassName = isFlatMode
    ? "font-precision rounded-full border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-3 py-2 text-[#6f655b]"
    : "font-precision rounded-full border border-[rgba(125,142,163,0.12)] bg-[rgba(19,31,44,0.72)] px-3 py-2 text-[var(--vf-text-muted)]";
  const surfaceModeLabel = isFlatMode
    ? (locale === "cn" ? "极简扁平" : "Minimal Flat")
    : (themeMode === "paper" ? text.dayMode : text.nightMode);
  const getPriorityMeta = useCallback((score: number) => {
    const level = priorityLevel(score);
    if (level === "high") {
      return {
        label: locale === "cn" ? "高" : "High",
        className: isFlatMode ? "bg-[rgba(191,122,34,0.12)] text-[#9a5f13]" : "bg-amber-500/12 text-[#f0c46e]",
      };
    }
    if (level === "medium") {
      return {
        label: locale === "cn" ? "中" : "Medium",
        className: isFlatMode ? "bg-[rgba(83,94,110,0.1)] text-[#5c534b]" : "bg-[rgba(125,142,163,0.14)] text-[var(--vf-text-muted)]",
      };
    }
    return {
      label: locale === "cn" ? "低" : "Low",
      className: isFlatMode ? "bg-[rgba(45,35,25,0.06)] text-[#8a7c70]" : "bg-[rgba(125,142,163,0.08)] text-[var(--vf-text-soft)]",
    };
  }, [isFlatMode, locale]);
  const taskCategoryOptions = useMemo<Array<DropdownOption<TaskCategory>>>(() => Object.entries(text.categories).map(([value, label]) => ({ value: value as TaskCategory, label })), [text.categories]);
  const taskGoalOptions = useMemo<Array<DropdownOption<string>>>(() => [{ value: "", label: text.noGoalLink }, ...goals.map((goal) => ({ value: goal.id, label: goal.title }))], [goals, text.noGoalLink]);
  const energyOptions = useMemo<Array<DropdownOption<TaskDraft["energyCost"]>>>(() => [
    { value: "low", label: locale === "cn" ? "体力消耗·低" : "Low energy" },
    { value: "medium", label: locale === "cn" ? "体力消耗·中" : "Medium energy" },
    { value: "high", label: locale === "cn" ? "体力消耗·高" : "High energy" },
  ], [locale]);
  const ruleKindOptions = useMemo<Array<DropdownOption<RecurrenceRule["kind"]>>>(() => [
    { value: "every_x_days", label: "Every X days" },
    { value: "specific_week_days", label: "Specific week days" },
    { value: "day_of_month", label: "Day of month" },
  ], []);
  const goalPeriodOptions = useMemo<Array<DropdownOption<GoalPeriod>>>(() => Object.entries(text.periods).map(([value, label]) => ({ value: value as GoalPeriod, label })), [text.periods]);
  const dayOptions = useMemo<Array<DropdownOption<string>>>(() => [
    { value: "1", label: locale === "cn" ? "周一" : "Mon" },
    { value: "2", label: locale === "cn" ? "周二" : "Tue" },
    { value: "3", label: locale === "cn" ? "周三" : "Wed" },
    { value: "4", label: locale === "cn" ? "周四" : "Thu" },
    { value: "5", label: locale === "cn" ? "周五" : "Fri" },
    { value: "6", label: locale === "cn" ? "周六" : "Sat" },
    { value: "7", label: locale === "cn" ? "周日" : "Sun" },
  ], [locale]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDefinition | null>(() => TEMPLATE_LIBRARY.find((t) => t.id === selectedTemplateId) ?? TEMPLATE_LIBRARY[0] ?? null);
  useEffect(() => {
    setSelectedTemplate(TEMPLATE_LIBRARY.find((t) => t.id === selectedTemplateId) ?? TEMPLATE_LIBRARY[0] ?? null);
  }, [selectedTemplateId]);
  const editingCourse = editingCourseIndex === null ? null : courses[editingCourseIndex] ?? null;
  const soulQuote = useMemo(() => {
    const seed = selectedDate
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return SOUL_QUOTES[seed % SOUL_QUOTES.length];
  }, [selectedDate]);
  const handleCreateTimeline = useCallback(() => {
    setActiveTab("today");
    window.setTimeout(() => {
      (hasScheduleSetup ? taskComposerRef.current : timelineSectionRef.current)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  }, [hasScheduleSetup]);
  const handleSelectCalendarDate = useCallback((date: string) => {
    setSlideDirection(date >= selectedDate ? 1 : -1);
    hydrateForDate(parseDate(date));
  }, [hydrateForDate, selectedDate]);
  const handleJumpToTimeline = useCallback(() => {
    setActiveTab("today");
    window.setTimeout(() => {
      timelineSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 140);
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ backgroundColor: isFlatMode ? "#f4efe6" : "#071019", color: isFlatMode ? "#201b16" : "#f6f1e8" }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className={`panel-profile relative min-h-screen w-full overflow-hidden pb-28 ${isFlatMode ? "chronos-flat-mode" : ""}`}
    >
      <div className={`pointer-events-none absolute inset-0 z-0 ${isFlatMode ? "bg-[#f4efe6]" : "bg-[#071019]"}`} />
      {!isFlatMode ? <div className="pointer-events-none absolute inset-0 z-0 chronos-noise" /> : null}
      {!isFlatMode ? (
        <motion.div
          animate={{ opacity: [0.45, 0.8, 0.45], scale: [1, 1.04, 1] }}
          transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="pointer-events-none absolute inset-0 z-0 chronos-atmosphere-pulse"
        />
      ) : null}
      {!isFlatMode ? <div className="pointer-events-none absolute inset-0 z-0 chronos-noise" /> : null}
      
      <SyncBootstrap />
      <div className="relative z-20 mx-auto max-w-7xl px-4 py-4 pb-32 sm:py-6 sm:pb-28 transition-colors duration-700">
        {activeTab === "today" ? (
          <header className="glass-surface relative overflow-hidden rounded-[28px] px-4 py-5 sm:rounded-[32px] sm:px-6 sm:py-6">
            {!isFlatMode ? <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(92,126,164,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(67,90,116,0.12),transparent_28%)]" /> : null}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="relative flex-1">
                <div className={`font-precision text-sm uppercase ${isFlatMode ? "text-[#9a5f13]" : "text-[#f0c46e]"}`}>
                  {locale === "cn" ? "大学生时间规划 V1" : "Student planning v1"}
                </div>
                <h1 className={`font-display mt-2 text-3xl font-black tracking-tighter sm:text-4xl md:text-6xl ${titleClassName}`}>{text.brand}</h1>
                <p className={`mt-2 max-w-3xl text-sm ${mutedTextClassName}`}>{text.subtitle}</p>
                <div className={`font-precision mt-3 text-xs ${publicApiUrl ? subtleTextClassName : mutedTextClassName}`}>
                  {publicApiUrl ? `API: ${publicApiUrl}` : (locale === "cn" ? "本地模式运行中" : "Running in local mode")}
                </div>
                <div className={`mt-5 grid gap-4 rounded-[24px] p-4 sm:rounded-[30px] sm:p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end ${shellGlassClassName}`}>
                  <div>
                    <div className={`text-xs uppercase tracking-[0.28em] ${isFlatMode ? "text-[#9a5f13]" : "text-[#e0b45c]"}`}>{text.initializeTitle}</div>
                    <h2 className={`mt-3 text-2xl font-semibold ${titleClassName}`}>{text.initializeHeading}</h2>
                    <p className={`mt-2 max-w-2xl text-sm ${mutedTextClassName}`}>{text.initializeDescription}</p>
                  </div>
                <button type="button" onClick={handleCreateTimeline} className={`${primaryButtonClassName} min-h-11 min-w-[148px] sm:min-w-[168px]`}>
                  {text.createTimeline}
                </button>
              </div>
            </div>
            <div className="relative flex flex-wrap items-center gap-2 lg:max-w-[420px] lg:justify-end">
              <LanguageSwitcher />
              <button
                type="button"
                onClick={() => importSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(45,35,25,0.12)] bg-[rgba(255,251,245,0.96)] px-4 py-2 text-sm"
                title={locale === 'cn' ? '导入课表：支持文本/图片/文件三种方式' : 'Import schedule: text/image/file'}
              >
                {locale === 'cn' ? '导入课表' : 'Import schedule'}
              </button>
              <Link href="/history" className="chronos-button-secondary hidden rounded-full px-4 py-2 text-sm font-medium sm:inline-flex">{text.history}</Link>
              <Link href="/settings" className="chronos-button-secondary hidden rounded-full px-4 py-2 text-sm font-medium sm:inline-flex">{locale === "cn" ? "设置" : "Settings"}</Link>
            </div>
          </div>
        </header>
        ) : null}

        <main className="mt-4">
          {activeTab === "today" ? (
            <div ref={timelineSectionRef} className="space-y-4">
              <TodayDashboard
                locale={locale}
                selectedDate={selectedDate}
                teachingWeek={teachingWeek}
                hasScheduleSetup={hasScheduleSetup}
                courseCount={selectedCourses.length}
                taskCount={todayTasks.length}
                completedCount={todayCompletedTasks.length}
                nextDeadline={nextDeadline ? {
                  id: nextDeadline.id,
                  name: nextDeadline.name,
                  deadline: nextDeadline.deadline ?? "",
                  daysLeft: daysUntilDate(nextDeadline.deadline),
                } : null}
                freeWindows={freeWindows}
                onOpenImport={() => setActiveTab("today")}
                onOpenComposer={() => setCreateSheet({ open: true, date: selectedDate })}
              />
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
                <TodayTimeline
                  locale={locale}
                  selectedDate={selectedDate}
                  items={displayedScheduleItems as ScheduleItem[]}
                  taskBuckets={taskBuckets}
                  freeWindows={freeWindows}
                  onToggleComplete={handleToggleComplete}
                  onTogglePin={handleTogglePin}
                  onDeleteTask={handleDeleteTask}
                />
                <aside className="space-y-4">
                  <div ref={taskComposerRef}>
                    <QuickTaskComposer
                      locale={locale}
                      draft={taskDraft}
                      fieldClassName={fieldClassName}
                      primaryButtonClassName={primaryButtonClassName}
                      secondaryButtonClassName={secondaryButtonClassName}
                      goalOptions={taskGoalOptions}
                      categoryOptions={taskCategoryOptions}
                      energyOptions={energyOptions}
                      onDraftChange={(patch) => setTaskDraft((current) => ({ ...current, ...patch }))}
                      onSubmit={handleAddTask}
                    />
                  </div>
                  <div ref={importSectionRef} className="-mt-2 mb-1 text-[10px] text-[var(--vf-text-soft)]">{locale === 'cn' ? '导入课表：支持文本/图片/文件三种方式；导入后可以在主历中统一安排。' : 'Import schedule via text/image/file; then arrange in calendar.'}</div>
                  <CourseImportStatus
                    locale={locale}
                    surfaceMode={surfaceMode}
                    courses={courses}
                    selectedCourses={selectedCourses}
                    teachingWeek={teachingWeek}
                    fieldClassName={fieldClassName}
                    onImport={handleImportSchedule}
                    onTeachingWeekChange={setTeachingWeek}
                    labels={{ title: text.scheduleImportTitle, description: text.scheduleImportDescription, placeholder: text.scheduleImportPlaceholder, parse: text.scheduleImportParse, sync: text.scheduleImportSync, empty: text.scheduleImportEmpty, parsed: text.scheduleImportParsed, modes: text.scheduleImportModes, uploadFile: text.scheduleImportUploadFile, uploadImage: text.scheduleImportUploadImage, processing: text.scheduleImportProcessing, rawTextTitle: text.scheduleImportRawTextTitle, replaceHint: text.scheduleImportReplaceHint, partialHint: text.scheduleImportPartialHint, imageHint: text.scheduleImportImageHint, parseFailed: text.scheduleImportFailed, reset: text.scheduleImportReset, sourceLabel: text.scheduleImportSourceLabel, editHint: text.scheduleImportEditHint, remove: text.remove, teachingWeek: text.teachingWeek }}
                  />
                  <div className="glass-surface rounded-[32px] p-5">
                    <button type="button" onClick={() => setShowCompletedOpen((v) => !v)} className="chronos-button-secondary rounded-full px-3 py-2 text-xs font-medium">
                      {showCompletedOpen ? (locale === "cn" ? "收起已完成" : "Hide completed") : (locale === "cn" ? "展开已完成" : "Show completed")}
                    </button>
                    {showCompletedOpen ? (
                      <div className="mt-4 space-y-2">
                        {todayCompletedTasks.length ? todayCompletedTasks.map((task) => (
                          <div key={task.id} className="rounded-2xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium text-[var(--vf-text)]">{task.name}</div>
                                <div className="mt-1 text-xs text-[var(--vf-text-muted)]">{task.estimatedMinutes} min{task.deadline ? ` · ${task.deadline}` : ""}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[var(--vf-text-muted)]">+{task.rewardPoints}</span>
                                <button type="button" onClick={() => setTasks((current) => current.map((t) => t.id === task.id ? { ...t, completed: false, deleted: false, completedAt: undefined } : t))} className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-2 text-xs font-medium text-[var(--vf-text)]">
                                  {locale === "cn" ? "恢复" : "Restore"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="mt-3 text-sm text-[var(--vf-text-muted)]">{locale === "cn" ? "今天还没有完成任务。" : "No completed tasks yet."}</div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </aside>
              </div>
            </div>
          ) : null}

          {activeTab === "calendar" ? (
            <div className="space-y-4">
              <div className="text-xs text-[var(--vf-text-soft)]">
                {locale === "cn"
                  ? "用途：总览日程密度与冲突；下一步：在周历中拖拽调整，或点‘回到今日’快速返回。"
                  : "Purpose: overview of density/conflicts. Next: drag in Week view, or tap 'Back to Today'."}
              </div>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setActiveTab("today")} className="chronos-button-secondary rounded-full px-3 py-1.5 text-xs">{locale === "cn" ? "回到今日" : "Back to Today"}</button>
                <button type="button" onClick={() => document?.querySelector?.("[data-week-grid]")?.scrollIntoView?.({ behavior: "smooth", block: "start" })} className="chronos-button-secondary rounded-full px-3 py-1.5 text-xs">{locale === "cn" ? "跳到周视图" : "Jump to Week"}</button>
              </div>
              <CalendarComponent
                selectedDate={selectedDate}
                tasks={tasks}
                courses={courses}
                themeMode={themeMode}
                surfaceMode={surfaceMode}
                teachingWeek={teachingWeek}
                labels={{
                  title: text.calendarTitle,
                  subtitle: text.calendarSubtitle,
                  timeline: text.calendarDay,
                  week: text.calendarWeek,
                  month: text.calendarMonth,
                }}
                onSelectDate={handleSelectCalendarDate}
                onJumpToTimeline={handleJumpToTimeline}
              />
              <WeekCalendarView
                locale={locale}
                selectedDate={selectedDate}
                courses={courses}
                tasks={tasks}
                teachingWeek={teachingWeek}
                onMoveTask={(id, toDate) => setTasks((cur) => cur.map((t) => t.id === id ? { ...t, plannedDate: toDate } : t))}
                onCreateQuick={(date) => setCreateSheet({ open: true, date })}
              />
            </div>
          ) : null}

          {activeTab === "list" ? (
            <TaskListView
              locale={locale}
              tasks={tasks}
              selectedDate={selectedDate}
              onToggleComplete={handleToggleComplete}
              onMoveToTomorrow={(id) => {
                const t = new Date(selectedDate + "T00:00:00"); t.setDate(t.getDate() + 1);
                const to = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
                setTasks((cur) => cur.map((x) => x.id === id ? { ...x, plannedDate: to } : x));
              }}
              onQuickRemind={(id, minutes) => {
                setTasks((cur) => cur.map((x) => x.id === id ? { ...x, remindAt: `${selectedDate}T${new Date(Date.now()+minutes*60000).toTimeString().slice(0,5)}` } : x));
              }}
              onAddTaskForDate={(date, inputText) => {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-var-requires
                  const { default: quickAddParser } = require("../lib/nlp/quickAddParser");
                  const nlp = quickAddParser(String(inputText));
                  const pre: TaskDraft = { ...taskDraft, name: nlp.title || inputText };
                  let draft = parseQuickCommand(pre);
                  if (nlp.durationMin) draft = { ...draft, estimatedMinutes: String(Math.max(5, nlp.durationMin)) };
                  let target = date || selectedDate;
                  if (nlp.plannedDate) {
                    const [d, t] = nlp.plannedDate.split('T');
                    if (d) target = d;
                    if (t) draft = { ...draft, exactTime: t.slice(0,5), isMandatory: true };
                  }
                  setTasks((cur) => [createTask(draft, target, selectedWeekday), ...cur]);
                  setTaskDraft(DEFAULT_TASK_DRAFT);
                  pushToast(text.saved);
                } catch {
                  const draft = parseQuickCommand({ ...taskDraft, name: inputText });
                  const target = date || selectedDate;
                  setTasks((cur) => [createTask(draft, target, selectedWeekday), ...cur]);
                  setTaskDraft(DEFAULT_TASK_DRAFT);
                  pushToast(text.saved);
                }
              }}
              selectable
              selectedIds={[]}
              onToggleSelect={() => {}}
              onUpdateNotes={(id, notes) => setTasks((cur) => cur.map((x) => x.id === id ? { ...x, notes } : x))}
              onUpdateSteps={(id, steps) => setTasks((cur) => cur.map((x) => x.id === id ? { ...x, steps } : x))}
            />
          ) : null}

          {activeTab === "tools" ? (
            <SecondaryToolsPanel
              locale={locale}
              templates={TEMPLATE_LIBRARY}
              selectedTemplateId={selectedTemplateId}
              selectedTemplateName={selectedTemplate?.name ?? ""}
              manualTemplates={manualTemplates}
              manualTemplateDraft={manualTemplateDraft}
              rewards={rewards}
              flashNotes={flashNotes}
              flashNote={flashNote}
              onSelectTemplate={setSelectedTemplateId}
              onImportTemplate={(templateId) => {
                const template = TEMPLATE_LIBRARY.find((item) => item.id === templateId);
                if (template) handleImportTemplate(template);
              }}
              onManualTemplateDraftChange={(patch) => setManualTemplateDraft((current) => ({ ...current, ...patch }))}
              onAddManualTemplateItem={handleAddManualTemplateItem}
              onSaveManualTemplate={handleSaveManualTemplate}
              onEditManualTemplate={(templateId) => {
                const template = manualTemplates.find((item) => item.id === templateId);
                if (template) handleEditManualTemplate(template);
              }}
              onDeleteManualTemplate={handleDeleteManualTemplate}
              onImportManualTemplate={(templateId) => {
                const template = manualTemplates.find((item) => item.id === templateId);
                if (template) handleImportManualTemplate(template);
              }}
              onSaveFlashNote={handleSaveFlashNote}
              onFlashNoteChange={setFlashNote}
              onEnterSoulMode={() => setMode((current) => current === "soul" ? "battle" : "soul")}
            />
          ) : null}

          {false && activeTab === "insight" ? (
            <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
              <section className="glass-surface rounded-[32px] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className={`text-sm font-semibold ${titleClassName}`}>{text.goalsPanel}</div>
                  <Link href="/history" className={`${secondaryButtonClassName} inline-flex items-center`}>{text.history}</Link>
                </div>
                <div className="mt-4 grid gap-3">
                  <input
                    value={goalDraft.title}
                    onChange={(event) => setGoalDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder={text.goalTitle}
                    className={fieldClassName}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <ChronosSelect value={goalDraft.period} options={goalPeriodOptions} onChange={(value) => setGoalDraft((current) => ({ ...current, period: value }))} />
                    <input type="date" value={goalDraft.deadline} onChange={(event) => setGoalDraft((current) => ({ ...current, deadline: event.target.value }))} className={fieldClassName} />
                  </div>
                  <button type="button" onClick={handleAddGoal} className={primaryButtonClassName}>{text.createGoal}</button>
                </div>
                <div className="mt-4 space-y-2">
                  {goals.length ? goals.map((goal) => (
                    <div key={goal.id} className={insightCardClassName}>
                      <div className={`text-sm font-medium ${titleClassName}`}>{goal.title}</div>
                      <div className={`mt-1 font-precision text-xs ${mutedTextClassName}`}>{text.periods[goal.period]} · {goal.deadline}</div>
                    </div>
                  )) : <div className={`text-sm ${mutedTextClassName}`}>{text.noGoals}</div>}
                </div>
              </section>
              <section className="space-y-4">
                {todayCompletedTasks.length ? (
                  <div className="glass-surface rounded-[32px] p-5">
                    <div className={`text-sm font-semibold ${titleClassName}`}>{text.aiReport}</div>
                    <div className={`mt-2 text-sm ${bodyTextClassName}`}>{aiReport}</div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className={insightChipClassName}>{text.xpLabel} {xp}</span>
                      <span className={insightChipClassName}>{text.fuelLabel} {fuel}</span>
                      <span className={insightChipClassName}>{text.revivalLabel} {revivalCards}</span>
                    </div>
                    <button type="button" onClick={() => setShowSettleModal(true)} className={`mt-3 ${primaryButtonClassName}`}>{text.settle}</button>
                  </div>
                ) : (
                  <div className="glass-surface rounded-[32px] p-5">
                    <div className={`text-sm font-semibold ${titleClassName}`}>{text.aiReport}</div>
                    <div className={`mt-2 text-sm ${mutedTextClassName}`}>{locale === "cn" ? "先完成今天的任务，复盘页会给出更有用的总结。" : "Finish some work today first. The review will be more useful then."}</div>
                  </div>
                )}
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
                          cell.count >= 2 ? "border-amber-500/50 bg-amber-500/60" : cell.count === 1 ? "border-neutral-600 bg-neutral-600/50" : (isFlatMode ? "border-[rgba(45,35,25,0.08)] bg-[rgba(247,241,232,0.72)]" : "border-[rgba(125,142,163,0.12)] bg-[rgba(19,31,44,0.72)]"),
                        ].join(" ")}
                        title={`${cell.date} · ${cell.count}`}
                      />
                    ))}
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {false && activeTab === "today" ? (
            <div ref={timelineSectionRef} className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <section className="space-y-4">
                <div className="glass-surface rounded-[32px] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => changeDate(-1)} className={ghostButtonClassName}><ChevronLeft className="h-4 w-4" /></button>
                    <div className="text-center"><div className={`text-sm ${mutedTextClassName}`}>{text.today}</div><div className={`mt-1 font-precision text-xl font-semibold ${titleClassName}`}>{selectedDate}</div></div>
                    <button type="button" onClick={() => changeDate(1)} className={ghostButtonClassName}><ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="glass-surface rounded-[32px] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className={`text-sm font-semibold ${titleClassName}`}>{text.initializeHeading}</div>
                      <div className={`mt-1 text-sm ${mutedTextClassName}`}>
                        {text.initializeTitle} {locale === "cn" ? "以课程边界与关键效能校准今日节奏。" : "Calibrate the day around course boundaries and key outcomes."}
                      </div>
                    </div>
                    <div className={panelBadgeClassName}>
                      {selectedCourses.length} course blocks
                    </div>
                  </div>
                  <div className="mt-5 min-h-[420px] overflow-hidden">
                    {battleLoading && !isSoulMode ? (
                      <div className="grid min-h-[420px] place-items-center">
                        <div className={`w-full max-w-xl rounded-[36px] px-8 py-10 text-center ${shellGlassClassName}`}>
                          <div className="mx-auto h-24 w-24 animate-breath rounded-full border border-amber-500/40 bg-amber-500/10" />
                          <div className={`mt-6 text-sm uppercase tracking-[0.3em] ${isFlatMode ? "text-[#9a5f13]" : "text-[#f0c46e]"}`}>{text.flowState}</div>
                          <div className={`mt-3 text-sm ${mutedTextClassName}`}>
                            {locale === "cn" ? "正在同步今日时序面板..." : "Synchronizing today's temporal dashboard..."}
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
                            {isSoulMode ? (
                              <div className="mb-4 rounded-[28px] border border-amber-400/18 bg-amber-500/8 px-5 py-4 text-sm text-stone-100 shadow-[0_0_40px_rgba(245,158,11,0.08)]">
                                <div className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
                                  {locale === "cn" ? "灵魂模式" : "Soul Mode"}
                                </div>
                                <div className="mt-2 text-base font-medium text-stone-50">{soulQuote}</div>
                                <button type="button" onClick={() => setAmbientEnabled((current) => !current)} className={`mt-4 ${secondaryButtonClassName}`}>
                                  {ambientEnabled ? (locale === "cn" ? "关闭 Lo-fi 占位" : "Disable lo-fi placeholder") : (locale === "cn" ? "开启 Lo-fi 占位" : "Enable lo-fi placeholder")}
                                </button>
                              </div>
                            ) : null}
                            <div className={`absolute bottom-2 left-2 top-2 w-px ${isFlatMode ? "bg-[rgba(45,35,25,0.08)]" : "bg-white/10"}`} />
                            <div className="space-y-4">
                              {displayedScheduleItems.map((item, index) => {
                                const isTask = item.type === "task";
                                const isReward = item.type === "reward";
                                const taskPriorityMeta = isTask ? getPriorityMeta(item.data.priorityScore) : null;
                                return (
                                  <motion.div
                                    key={`${item.type}-${item.startTime}-${item.endTime}-${item.data.name}`}
                                    className="relative"
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.04, type: "spring", stiffness: 180, damping: 20 }}
                                  >
                                    <div
                                      className={[
                                        "absolute -left-[22px] top-7 h-3.5 w-3.5 rounded-full ring-4 ring-[var(--vf-canvas)]",
                                        item.type === "course"
                                          ? "bg-amber-500"
                                          : item.type === "reward"
                                            ? "bg-amber-300"
                                            : item.type === "task" && item.data.locked
                                              ? "bg-amber-300"
                                              : item.type === "void"
                                                ? "bg-slate-500"
                                                : "bg-white",
                                      ].join(" ")}
                                    />
                                    <div
                                      className={[
                                        `timeline-card-hover rounded-3xl px-4 py-4 ${cardSurfaceClassName}`,
                                        item.type === "course"
                                          ? (isFlatMode ? "border-[#bf7a22]/40" : "border-amber-500/30")
                                          : "",
                                        item.type === "course" ? "border-l-[3px]" : "",
                                      ].join(" ")}
                                      onClick={isTask ? () => setFocusTaskId(item.data.id) : undefined}
                                      onMouseEnter={() => setCursor((current) => ({ ...current, active: true }))}
                                      onMouseLeave={() => setCursor((current) => ({ ...current, active: false }))}
                                    >
                                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                          <div className={`font-precision flex items-center gap-2 text-xs ${mutedTextClassName}`}>
                                            <CalendarClock className="h-4 w-4" />
                                            {item.startTime} - {item.endTime}
                                          </div>
                                          <div className={`font-display mt-2 text-base font-bold tracking-tighter ${titleClassName}`}>
                                            {item.data.name}
                                          </div>
                                          <div className={`mt-2 flex flex-wrap gap-2 text-xs ${bodyTextClassName}`}>
                                            {item.type === "course" && item.data.location ? (
                                              <span className={`font-precision rounded-full px-2 py-1 ${isFlatMode ? "bg-[rgba(191,122,34,0.1)] text-[#9a5f13]" : "bg-amber-500/10 text-[#f0c46e]"}`}>
                                                {item.data.location}
                                              </span>
                                            ) : null}
                                            {isTask ? (
                                              <>
                                                <span className={`rounded-full px-2 py-1 ${taskPriorityMeta?.className}`}>
                                                  {locale === "cn" ? "优先级" : "Priority"} {taskPriorityMeta?.label}
                                                </span>
                                              </>
                                            ) : null}
                                            {isReward ? (
                                              <span className={pillClassName}>
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
                                              className={`rounded-full px-3 py-2 text-xs font-medium ${subCardClassName}`}
                                            >
                                              {item.data.completed ? text.completed : text.complete}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                handleTogglePin(item.data.id);
                                              }}
                                              className={`rounded-full px-3 py-2 text-xs font-medium ${subCardClassName}`}
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
                                                className={`rounded-full px-3 py-2 text-xs font-medium ${subCardClassName}`}
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
                                                ? "bg-amber-500 text-black"
                                                : (isFlatMode ? "bg-[rgba(45,35,25,0.06)] text-[#8a7c70]" : "bg-[rgba(19,31,44,0.72)] text-[#7f8a99]"),
                                            ].join(" ")}
                                          >
                                            {locale === "cn" ? "兑换" : "Redeem"}
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className={`rounded-3xl px-4 py-10 text-center text-sm ${subCardClassName} ${mutedTextClassName}`}>
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
                <div ref={taskComposerRef} className="glass-surface rounded-[32px] p-5"><div className="text-sm font-semibold">{text.addTask}</div><div className="mt-4 grid gap-3"><input value={taskDraft.name} onChange={(event) => setTaskDraft((current) => ({ ...current, name: event.target.value }))} placeholder={text.taskName} className={fieldClassName} /><div className="grid grid-cols-2 gap-2"><input value={taskDraft.estimatedMinutes} onChange={(event) => setTaskDraft((current) => ({ ...current, estimatedMinutes: event.target.value }))} placeholder={text.minutes} className={`${fieldClassName} font-precision`} /><input value={taskDraft.urgency} onChange={(event) => setTaskDraft((current) => ({ ...current, urgency: event.target.value }))} placeholder={text.urgency} className={`${fieldClassName} font-precision`} /></div><div className="grid grid-cols-2 gap-2"><ChronosSelect value={taskDraft.category} options={taskCategoryOptions} onChange={(value) => setTaskDraft((current) => ({ ...current, category: value }))} /><ChronosSelect value={taskDraft.energyCost} options={energyOptions} onChange={(value) => setTaskDraft((current) => ({ ...current, energyCost: value }))} /></div><div className="grid grid-cols-2 gap-2"><input value={taskDraft.exactTime} onChange={(event) => setTaskDraft((current) => ({ ...current, exactTime: event.target.value }))} placeholder={text.exactTime} className={`${fieldClassName} font-precision`} /><ChronosSelect value={taskDraft.goalId} options={taskGoalOptions} onChange={(value) => setTaskDraft((current) => ({ ...current, goalId: value }))} /></div><div className={["flex gap-3 text-sm", themeMode === "paper" ? "text-neutral-700" : "text-stone-300"].join(" ")}><label className="flex items-center gap-2"><input type="checkbox" checked={taskDraft.isMandatory} onChange={(event) => setTaskDraft((current) => ({ ...current, isMandatory: event.target.checked }))} />{text.mandatory}</label><label className="flex items-center gap-2"><input type="checkbox" checked={taskDraft.hardBoundary} onChange={(event) => setTaskDraft((current) => ({ ...current, hardBoundary: event.target.checked }))} />Void Period</label></div><button type="button" onClick={handleAddTask} className={primaryButtonClassName}>{text.addTask}</button></div></div>
                <ScheduleImportPanel surfaceMode={surfaceMode} onImport={handleImportSchedule} labels={{ title: text.scheduleImportTitle, description: text.scheduleImportDescription, placeholder: text.scheduleImportPlaceholder, parse: text.scheduleImportParse, sync: text.scheduleImportSync, empty: text.scheduleImportEmpty, parsed: text.scheduleImportParsed, modes: text.scheduleImportModes, uploadFile: text.scheduleImportUploadFile, uploadImage: text.scheduleImportUploadImage, processing: text.scheduleImportProcessing, rawTextTitle: text.scheduleImportRawTextTitle, replaceHint: text.scheduleImportReplaceHint, partialHint: text.scheduleImportPartialHint, imageHint: text.scheduleImportImageHint, parseFailed: text.scheduleImportFailed, reset: text.scheduleImportReset, sourceLabel: text.scheduleImportSourceLabel, editHint: text.scheduleImportEditHint, remove: text.remove, teachingWeek: text.teachingWeek }} />
                <div className="glass-surface rounded-[32px] p-5"><div className="flex items-center justify-between gap-3"><div className={`text-sm font-semibold ${titleClassName}`}>{text.courseBlocks}</div><div className="flex items-center gap-2"><span className={`text-xs ${mutedTextClassName}`}>{text.teachingWeek}</span><input type="number" min="1" value={teachingWeek} onChange={(event) => setTeachingWeek(Math.max(1, Number(event.target.value) || 1))} className={`${fieldClassName} h-10 w-24 font-precision`} /></div></div><div className="mt-4 space-y-2">{selectedCourses.length ? selectedCourses.map((course) => { const sourceIndex = courses.findIndex((item) => item === course); return <button key={`${course.name}-${course.startTime}-${sourceIndex}`} type="button" onClick={() => setEditingCourseIndex(sourceIndex)} className={`timeline-card-hover w-full rounded-2xl border-l-[3px] px-4 py-3 text-left text-sm ${cardSurfaceClassName} ${isFlatMode ? "border-l-[#bf7a22]" : "border-l-[#F59E0B]"}`}><div className={`font-display font-bold tracking-tighter ${titleClassName}`}>{course.name}</div><div className={`font-precision mt-1 text-xs ${mutedTextClassName}`}>{course.startTime}-{course.endTime}{course.location ? ` · ${course.location}` : ""}</div>{formatWeeksSummary(course.weeks, course.weekMode) ? <div className={`mt-1 text-xs ${isFlatMode ? "text-[#9a5f13]" : "text-amber-200"}`}>{formatWeeksSummary(course.weeks, course.weekMode)}</div> : null}{course.sourceLabel ? <div className={`mt-1 text-[11px] ${subtleTextClassName}`}>{course.sourceLabel}</div> : null}</button>; }) : <div className={`text-sm ${mutedTextClassName}`}>{text.noCourseBlocks}</div>}</div>{editingCourse ? <div className={`mt-4 rounded-[28px] p-4 ${subCardClassName}`}><div className={`text-sm font-semibold ${titleClassName}`}>{text.editCourse}</div><div className="mt-3 grid gap-3"><input value={editingCourse!.name} onChange={(event) => handleUpdateCourse({ name: event.target.value })} className={fieldClassName} /><input value={editingCourse!.location ?? ""} onChange={(event) => handleUpdateCourse({ location: event.target.value })} placeholder={locale === "cn" ? "地点" : "Location"} className={`${fieldClassName} font-precision`} /><div className="grid grid-cols-3 gap-2"><ChronosSelect value={String(editingCourse!.weekday)} options={dayOptions} onChange={(value) => handleUpdateCourse({ weekday: Number(value) as Weekday })} /><input value={editingCourse!.startTime} onChange={(event) => handleUpdateCourse({ startTime: event.target.value })} className={`${fieldClassName} font-precision`} /><input value={editingCourse!.endTime} onChange={(event) => handleUpdateCourse({ endTime: event.target.value })} className={`${fieldClassName} font-precision`} /></div>{formatWeeksSummary(editingCourse!.weeks, editingCourse!.weekMode) ? <div className={`text-xs ${isFlatMode ? "text-[#9a5f13]" : "text-amber-200"}`}>{formatWeeksSummary(editingCourse!.weeks, editingCourse!.weekMode)}</div> : null}{editingCourse!.sourceLabel ? <div className={`text-xs ${subtleTextClassName}`}>{text.scheduleImportSourceLabel}: {editingCourse!.sourceLabel}</div> : null}<button type="button" onClick={() => { setEditingCourseIndex(null); pushToast(text.saved); }} className={primaryButtonClassName}>{text.saveCourse}</button></div></div> : null}</div>
                <div className="glass-surface rounded-[32px] p-5"><div className={`text-sm font-semibold ${titleClassName}`}>{text.sortedTasks}</div><div className="mt-4 space-y-2">{visibleTodayTasks.length ? visibleTodayTasks.map((task) => { const meta = getPriorityMeta(computePriorityScore({ importance: computeGoalDrivenImportance(task, goals), urgency: task.urgency })); return <div key={task.id} className={`rounded-2xl px-4 py-3 ${subCardClassName}`}><div className={`text-sm font-medium ${titleClassName}`}>{task.name}</div><div className="mt-2"><span className={`rounded-full px-2 py-1 text-xs ${meta.className}`}>{text.priority} {meta.label}</span></div><div className={`mt-2 text-xs ${subtleTextClassName}`}>{text.energy} {task.energyCost ?? "medium"}</div></div>; }) : <div className={`text-sm ${mutedTextClassName}`}>{text.noTasks}</div>}</div></div>
              </aside>
            </div>
          ) : null}

          {false ? (
            <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
              <section className="glass-surface rounded-[32px] p-5">
                <div className="text-sm font-semibold">{text.tabs.calendar}</div>
                <div className="mt-4 grid gap-3">
                  <input value={ruleDraft.title} onChange={(event) => setRuleDraft((current) => ({ ...current, title: event.target.value }))} placeholder={text.ruleName} className={fieldClassName} />
                  <div className="grid grid-cols-2 gap-2">
                    <ChronosSelect value={ruleDraft.kind} options={ruleKindOptions} onChange={(value) => setRuleDraft((current) => ({ ...current, kind: value }))} />
                    <ChronosSelect value={ruleDraft.category} options={taskCategoryOptions} onChange={(value) => setRuleDraft((current) => ({ ...current, category: value }))} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
  <input value={ruleDraft.interval} onChange={(event) => setRuleDraft((current) => ({ ...current, interval: event.target.value }))} placeholder="Every X" className={`${fieldClassName} font-precision`} />
  <input value={ruleDraft.dayOfMonth} onChange={(event) => setRuleDraft((current) => ({ ...current, dayOfMonth: event.target.value }))} placeholder="Day X" className={`${fieldClassName} font-precision`} />
  <input value={ruleDraft.seedMinutes} onChange={(event) => setRuleDraft((current) => ({ ...current, seedMinutes: event.target.value }))} placeholder={text.seed} className={`${fieldClassName} font-precision`} />
</div>
                  <div className="grid grid-cols-3 gap-2">
  <input value={ruleDraft.estimatedMinutes} onChange={(event) => setRuleDraft((current) => ({ ...current, estimatedMinutes: event.target.value }))} placeholder={text.minutes} className={`${fieldClassName} font-precision`} />
  <input value={ruleDraft.urgency} onChange={(event) => setRuleDraft((current) => ({ ...current, urgency: event.target.value }))} placeholder={text.urgency} className={`${fieldClassName} font-precision`} />
  <div className="min-h-11">
    <ChronosSelect value={ruleDraft.energyCost} options={energyOptions} onChange={(value) => setRuleDraft((current) => ({ ...current, energyCost: value }))} />
  </div>
</div>
                  <div className="grid grid-cols-7 gap-2">{WEEKDAY_LABELS.map((label, index) => { const weekday = (index + 1) as Weekday; const active = ruleDraft.weekDays.includes(weekday); const offClass = isFlatMode ? "border-[rgba(45,35,25,0.12)] bg-[rgba(255,251,245,0.96)] text-[#6f655b]" : "border-[rgba(125,142,163,0.18)] bg-[rgba(19,31,44,0.72)] text-stone-300"; const onClass = isFlatMode ? "border-amber-500/25 bg-amber-500/10 text-[#9a5f13]" : "border-amber-500/40 bg-amber-500/10 text-amber-300"; return <button key={label} type="button" onClick={() => setRuleDraft((current) => ({ ...current, weekDays: current.weekDays.includes(weekday) ? current.weekDays.filter((value) => value !== weekday) : [...current.weekDays, weekday].sort() as Weekday[] }))} className={["rounded-2xl border px-2 py-2 text-xs font-medium", active ? onClass : offClass].join(" ")}>{label.slice(0, 1)}</button>; })}</div>
                  <div className="text-xs text-stone-400">火种时间会作为忙碌时的最低执行时长生成到 Today。</div>
                  <button type="button" onClick={handleAddRule} className={primaryButtonClassName}>{text.addRule}</button>
                </div>
              </section>
              <section className="glass-surface rounded-[32px] p-5"><div className="text-sm font-semibold">{text.blueprintMasters}</div><div className="mt-4 space-y-3">{rules.length ? rules.map((rule) => <div key={rule.id} className="rounded-3xl border border-[rgba(125,142,163,0.18)] bg-[rgba(19,31,44,0.72)] px-4 py-4"><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold text-stone-50">{rule.title}</div><div className="mt-1 font-precision text-xs text-stone-400">{rule.kind} · seed {rule.seedMinutes} min · {rule.active ? (locale === "cn" ? "启用中" : "active") : (locale === "cn" ? "已暂停" : "paused")}</div></div><button type="button" onClick={() => setRules((current) => current.map((item) => item.id === rule.id ? { ...item, active: !item.active } : item))} className="rounded-full border border-[rgba(125,142,163,0.18)] bg-[rgba(24,36,54,0.92)] px-3 py-2 text-xs font-medium text-stone-200">{rule.active ? (locale === "cn" ? "暂停" : "Pause") : (locale === "cn" ? "恢复" : "Resume")}</button></div></div>) : <div className="text-sm text-stone-400">{text.noRules}</div>}</div></section>
            </div>
          ) : null}

          {false ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="glass-surface rounded-[32px] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{text.toolboxTitle}</div>
                    <div className="mt-1 text-sm text-stone-400">{text.toolboxDescription}</div>
                  </div>
                  <div className="rounded-full border border-[rgba(125,142,163,0.18)] bg-[rgba(19,31,44,0.72)] px-3 py-2 font-precision text-xs text-stone-300">{TEMPLATE_LIBRARY.length} {text.modulesCount}</div>
                </div>
                <div className="mt-5 grid gap-3">
                  {TEMPLATE_LIBRARY.map((template) => {
                    const Icon = template.icon;
                    const selected = selectedTemplate?.id === template.id;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(template.id)}
                        className={[
                          "group rounded-[30px] px-5 py-5 text-left transition",
                          toolboxCardClassName,
                          selected ? toolboxCardSelectedClassName : "",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={`grid h-12 w-12 place-items-center rounded-2xl ${subCardClassName} ${isFlatMode ? "text-[#9a5f13]" : "text-[#f0c46e]"}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className={`text-xs uppercase tracking-[0.24em] ${isFlatMode ? "text-[#9a5f13]/70" : "text-[#f0c46e]/70"}`}>{template.tagline}</div>
                              <div className={`mt-2 text-lg font-semibold ${titleClassName}`}>{template.name}</div>
                              <div className={`mt-2 max-w-2xl text-sm ${mutedTextClassName}`}>{template.description}</div>
                            </div>
                          </div>
                          <Import className={`mt-1 h-4 w-4 ${isFlatMode ? "text-[#9a5f13]" : "text-[#f0c46e]"}`} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {template.items.map((item) => (
                            <span key={item} className={`rounded-full px-3 py-1.5 text-xs ${pillClassName}`}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
              <aside className="space-y-4">
                <div className="glass-surface rounded-[32px] p-5">
                  {(() => {
                    const SelectedTemplateIcon = selectedTemplate?.icon ?? Sparkles;
                    return (
                      <>
                  <div className="flex items-center gap-3">
                    <div className={`grid h-11 w-11 place-items-center rounded-2xl ${subCardClassName} ${isFlatMode ? "text-[#9a5f13]" : "text-[#f0c46e]"}`}>
                      <SelectedTemplateIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${titleClassName}`}>{selectedTemplate?.name}</div>
                      <div className={`mt-1 text-xs uppercase tracking-[0.24em] ${isFlatMode ? "text-[#9a5f13]/70" : "text-[#f0c46e]/70"}`}>{selectedTemplate?.tagline}</div>
                    </div>
                  </div>
                  <div className={`mt-4 rounded-[28px] p-4 text-sm ${subCardClassName} ${bodyTextClassName}`}>
                    {selectedTemplate?.description}
                  </div>
                  <div className="mt-4 space-y-2">
                    {selectedTemplate?.items.map((item, index) => (
                      <div key={item} className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${subCardClassName}`}>
                        <input
                          defaultValue={item}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            setSelectedTemplate((prev) => {
                              if (!prev) return prev;
                              const copy = { ...prev, items: [...prev.items] } as TemplateDefinition;
                              copy.items[index] = val || item;
                              return copy;
                            });
                          }}
                          className={`${fieldClassName} !h-9`}
                        />
                        <span className={`font-precision text-xs ${subtleTextClassName}`}>0{index + 1}</span>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => selectedTemplate && handleImportTemplate(selectedTemplate)} className={`${primaryButtonClassName} mt-5 w-full`}>
                    {text.importTemplate}
                  </button>
                      </>
                    );
                  })()}
                </div>
                <div className="glass-surface rounded-[32px] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`text-sm font-semibold ${titleClassName}`}>{text.manualTemplateTitle}</div>
                      <div className={`mt-1 text-sm ${mutedTextClassName}`}>{text.manualTemplateDescription}</div>
                    </div>
                    <div className={`grid h-10 w-10 place-items-center rounded-2xl ${subCardClassName} ${isFlatMode ? "text-[#9a5f13]" : "text-[#f0c46e]"}`}>
                      <CalendarPlus2 className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <input
                      value={manualTemplateDraft.title}
                      onChange={(event) => setManualTemplateDraft((current) => ({ ...current, title: event.target.value }))}
                      placeholder={text.manualTemplateName}
                      className={fieldClassName}
                    />
                    <textarea
                      rows={4}
                      value={manualTemplateDraft.itemInput}
                      onChange={(event) => setManualTemplateDraft((current) => ({ ...current, itemInput: event.target.value }))}
                      placeholder={text.manualTemplateItems}
                      className={fieldClassName}
                    />
                    <button type="button" onClick={handleAddManualTemplateItem} className={secondaryButtonClassName}>
                      {text.addManualTemplateItem}
                    </button>
                    <div className={`rounded-[24px] p-4 ${subCardClassName}`}>
                      <div className={`text-xs uppercase tracking-[0.2em] ${subtleTextClassName}`}>{text.manualTemplateList}</div>
                      <div className="mt-3 space-y-2">
                        {manualTemplateDraft.items.length ? manualTemplateDraft.items.map((item, index) => (
                          <div key={`${item}-${index}`} className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm ${isFlatMode ? "bg-[rgba(255,251,245,0.92)]" : "bg-[rgba(15,24,35,0.76)]"}`}>
                            <span className={titleClassName}>{item}</span>
                            <button type="button" onClick={() => handleRemoveManualTemplateItem(index)} className="text-xs text-rose-300">{text.delete}</button>
                          </div>
                        )) : <div className={`text-sm ${mutedTextClassName}`}>{text.noManualTemplateItems}</div>}
                      </div>
                    </div>
                    <button type="button" onClick={handleSaveManualTemplate} className={primaryButtonClassName}>
                      {manualTemplateDraft.editingId ? text.updateManualTemplate : text.saveManualTemplate}
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {manualTemplates.length ? manualTemplates.map((template) => (
                      <div key={template.id} className={`rounded-[24px] p-4 ${toolboxCardClassName}`}>
                        <div className={`text-sm font-medium ${titleClassName}`}>{template.title}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {template.items.map((item) => (
                            <span key={item} className={`rounded-full px-3 py-1 text-xs ${pillClassName}`}>{item}</span>
                          ))}
                        </div>
                        <div className="mt-4 grid gap-2">
                        <button type="button" onClick={() => handleImportManualTemplate(template)} className={`w-full ${secondaryButtonClassName}`}>
                          {text.addManualTemplate}
                        </button>
                        <button type="button" onClick={() => handleEditManualTemplate(template)} className={`w-full ${secondaryButtonClassName}`}>
                          {text.editManualTemplate}
                        </button>
                        <button type="button" onClick={() => handleDeleteManualTemplate(template.id)} className="w-full rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200">
                          {text.deleteManualTemplate}
                        </button>
                        </div>
                      </div>
                    )) : <div className="text-sm text-stone-400">{text.noManualTemplates}</div>}
                  </div>
                </div>
                <div className="glass-surface rounded-[32px] p-5"><div className="text-sm font-semibold">{text.rewardBank}</div><div className="mt-4 space-y-2">{rewards.length ? rewards.map((reward, index) => <div key={`${reward.name}-${index}`} className="rounded-2xl border border-[rgba(125,142,163,0.18)] bg-[rgba(19,31,44,0.72)] px-4 py-3 text-sm text-stone-200">{reward.name} · {reward.requiredPoints} pts</div>) : <div className="text-sm text-stone-400">{text.noRewards}</div>}</div></div>
              </aside>
            </div>
          ) : null}

          {activeTab === "insight" ? (
            <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
              <section className="glass-surface rounded-[32px] p-5">
                <div className="text-sm font-semibold">{text.goalsPanel}</div>
                <div className="mt-4 grid gap-3">
                  <input
                    value={goalDraft.title}
                    onChange={(event) => setGoalDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder={text.goalTitle}
                    className={fieldClassName}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <ChronosSelect value={goalDraft.period} options={goalPeriodOptions} onChange={(value) => setGoalDraft((current) => ({ ...current, period: value }))} />
                    <input
                      type="date"
                      value={goalDraft.deadline}
                      onChange={(event) => setGoalDraft((current) => ({ ...current, deadline: event.target.value }))}
                      className={fieldClassName}
                    />
                  </div>
                  <button type="button" onClick={handleAddGoal} className={primaryButtonClassName}>
                    {text.createGoal}
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  {goals.length ? goals.map((goal) => (
                    <div key={goal.id} className={insightCardClassName}>
                      <div className={`text-sm font-medium ${titleClassName}`}>{goal.title}</div>
                      <div className={`mt-1 font-precision text-xs ${mutedTextClassName}`}>{text.periods[goal.period]} · {goal.deadline}</div>
                    </div>
                  )) : <div className={`text-sm ${mutedTextClassName}`}>{text.noGoals}</div>}
                </div>
                <div className={`mt-5 ${insightCardClassName}`}>
                  <div className={`text-sm font-semibold ${titleClassName}`}>{text.aiReport}</div>
                  <div className={`mt-2 text-sm ${bodyTextClassName}`}>{aiReport}</div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className={insightChipClassName}>{text.xpLabel} {xp}</span>
                    <span className={insightChipClassName}>{text.fuelLabel} {fuel}</span>
                    <span className={insightChipClassName}>{text.revivalLabel} {revivalCards}</span>
                  </div>
                  <button type="button" onClick={handleSparkMode} className={`mt-3 ${secondaryButtonClassName}`}>
                    {text.sparkMode}
                  </button>
                </div>
                <div className={`mt-5 ${insightCardClassName}`}>
                  <div className={`text-sm font-semibold ${titleClassName}`}>{text.flashNotesTitle}</div>
                  <textarea
                    rows={4}
                    value={flashNote}
                    onChange={(event) => setFlashNote(event.target.value)}
                    placeholder={text.flashNotePlaceholder}
                    className={`mt-3 ${textAreaClassName}`}
                  />
                  <button type="button" onClick={handleSaveFlashNote} className={`mt-3 ${secondaryButtonClassName}`}>
                    {text.saveFlashNote}
                  </button>
                  <div className="mt-4 space-y-2">
                    {flashNotes.length ? flashNotes.slice(0, 5).map((note) => (
                      <div key={note.id} className={subCardClassName}>
                        <div className={`font-precision px-4 pt-3 text-xs ${subtleTextClassName}`}>{note.category}</div>
                        <div className={`mt-1 px-4 pb-3 text-sm ${bodyTextClassName}`}>{note.content}</div>
                      </div>
                    )) : <div className={`text-sm ${mutedTextClassName}`}>{text.noFlashNotes}</div>}
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
                          cell.count >= 2 ? "border-amber-500/50 bg-amber-500/60" : cell.count === 1 ? "border-neutral-600 bg-neutral-600/50" : (isFlatMode ? "border-[rgba(45,35,25,0.08)] bg-[rgba(247,241,232,0.72)]" : "border-[rgba(125,142,163,0.12)] bg-[rgba(19,31,44,0.72)]"),
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
                        <div className={`font-precision text-xs ${mutedTextClassName}`}>{point.date}</div>
                        <div>
                          <div className="h-2 rounded-full bg-white/8">
                            <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, point.robot * 28)}%` }} />
                          </div>
                          <div className={`mt-1 text-[11px] ${subtleTextClassName}`}>{text.robotLabel}</div>
                        </div>
                        <div>
                          <div className="h-2 rounded-full bg-white/8">
                            <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, point.cpp * 28)}%` }} />
                          </div>
                          <div className={`mt-1 text-[11px] ${subtleTextClassName}`}>{text.cppLabel}</div>
                        </div>
                      </div>
                    )) : <div className={`text-sm ${mutedTextClassName}`}>{text.noGrowthCurve}</div>}
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </main>
      </div>

      <Navigation activeTab={activeTab as any} labels={text.tabs as any} onChange={(tab) => setActiveTab(tab as TabKey)} />

      <AnimatePresence>
        {showSettleModal ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`fixed inset-0 z-50 grid place-items-center px-4 ${isFlatMode ? "bg-[rgba(244,239,230,0.82)]" : "bg-[rgba(7,16,25,0.8)]"}`}>
            <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} className={`w-full max-w-md rounded-[32px] p-6 ${shellGlassClassName}`}>
              <div className={`text-lg font-semibold ${titleClassName}`}>{text.settle}</div>
              <div className={`mt-3 text-sm ${mutedTextClassName}`}>
                {locale === "cn"
                  ? `今日 XP ${xp}，Fuel ${fuel}，已完成 ${todayCompletedTasks.length} 项。`
                  : `Today XP ${xp}, Fuel ${fuel}, ${todayCompletedTasks.length} tasks completed.`}
              </div>
              <div className={`mt-4 rounded-3xl p-4 text-sm ${isFlatMode ? "border border-[rgba(45,35,25,0.08)] bg-[rgba(247,241,232,0.84)] text-[#3f372f]" : "border border-[rgba(125,142,163,0.12)] bg-[rgba(19,31,44,0.7)] text-[var(--vf-text)]"}`}>
                {plan === "pro"
                  ? (locale === "cn"
                    ? "AI 深度情绪洞察总结已解锁。"
                    : "AI deep emotional insight is unlocked.")
                  : (locale === "cn"
                    ? "AI 深度情绪洞察总结（仅限订阅用户）"
                    : "AI deep emotional insight summary (subscribers only)")}
              </div>
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => setShowSettleModal(false)} className={`flex-1 ${secondaryButtonClassName.replace("py-2", "py-3")}`}>
                  {locale === "cn" ? "取消" : "Cancel"}
                </button>
                <button type="button" onClick={() => { handleSettleToday(); setShowSettleModal(false); }} className={`flex-1 ${primaryButtonClassName}`}>
                  {locale === "cn" ? "确认结算" : "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>{focusTaskId ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-[rgba(7,12,22,0.86)] px-4"><motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="relative w-full max-w-2xl rounded-[40px] border border-[rgba(125,142,163,0.18)] bg-[rgba(15,24,38,0.94)] px-8 py-12 shadow-[0_0_90px_rgba(245,158,11,0.1)] backdrop-blur-xl"><button type="button" onClick={() => setFocusTaskId(null)} className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full border border-[rgba(125,142,163,0.18)] bg-[rgba(24,36,54,0.92)]"><X className="h-4 w-4" /></button>{(() => { const task = tasks.find((item) => item.id === focusTaskId); if (!task) return null; const meta = getPriorityMeta(computePriorityScore({ importance: computeGoalDrivenImportance(task, goals), urgency: task.urgency })); return <div className="text-center"><div className="mx-auto h-24 w-24 animate-breath rounded-full border border-amber-500/50 bg-amber-500/10" /><div className="mt-8 text-sm uppercase tracking-[0.4em] text-amber-300">{text.focus}</div><h2 className="mt-4 text-3xl font-semibold text-stone-50">{task.name}</h2><div className="mt-3"><span className={`rounded-full px-3 py-1 text-xs ${meta.className}`}>{locale === "cn" ? "优先级" : "Priority"} {meta.label}</span></div><div className="mt-3 font-precision text-stone-300">{task.estimatedMinutes} min</div><button type="button" onClick={() => handleToggleComplete(task.id)} className="chronos-button-primary mt-8 rounded-full px-5 py-3 text-sm font-medium text-white">{task.completed ? text.completed : text.complete}</button></div>; })()}</motion.div></motion.div> : null}</AnimatePresence>

      {toast ? <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2"><div className={`rounded-full px-4 py-2 text-sm font-medium ${isFlatMode ? "border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] text-[#9a5f13] shadow-none" : "border border-[rgba(125,142,163,0.12)] bg-[rgba(15,24,35,0.88)] text-[#f0c46e] shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl"}`}>{toast.message}</div></div> : null}

      {/* Bottom sheet for week quick-create */}
      {createSheet.open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20" onClick={() => setCreateSheet({ open: false, date: null })}>
          <div className="w-full max-w-md rounded-t-3xl bg-[rgba(255,251,245,0.98)] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-semibold text-[var(--vf-text)]">{locale === "cn" ? "快速创建" : "Quick create"}</div>
            <div className="mt-1 text-xs text-[var(--vf-text-soft)]">{locale === "cn" ? `将安排到：${createSheet.date ?? ""}` : `Will plan to: ${createSheet.date ?? ""}`}</div>
            <div className="mt-3 grid gap-2">
              <div className="text-[10px] text-[var(--vf-text-soft)]">
                {locale === "cn"
                  ? "用途：一句话创建任务；示例：明早9点 / 19:30 / 每周一三 / ddl 2026-04-10 / 提前10分钟 / #study"
                  : "Purpose: one-sentence create; examples: 9am tmr / 19:30 / MO,WE / ddl 2026-04-10 / remind 10m / #study"}
              </div>
              <input
                value={taskDraft.name}
                onChange={(e) => setTaskDraft((cur) => ({ ...cur, name: e.target.value, plannedDate: createSheet.date ?? cur.plannedDate }))}
                placeholder={locale === "cn" ? "例如：明晚7点 30min 复习英语 提前10分钟" : "e.g. tmr 7pm 30m review remind 10m"}
                className="chronos-field w-full rounded-2xl px-4 py-3 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setTaskDraft((cur) => ({ ...cur, name: `${cur.name ? cur.name + " " : ""}25min` }))} className="chronos-button-secondary rounded-full px-3 py-1.5 text-xs">25min</button>
                <button type="button" onClick={() => setTaskDraft((cur) => ({ ...cur, name: `${cur.name ? cur.name + " " : ""}@16:00`, exactTime: cur.exactTime || "16:00" }))} className="chronos-button-secondary rounded-full px-3 py-1.5 text-xs">@16:00</button>
                <button type="button" onClick={() => {
                  const t = new Date(Date.now() + 86400000);
                  const yyyy = t.getFullYear();
                  const mm = String(t.getMonth() + 1).padStart(2, '0');
                  const dd = String(t.getDate()).padStart(2, '0');
                  const d = `${yyyy}-${mm}-${dd}`;
                  setTaskDraft((cur) => ({ ...cur, name: `${cur.name ? cur.name + " " : ""}ddl ${d}`, deadline: d }));
                }} className="chronos-button-secondary rounded-full px-3 py-1.5 text-xs">{locale === "cn" ? "ddl 明天" : "ddl Tomorrow"}</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={createSheet.date ?? ""}
                  onChange={(e) => setCreateSheet((s) => ({ ...s, date: e.target.value }))}
                  className="chronos-field rounded-2xl px-3 py-2 text-sm"
                />
                <input
                  value={taskDraft.exactTime}
                  onChange={(e) => setTaskDraft((cur) => ({ ...cur, exactTime: e.target.value }))}
                  placeholder={locale === "cn" ? "固定时间 16:00" : "Fixed 16:00"}
                  className="chronos-field rounded-2xl px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={taskDraft.deadline || ''}
                  onChange={(e) => setTaskDraft((cur) => ({ ...cur, deadline: e.target.value }))}
                  className="chronos-field rounded-2xl px-3 py-2 text-sm"
                  placeholder={locale === 'cn' ? 'DDL 截止日' : 'Deadline'}
                  title={locale === 'cn' ? '设置截止日期' : 'Set deadline'}
                />
                {(() => {
                  const m = (taskDraft.deadline || (taskDraft.name.match(/ddl\s*(\d{4}-\d{2}-\d{2})/i)?.[1] ?? ''));
                  if (!m) return <div />;
                  function shift(dstr: string, n: number) {
                    const dt = new Date(dstr + 'T00:00:00');
                    dt.setDate(dt.getDate() - n);
                    const y = dt.getFullYear();
                    const mo = String(dt.getMonth() + 1).padStart(2, '0');
                    const da = String(dt.getDate()).padStart(2, '0');
                    return `${y}-${mo}-${da}`;
                  }
                  return (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setCreateSheet((s) => ({ ...s, date: shift(m, 1) }))} className="chronos-button-secondary rounded-full px-3 py-1.5 text-xs">{locale === 'cn' ? '安排到 DDL 前一天' : 'Plan D-1'}</button>
                      <button type="button" onClick={() => setCreateSheet((s) => ({ ...s, date: shift(m, 2) }))} className="chronos-button-secondary rounded-full px-3 py-1.5 text-xs">{locale === 'cn' ? '安排到 DDL 前两天' : 'Plan D-2'}</button>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setCreateSheet({ open: false, date: null })} className="chronos-button-secondary rounded-full px-4 py-2 text-sm">{locale === "cn" ? "取消" : "Cancel"}</button>
              <button type="button" onClick={() => {
                setTaskDraft((cur) => ({ ...cur, plannedDate: createSheet.date ?? cur.plannedDate }));
                // 派发自定义事件，由 handleAddTask 统一处理
                const ev = new CustomEvent('chronos-quick-add-from-sheet');
                window.dispatchEvent(ev);
              }} className="chronos-button-primary rounded-full px-4 py-2 text-sm text-white">{locale === "cn" ? "添加" : "Add"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
