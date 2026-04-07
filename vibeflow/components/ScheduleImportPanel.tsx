"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarSync, FileImage, FileSpreadsheet, MapPin, ScanSearch, Sparkles, Type } from "lucide-react";
import {
  formatWeeksSummary,
  parseSchedule,
  parseScheduleWorkbook,
  parsedScheduleToCourses,
  type ParsedScheduleEntry,
  type ParsedScheduleSource,
} from "../lib/parseSchedule";
import type { Course } from "../types";

type ImportState = "idle" | "parsing" | "preview" | "error";
type ImportMode = "file" | "image" | "text";

type ImportMeta = {
  source: ParsedScheduleSource;
  sourceLabel?: string;
  warning?: string;
  rawText?: string;
};

function weekdayOptions() {
  return [
    { value: "周一", label: "周一" },
    { value: "周二", label: "周二" },
    { value: "周三", label: "周三" },
    { value: "周四", label: "周四" },
    { value: "周五", label: "周五" },
    { value: "周六", label: "周六" },
    { value: "周日", label: "周日" },
  ];
}

async function preprocessImage(file: File) {
  const imageUrl = URL.createObjectURL(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const node = new Image();
    node.onload = () => resolve(node);
    node.onerror = () => reject(new Error("image-load-failed"));
    node.src = imageUrl;
  });

  const scale = Math.min(1.6, 1800 / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    URL.revokeObjectURL(imageUrl);
    throw new Error("canvas-context-failed");
  }

  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const contrast = gray > 160 ? 255 : gray < 100 ? 0 : Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
    data[index] = contrast;
    data[index + 1] = contrast;
    data[index + 2] = contrast;
  }

  context.putImageData(imageData, 0, 0);
  const processedDataUrl = canvas.toDataURL("image/png");
  URL.revokeObjectURL(imageUrl);
  return processedDataUrl;
}

