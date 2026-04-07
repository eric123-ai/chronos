"use client";

import { useMemo, useRef, useState } from "react";
import type { Course, PlannerTask } from "../types";
import { courseMatchesTeachingWeek } from "../lib/parseSchedule";

export default function WeekCalendarView({
  locale,
  selectedDate,
  courses,
  tasks,
  teachingWeek,
  onMoveTask,
  onCreateQuick,
}: {
  locale: "cn" | "en";
  selectedDate: string;
  courses: Course[];
  tasks: PlannerTask[];
  teachingWeek: number;
  onMoveTask?: (id: string, toDate: string) => void;
  onCreateQuick?: (date: string) => void;
}) {
  const isCn = locale === "cn";

  const weekDays = useMemo(() => {
    const base = new Date(selectedDate + "T00:00:00");
    const js = base.getDay() || 7;
    const monday = new Date(base);
    monday.setDate(base.getDate() - (js - 1));
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    return days;
  }, [selectedDate]);

  const grouped = useMemo(() => {
    const map: Record<string, { courses: Course[]; tasks: PlannerTask[] }> = {};
    for (const d of weekDays) map[d] = { courses: [], tasks: [] };
    // courses: place by weekday number (1=Mon..7=Sun)
    courses
      .filter((c) => courseMatchesTeachingWeek(c, teachingWeek))
      .forEach((c) => {
        const index = Math.min(6, Math.max(0, (Number(c.weekday) || 1) - 1));
        const dayKey = weekDays[index];
        map[dayKey].courses.push(c);
      });
    // tasks: by plannedDate within the week
    tasks
      .filter((t) => !t.deleted && t.plannedDate && weekDays.includes(t.plannedDate))
      .forEach((t) => { map[t.plannedDate!].tasks.push(t); });
    return map;
  }, [courses, tasks, teachingWeek, weekDays]);

  return (
    <section className="grid gap-2">
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs text-[var(--vf-text-soft)]">{d.slice(5)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2" data-week-grid>
        {weekDays.map((d) => (
          <div
            key={d}
            className="rounded-[24px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] p-2"
            onClick={(e) => {
              const isClickableChild = (e.target as HTMLElement).closest('[draggable],button,input,textarea');
              if (!isClickableChild) onCreateQuick?.(d);
            }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => {
              try {
                const text = e.dataTransfer.getData("text/plain");
                const payload = JSON.parse(text);
                if (payload && payload.id) onMoveTask?.(payload.id, d);
              } catch {}
            }}
          >
            <div className="space-y-1">
              {grouped[d].courses.slice(0, 6).map((c, idx) => (
                <div key={`c-${idx}`} className="rounded-xl bg-amber-500/10 px-2 py-1 text-xs text-[#9a5f13] truncate">{c.name}</div>
              ))}
              {grouped[d].tasks.slice(0, 6).map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", JSON.stringify({ id: t.id }));
                  }}
                  className="cursor-move rounded-xl bg-[rgba(45,35,25,0.06)] px-2 py-1 text-xs text-[var(--vf-text)] truncate"
                  title={t.name}
                >
                  {t.name} · {t.estimatedMinutes}m
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
