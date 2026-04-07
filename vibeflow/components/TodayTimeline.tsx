"use client";

import { CalendarClock, MoreHorizontal, Pin, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ScheduleItem } from "../lib/autoSchedule";
import type { PlannerTask } from "../types";

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
  const [openTaskMenuId, setOpenTaskMenuId] = useState<string | null>(null);

  const bucketMeta = [
    { key: "mustDo", label: isCn ? "必须做" : "Must do", tasks: taskBuckets.mustDo },
    { key: "shouldDo", label: isCn ? "应该做" : "Should do", tasks: taskBuckets.shouldDo },
    { key: "ifPossible", label: isCn ? "有空再做" : "If possible", tasks: taskBuckets.ifPossible },
  ] as const;

  return (
    <section className="space-y-4">
      <div className="glass-surface rounded-[28px] p-4 sm:rounded-[32px] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-[var(--vf-text)]">
              {isCn ? "今日时间线" : "Today's timeline"}
            </div>
            <div className="mt-1 text-sm text-[var(--vf-text-muted)]">{selectedDate}</div>
          </div>
          <div className="rounded-full border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-3 py-2 text-xs text-[var(--vf-text-muted)]">
            {isCn ? `${items.length} 个区块` : `${items.length} blocks`}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {items.length ? items.map((item) => {
            const isTask = item.type === "task";
            const taskId = isTask ? item.data.id : null;

            return (
              <div
                key={`${item.type}-${item.startTime}-${item.endTime}-${item.data.name}`}
                className="rounded-[22px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-4 sm:rounded-[28px]"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0 rounded-full bg-[rgba(191,122,34,0.1)] p-2 text-[#9a5f13]">
                    <CalendarClock className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-[var(--vf-text-soft)]">
                      {item.startTime} - {item.endTime}
                    </div>
                    <div className="mt-1 text-sm font-semibold leading-6 text-[var(--vf-text)] sm:text-base">
                      {item.data.name}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {"estimatedMinutes" in item.data ? (
                        <span className="rounded-full bg-[rgba(45,35,25,0.06)] px-2 py-1 text-[var(--vf-text-muted)]">
                          {item.data.estimatedMinutes} min
                        </span>
                      ) : null}
                      {"deadline" in item.data && item.data.deadline ? (
                        <span className="rounded-full bg-[rgba(191,122,34,0.1)] px-2 py-1 text-[#9a5f13]">
                          DDL {item.data.deadline}
                        </span>
                      ) : null}
                      {"location" in item.data && item.data.location ? (
                        <span className="rounded-full bg-[rgba(45,35,25,0.06)] px-2 py-1 text-[var(--vf-text-muted)]">
                          {item.data.location}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {isTask ? (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setOpenTaskMenuId((current) => current === taskId ? null : taskId)}
                        className="rounded-full bg-[rgba(45,35,25,0.06)] p-2 text-[var(--vf-text-muted)]"
                        aria-label={isCn ? "更多操作" : "More actions"}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openTaskMenuId === taskId ? (
                        <div className="absolute right-0 top-11 z-10 grid w-36 gap-1 rounded-2xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.98)] p-2 shadow-lg">
                          <button type="button" onClick={() => { onToggleComplete(taskId!); setOpenTaskMenuId(null); }} className="rounded-xl px-3 py-2 text-left text-xs hover:bg-[rgba(45,35,25,0.06)]">
                            {item.data.completed ? (isCn ? "标记未完成" : "Mark undone") : (isCn ? "完成任务" : "Complete")}
                          </button>
                          <button type="button" onClick={() => { onTogglePin(taskId!); setOpenTaskMenuId(null); }} className="rounded-xl px-3 py-2 text-left text-xs hover:bg-[rgba(45,35,25,0.06)]">
                            <Pin className="mr-1 inline h-3.5 w-3.5" />
                            {item.data.pinned ? (isCn ? "取消置顶" : "Unpin") : (isCn ? "置顶" : "Pin")}
                          </button>
                          {!item.data.locked ? (
                            <button type="button" onClick={() => { onDeleteTask(taskId!); setOpenTaskMenuId(null); }} className="rounded-xl px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50">
                              <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                              {isCn ? "删除" : "Delete"}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          }) : (
            <div className="rounded-[22px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-8 text-center text-sm text-[var(--vf-text-muted)]">
              {isCn ? "今天还没有排进时间线的任务。" : "Nothing is placed on today's timeline yet."}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="glass-surface rounded-[28px] p-4 sm:rounded-[32px] sm:p-5">
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

        <div className="glass-surface rounded-[28px] p-4 sm:rounded-[32px] sm:p-5">
          <div className="text-sm font-semibold text-[var(--vf-text)]">
            {isCn ? "执行清单" : "Execution list"}
          </div>
          <div className="mt-4 space-y-3">
            {bucketMeta.map((bucket) => (
              <div key={bucket.key} className="rounded-[22px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] p-4">
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
