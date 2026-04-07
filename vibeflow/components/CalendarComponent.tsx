"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Rows3, StretchHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { courseMatchesTeachingWeek } from "../lib/parseSchedule";
import type { Course, PlannerTask } from "../types";

type CalendarView = "day" | "week" | "month";
type ThemeMode = "paper" | "obsidian";

type DaySummary = {
  date: string;
  dayLabel: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  fixedCount: number;
  flexibleCount: number;
};

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function weekdayFromDate(date: Date) {
  const js = date.getDay();
  return js === 0 ? 7 : js;
}

function monthMatrix(selectedDate: string) {
  const anchor = parseDate(selectedDate);
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const offset = weekdayFromDate(start) - 1;
  const gridStart = addDays(start, -offset);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function weekStrip(selectedDate: string) {
  const anchor = parseDate(selectedDate);
  const offset = weekdayFromDate(anchor) - 1;
  const start = addDays(anchor, -offset);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function CalendarComponent({
  selectedDate,
  tasks,
  courses,
  labels,
  teachingWeek,
  surfaceMode,
  onSelectDate,
  onJumpToTimeline,
}: {
  selectedDate: string;
  tasks: PlannerTask[];
  courses: Course[];
  themeMode: ThemeMode;
  teachingWeek: number;
  surfaceMode?: "default" | "flat";
  labels: {
    title: string;
    subtitle: string;
    timeline: string;
    week: string;
    month: string;
  };
  onSelectDate: (date: string) => void;
  onJumpToTimeline: () => void;
}) {
  const [view, setView] = useState<CalendarView>("day");
  const isFlatMode = surfaceMode === "flat";

  const summaryMap = useMemo(() => {
    const map = new Map<string, { fixed: number; flexible: number }>();
    const today = formatDate(new Date());

    for (const task of tasks.filter((item) => !item.deleted)) {
      const key = task.plannedDate ?? today;
      const current = map.get(key) ?? { fixed: 0, flexible: 0 };
      if (task.isMandatory || task.category === "fixed_timeline") current.fixed += 1;
      else current.flexible += 1;
      map.set(key, current);
    }

    const monthDates = monthMatrix(selectedDate);
    for (const date of monthDates) {
      const key = formatDate(date);
      const weekday = weekdayFromDate(date);
      const current = map.get(key) ?? { fixed: 0, flexible: 0 };
      current.fixed += courses.filter((course) => course.weekday === weekday && courseMatchesTeachingWeek(course, teachingWeek)).length;
      map.set(key, current);
    }

    return map;
  }, [courses, selectedDate, tasks, teachingWeek]);

  const monthDays = useMemo<DaySummary[]>(() => {
    const anchor = parseDate(selectedDate);
    const today = formatDate(new Date());
    return monthMatrix(selectedDate).map((date) => {
      const key = formatDate(date);
      const summary = summaryMap.get(key) ?? { fixed: 0, flexible: 0 };
      return {
        date: key,
        dayLabel: date.toLocaleDateString("zh-CN", { weekday: "short" }),
        dayNumber: date.getDate(),
        inCurrentMonth: date.getMonth() === anchor.getMonth(),
        isToday: key === today,
        isSelected: key === selectedDate,
        fixedCount: summary.fixed,
        flexibleCount: summary.flexible,
      };
    });
  }, [selectedDate, summaryMap]);

  const weekDays = useMemo<DaySummary[]>(() => {
    const today = formatDate(new Date());
    return weekStrip(selectedDate).map((date) => {
      const key = formatDate(date);
      const summary = summaryMap.get(key) ?? { fixed: 0, flexible: 0 };
      return {
        date: key,
        dayLabel: date.toLocaleDateString("zh-CN", { weekday: "short" }),
        dayNumber: date.getDate(),
        inCurrentMonth: true,
        isToday: key === today,
        isSelected: key === selectedDate,
        fixedCount: summary.fixed,
        flexibleCount: summary.flexible,
      };
    });
  }, [selectedDate, summaryMap]);

  const viewOptions: Array<{ value: CalendarView; label: string; icon: typeof Rows3 }> = [
    { value: "day", label: labels.timeline, icon: Rows3 },
    { value: "week", label: labels.week, icon: StretchHorizontal },
    { value: "month", label: labels.month, icon: CalendarDays },
  ];

  const baseCellClass = isFlatMode
    ? "border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.98)] text-[#201b16] shadow-none"
    : "border border-[rgba(125,142,163,0.12)] bg-[rgba(15,24,35,0.78)] text-[#f6f1e8] backdrop-blur-xl shadow-[0_18px_44px_rgba(0,0,0,0.24)]";

  return (
    <section className="glass-surface rounded-[32px] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="font-display text-2xl font-black tracking-tighter">{labels.title}</div>
          <div className={`mt-1 text-sm ${isFlatMode ? "text-[#6f655b]" : "text-[var(--vf-text-muted)]"}`}>{labels.subtitle}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {viewOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={[
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                view === value
                  ? (isFlatMode ? "border-[rgba(191,122,34,0.3)] bg-[rgba(191,122,34,0.1)] text-[#9a5f13]" : "border-amber-400/30 bg-amber-500/10 text-[#f0c46e]")
                  : baseCellClass,
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === "day" ? (
          <motion.div
            key="day"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ type: "spring", stiffness: 180, damping: 20 }}
            className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]"
          >
            <button type="button" onClick={onJumpToTimeline} className={`rounded-[28px] border p-6 text-left ${baseCellClass}`}>
              <div className={`font-precision text-xs uppercase tracking-[0.28em] ${isFlatMode ? "text-[#9a5f13]" : "text-[#f0c46e]"}`}>{labels.timeline}</div>
              <div className="font-display mt-4 text-4xl font-black tracking-tighter">{selectedDate.slice(8)}</div>
              <div className="font-precision mt-2 text-sm">{selectedDate}</div>
            </button>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                { label: "Fixed", value: summaryMap.get(selectedDate)?.fixed ?? 0, color: "bg-amber-500" },
                { label: "Flexible", value: summaryMap.get(selectedDate)?.flexible ?? 0, color: "bg-neutral-400" },
              ].map((item) => (
                <div key={item.label} className={`rounded-[28px] border p-5 ${baseCellClass}`}>
                  <div className="font-precision text-xs uppercase tracking-[0.24em]">{item.label}</div>
                  <div className="mt-4 flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                    <span className="font-display text-3xl font-black tracking-tighter">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}

        {view === "week" ? (
          <motion.div
            key="week"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ type: "spring", stiffness: 180, damping: 20 }}
            className="mt-6 grid gap-6 md:grid-cols-7"
          >
            {weekDays.map((day, index) => (
              <motion.button
                key={day.date}
                type="button"
                onClick={() => {
                  onSelectDate(day.date);
                  onJumpToTimeline();
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, type: "spring", stiffness: 180, damping: 20 }}
                className={[
                    "rounded-[28px] border p-4 text-left",
                    baseCellClass,
                  day.isSelected ? "border-amber-500/40" : "",
                ].join(" ")}
              >
                <div className="font-precision text-xs uppercase">{day.dayLabel}</div>
                <div className="font-display mt-4 text-3xl font-black tracking-tighter">{day.dayNumber}</div>
                <div className="mt-4 flex gap-2">
                  {day.fixedCount ? <span className="h-1.5 flex-1 rounded-full bg-amber-500" /> : null}
                  {day.flexibleCount ? <span className="h-1.5 flex-1 rounded-full bg-neutral-400" /> : null}
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : null}

        {view === "month" ? (
          <motion.div
            key="month"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ type: "spring", stiffness: 180, damping: 20 }}
            className="mt-6 grid gap-6"
          >
            <div className="grid grid-cols-7 gap-6">
              {monthDays.map((day, index) => (
                <motion.button
                  key={day.date}
                  type="button"
                  onClick={() => {
                    onSelectDate(day.date);
                    onJumpToTimeline();
                  }}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.012, type: "spring", stiffness: 200, damping: 22 }}
                  className={[
                    "chronos-month-grid min-h-[108px] rounded-[28px] border p-4 text-left",
                    baseCellClass,
                    !day.inCurrentMonth ? "opacity-45" : "",
                    day.isSelected ? "border-amber-500/45" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-precision text-[11px] uppercase">{day.dayLabel}</div>
                    {day.isToday ? <span className="h-2 w-2 rounded-full bg-amber-500" /> : null}
                  </div>
                  <div className="font-display mt-5 text-3xl font-black tracking-tighter">{day.dayNumber}</div>
                  <div className="mt-4 flex gap-2">
                    {day.fixedCount ? <span className="h-1.5 flex-1 rounded-full bg-amber-500" /> : null}
                    {day.flexibleCount ? <span className="h-1.5 flex-1 rounded-full bg-neutral-400" /> : null}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
