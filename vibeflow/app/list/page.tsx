"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import TaskListView from "../../components/TaskListView";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import type { PlannerTask } from "../../types";
import { useI18n } from "../../components/I18nProvider";
import { formatLocalDate } from "../../lib/historyStorage";
import { loadTasks, saveTasks } from "../../lib/userDataStorage";

function toLocalMinuteString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export default function ListPage() {
  const { locale } = useI18n();
  const [hydrated, setHydrated] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [tasks, setTasks] = useState<PlannerTask[]>([]);

  useEffect(() => {
    const today = formatLocalDate(new Date());
    setSelectedDate(today);
    setTasks(loadTasks());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveTasks(tasks);
  }, [hydrated, tasks]);

  const handleToggleComplete = useCallback((id: string) => {
    setTasks((current) => current.map((t) => {
      if (t.id !== id) return t;
      const completing = !t.completed;
      return ({ ...t, completed: completing, completedAt: completing ? new Date().toISOString() : undefined, deleted: false });
    }));
  }, []);

  const handleMoveToTomorrow = useCallback((id: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const label = formatLocalDate(tomorrow);
    setTasks((current) => current.map((t) => t.id === id ? { ...t, plannedDate: label } : t));
  }, []);

  const handleQuickRemind = useCallback((id: string, minutes: number) => {
    const at = new Date(Date.now() + Math.max(1, minutes) * 60000);
    const when = toLocalMinuteString(at);
    setTasks((current) => current.map((t) => t.id === id ? { ...t, remindAt: when } : t));
  }, []);

  const title = useMemo(() => locale === "cn" ? "智能清单" : "Smart Lists", [locale]);
  const subtitle = useMemo(() => locale === "cn" ? "按今天/明天/本周/已计划/逾期自动分区。" : "Auto-partitioned: Today/Tomorrow/This week/Scheduled/Overdue.", [locale]);

  return (
    <div className="panel-workspace min-h-screen w-full text-[var(--vf-text)]">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="glass-surface rounded-[32px] px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-amber-200">/list</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm text-[var(--vf-text-muted)]">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LanguageSwitcher />
              <Link href="/" className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-amber-400">{locale === "cn" ? "返回今日" : "Back to today"}</Link>
            </div>
          </div>
        </header>

        <main className="mt-4">
          <TaskListView
            locale={locale}
            tasks={tasks}
            selectedDate={selectedDate}
            onToggleComplete={handleToggleComplete}
            onMoveToTomorrow={handleMoveToTomorrow}
            onQuickRemind={handleQuickRemind}
          />
        </main>
      </div>
    </div>
  );
}
