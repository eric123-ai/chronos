"use client";

import { useState } from "react";
import type { TaskCategory } from "../types";

type TaskDraft = {
  name: string;
  estimatedMinutes: string;
  urgency: string;
  energyCost: "low" | "medium" | "high";
  category: TaskCategory;
  goalId: string;
  exactTime: string;
  deadline: string;
  plannedDate?: string;
  isMandatory: boolean;
  hardBoundary: boolean;
};

type Option<T extends string> = {
  value: T;
  label: string;
};

export function QuickTaskComposer({
  locale,
  draft,
  fieldClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  goalOptions,
  categoryOptions,
  energyOptions,
  onDraftChange,
  onSubmit,
}: {
  locale: "cn" | "en";
  draft: TaskDraft;
  fieldClassName: string;
  primaryButtonClassName: string;
  secondaryButtonClassName: string;
  goalOptions: Array<Option<string>>;
  categoryOptions: Array<Option<TaskCategory>>;
  energyOptions: Array<Option<TaskDraft["energyCost"]>>;
  onDraftChange: (patch: Partial<TaskDraft>) => void;
  onSubmit: () => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const isCn = locale === "cn";

  return (
    <section className="glass-surface rounded-[28px] p-4 sm:rounded-[32px] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--vf-text)]">
            {isCn ? "快速加任务" : "Quick add"}
          </div>
          <div className="mt-1 text-sm text-[var(--vf-text-muted)]">
            {isCn ? "默认只填最必要的信息，系统会自动避开上课时间。" : "Only fill the essentials. Chronos will avoid class blocks by default."}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((current) => !current)}
          className={`${secondaryButtonClassName} px-3 py-2 text-xs sm:text-sm`}
        >
          {advancedOpen ? (isCn ? "收起" : "Hide") : (isCn ? "更多" : "More")}
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <input
          value={draft.name}
          onChange={(event) => onDraftChange({ name: event.target.value })}
          placeholder={isCn ? "比如：写实验报告" : "For example: write lab report"}
          className={fieldClassName}
        />

        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={draft.estimatedMinutes}
            onChange={(event) => onDraftChange({ estimatedMinutes: event.target.value })}
            placeholder={isCn ? "预计时长（分钟）" : "Minutes"}
            className={`${fieldClassName} font-precision`}
          />
          <input
            value={draft.deadline}
            type="date"
            onChange={(event) => onDraftChange({ deadline: event.target.value })}
            className={`${fieldClassName} font-precision`}
          />
        </div>

        <input
          value={draft.urgency}
          onChange={(event) => onDraftChange({ urgency: event.target.value })}
          placeholder={isCn ? "紧急度 0-1" : "Urgency 0-1"}
          className={`${fieldClassName} font-precision`}
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => onDraftChange({ estimatedMinutes: "25" })} className={`${secondaryButtonClassName} px-3 py-2 text-xs`}>
            25min
          </button>
          <button type="button" onClick={() => onDraftChange({ estimatedMinutes: "45" })} className={`${secondaryButtonClassName} px-3 py-2 text-xs`}>
            45min
          </button>
          <button type="button" onClick={() => onDraftChange({ category: "study" })} className={`${secondaryButtonClassName} col-span-2 px-3 py-2 text-xs sm:col-span-1`}>
            {isCn ? "学习任务" : "Study"}
          </button>
        </div>

        {advancedOpen ? (
          <div className="grid gap-3 rounded-[24px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={draft.category}
                onChange={(event) => onDraftChange({ category: event.target.value as TaskCategory })}
                className={fieldClassName}
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={draft.energyCost}
                onChange={(event) => onDraftChange({ energyCost: event.target.value as TaskDraft["energyCost"] })}
                className={fieldClassName}
              >
                {energyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={draft.exactTime}
                onChange={(event) => onDraftChange({ exactTime: event.target.value })}
                placeholder={isCn ? "固定时间 16:00" : "Fixed time 16:00"}
                className={`${fieldClassName} font-precision`}
              />
              <select
                value={draft.goalId}
                onChange={(event) => onDraftChange({ goalId: event.target.value })}
                className={fieldClassName}
              >
                {goalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2 text-sm text-[var(--vf-text-muted)] sm:flex-row sm:flex-wrap">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.isMandatory}
                  onChange={(event) => onDraftChange({ isMandatory: event.target.checked })}
                />
                {isCn ? "固定安排" : "Fixed slot"}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.hardBoundary}
                  onChange={(event) => onDraftChange({ hardBoundary: event.target.checked })}
                />
                {isCn ? "强占时间" : "Hard block"}
              </label>
            </div>
          </div>
        ) : null}

        <button type="button" onClick={onSubmit} className={primaryButtonClassName}>
          {isCn ? "添加到今天" : "Add to today"}
        </button>
      </div>
    </section>
  );
}
