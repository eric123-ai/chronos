"use client";

import { useState } from "react";
import { ScheduleImportPanel } from "./ScheduleImportPanel";
import type { Course } from "../types";

export function CourseImportStatus({
  locale,
  surfaceMode,
  courses,
  selectedCourses,
  teachingWeek,
  fieldClassName,
  labels,
  onImport,
  onTeachingWeekChange,
}: {
  locale: "cn" | "en";
  surfaceMode: "default" | "flat";
  courses: Course[];
  selectedCourses: Course[];
  teachingWeek: number;
  fieldClassName: string;
  labels: {
    title: string;
    description: string;
    placeholder: string;
    parse: string;
    sync: string;
    empty: string;
    parsed: string;
    modes: { file: string; image: string; text: string };
    uploadFile: string;
    uploadImage: string;
    processing: string;
    rawTextTitle: string;
    replaceHint: string;
    partialHint: string;
    imageHint: string;
    parseFailed: string;
    reset: string;
    sourceLabel: string;
    editHint: string;
    remove: string;
    teachingWeek: string;
  };
  onImport: (courses: Course[]) => void;
  onTeachingWeekChange: (week: number) => void;
}) {
  const [expanded, setExpanded] = useState(courses.length === 0);
  const isCn = locale === "cn";

  return (
    <section className="glass-surface rounded-[32px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--vf-text)]">
            {isCn ? "课表与固定安排" : "Classes and fixed blocks"}
          </div>
          <div className="mt-1 text-sm text-[var(--vf-text-muted)]">
            {courses.length
              ? (isCn ? "课表已导入，系统会自动避开这些时间。" : "Schedule imported. Chronos avoids these blocks automatically.")
              : (isCn ? "先把课表导进来，今天的任务安排才会更准。" : "Import your schedule first for better task placement.")}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium"
        >
          {expanded ? (isCn ? "收起" : "Hide") : (isCn ? "展开导入" : "Open import")}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs text-[var(--vf-text-muted)]">{labels.teachingWeek}</span>
        <input
          type="number"
          min="1"
          value={teachingWeek}
          onChange={(event) => onTeachingWeekChange(Math.max(1, Number(event.target.value) || 1))}
          className={`${fieldClassName} h-10 w-24 font-precision`}
        />
      </div>

      {expanded ? (
        <div className="mt-4">
          <ScheduleImportPanel
            surfaceMode={surfaceMode}
            onImport={(nextCourses) => {
              onImport(nextCourses);
              setExpanded(false);
            }}
            labels={labels}
          />
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {selectedCourses.length ? selectedCourses.map((course, index) => (
          <div key={`${course.name}-${course.startTime}-${index}`} className="rounded-2xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-3">
            <div className="text-sm font-medium text-[var(--vf-text)]">{course.name}</div>
            <div className="mt-1 text-xs text-[var(--vf-text-muted)]">
              {course.startTime} - {course.endTime}{course.location ? ` · ${course.location}` : ""}
            </div>
          </div>
        )) : (
          <div className="text-sm text-[var(--vf-text-muted)]">
            {isCn ? "本周还没有课程区块。" : "No class blocks for this week."}
          </div>
        )}
      </div>
    </section>
  );
}
