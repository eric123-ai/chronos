"use client";

import { useMemo } from "react";
import type { PlannerTask } from "../types";

export default function TaskListView({
  locale,
  tasks,
  selectedDate,
  onToggleComplete,
  onMoveToTomorrow,
  onQuickRemind,
}: {
  locale: "cn" | "en";
  tasks: PlannerTask[];
  selectedDate: string;
  onToggleComplete?: (id: string) => void;
  onMoveToTomorrow?: (id: string) => void;
  onQuickRemind?: (id: string, minutes: number) => void;
}) {
  const isCn = locale === "cn";

  const sections = useMemo(() => {
    const today = selectedDate;
    const now = new Date();
    const monday = new Date(now);
    const day = monday.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
    monday.setDate(now.getDate() + diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const isSameDay = (d: string) => d === today;
    const isTomorrow = (d: string) => {
      const t = new Date(today + "T00:00:00");
      const tm = new Date(t);
      tm.setDate(t.getDate() + 1);
      return d === tm.toISOString().slice(0, 10);
    };
    const inThisWeek = (d: string) => {
      const x = new Date(d + "T00:00:00");
      return x >= monday && x <= sunday;
    };
    const overdue = (t: PlannerTask) => {
      if (!t.deadline) return false;
      const dl = new Date(t.deadline + "T23:59:59");
      const todayDate = new Date(today + "T00:00:00");
      return dl < todayDate && !t.completed;
    };

    const pool = tasks.filter((t) => !t.deleted);

    return [
      { key: "today", title: isCn ? "今天" : "Today", items: pool.filter((t) => isSameDay(t.plannedDate ?? "")) },
      { key: "tomorrow", title: isCn ? "明天" : "Tomorrow", items: pool.filter((t) => isTomorrow(t.plannedDate ?? "")) },
      { key: "week", title: isCn ? "本周" : "This week", items: pool.filter((t) => t.plannedDate && inThisWeek(t.plannedDate)) },
      { key: "scheduled", title: isCn ? "已计划" : "Scheduled", items: pool.filter((t) => t.plannedDate && !isSameDay(t.plannedDate) && !isTomorrow(t.plannedDate) && !inThisWeek(t.plannedDate)) },
      { key: "overdue", title: isCn ? "已逾期" : "Overdue", items: pool.filter((t) => overdue(t)) },
    ];
  }, [locale, selectedDate, tasks]);

  return (
    <section className="grid gap-4">
      {sections.map((sec) => (
        <div key={sec.key} className="glass-surface rounded-[32px] p-5">
          <div className="text-sm font-semibold">{sec.title}</div>
          <div className="mt-3 space-y-2">
            {sec.items.length ? (
              sec.items.slice(0, 40).map((t) => (
                <div key={t.id} className="rounded-2xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-[var(--vf-text)]">{t.name}</div>
                      <div className="mt-1 text-xs text-[var(--vf-text-muted)]">{t.estimatedMinutes} min{t.deadline ? ` · ${t.deadline}` : ""}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onToggleComplete?.(t.id)} className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-1.5 text-xs">{isCn ? (t.completed ? "已完成" : "完成") : (t.completed ? "Done" : "Complete")}</button>
                      <button type="button" onClick={() => onMoveToTomorrow?.(t.id)} className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-1.5 text-xs">{isCn ? "移到明天" : "Move to tomorrow"}</button>
                      <div className="relative group">
                        <button type="button" className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-1.5 text-xs">{isCn ? "提醒" : "Remind"}</button>
                        <div className="absolute right-0 z-10 hidden w-[160px] gap-1 rounded-2xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.98)] p-2 text-xs group-hover:grid">
                          {[5,10,30,60].map((m) => (
                            <button key={m} type="button" onClick={() => onQuickRemind?.(t.id, m)} className="rounded-xl px-2 py-1 text-left hover:bg-[rgba(45,35,25,0.06)]">{isCn ? `${m} 分钟后` : `in ${m} min`}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-[var(--vf-text-muted)]">{isCn ? "暂无任务" : "No tasks"}</div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
