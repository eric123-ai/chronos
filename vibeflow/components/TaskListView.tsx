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
  onAddTaskForDate,
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
  onAddTaskForDate?: (date: string, input: string) => void;
}) {
  const isCn = locale === "cn";
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const sections = useMemo(() => {
    const today = selectedDate;
    const tomorrow = new Date(selectedDate + "T00:00:00");
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    const pool = tasks.filter((task) => !task.deleted);

    return [
      { key: "today", title: isCn ? "今天" : "Today", items: pool.filter((task) => task.plannedDate === today) },
      { key: "tomorrow", title: isCn ? "明天" : "Tomorrow", items: pool.filter((task) => task.plannedDate === tomorrowKey) },
      { key: "unscheduled", title: isCn ? "未安排" : "Unscheduled", items: pool.filter((task) => !task.plannedDate) },
      { key: "overdue", title: isCn ? "已逾期" : "Overdue", items: pool.filter((task) => Boolean(task.deadline) && !task.completed && task.deadline! < today) },
    ];
  }, [isCn, selectedDate, tasks]);

  return (
    <section className="grid gap-4">
      <div className="rounded-2xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-3 text-xs text-[var(--vf-text-soft)] md:hidden">
        {isCn
          ? "按时间分组查看任务。点击分组可收起，长列表也能在手机上保持清爽。"
          : "Tasks are grouped by time so the mobile view stays clean."}
      </div>

      {sections.map((section) => (
        <div key={section.key} className="glass-surface rounded-[28px] p-4 sm:rounded-[32px] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[var(--vf-text)]">{section.title}</div>
            <div className="flex items-center gap-2">
              {onAddTaskForDate ? (
                <button
                  type="button"
                  onClick={() => onAddTaskForDate(section.key === "unscheduled" ? "" : selectedDate, "")}
                  className="chronos-button-secondary rounded-full px-3 py-2 text-xs font-medium"
                >
                  {isCn ? "添加" : "Add"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setCollapsed((current) => ({ ...current, [section.key]: !current[section.key] }))}
                className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-2 text-xs text-[var(--vf-text-muted)]"
              >
                {collapsed[section.key] ? (isCn ? "展开" : "Expand") : (isCn ? "收起" : "Collapse")}
              </button>
            </div>
          </div>

          {!collapsed[section.key] ? (
            <div className="mt-3 space-y-2">
              {section.items.length ? section.items.map((task) => {
                const isSelected = Boolean(selectedIds?.includes(task.id));
                const isOpen = Boolean(expanded[task.id]);
                return (
                  <div key={task.id} className="rounded-2xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {selectable ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggleSelect?.(task.id)}
                              className="h-4 w-4 rounded"
                            />
                          ) : null}
                          <div className="truncate text-sm font-medium text-[var(--vf-text)]">{task.name}</div>
                        </div>
                        <div className="mt-1 text-xs text-[var(--vf-text-muted)]">
                          {task.estimatedMinutes} min{task.deadline ? ` · ${task.deadline}` : ""}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button type="button" onClick={() => onToggleComplete?.(task.id)} className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-2 text-xs">
                          {task.completed ? (isCn ? "已完成" : "Done") : (isCn ? "完成" : "Complete")}
                        </button>
                        <button type="button" onClick={() => setExpanded((current) => ({ ...current, [task.id]: !current[task.id] }))} className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-2 text-xs">
                          {isOpen ? (isCn ? "收起" : "Hide") : (isCn ? "详情" : "Details")}
                        </button>
                      </div>
                    </div>

                    {isOpen ? (
                      <div className="mt-3 grid gap-3 rounded-2xl bg-[rgba(45,35,25,0.04)] p-3">
                        <div className="flex flex-wrap gap-2">
                          {onMoveToTomorrow ? (
                            <button type="button" onClick={() => onMoveToTomorrow(task.id)} className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-2 text-xs">
                              {isCn ? "移到明天" : "Tomorrow"}
                            </button>
                          ) : null}
                          {onQuickRemind ? [10, 30, 60].map((minutes) => (
                            <button key={minutes} type="button" onClick={() => onQuickRemind(task.id, minutes)} className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-2 text-xs">
                              {isCn ? `${minutes} 分钟后提醒` : `Remind in ${minutes}m`}
                            </button>
                          )) : null}
                        </div>

                        <div>
                          <div className="text-xs text-[var(--vf-text-soft)]">{isCn ? "备注" : "Notes"}</div>
                          <textarea
                            defaultValue={task.notes ?? ""}
                            onBlur={(event) => onUpdateNotes?.(task.id, event.currentTarget.value)}
                            className="mt-1 w-full rounded-xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.98)] p-2 text-sm outline-none"
                            rows={2}
                          />
                        </div>

                        <div>
                          <div className="text-xs text-[var(--vf-text-soft)]">{isCn ? "子任务" : "Subtasks"}</div>
                          <StepsEditor id={task.id} steps={task.steps ?? []} onChange={(steps) => onUpdateSteps?.(task.id, steps)} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              }) : (
                <div className="text-sm text-[var(--vf-text-muted)]">
                  {isCn ? "暂无任务" : "No tasks"}
                </div>
              )}
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}

function StepsEditor({
  id,
  steps,
  onChange,
}: {
  id: string;
  steps: string[];
  onChange: (steps: string[]) => void;
}) {
  const [local, setLocal] = useState<string[]>(steps);

  function commit(next: string[]) {
    setLocal(next);
    onChange(next.filter((step) => step.trim().length > 0));
  }

  return (
    <div className="mt-1 grid gap-1">
      {local.map((step, index) => (
        <div key={`${id}-step-${index}`} className="flex items-center gap-2">
          <input
            value={step}
            onChange={(event) => {
              const next = [...local];
              next[index] = event.currentTarget.value;
              setLocal(next);
            }}
            onBlur={() => commit(local)}
            className="flex-1 rounded-xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.98)] px-2 py-1 text-sm outline-none"
          />
          <button type="button" onClick={() => commit(local.filter((_, idx) => idx !== index))} className="rounded-full bg-[rgba(45,35,25,0.06)] px-2 py-1 text-xs">
            删除
          </button>
        </div>
      ))}
      <button type="button" onClick={() => commit([...local, ""])} className="mt-1 w-fit rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-1 text-xs">
        + 添加
      </button>
    </div>
  );
}