export function ScheduleImportPanel({
  onImport,
  labels,
  surfaceMode = "default",
}: {
  onImport: (courses: Course[], entries: ParsedScheduleEntry[], meta: ImportMeta) => void;
  surfaceMode?: "default" | "flat";
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
}) {
  const [mode, setMode] = useState<ImportMode>("file");
  const [state, setState] = useState<ImportState>("idle");
  const [rawText, setRawText] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [parsedEntries, setParsedEntries] = useState<ParsedScheduleEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [warning, setWarning] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const parsedCourses = useMemo(() => parsedScheduleToCourses(parsedEntries, sourceLabel), [parsedEntries, sourceLabel]);
  const activeRawText = mode === "image" ? ocrText : rawText;
  const dayOptions = weekdayOptions();
  const isFlatMode = surfaceMode === "flat";
  const titleClassName = isFlatMode ? "text-[#201b16]" : "text-[#f6f1e8]";
  const mutedClassName = isFlatMode ? "text-[#6f655b]" : "text-[var(--vf-text-muted)]";
  const subtleClassName = isFlatMode ? "text-[#8a7c70]" : "text-[var(--vf-text-soft)]";
  const iconClassName = isFlatMode
    ? "border border-[rgba(191,122,34,0.16)] bg-[rgba(191,122,34,0.08)] text-[#9a5f13]"
    : "border border-[rgba(125,142,163,0.14)] bg-[rgba(91,114,148,0.12)] text-[#d8e1ef]";
  const innerPanelClassName = isFlatMode
    ? "rounded-[28px] border border-[rgba(45,35,25,0.08)] bg-[rgba(247,241,232,0.84)] p-4"
    : "rounded-[28px] border border-[rgba(125,142,163,0.12)] bg-[rgba(10,16,24,0.32)] p-4";
  const previewItemClassName = isFlatMode
    ? "rounded-2xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-3"
    : "rounded-2xl bg-white/6 px-4 py-3";

  function resetPreview(nextMode?: ImportMode) {
    if (nextMode) setMode(nextMode);
    setState("idle");
    setParsedEntries([]);
    setErrorMessage("");
    setWarning("");
    setSourceLabel("");
    if (nextMode !== "image") {
      setPreviewImage("");
      setOcrText("");
    }
  }

  function updateEntry(index: number, patch: Partial<ParsedScheduleEntry>) {
    setParsedEntries((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry));
    setState("preview");
    setErrorMessage("");
  }

  function removeEntry(index: number) {
    setParsedEntries((current) => current.filter((_, entryIndex) => entryIndex !== index));
  }

  async function handleWorkbook(file: File) {
    setState("parsing");
    setErrorMessage("");
    setWarning("");
    setSourceLabel(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const entries = parseScheduleWorkbook(buffer);
      setParsedEntries(entries);
      setState(entries.length ? "preview" : "error");
      setWarning(entries.length ? "" : labels.parseFailed);
      if (!entries.length) setErrorMessage(labels.parseFailed);
    } catch {
      setState("error");
      setErrorMessage(labels.parseFailed);
    }
  }

  async function handleImage(file: File) {
    setState("parsing");
    setErrorMessage("");
    setWarning("");
    setSourceLabel(file.name);
    setPreviewImage(URL.createObjectURL(file));

    try {
      const processedDataUrl = await preprocessImage(file);
      const Tesseract = await import("tesseract.js");
      const result = await Tesseract.recognize(processedDataUrl, "chi_sim+eng", {
        logger: () => undefined,
      });
      const recognizedText = result.data.text.trim();
      setOcrText(recognizedText);
      const entries = parseSchedule(recognizedText, "image");
      setParsedEntries(entries);
      setState(entries.length ? "preview" : "error");
      if (!entries.length) {
        setErrorMessage(labels.parseFailed);
      } else if (entries.length < 3) {
        setWarning(labels.partialHint);
      }
    } catch {
      setState("error");
      setErrorMessage(labels.parseFailed);
    }
  }

  function handleTextParse() {
    setErrorMessage("");
    setWarning("");
    setSourceLabel(labels.modes.text);
    const entries = parseSchedule(rawText, "text");
    setParsedEntries(entries);
    setState(entries.length ? "preview" : "error");
    if (!entries.length) setErrorMessage(labels.parseFailed);
  }

  const modeButtons: Array<{ key: ImportMode; label: string; icon: typeof FileSpreadsheet }> = [
    { key: "file", label: labels.modes.file, icon: FileSpreadsheet },
    { key: "image", label: labels.modes.image, icon: FileImage },
    { key: "text", label: labels.modes.text, icon: Type },
  ];

  return (
    <div className="glass-surface rounded-[32px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-sm font-semibold ${titleClassName}`}>{labels.title}</div>
          <div className={`mt-1 text-sm ${mutedClassName}`}>{labels.description}</div>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-2xl ${iconClassName}`}>
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {modeButtons.map((item) => {
          const Icon = item.icon;
          const active = item.key === mode;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => resetPreview(item.key)}
              className={[
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition",
                active
                  ? (isFlatMode ? "border border-[rgba(191,122,34,0.28)] bg-[rgba(191,122,34,0.1)] text-[#9a5f13]" : "border border-amber-400/30 bg-amber-500/10 text-[#f0c46e]")
                  : (isFlatMode ? "border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.84)] text-[#6f655b] hover:bg-[rgba(191,122,34,0.06)] hover:text-[#201b16]" : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"),
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className={`mt-4 ${innerPanelClassName}`}>
        {mode === "file" ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleWorkbook(file);
                event.currentTarget.value = "";
              }}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium text-white">
              <span className="inline-flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                {labels.uploadFile}
              </span>
            </button>
          </>
        ) : null}

        {mode === "image" ? (
          <div className="space-y-3">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImage(file);
                event.currentTarget.value = "";
              }}
            />
            <button type="button" onClick={() => imageInputRef.current?.click()} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium text-white">
              <span className="inline-flex items-center gap-2">
                <ScanSearch className="h-4 w-4" />
                {labels.uploadImage}
              </span>
            </button>
            <div className={`text-xs ${mutedClassName}`}>{labels.imageHint}</div>
            {previewImage ? (
              <img src={previewImage} alt="schedule preview" className={`max-h-64 w-full rounded-2xl object-contain ${isFlatMode ? "border border-[rgba(45,35,25,0.08)]" : "border border-white/10"}`} />
            ) : null}
          </div>
        ) : null}

        {mode === "text" ? (
          <>
            <textarea
              rows={7}
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder={labels.placeholder}
              className={`chronos-field w-full resize-none rounded-[28px] px-4 py-4 text-sm ${isFlatMode ? "text-[#201b16] placeholder:text-[#8a7c70]" : "text-slate-100 placeholder:text-slate-500"}`}
            />
            <div className="mt-4">
              <button type="button" onClick={handleTextParse} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium text-white">
                {labels.parse}
              </button>
            </div>
          </>
        ) : null}

        {state === "parsing" ? <div className={`mt-4 text-sm ${isFlatMode ? "text-[#9a5f13]" : "text-amber-200"}`}>{labels.processing}</div> : null}
        {state === "error" && errorMessage ? <div className="mt-4 text-sm text-rose-300">{errorMessage}</div> : null}
      </div>

      <div className={`mt-5 ${innerPanelClassName}`}>
        <div className="flex items-center justify-between gap-3">
          <div className={`text-sm font-medium ${titleClassName}`}>{labels.parsed}</div>
          <div className={`rounded-full px-3 py-1 text-xs ${isFlatMode ? "bg-[rgba(191,122,34,0.08)] text-[#6f655b]" : "bg-white/10 text-slate-300"}`}>{parsedCourses.length}</div>
        </div>
        <div className={`mt-3 text-xs ${mutedClassName}`}>{labels.replaceHint}</div>
        {sourceLabel ? <div className={`mt-2 text-xs ${subtleClassName}`}>{labels.sourceLabel}: {sourceLabel}</div> : null}
        {warning ? <div className="mt-2 text-xs text-amber-200">{warning}</div> : null}

        {mode === "image" && ocrText ? (
          <div className={`mt-4 rounded-2xl p-4 ${isFlatMode ? "bg-[rgba(255,251,245,0.96)]" : "bg-white/6"}`}>
            <div className={`text-xs uppercase tracking-[0.18em] ${mutedClassName}`}>{labels.rawTextTitle}</div>
            <pre className={`mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs ${isFlatMode ? "text-[#3f372f]" : "text-slate-300"}`}>{ocrText}</pre>
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {parsedEntries.length ? parsedEntries.slice(0, 8).map((entry, index) => (
            <div key={`${entry.day}-${entry.startTime}-${entry.title}-${entry.location}-${index}`} className={previewItemClassName}>
              <div className="grid gap-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <input value={entry.title} onChange={(event) => updateEntry(index, { title: event.target.value })} className={`chronos-field h-10 rounded-2xl px-3 text-sm ${isFlatMode ? "text-[#201b16]" : "text-slate-100"}`} />
                  <input value={entry.location} onChange={(event) => updateEntry(index, { location: event.target.value })} placeholder="地点 / Location" className={`chronos-field h-10 rounded-2xl px-3 text-sm ${isFlatMode ? "text-[#201b16]" : "text-slate-100"}`} />
                </div>
                <div className="grid gap-2 md:grid-cols-[120px_1fr_1fr_auto]">
                  <select value={entry.day} onChange={(event) => updateEntry(index, { day: event.target.value })} className={`chronos-field h-10 rounded-2xl px-3 text-sm ${isFlatMode ? "text-[#201b16]" : "text-slate-100"}`}>
                    {dayOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <input value={entry.startTime} onChange={(event) => updateEntry(index, { startTime: event.target.value })} className={`chronos-field h-10 rounded-2xl px-3 text-sm ${isFlatMode ? "text-[#201b16]" : "text-slate-100"}`} />
                  <input value={entry.endTime} onChange={(event) => updateEntry(index, { endTime: event.target.value })} className={`chronos-field h-10 rounded-2xl px-3 text-sm ${isFlatMode ? "text-[#201b16]" : "text-slate-100"}`} />
                  <button type="button" onClick={() => removeEntry(index)} className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{labels.remove}</button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className={`text-xs ${mutedClassName}`}>{labels.editHint}</div>
                  <div className="text-right">
                    {formatWeeksSummary(entry.weeks, entry.weekMode) ? (
                      <div className={`text-xs ${isFlatMode ? "text-[#9a5f13]" : "text-amber-200"}`}>{formatWeeksSummary(entry.weeks, entry.weekMode)}</div>
                    ) : null}
                    {entry.location ? (
                      <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${isFlatMode ? "bg-[rgba(191,122,34,0.08)] text-[#6f655b]" : "bg-white/10 text-slate-300"}`}>
                        <MapPin className="h-3.5 w-3.5" />
                        {entry.location}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className={`text-sm ${mutedClassName}`}>{labels.empty}</div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onImport(parsedCourses, parsedEntries, {
              source: mode === "file" ? "file" : mode === "image" ? "image" : "text",
              sourceLabel,
              warning,
              rawText: activeRawText,
            })}
            disabled={!parsedCourses.length}
            className={[
              "rounded-full px-4 py-2 text-sm font-medium text-white transition",
              parsedCourses.length
                ? "chronos-button-primary"
                : (isFlatMode ? "cursor-not-allowed border border-[rgba(45,35,25,0.08)] bg-[rgba(247,241,232,0.7)] text-[#8a7c70]" : "cursor-not-allowed border border-white/10 bg-white/8 text-slate-500"),
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-2">
              <CalendarSync className="h-4 w-4" />
              {labels.sync}
            </span>
          </button>
          <button type="button" onClick={() => resetPreview()} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium text-white">
            {labels.reset}
          </button>
        </div>
      </div>
    </div>
  );
}
