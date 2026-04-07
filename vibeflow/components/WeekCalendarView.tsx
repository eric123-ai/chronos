"use client";

import { useMemo } from "react";
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
    return Array.from({ length: 7 }, (_, index) => {
      const current = new Date(monday);
      current.setDate(monday.getDate() + index);
      return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
    });
  }, [selectedDate]);

  const grouped = useMemo(() => {
    const map: Record<string, { courses: Course[]; tasks: PlannerTask[] }> = {};
    for (const date of weekDays) map[date] = { courses: [], tasks: [] };

    courses
      .filter((course) => courseMatchesTeachingWeek(course, teachingWeek))
      .forEach((course) => {
        const index = Math.min(6, Math.max(0, (Number(course.weekday) || 1) - 1));
        const dayKey = weekDays[index];
        map[dayKey].courses.push(course);
      });

    tasks
      .filter((task) => !task.deleted && task.plannedDate && weekDays.includes(task.plannedDate))
      .forEach((task) => {
        map[task.plannedDate!].tasks.push(task);
      });

    return map;
  }, [courses, tasks, teachingWeek, weekDays]);

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[var(--vf-text)]">
          {isCn ? "周视图" : "Week view"}
        </div>
        <div className="text-xs text-[var(--vf-text-soft)]">
          {isCn ? "手机上支持横向滚动查看整周。" : "Scroll horizontally on mobile."}
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((date) => (
              <div key={date} className="text-center text-xs text-[var(--vf-text-soft)]">
                {date.slice(5)}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2" data-week-grid>
            {weekDays.map((date) => (
              <div
                key={date}
                className="min-h-[180px] rounded-[20px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] p-2"
                onClick={(event) => {
                  const interactive = (event.target as HTMLElement).closest("[draggable],button,input,textarea");
                  if (!interactive) onCreateQuick?.(date);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  try {
                    const payload = JSON.parse(event.dataTransfer.getData("text/plain"));
                    if (payload?.id) onMoveTask?.(payload.id, date);
                  } catch {
                    // ignore malformed drops
                  }
                }}
              >
                <div className="space-y-1">
                  {grouped[date].courses.slice(0, 6).map((course, index) => (
                    <div key={`course-${index}`} className="truncate rounded-xl bg-[rgba(191,122,34,0.1)] px-2 py-1 text-xs text-[#9a5f13]">
                      {course.name}
                    </div>
                  ))}

                  {grouped[date].tasks.slice(0, 6).map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", JSON.stringify({ id: task.id }));
                      }}
                      className="truncate rounded-xl bg-[rgba(45,35,25,0.06)] px-2 py-1 text-xs text-[var(--vf-text)]"
                      title={task.name}
                    >
                      {task.name} · {task.estimatedMinutes}m
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
