"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { useI18n } from "../../components/I18nProvider";
import { formatLocalDate, loadHistory, loadSummaries } from "../../lib/historyStorage";
import { generateIcsForHistory } from "../../lib/ics";

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
  if (count >= 5) return "bg-amber-400";
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
  const session = useSession();
  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [historyLog, setHistoryLog] = useState<ReturnType<typeof loadHistory>>([]);
  const [summaries, setSummaries] = useState<ReturnType<typeof loadSummaries>>([]);
  const [serverDay, setServerDay] = useState<{ insight?: string; summary?: string } | null>(null);
  const [pieDim, setPieDim] = useState<"category" | "energy" | "goal">("category");

  useEffect(() => {
    const currentDate = formatLocalDate(new Date());
    setToday(currentDate);
    setSelectedDate(currentDate);
    setHistoryLog(loadHistory());
    setSummaries(loadSummaries());
    setHydrated(true);
  }, []);

  // Try fetch from server when logged in (fallback to local)
  useEffect(() => {
    if (session.status !== "authenticated") return;
    (async () => {
      try {
        const base = new Date(selectedDate || today || formatLocalDate(new Date()));
        const from = new Date(base.getFullYear(), base.getMonth(), 1);
        const to = new Date(base.getFullYear(), base.getMonth() + 1, 0);
        const mk = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const res = await fetch(`/api/history?from=${mk(from)}&to=${mk(to)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data?.items)) {
          // merge-down: server wins for same date
          const server = data.items as Array<{ date: string; totalPoints?: number; spentPoints?: number; insight?: string }>;
          const map = new Map(historyLog.map((x) => [x.date, x]));
          server.forEach((row) => {
            const local = map.get(row.date);
            map.set(row.date, {
              date: row.date,
              completedTasks: local?.completedTasks ?? [],
              totalPoints: row.totalPoints ?? local?.totalPoints ?? 0,
              dailyVibe: local?.dailyVibe ?? "",
              insight: row.insight ?? local?.insight ?? "",
              spentPoints: row.spentPoints ?? local?.spentPoints ?? 0,
              redeemedRewards: local?.redeemedRewards ?? [],
              settledAt: local?.settledAt ?? undefined,
            });
          });
          setHistoryLog(Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date)));
        }
      } catch {
        // ignore
      }
    })();
  }, [session.status, selectedDate, today]);

  // Fetch single-day details when date changes (server has priority)
  useEffect(() => {
    if (session.status !== "authenticated" || !selectedDate) return;
    (async () => {
      try {
        const res = await fetch(`/api/history/${selectedDate}`);
        if (!res.ok) return;
        const data = await res.json();
        setServerDay({
          insight: data?.history?.insight ?? undefined,
          summary: data?.summary?.content ?? undefined,
        });
      } catch {
        // ignore
      }
    })();
  }, [session.status, selectedDate]);

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
    <div className="panel-profile min-h-screen w-full text-[var(--vf-text)]">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="glass-surface rounded-[32px] px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium text-amber-200">/history</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{text.title}</h1>
              <p className="mt-2 max-w-3xl text-sm text-[var(--vf-text-muted)]">{text.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LanguageSwitcher />
              <Link href="/" className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-amber-400">{text.back}</Link>
            </div>
          </div>
        </header>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="glass-surface rounded-[32px] p-5">
            <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">{text.heatmap}</div><div className="mt-1 text-sm text-[var(--vf-text-muted)]">{monthLabel}</div></div><div className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-2 text-xs text-[var(--vf-text-muted)]">{text.selected}: {selectedDate || "--"}</div></div>
            {hydrated ? <div className="mt-5">
              <div className="mb-2 grid grid-cols-7 gap-2">{text.weekdays.map((label) => <div key={label} className="text-center text-[11px] text-[var(--vf-text-soft)]">{label}</div>)}</div>
              <div className="grid grid-cols-7 gap-2">
                {calendar.map((cell) => {
                  const count = counts.get(cell.date) ?? 0;
                  const active = cell.date === selectedDate;
                  const color = count >= 5 ? "#f59e0b" : count >= 3 ? "#06b6d4" : count >= 1 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.14)";
                  const ring = active ? "ring-2 ring-amber-400" : "ring-1 ring-[rgba(45,35,25,0.08)]";
                  return (
                    <button key={cell.date} type="button" onClick={() => setSelectedDate(cell.date)} className={["relative h-12 rounded-2xl transition", ring, cell.inMonth ? "" : "opacity-45"].join(" ")}>
                      <span className="absolute inset-1 rounded-[14px]" style={{ background: color }} />
                      <span className="relative flex h-full items-center justify-center text-xs font-medium text-[var(--vf-text)]">{Number(cell.date.slice(-2))}</span>
                    </button>
                  );
                })}
              </div>
            </div> : <div className="mt-5 h-[320px]" />}
          </section>

          <section className="glass-surface rounded-[32px] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">{text.recent}</div>
              <div className="flex items-center gap-2">
                {/* 饼图维度切换 */}
                <div className="flex items-center gap-1 rounded-full bg-[rgba(45,35,25,0.06)] p-1 text-xs text-[var(--vf-text-muted)]">
                  {["category","energy","goal"].map((dim) => (
                    <button
                      key={dim}
                      type="button"
                      onClick={() => setPieDim(dim as typeof pieDim)}
                      className={["rounded-full px-2 py-1", pieDim === dim ? "bg-amber-500 text-slate-950" : ""].join(" ")}
                    >
                      {dim === "category" ? (locale === "cn" ? "类别" : "Category") : dim === "energy" ? (locale === "cn" ? "能量" : "Energy") : (locale === "cn" ? "目标" : "Goal")}
                    </button>
                  ))}
                </div>
                {/* 周/整月导出 */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const base = parseLocalDate(selectedDate || today || formatLocalDate(new Date()));
                      const monthStart = new Date(base.getFullYear(), base.getMonth(), 1);
                      const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0);
                      const days = historyLog
                        .filter((r) => {
                          const d = parseLocalDate(r.date);
                          return d >= monthStart && d <= monthEnd;
                        })
                        .map((r) => ({ date: r.date, tasks: r.completedTasks }));
                      const ics = generateIcsForHistory(days);
                      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      const label = `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2, "0")}`;
                      a.download = `Chronos-${label}.ics`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch {}
                  }}
                  className="chronos-button-secondary rounded-full px-3 py-2 text-xs font-medium"
                >
                  {locale === "cn" ? "导出本月 .ics" : "Export month .ics"}
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-4">
              {/* 饼图：按类别统计 selectedRecord 的完成任务 */}
              {selectedRecord ? (
                <>
                  {/* 为避免引入重型图表库，使用自定义 SVG PieChart */}
                  {/* @ts-ignore - dynamic import not required here */}
                  <div className="shrink-0">
                    {/* 轻量组装分布数据 */}
                    {(() => {
                      // aggregate by selected dimension
                      type Row = { label: string; value: number };
                      const rows: Row[] = [];
                      if (pieDim === "category") {
                        const map = new Map<string, number>();
                        selectedRecord.completedTasks.forEach((t) => {
                          const key = String(t.category || "other");
                          map.set(key, (map.get(key) || 0) + 1);
                        });
                        Array.from(map.entries()).forEach(([label, value]) => rows.push({ label, value }));
                      } else if (pieDim === "energy") {
                        const map = new Map<string, number>();
                        selectedRecord.completedTasks.forEach((t) => {
                          const key = String(t.energyCost || "medium");
                          map.set(key, (map.get(key) || 0) + 1);
                        });
                        Array.from(map.entries()).forEach(([label, value]) => rows.push({ label, value }));
                      } else {
                        const map = new Map<string, number>();
                        selectedRecord.completedTasks.forEach((t) => {
                          const key = String(t.goalId || "unassigned");
                          map.set(key, (map.get(key) || 0) + 1);
                        });
                        Array.from(map.entries()).forEach(([label, value]) => rows.push({ label, value }));
                      }
                      const palette: Record<string, string> = {
                        deep_work: "#f59e0b",
                        competition: "#06b6d4",
                        study: "#22c55e",
                        life: "#a78bfa",
                        personal: "#f472b6",
                        habit: "#fb7185",
                        other: "#94a3b8",
                        low: "#60a5fa",
                        medium: "#fbbf24",
                        high: "#ef4444",
                        unassigned: "#94a3b8",
                      };
                      const segments = rows.map(({ label, value }) => ({ label, value, color: palette[label] || "#94a3b8" }));
                      const total = segments.reduce((s, x) => s + x.value, 0);
                      return total ? (
                        // inline pie chart without importing component to keep single-file
                        <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
                          <circle cx="60" cy="60" r="49" fill="transparent" stroke="rgba(0,0,0,0.08)" strokeWidth="22" />
                          {(() => {
                            let acc = 0;
                            const r = 49;
                            const center = 60;
                            return (
                              <g transform={`rotate(-90 ${center} ${center})`}>
                                {segments.map((seg, idx) => {
                                  const pct = (seg.value / total) * 100;
                                  const el = (
                                    <circle key={`${seg.label}-${idx}`} cx={center} cy={center} r={r} fill="transparent" stroke={seg.color} strokeWidth={22} strokeLinecap="butt" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={100 - acc} />
                                  );
                                  acc += pct;
                                  return el;
                                })}
                              </g>
                            );
                          })()}
                        </svg>
                      ) : (
                        <div className="text-xs text-[var(--vf-text-muted)]">{locale === "cn" ? "暂无完成数据" : "No data"}</div>
                      );
                    })()}
                  </div>
                  <div className="grid gap-2 text-sm">
                    {(() => {
                      type Row = { label: string; value: number };
                      let rows: Row[] = [];
                      if (pieDim === "category") {
                        const map = new Map<string, number>();
                        selectedRecord.completedTasks.forEach((t) => {
                          const key = String(t.category || "other");
                          map.set(key, (map.get(key) || 0) + 1);
                        });
                        rows = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
                      } else if (pieDim === "energy") {
                        const map = new Map<string, number>();
                        selectedRecord.completedTasks.forEach((t) => {
                          const key = String(t.energyCost || "medium");
                          map.set(key, (map.get(key) || 0) + 1);
                        });
                        rows = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
                      } else {
                        const map = new Map<string, number>();
                        selectedRecord.completedTasks.forEach((t) => {
                          const key = String(t.goalId || "unassigned");
                          map.set(key, (map.get(key) || 0) + 1);
                        });
                        rows = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
                      }
                      rows.sort((a,b)=>b.value-a.value);
                      if (!rows.length) return <div className="text-xs text-[var(--vf-text-muted)]">{locale === "cn" ? "暂无完成数据" : "No data"}</div>;
                      const palette: Record<string, string> = { deep_work: "#f59e0b", competition: "#06b6d4", study: "#22c55e", life: "#a78bfa", personal: "#f472b6", habit: "#fb7185", other: "#94a3b8", low: "#60a5fa", medium: "#fbbf24", high: "#ef4444", unassigned: "#94a3b8" };
                      return rows.map(({label, value}) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: palette[label] || "#94a3b8" }} />
                          <span>{label}</span>
                          <span className="font-precision text-[11px] text-[var(--vf-text-soft)]">{value}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </>
              ) : (
                <div className="text-xs text-[var(--vf-text-muted)]">暂无完成数据</div>
              )}
            </div>

            <div className="mt-4 space-y-3">
  {historyLog.length ? historyLog.slice(0, 8).map((record) => (
    <button
      key={record.date}
      type="button"
      onClick={() => setSelectedDate(record.date)}
      className="w-full rounded-3xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-4 text-left transition hover:bg-[rgba(247,241,232,0.96)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[var(--vf-text)]">{record.date}</div>
        <div className="text-xs text-[var(--vf-text-muted)]">+{record.totalPoints} / -{record.spentPoints ?? 0}</div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-[var(--vf-text-soft)]">
        <span className="rounded-full bg-[rgba(45,35,25,0.06)] px-2 py-1 text-center">{locale === "cn" ? "完成" : "Done"}: {record.completedTasks.length}</span>
        <span className="rounded-full bg-[rgba(45,35,25,0.06)] px-2 py-1 text-center">{locale === "cn" ? "XP" : "XP"}: {record.totalPoints}</span>
        <span className="rounded-full bg-[rgba(45,35,25,0.06)] px-2 py-1 text-center">{locale === "cn" ? "用时估算" : "Est."}: {record.completedTasks.reduce((m, t) => m + (t.estimatedMinutes || 0), 0)}m</span>
      </div>
    </button>
  )) : (
    <div className="rounded-3xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-6 text-sm text-[var(--vf-text-muted)]">{text.noHistory}</div>
  )}
</div>
          </section>
        </div>

        <section className="glass-surface mt-4 rounded-[32px] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-lg font-semibold text-[var(--vf-text)]">{selectedDate || today || "--"}</div>
            <div className="flex flex-wrap gap-2 text-xs text-[var(--vf-text-muted)]">
              <span className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-2">{text.points}: {selectedRecord?.totalPoints ?? 0}</span>
              <span className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-2">{text.spent}: {selectedRecord?.spentPoints ?? 0}</span>
              {selectedSummary ? <span className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-2">{text.mood}: {selectedSummary.mood}/5</span> : null}
            </div>
          </div>

          {selectedRecord ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[28px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] p-4">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--vf-text-soft)]">{text.summary}</div>
                <div className="mt-3 whitespace-pre-wrap text-sm text-[var(--vf-text)]">{serverDay?.summary || selectedSummary?.content || text.noSummary}</div>
              </div>
              <div className="rounded-[28px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] p-4">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--vf-text-soft)]">{text.insight}</div>
                <div className="mt-3 whitespace-pre-wrap text-sm text-[var(--vf-text)]">{serverDay?.insight || selectedRecord.insight || text.noInsight}</div>
              </div>
              <div className="rounded-[28px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] p-4">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--vf-text-soft)]">{text.completed}</div>
                <div className="mt-3 space-y-2">
                  {selectedRecord.completedTasks.length ? (
                    selectedRecord.completedTasks.map((task) => (
                      <div key={`${task.name}-${task.completedAt ?? task.estimatedMinutes}`} className="rounded-2xl bg-[rgba(45,35,25,0.05)] px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-[var(--vf-text)]">{task.name}</div>
                          <div className="text-xs text-[var(--vf-text-muted)]">+{task.rewardPoints}</div>
                        </div>
                        <div className="mt-1 text-xs text-[var(--vf-text-soft)]">{task.estimatedMinutes} min</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-[var(--vf-text-muted)]">{text.empty}</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[28px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-10 text-sm text-[var(--vf-text-muted)]">{text.empty}</div>
          )}

          <div className="mt-4 rounded-[28px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] p-4">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--vf-text-soft)]">{text.rewards}</div>
            <div className="mt-3 space-y-2">
              {selectedRecord?.redeemedRewards && selectedRecord.redeemedRewards.length > 0 ? (
                selectedRecord.redeemedRewards.map((reward, index) => (
                  <div key={`${reward.name}-${reward.requiredPoints}-${index}`} className="rounded-2xl bg-[rgba(45,35,25,0.05)] px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-[var(--vf-text)]">{reward.name}</div>
                      <div className="text-xs text-[var(--vf-text-muted)]">-{reward.requiredPoints}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-[var(--vf-text-muted)]">{text.noRewards}</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
