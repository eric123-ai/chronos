"use client";

import { useMemo, useState } from "react";
import type { PlannerTask } from "../types";

export default function TaskListView({
  locale,
  tasks,
  selectedDate,
  onToggleComplete,
  onMoveToTomorrow,
  onQuickRemind,
  selectable,
  selectedIds,
  onToggleSelect,
  onUpdateNotes,
  onUpdateSteps,
}: {
  locale: "cn" | "en";
  tasks: PlannerTask[];
  selectedDate: string;
  onToggleComplete?: (id: string) => void;
  onMoveToTomorrow?: (id: string) => void;
  onQuickRemind?: (id: string, minutes: number) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
  onUpdateSteps?: (id: string, steps: string[]) => void;
}) {
  const isCn = locale === "cn";
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
              sec.items.slice(0, 80).map((t) => {
                const isSelected = !!selectedIds?.includes(t.id);
                const open = !!expanded[t.id];
                return (
                  <div key={t.id} className="rounded-2xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {selectable ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggleSelect?.(t.id)}
                              className="h-4 w-4 rounded"
                              aria-label={isCn ? "选择任务" : "Select task"}
                            />
                          ) : null}
                          <div className="truncate text-sm font-medium text-[var(--vf-text)]">{t.name}</div>
                          {t.tags && t.tags.length ? (
                            <div className="truncate text-xs text-[var(--vf-text-muted)]">#{t.tags.slice(0,3).join(" #")}</div>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-[var(--vf-text-muted)]">
                          {t.estimatedMinutes} min{t.deadline ? ` · ${t.deadline}` : ""}
                          {t.remindAt ? ` · ⏰ ${t.remindAt.slice(11,16)}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => onToggleComplete?.(t.id)} className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-1.5 text-xs">{isCn ? (t.completed ? "已完成" : "完成") : (t.completed ? "Done" : "Complete")}</button>
                        <button type="button" onClick={() => onMoveToTomorrow?.(t.id)} className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-1.5 text-xs">{isCn ? "移到明天" : "Tomorrow"}</button>
                        <div className="relative group">
                          <button type="button" className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-1.5 text-xs">{isCn ? "提醒/延后" : "Remind"}</button>
                          <div className="absolute right-0 z-10 hidden w-[180px] gap-1 rounded-2xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.98)] p-2 text-xs group-hover:grid">
                            {[5,10,30,60,120].map((m) => (
                              <button key={m} type="button" onClick={() => onQuickRemind?.(t.id, m)} className="rounded-xl px-2 py-1 text-left hover:bg-[rgba(45,35,25,0.06)]">{isCn ? `${m} 分钟后` : `in ${m} min`}</button>
                            ))}
                          </div>
                        </div>
                        <button type="button" onClick={() => setExpanded((c) => ({ ...c, [t.id]: !c[t.id] }))} className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-1.5 text-xs">{open ? (isCn ? "收起" : "Hide") : (isCn ? "详情" : "Details")}</button>
                      </div>
                    </div>
                    {open ? (
                      <div className="mt-3 grid gap-3 rounded-2xl bg-[rgba(45,35,25,0.04)] p-3">
                        <div>
                          <div className="text-xs text-[var(--vf-text-soft)]">{isCn ? "备注" : "Notes"}</div>
                          <textarea defaultValue={t.notes ?? ""} onBlur={(e) => onUpdateNotes?.(t.id, e.currentTarget.value)} className="mt-1 w-full rounded-xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.98)] p-2 text-sm outline-none" rows={2} />
                        </div>
                        <div>
                          <div className="text-xs text-[var(--vf-text-soft)]">{isCn ? "子任务" : "Subtasks"}</div>
                          <StepsEditor id={t.id} steps={t.steps ?? []} onChange={(steps) => onUpdateSteps?.(t.id, steps)} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-[var(--vf-text-muted)]">{isCn ? "暂无任务" : "No tasks"}</div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

function StepsEditor({ id, steps, onChange }: { id: string; steps: string[]; onChange: (steps: string[]) => void }) {
  const [local, setLocal] = useState<string[]>(steps);
  function commit(next: string[]) {
    setLocal(next);
    onChange(next.filter((s) => s.trim().length > 0));
  }
  return (
    <div className="mt-1 grid gap-1">
      {local.map((s, i) => (
        <div key={`${id}-step-${i}`} className="flex items-center gap-2">
          <input value={s} onChange={(e) => {
            const next = [...local];
            next[i] = e.currentTarget.value;
            setLocal(next);
          }} onBlur={() => commit(local)} className="flex-1 rounded-xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.98)] px-2 py-1 text-sm outline-none" />
          <button type="button" onClick={() => commit(local.filter((_, idx) => idx !== i))} className="rounded-full bg-[rgba(45,35,25,0.06)] px-2 py-1 text-xs">删除</button>
        </div>
      ))}
      <button type="button" onClick={() => commit([...local, ""])} className="mt-1 w-fit rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-1 text-xs">+ 添加</button>
    </div>
  );
}
