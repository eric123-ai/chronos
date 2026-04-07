"use client";

import { Bot, CalendarPlus2, Sparkles } from "lucide-react";

type TemplateDefinition = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  items: string[];
};

type ManualTemplate = {
  id: string;
  title: string;
  items: string[];
};

type ManualTemplateDraft = {
  title: string;
  itemInput: string;
  items: string[];
  editingId?: string | null;
};

type Reward = {
  name: string;
  requiredPoints: number;
};

type FlashNote = {
  id: string;
  content: string;
  category: "robot" | "cpp" | "life";
};

export function SecondaryToolsPanel({
  locale,
  templates,
  selectedTemplateId,
  selectedTemplateName,
  manualTemplates,
  manualTemplateDraft,
  rewards,
  flashNotes,
  flashNote,
  onSelectTemplate,
  onImportTemplate,
  onManualTemplateDraftChange,
  onAddManualTemplateItem,
  onSaveManualTemplate,
  onEditManualTemplate,
  onDeleteManualTemplate,
  onImportManualTemplate,
  onSaveFlashNote,
  onFlashNoteChange,
  onEnterSoulMode,
}: {
  locale: "cn" | "en";
  templates: TemplateDefinition[];
  selectedTemplateId: string;
  selectedTemplateName: string;
  manualTemplates: ManualTemplate[];
  manualTemplateDraft: ManualTemplateDraft;
  rewards: Reward[];
  flashNotes: FlashNote[];
  flashNote: string;
  onSelectTemplate: (id: string) => void;
  onImportTemplate: (id: string) => void;
  onManualTemplateDraftChange: (patch: Partial<ManualTemplateDraft>) => void;
  onAddManualTemplateItem: () => void;
  onSaveManualTemplate: () => void;
  onEditManualTemplate: (id: string) => void;
  onDeleteManualTemplate: (id: string) => void;
  onImportManualTemplate: (id: string) => void;
  onSaveFlashNote: () => void;
  onFlashNoteChange: (value: string) => void;
  onEnterSoulMode: () => void;
}) {
  const isCn = locale === "cn";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="glass-surface rounded-[32px] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[var(--vf-text)]">
              {isCn ? "工具箱" : "Toolbox"}
            </div>
            <div className="mt-1 text-sm text-[var(--vf-text-muted)]">
              {isCn ? "把常用流程收起来，首页只留下真正需要当天决策的内容。" : "Move repeatable workflows here so the home screen can stay focused."}
            </div>
          </div>
          <div className="rounded-full border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-3 py-2 text-xs text-[var(--vf-text-muted)]">
            {templates.length}
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template.id)}
              className={[
                "rounded-[28px] border px-5 py-5 text-left transition",
                selectedTemplateId === template.id
                  ? "border-[rgba(191,122,34,0.18)] bg-[rgba(245,158,11,0.08)]"
                  : "border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)]",
              ].join(" ")}
            >
              <div className="text-xs uppercase tracking-[0.22em] text-[#9a5f13]">{template.tagline}</div>
              <div className="mt-2 text-lg font-semibold text-[var(--vf-text)]">{template.name}</div>
              <div className="mt-2 text-sm text-[var(--vf-text-muted)]">{template.description}</div>
            </button>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="glass-surface rounded-[32px] p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[rgba(191,122,34,0.16)] bg-[rgba(245,158,11,0.08)] text-[#9a5f13]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--vf-text)]">{selectedTemplateName}</div>
              <div className="mt-1 text-xs text-[var(--vf-text-muted)]">
                {isCn ? "一键加入今天" : "Inject into today"}
              </div>
            </div>
          </div>
          <button type="button" onClick={() => onImportTemplate(selectedTemplateId)} className="chronos-button-primary mt-4 w-full rounded-full px-4 py-3 text-sm font-medium text-white">
            {isCn ? "加入今日任务" : "Add to today"}
          </button>
        </section>

        <section className="glass-surface rounded-[32px] p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-[rgba(191,122,34,0.16)] bg-[rgba(245,158,11,0.08)] text-[#9a5f13]">
              <CalendarPlus2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--vf-text)]">{isCn ? "固定流程" : "Routines"}</div>
              <div className="mt-1 text-sm text-[var(--vf-text-muted)]">{isCn ? "比如通勤、社团、比赛前检查。" : "For commuting, club work, or pre-competition prep."}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <input
              value={manualTemplateDraft.title}
              onChange={(event) => onManualTemplateDraftChange({ title: event.target.value })}
              placeholder={isCn ? "流程标题" : "Routine title"}
              className="chronos-field h-11 w-full rounded-2xl px-4 text-sm text-[var(--vf-text)]"
            />
            <textarea
              rows={3}
              value={manualTemplateDraft.itemInput}
              onChange={(event) => onManualTemplateDraftChange({ itemInput: event.target.value })}
              placeholder={isCn ? "输入一个步骤" : "Add one step"}
              className="chronos-field w-full resize-none rounded-3xl px-4 py-3 text-sm text-[var(--vf-text)]"
            />
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => { onManualTemplateDraftChange({ itemInput: (manualTemplateDraft.itemInput ? manualTemplateDraft.itemInput + "\n" : "") + "25min 专注" }); onAddManualTemplateItem(); }} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium">{isCn ? "+ 专注 25min" : "+ Focus 25m"}</button>
              <button type="button" onClick={() => { onManualTemplateDraftChange({ itemInput: (manualTemplateDraft.itemInput ? manualTemplateDraft.itemInput + "\n" : "") + "10min 休息" }); onAddManualTemplateItem(); }} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium">{isCn ? "+ 休息 10min" : "+ Break 10m"}</button>
              <button type="button" onClick={() => { onManualTemplateDraftChange({ itemInput: (manualTemplateDraft.itemInput ? manualTemplateDraft.itemInput + "\n" : "") + "房间整理" }); onAddManualTemplateItem(); }} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium">{isCn ? "+ 房间整理" : "+ Tidy room"}</button>
            </div>
            <button type="button" onClick={onAddManualTemplateItem} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium">
              {isCn ? "添加条目" : "Add item"}
            </button>
            <button type="button" onClick={onSaveManualTemplate} className="chronos-button-primary rounded-full px-4 py-3 text-sm font-medium text-white">
              {manualTemplateDraft.editingId ? (isCn ? "更新流程" : "Update routine") : (isCn ? "保存流程" : "Save routine")}
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {manualTemplates.length ? manualTemplates.map((template) => (
              <div key={template.id} className="rounded-2xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-4">
                <div className="text-sm font-medium text-[var(--vf-text)]">{template.title}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {template.items.map((item) => (
                    <span key={item} className="rounded-full bg-[rgba(45,35,25,0.06)] px-3 py-1 text-xs text-[var(--vf-text-muted)]">{item}</span>
                  ))}
                </div>
                <div className="mt-4 grid gap-2">
                  <button type="button" onClick={() => onImportManualTemplate(template.id)} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium">
                    {isCn ? "加到今天" : "Add to today"}
                  </button>
                  <button type="button" onClick={() => onEditManualTemplate(template.id)} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium">
                    {isCn ? "编辑" : "Edit"}
                  </button>
                  <button type="button" onClick={() => onDeleteManualTemplate(template.id)} className="rounded-full bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-500">
                    {isCn ? "删除" : "Delete"}
                  </button>
                </div>
              </div>
            )) : null}
          </div>
        </section>

        <section className="glass-surface rounded-[32px] p-5">
          <div className="text-sm font-semibold text-[var(--vf-text)]">{isCn ? "奖励与闪念" : "Rewards and notes"}</div>
          <div className="mt-4 space-y-2">
            {rewards.length ? rewards.map((reward, index) => (
              <div key={`${reward.name}-${index}`} className="rounded-2xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-3 text-sm text-[var(--vf-text)]">
                {reward.name} · {reward.requiredPoints} pts
              </div>
            )) : (
              <div className="text-sm text-[var(--vf-text-muted)]">{isCn ? "还没有奖励。" : "No rewards yet."}</div>
            )}
          </div>

          <textarea
            rows={4}
            value={flashNote}
            onChange={(event) => onFlashNoteChange(event.target.value)}
            placeholder={isCn ? "记录一个想法、灵感或提醒" : "Capture one idea, note, or reminder"}
            className="chronos-field mt-4 w-full resize-none rounded-3xl px-4 py-3 text-sm text-[var(--vf-text)]"
          />
          <button type="button" onClick={onSaveFlashNote} className="chronos-button-secondary mt-3 rounded-full px-4 py-2 text-sm font-medium">
            {isCn ? "保存闪念" : "Save note"}
          </button>
          <div className="mt-4 space-y-2">
            {flashNotes.length ? flashNotes.slice(0, 4).map((note) => (
              <div key={note.id} className="rounded-2xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-3">
                <div className="text-xs text-[var(--vf-text-soft)]">{note.category}</div>
                <div className="mt-1 text-sm text-[var(--vf-text)]">{note.content}</div>
              </div>
            )) : null}
          </div>
        </section>

        <section className="glass-surface rounded-[32px] p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-[rgba(191,122,34,0.16)] bg-[rgba(245,158,11,0.08)] text-[#9a5f13]">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--vf-text)]">{isCn ? "灵魂模式" : "Soul mode"}</div>
              <div className="mt-1 text-sm text-[var(--vf-text-muted)]">
                {isCn ? "不再常驻首页，只在你主动需要减压时开启。" : "No longer pinned to the home screen. Open it only when you need a softer mode."}
              </div>
            </div>
          </div>
          <button type="button" onClick={onEnterSoulMode} className="chronos-button-secondary mt-4 rounded-full px-4 py-2 text-sm font-medium">
            {isCn ? "进入灵魂模式" : "Enter soul mode"}
          </button>
        </section>
      </aside>
    </div>
  );
}
