"use client";

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

  return (
    <section className="glass-surface rounded-[32px] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-[#9a5f13]">
            {isCn ? "今日时间线总览" : "Today timeline"}
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--vf-text)]">
            {selectedDate}
          </h2>
          <p className="mt-2 text-sm text-[var(--vf-text-muted)]">
            {isCn
              ? "先锁定课程，再把真正要做的事放进空档里。"
              : "Lock in classes first, then place the work that actually matters into the free windows."}
          </p>
          <p className="mt-1 text-xs text-[var(--vf-text-soft)]">
            {isCn
              ? "用途：快速了解今日空档与最近DDL；下一步：点击“添加今日任务（自然语言）”录入（如：明早9点 30min 英语）。"
              : "Purpose: see today's gaps and next deadline. Next: click 'Add today's task (NL)' and type (e.g., 9am tmr 30m review)."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={hasScheduleSetup ? onOpenComposer : onOpenImport}
            className="chronos-button-primary rounded-full px-4 py-3 text-sm font-medium text-white"
          >
            {hasScheduleSetup ? (isCn ? "添加今日任务" : "Add today's task") : (isCn ? "导入课表" : "Import schedule")}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          { label: isCn ? "教学周" : "Week", value: teachingWeek },
          { label: isCn ? "今日课程" : "Classes", value: courseCount },
          { label: isCn ? "今日任务" : "Tasks", value: `${completedCount}/${taskCount}` },
          { label: isCn ? "课表状态" : "Schedule", value: hasScheduleSetup ? (isCn ? "已导入" : "Imported") : (isCn ? "待导入" : "Missing") },
        ].map((item) => (
          <div key={item.label} className="rounded-[28px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--vf-text-soft)]">
              {item.label}
            </div>
            <div className="mt-3 text-2xl font-semibold text-[var(--vf-text)]">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-[rgba(191,122,34,0.16)] bg-[rgba(245,158,11,0.08)] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[#9a5f13]">
            {isCn ? "最近的 DDL" : "Next deadline"}
          </div>
          {nextDeadline ? (
            <>
              <div className="mt-3 text-lg font-semibold text-[var(--vf-text)]">{nextDeadline.name}</div>
              <div className="mt-2 text-sm text-[var(--vf-text-muted)]">
                {nextDeadline.deadline} · {isCn ? `剩余 ${nextDeadline.daysLeft} 天` : `${nextDeadline.daysLeft} day(s) left`}
              </div>
            </>
          ) : (
            <div className="mt-3 text-sm text-[var(--vf-text-muted)]">
              {isCn ? "今天没有很近的 DDL，优先利用课程之间的空档。" : "No urgent deadline today. Use the gaps between classes well."}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--vf-text-soft)]">
            {isCn ? "最佳空档" : "Best gap"}
          </div>
          {primaryWindow ? (
            <>
              <div className="mt-3 text-lg font-semibold text-[var(--vf-text)]">
                {primaryWindow.startTime} - {primaryWindow.endTime}
              </div>
              <div className="mt-2 text-sm text-[var(--vf-text-muted)]">
                {isCn ? `${primaryWindow.durationMinutes} 分钟，适合安排需要专注的任务。` : `${primaryWindow.durationMinutes} min, good for focused work.`}
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
