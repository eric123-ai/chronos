"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { useI18n } from "../../components/I18nProvider";
import { formatLocalDate, loadHistory, loadSummaries } from "../../lib/historyStorage";

function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function weekDayNumber(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function intensityClass(count: number) {
  if (count >= 5) return "bg-violet-400";
  if (count >= 3) return "bg-cyan-400";
  if (count >= 1) return "bg-white/40";
  return "bg-white/8";
}

const TEXT = {
  cn: {
    title: "时序归档",
    subtitle: "Chronos 在这里沉淀每天的完成任务、洞察与积分变化。",
    back: "返回今日",
    heatmap: "热力图",
    recent: "最近结算",
    selected: "选中日期",
    summary: "反思",
    insight: "洞察",
    completed: "完成任务",
    rewards: "奖励消费",
    points: "积分",
    spent: "消耗",
    mood: "心情",
    empty: "这一天还没有归档记录。",
    noSummary: "这一天还没有反思。",
    noInsight: "这一天还没有洞察。",
    noRewards: "这一天没有奖励消费。",
    noHistory: "还没有历史记录。",
    weekdays: ["一", "二", "三", "四", "五", "六", "日"],
  },
  en: {
    title: "Chronos Archive",
    subtitle: "Chronos keeps completed tasks, insights, and point changes here.",
    back: "Back to today",
    heatmap: "Heatmap",
    recent: "Recent settlements",
    selected: "Selected",
    summary: "Reflection",
    insight: "Insight",
    completed: "Completed tasks",
    rewards: "Reward spending",
    points: "Points",
    spent: "Spent",
    mood: "Mood",
    empty: "No archived record for this day.",
    noSummary: "No reflection for this day.",
    noInsight: "No insight for this day.",
    noRewards: "No reward spending for this day.",
    noHistory: "No history yet.",
    weekdays: ["M", "T", "W", "T", "F", "S", "S"],
  },
} as const;

export default function HistoryPage() {
  const { locale } = useI18n();
  const text = TEXT[locale];
  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [historyLog, setHistoryLog] = useState<ReturnType<typeof loadHistory>>([]);
  const [summaries, setSummaries] = useState<ReturnType<typeof loadSummaries>>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentDate = formatLocalDate(new Date());
      setToday(currentDate);
      setSelectedDate(currentDate);
      setHistoryLog(loadHistory());
      setSummaries(loadSummaries());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedRecord = useMemo(() => historyLog.find((item) => item.date === selectedDate) ?? null, [historyLog, selectedDate]);
  const selectedSummary = useMemo(() => summaries.find((item) => item.date === selectedDate) ?? null, [selectedDate, summaries]);
  const monthAnchor = useMemo(() => {
    const base = parseLocalDate(selectedDate || today || formatLocalDate(new Date()));
    return new Date(base.getFullYear(), base.getMonth(), 1);
  }, [selectedDate, today]);

  const calendar = useMemo(() => {
    const offset = weekDayNumber(monthAnchor) - 1;
    const start = addDays(monthAnchor, -offset);
    return Array.from({ length: 42 }, (_, index) => {
      const current = addDays(start, index);
      return { date: formatLocalDate(current), inMonth: current.getMonth() === monthAnchor.getMonth() };
    });
  }, [monthAnchor]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of historyLog) map.set(item.date, item.completedTasks.length);
    return map;
  }, [historyLog]);

  const monthLabel = useMemo(() => monthAnchor.toLocaleDateString(locale === "cn" ? "zh-CN" : "en-US", { year: "numeric", month: "long" }), [locale, monthAnchor]);

  return (
    <div className="panel-profile min-h-screen w-full text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="glass-surface rounded-[32px] px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-violet-200">/history</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{text.title}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">{text.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LanguageSwitcher />
              <Link href="/" className="rounded-full bg-violet-500 px-4 py-2 text-sm font-medium text-white">{text.back}</Link>
            </div>
          </div>
        </header>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="glass-surface rounded-[32px] p-5">
            <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">{text.heatmap}</div><div className="mt-1 text-sm text-slate-400">{monthLabel}</div></div><div className="rounded-full bg-white/8 px-3 py-2 text-xs text-slate-300">{text.selected}: {selectedDate || "--"}</div></div>
            {hydrated ? <div className="mt-5"><div className="mb-2 grid grid-cols-7 gap-2">{text.weekdays.map((label) => <div key={label} className="text-center text-[11px] text-slate-500">{label}</div>)}</div><div className="grid grid-cols-7 gap-2">{calendar.map((cell) => { const count = counts.get(cell.date) ?? 0; return <button key={cell.date} type="button" onClick={() => setSelectedDate(cell.date)} className={["relative h-12 rounded-2xl ring-1 transition", cell.inMonth ? "ring-white/10" : "opacity-40 ring-white/5", cell.date === selectedDate ? "ring-2 ring-violet-400" : ""].join(" ")}><span className={["absolute inset-1 rounded-[14px]", intensityClass(count)].join(" ")} /><span className="relative flex h-full items-center justify-center text-xs font-medium text-slate-100">{Number(cell.date.slice(-2))}</span></button>; })}</div></div> : <div className="mt-5 h-[320px]" />}
          </section>

          <section className="glass-surface rounded-[32px] p-5">
            <div className="text-sm font-semibold">{text.recent}</div>
            <div className="mt-4 space-y-3">{historyLog.length ? historyLog.slice(0, 8).map((record) => <button key={record.date} type="button" onClick={() => setSelectedDate(record.date)} className="w-full rounded-3xl bg-white/6 px-4 py-4 text-left transition hover:bg-white/10"><div className="flex items-center justify-between gap-3"><div className="text-sm font-semibold">{record.date}</div><div className="text-xs text-slate-400">+{record.totalPoints} / -{record.spentPoints ?? 0}</div></div><div className="mt-2 text-xs text-slate-500">{record.completedTasks.length} tasks</div></button>) : <div className="rounded-3xl bg-white/6 px-4 py-6 text-sm text-slate-400">{text.noHistory}</div>}</div>
          </section>
        </div>

        <section className="glass-surface mt-4 rounded-[32px] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="text-lg font-semibold">{selectedDate || today || "--"}</div><div className="flex flex-wrap gap-2 text-xs text-slate-300"><span className="rounded-full bg-white/8 px-3 py-2">{text.points}: {selectedRecord?.totalPoints ?? 0}</span><span className="rounded-full bg-white/8 px-3 py-2">{text.spent}: {selectedRecord?.spentPoints ?? 0}</span>{selectedSummary ? <span className="rounded-full bg-white/8 px-3 py-2">{text.mood}: {selectedSummary.mood}/5</span> : null}</div></div>
          {selectedRecord ? <div className="mt-5 grid gap-4 lg:grid-cols-2"><div className="rounded-[28px] bg-white/6 p-4"><div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{text.summary}</div><div className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{selectedSummary?.content || text.noSummary}</div></div><div className="rounded-[28px] bg-white/6 p-4"><div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{text.insight}</div><div className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{selectedRecord.insight || text.noInsight}</div></div><div className="rounded-[28px] bg-white/6 p-4"><div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{text.completed}</div><div className="mt-3 space-y-2">{selectedRecord.completedTasks.length ? selectedRecord.completedTasks.map((task) => <div key={`${task.name}-${task.completedAt ?? task.estimatedMinutes}`} className="rounded-2xl bg-white/8 px-3 py-3"><div className="flex items-center justify-between gap-3"><div className="text-sm font-medium text-white">{task.name}</div><div className="text-xs text-slate-400">+{task.rewardPoints}</div></div><div className="mt-1 text-xs text-slate-500">{task.estimatedMinutes} min</div></div>) : <div className="text-sm text-slate-400">{text.empty}</div>}</div></div><div className="rounded-[28px] bg-white/6 p-4"><div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{text.rewards}</div><div className="mt-3 space-y-2">{selectedRecord.redeemedRewards?.length ? selectedRecord.redeemedRewards.map((reward, index) => <div key={`${reward.name}-${reward.requiredPoints}-${index}`} className="rounded-2xl bg-white/8 px-3 py-3"><div className="flex items-center justify-between gap-3"><div className="text-sm font-medium text-white">{reward.name}</div><div className="text-xs text-slate-400">-{reward.requiredPoints}</div></div></div>) : <div className="text-sm text-slate-400">{text.noRewards}</div>}</div></div></div> : <div className="mt-5 rounded-[28px] bg-white/6 px-4 py-10 text-sm text-slate-400">{text.empty}</div>}
        </section>
      </div>
    </div>
  );
}
