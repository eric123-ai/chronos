"use client";

import { CalendarPlus2, Upload } from "lucide-react";

type DeadlineItem = {
  id: string;
  name: string;
  deadline: string;
  daysLeft: number;
};

type FreeWindow = {
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

export function TodayDashboard({
  locale,
  selectedDate,
  teachingWeek,
  hasScheduleSetup,
  courseCount,
  taskCount,
  completedCount,
  nextDeadline,
  freeWindows,
  onOpenImport,
  onOpenComposer,
}: {
  locale: "cn" | "en";
  selectedDate: string;
  teachingWeek: number;
  hasScheduleSetup: boolean;
  courseCount: number;
  taskCount: number;
  completedCount: number;
  nextDeadline: DeadlineItem | null;
  freeWindows: FreeWindow[];
  onOpenImport: () => void;
  onOpenComposer: () => void;
}) {
  const isCn = locale === "cn";
  const primaryWindow = freeWindows[0] ?? null;

  const stats = [
    { label: isCn ? "教学周" : "Week", value: String(teachingWeek) },
    { label: isCn ? "今日课程" : "Classes", value: String(courseCount) },
    { label: isCn ? "今日任务" : "Tasks", value: `${completedCount}/${taskCount}` },
    { label: isCn ? "课表状态" : "Schedule", value: hasScheduleSetup ? (isCn ? "已导入" : "Imported") : (isCn ? "未导入" : "Missing") },
  ];

  return (
    <section className="glass-surface rounded-[28px] p-4 sm:rounded-[32px] sm:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.26em] text-[#9a5f13]">
            {isCn ? "今日总览" : "Today"}
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--vf-text)] sm:text-3xl">
            {selectedDate}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--vf-text-muted)]">
            {isCn
              ? "先锁定课程，再把真正要做的任务放进空档里。"
              : "Lock in classes first, then place the work that matters into the free windows."}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={hasScheduleSetup ? onOpenComposer : onOpenImport}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950"
          >
            {hasScheduleSetup ? <CalendarPlus2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            {hasScheduleSetup ? (isCn ? "添加今日任务" : "Add task") : (isCn ? "导入课表" : "Import schedule")}
          </button>
          {!hasScheduleSetup ? (
            <div className="rounded-2xl bg-[rgba(191,122,34,0.08)] px-3 py-2 text-xs leading-5 text-[#9a5f13]">
              {isCn ? "支持文本、图片、Excel 三种导入方式。" : "Supports text, image, and Excel imports."}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-[22px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] p-3 sm:rounded-[28px] sm:p-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--vf-text-soft)]">
              {item.label}
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--vf-text)] sm:text-2xl">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[22px] border border-[rgba(191,122,34,0.16)] bg-[rgba(245,158,11,0.08)] p-4 sm:rounded-[28px]">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#9a5f13]">
            {isCn ? "最近的 DDL" : "Next deadline"}
          </div>
          {nextDeadline ? (
            <>
              <div className="mt-3 text-base font-semibold text-[var(--vf-text)] sm:text-lg">{nextDeadline.name}</div>
              <div className="mt-2 text-sm text-[var(--vf-text-muted)]">
                {nextDeadline.deadline} · {isCn ? `剩余 ${nextDeadline.daysLeft} 天` : `${nextDeadline.daysLeft} day(s) left`}
              </div>
            </>
          ) : (
            <div className="mt-3 text-sm text-[var(--vf-text-muted)]">
              {isCn ? "今天没有很近的 DDL，优先利用课间空档。" : "No urgent deadline today. Use the gaps between classes well."}
            </div>
          )}
        </div>

        <div className="rounded-[22px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] p-4 sm:rounded-[28px]">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--vf-text-soft)]">
            {isCn ? "最佳空档" : "Best gap"}
          </div>
          {primaryWindow ? (
            <>
              <div className="mt-3 text-base font-semibold text-[var(--vf-text)] sm:text-lg">
                {primaryWindow.startTime} - {primaryWindow.endTime}
              </div>
              <div className="mt-2 text-sm text-[var(--vf-text-muted)]">
                {isCn ? `${primaryWindow.durationMinutes} 分钟，适合安排专注任务。` : `${primaryWindow.durationMinutes} min, good for focused work.`}
              </div>
            </>
          ) : (
            <div className="mt-3 text-sm text-[var(--vf-text-muted)]">
              {isCn ? "今天几乎没有完整空档，建议只安排必须做的任务。" : "Today is tight. Only place the must-do items."}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
