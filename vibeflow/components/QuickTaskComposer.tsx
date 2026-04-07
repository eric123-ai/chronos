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
    <section className="glass-surface rounded-[32px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--vf-text)]">
            {isCn ? "快速添加（自然语言）" : "Quick add (NL)"}
          </div>
          <div className="mt-1 text-sm text-[var(--vf-text-muted)]">
            {isCn ? "默认只填最必要的信息，系统会自动避开上课时间。" : "Only fill the essentials. Chronos will avoid class blocks by default."}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((current) => !current)}
          className={secondaryButtonClassName}
        >
          {advancedOpen ? (isCn ? "收起高级项" : "Hide advanced") : (isCn ? "更多设置" : "More")}
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <input
          value={draft.name}
          onChange={(event) => onDraftChange({ name: event.target.value })}
          placeholder={isCn ? "示例：明早9点 每周一三 30min 复习英语 提前10分钟 提醒 #study" : "e.g. 9am tmr MO,WE 30m review remind 10m #study"}
          aria-describedby="quick-add-hint"
          className={fieldClassName}
        />
        {(() => {
          const text = draft.name || "";
          const minutes = (() => { const m = text.match(/(\d+)\s*(?:m|min|分钟)/i); return m ? Math.max(5, parseInt(m[1]!, 10)) : null; })();
          const time = (() => { const t = text.match(/@?(\d{1,2}:\d{2})/); return t ? t[1] : null; })();
          const ddl = (() => { const d = text.match(/ddl\s*(\d{4}-\d{2}-\d{2})/i); return d ? d[1] : null; })();
          const energy = (() => { const e = text.match(/energy:(low|medium|high)/i); return e ? e[1]!.toLowerCase() : null; })();
          const mandatory = /!mandatory/i.test(text);
          const hard = /!hard/i.test(text);
          const category = (() => { const c = text.match(/#([a-z_]+)/i); return c ? c[1] : null; })();
          const hasAny = minutes || time || ddl || energy || mandatory || hard || category;
          if (!hasAny) return (
            <div id="quick-add-hint" className="text-xs text-[var(--vf-text-soft)]">
              {isCn
                ? "可输入：25min（时长） / 16:00 或 @16:00（时间） / ddl YYYY-MM-DD（截止） / 每周一三（重复） / 提前10分钟（提醒） / #study（标签）"
                : "You can type: 25m (duration) / 16:00 or @16:00 (time) / ddl YYYY-MM-DD (deadline) / MO,WE (repeat) / remind 10m (reminder) / #study (tag)"}
            </div>
          );
          return (
            <div className="grid gap-2">
              <div className="text-[10px] text-[var(--vf-text-soft)]">
                {isCn ? "已识别字段：" : "Recognized:"}
                {time ? (isCn ? ` 时间 ${time}（固定时间）` : ` time ${time}`) : ""}
                {minutes ? (isCn ? ` · 时长 ${minutes}min` : ` · duration ${minutes}m`) : ""}
                {ddl ? (isCn ? ` · 截止 ${ddl}` : ` · deadline ${ddl}`) : ""}
                {category ? (isCn ? ` · 标签 #${category}` : ` · tag #${category}`) : ""}
                {energy ? (isCn ? ` · 能量 ${energy}` : ` · energy ${energy}`) : ""}
                {mandatory ? (isCn ? " · 固定安排" : " · fixed") : ""}
                {hard ? (isCn ? " · 强占" : " · hard block") : ""}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {minutes ? <span className="rounded-full bg-[rgba(45,35,25,0.06)] px-2 py-1 text-[var(--vf-text-muted)]">{minutes} min</span> : null}
                {time ? <span className="rounded-full bg-[rgba(45,35,25,0.06)] px-2 py-1 text-[var(--vf-text-muted)]">@{time}</span> : null}
                {ddl ? <span className="rounded-full bg-[rgba(45,35,25,0.06)] px-2 py-1 text-[var(--vf-text-muted)]">DDL {ddl}</span> : null}
                {energy ? <span className="rounded-full bg-[rgba(45,35,25,0.06)] px-2 py-1 text-[var(--vf-text-muted)]">{isCn ? "能量" : "Energy"}:{energy}</span> : null}
                {category ? <span className="rounded-full bg-[rgba(45,35,25,0.06)] px-2 py-1 text-[var(--vf-text-muted)]">#{category}</span> : null}
                {mandatory ? <span className="rounded-full bg-[rgba(191,122,34,0.1)] px-2 py-1 text-[#9a5f13]">{isCn ? "固定安排" : "Mandatory"}</span> : null}
                {hard ? <span className="rounded-full bg-rose-500/10 px-2 py-1 text-rose-600">{isCn ? "强占" : "Hard"}</span> : null}
              </div>
            </div>
          );
        })()}
        <div className="text-xs text-[var(--vf-text-soft)]">
          {isCn
            ? "用途：一句话创建任务。示例：明早9点 / 19:30 / 每周一三 / 每月最后一天 / ddl 2026-04-10 / 提前10分钟 / #study / energy:low"
            : "Purpose: one‑sentence task creation. Examples: 9am tmr / 19:30 / MO,WE / last day monthly / ddl 2026-04-10 / remind 10m / #study / energy:low"}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => onDraftChange({ name: `${draft.name ? draft.name + " " : ""}25min` })} className="chronos-button-secondary rounded-full px-3 py-2 text-xs font-medium">25min</button>
          <button type="button" onClick={() => onDraftChange({ name: `${draft.name ? draft.name + " " : ""}@16:00` })} className="chronos-button-secondary rounded-full px-3 py-2 text-xs font-medium">@16:00</button>
          <button type="button" onClick={() => {
            const tomorrow = new Date(Date.now() + 86400000);
            const yyyy = tomorrow.getFullYear();
            const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
            const dd = String(tomorrow.getDate()).padStart(2, "0");
            onDraftChange({ name: `${draft.name ? draft.name + " " : ""}ddl ${yyyy}-${mm}-${dd}` });
          }} className="chronos-button-secondary rounded-full px-3 py-2 text-xs font-medium">{isCn ? "ddl 明天" : "ddl Tomorrow"}</button>
          <button type="button" onClick={() => onDraftChange({ name: `${draft.name ? draft.name + " " : ""}#study` })} className="chronos-button-secondary rounded-full px-3 py-2 text-xs font-medium">#study</button>
          <button type="button" onClick={() => onDraftChange({ name: `${draft.name ? draft.name + " " : ""}energy:low` })} className="chronos-button-secondary rounded-full px-3 py-2 text-xs font-medium">energy:low</button>
          <button type="button" onClick={() => onDraftChange({ name: `${draft.name ? draft.name + " " : ""}!mandatory` })} className="chronos-button-secondary rounded-full px-3 py-2 text-xs font-medium">!mandatory</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
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
          placeholder={isCn ? "紧急度（0-1，越高越急）" : "Urgency 0-1 (higher = more urgent)"}
          className={`${fieldClassName} font-precision`}
        />

        {advancedOpen ? (
          <div className="grid gap-3 rounded-[24px] border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] p-4">
            <div className="grid grid-cols-2 gap-2">
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
                title={isCn ? "体力消耗：低=整理/复盘；中=常规学习；高=攻坚/竞赛" : "Energy: low=review/tidy, medium=normal study, high=deep/competitive"}
              >
                {energyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
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

            <div className="flex flex-wrap gap-3 text-sm text-[var(--vf-text-muted)]">
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
