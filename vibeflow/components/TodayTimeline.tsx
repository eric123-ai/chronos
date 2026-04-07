"use client";

import { CalendarClock, Pin, Trash2, Download } from "lucide-react";
import type { ScheduleItem } from "../lib/autoSchedule";
import type { PlannerTask } from "../types";
import { generateIcsForDay } from "../lib/ics";

type TaskBucket = {
  mustDo: PlannerTask[];
  shouldDo: PlannerTask[];
  ifPossible: PlannerTask[];
};

type FreeWindow = {
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

export function TodayTimeline({
  locale,
  selectedDate,
  items,
  taskBuckets,
  freeWindows,
  onToggleComplete,
  onTogglePin,
  onDeleteTask,
}: {
  locale: "cn" | "en";
  selectedDate: string;
  items: ScheduleItem[];
  taskBuckets: TaskBucket;
  freeWindows: FreeWindow[];
  onToggleComplete: (taskId: string) => void;
  onTogglePin: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const isCn = locale === "cn";
  const bucketMeta = [
    { key: "mustDo", label: isCn ? "必须做" : "Must do", tasks: taskBuckets.mustDo },
    { key: "shouldDo", label: isCn ? "应该做" : "Should do", tasks: taskBuckets.shouldDo },
    { key: "ifPossible", label: isCn ? "有空再做" : "If possible", tasks: taskBuckets.ifPossible },
  ] as const;

  function downloadIcs() {
    try {
      const ics = generateIcsForDay(selectedDate, items);
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Chronos-${selectedDate}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // TODO: add toast error if needed
    }
  }

  return (
    <section className="space-y-4">
      <div className="glass-surface rounded-[32px] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[var(--vf-text)]">
              {isCn ? "今日时间线" : "Today's timeline"}
            </div>
            <div className="mt-1 text-sm text-[var(--vf-text-muted)]">{selectedDate}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadIcs}
              className="chronos-button-secondary rounded-full px-3 py-2 text-xs font-medium"
            >
              <Download className="mr-1 inline h-3.5 w-3.5" />
              {isCn ? "导出 .ics" : "Export .ics"}
            </button>
            <button
              type="button"
              onClick={() => (window as any).__chronosAddBreak?.()}
              className="chronos-button-secondary rounded-full px-3 py-2 text-xs font-medium"
            >
              {isCn ? "+ 15 分钟休息" : "+ 15m Break"}
            </button>
            <div className="rounded-full border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-3 py-2 text-xs text-[var(--vf-text-muted)]">
              {isCn ? `${items.length} 个区块` : `${items.length} blocks`}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {items.length ? items.map((item) => {
            const isTask = item.type === "task";
            const isCourse = item.type === "course";
            const isReward = item.type === "reward";

            return (
              <div
                key={`${item.type}-${item.startTime}-${item.endTime}-${item.data.name}`}
                className="rounded-[28px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[var(--vf-text-soft)]">
                      <CalendarClock className="h-4 w-4" />
                      {item.startTime} - {item.endTime}
                    </div>
                    <div className="mt-2 text-base font-semibold text-[var(--vf-text)]">{item.data.name}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {isCourse && (item as any).data.location ? (
                        <span className="rounded-full bg-[rgba(191,122,34,0.1)] px-2 py-1 text-[#9a5f13]">
                          {(item as any).data.location}
                        </span>
                      ) : null}
                      {isTask ? (
                        <>
                          <span className="rounded-full bg-[rgba(45,35,25,0.06)] px-2 py-1 text-[var(--vf-text-muted)]">
                            {item.data.estimatedMinutes} min
                          </span>
                          {(item as any).data.deadline ? (
                            <span className="rounded-full bg-[rgba(191,122,34,0.1)] px-2 py-1 text-[#9a5f13]">
                              DDL {(item as any).data.deadline}
                            </span>
                          ) : null}
                          {(item as any).data.category ? (
                            <span className="rounded-full bg-[rgba(45,35,25,0.06)] px-2 py-1 text-[var(--vf-text-muted)]">
                              {(item as any).data.category}
                            </span>
                          ) : null}
                        </>
                      ) : null}
                      {isReward ? (
                        <span className="rounded-full bg-[rgba(191,122,34,0.1)] px-2 py-1 text-[#9a5f13]">
                          {(item as any).data.requiredPoints} pts
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {isTask ? (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => onToggleComplete((item as any).data.id)} className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-2 text-xs font-medium text-[var(--vf-text)]">
                        {(item as any).data.completed ? (isCn ? "已完成" : "Done") : (isCn ? "完成" : "Complete")}
                      </button>
                      <button type="button" onClick={() => onTogglePin((item as any).data.id)} className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-2 text-xs font-medium text-[var(--vf-text)]">
                        <Pin className="mr-1 inline h-3.5 w-3.5" />
                        {(item as any).data.pinned ? (isCn ? "取消置顶" : "Unpin") : (isCn ? "置顶" : "Pin")}
                      </button>
                      {!((item as any).data.locked) ? (
                        <button type="button" onClick={() => onDeleteTask((item as any).data.id)} className="rounded-full bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-500">
                          <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                          {isCn ? "删除" : "Delete"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          }) : (
            <div className="rounded-[28px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-10 text-center text-sm text-[var(--vf-text-muted)]">
              {isCn ? "今天还没有排进时间线的任务。" : "Nothing is placed on today's timeline yet."}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-surface rounded-[32px] p-5">
          <div className="text-sm font-semibold text-[var(--vf-text)]">
            {isCn ? "可用空档" : "Free windows"}
          </div>
          <div className="mt-4 space-y-2">
            {freeWindows.length ? freeWindows.slice(0, 4).map((window) => (
              <div key={`${window.startTime}-${window.endTime}`} className="rounded-2xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-3">
                <div className="text-sm font-medium text-[var(--vf-text)]">
                  {window.startTime} - {window.endTime}
                </div>
                <div className="mt-1 text-xs text-[var(--vf-text-muted)]">
                  {isCn ? `${window.durationMinutes} 分钟` : `${window.durationMinutes} min`}
                </div>
              </div>
            )) : (
              <div className="text-sm text-[var(--vf-text-muted)]">
                {isCn ? "今天没有完整空档。" : "No clear free window today."}
              </div>
            )}
          </div>
        </div>

        <div className="glass-surface rounded-[32px] p-5">
          <div className="text-sm font-semibold text-[var(--vf-text)]">
            {isCn ? "执行清单" : "Execution list"}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {bucketMeta.map((bucket) => (
              <div key={bucket.key} className="rounded-[28px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] p-4">
                <div className="text-sm font-semibold text-[var(--vf-text)]">{bucket.label}</div>
                <div className="mt-3 space-y-2">
                  {bucket.tasks.length ? bucket.tasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="rounded-2xl bg-[rgba(45,35,25,0.05)] px-3 py-3">
                      <div className="text-sm font-medium text-[var(--vf-text)]">{task.name}</div>
                      <div className="mt-1 text-xs text-[var(--vf-text-muted)]">
                        {task.estimatedMinutes} min{task.deadline ? ` · ${task.deadline}` : ""}
                      </div>
                    </div>
                  )) : (
                    <div className="text-xs text-[var(--vf-text-muted)]">
                      {isCn ? "暂无" : "None"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
