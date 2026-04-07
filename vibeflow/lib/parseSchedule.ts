import * as XLSX from "xlsx";
import type { Course, WeekMode, Weekday } from "../types";

export type ParsedScheduleSource = "text" | "file" | "image";

export type ParsedScheduleEntry = {
  title: string;
  location: string;
  startTime: string;
  endTime: string;
  day: string;
  weeks?: number[];
  weekMode?: WeekMode;
  source?: ParsedScheduleSource;
};

type DayInfo = { day: Weekday; label: string };

const DAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;

const DAY_TOKEN_MAP: Array<{ token: RegExp; day: Weekday; label: string }> = [
  { token: /(周一|星期一|礼拜一|Monday|Mon)/i, day: 1, label: "周一" },
  { token: /(周二|星期二|礼拜二|Tuesday|Tue)/i, day: 2, label: "周二" },
  { token: /(周三|星期三|礼拜三|Wednesday|Wed)/i, day: 3, label: "周三" },
  { token: /(周四|星期四|礼拜四|Thursday|Thu)/i, day: 4, label: "周四" },
  { token: /(周五|星期五|礼拜五|Friday|Fri)/i, day: 5, label: "周五" },
  { token: /(周六|星期六|礼拜六|Saturday|Sat)/i, day: 6, label: "周六" },
  { token: /(周日|星期日|星期天|礼拜日|礼拜天|Sunday|Sun)/i, day: 7, label: "周日" },
];

const SECTION_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: "08:30", end: "09:15" },
  2: { start: "09:20", end: "10:05" },
  3: { start: "10:25", end: "11:10" },
  4: { start: "11:15", end: "12:00" },
  5: { start: "14:00", end: "14:45" },
  6: { start: "14:50", end: "15:35" },
  7: { start: "15:55", end: "16:40" },
  8: { start: "16:45", end: "17:30" },
  9: { start: "18:30", end: "19:15" },
  10: { start: "19:20", end: "20:05" },
  11: { start: "20:15", end: "21:00" },
  12: { start: "21:05", end: "21:50" },
};

function normalizeSource(input: string) {
  return input
    .replace(/\r/g, "")
    .replace(/[：﹕]/g, ":")
    .replace(/[—–－~～至]/g, "-")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[，、]/g, ",")
    .trim();
}

function normalizeTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function parseDayToken(value: string): DayInfo | null {
  const match = DAY_TOKEN_MAP.find((entry) => entry.token.test(value));
  return match ? { day: match.day, label: match.label } : null;
}

function stripDayToken(value: string) {
  return DAY_TOKEN_MAP.reduce((current, entry) => current.replace(entry.token, ""), value).trim();
}

function parseTimeWindow(value: string) {
  const match = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/.exec(value);
  if (!match) return null;
  return {
    startTime: normalizeTime(match[1]),
    endTime: normalizeTime(match[2]),
  };
}

function parseSectionWindow(value: string) {
  const match = /第?\s*(\d{1,2})\s*-\s*(\d{1,2})\s*节?/.exec(value) ?? /第?\s*(\d{1,2})\s*节?/.exec(value);
  if (!match) return null;
  const startSection = Number(match[1]);
  const endSection = Number(match[2] ?? match[1]);
  const start = SECTION_TIMES[startSection];
  const end = SECTION_TIMES[endSection];
  if (!start || !end) return null;
  return { startTime: start.start, endTime: end.end };
}

function parseWindow(value: string) {
  return parseTimeWindow(value) ?? parseSectionWindow(value);
}

function buildWeeks(start: number, end: number, weekMode: WeekMode = "all") {
  const weeks: number[] = [];
  for (let week = start; week <= end; week += 1) {
    if (weekMode === "odd" && week % 2 === 0) continue;
    if (weekMode === "even" && week % 2 !== 0) continue;
    weeks.push(week);
  }
  return weeks;
}

function parseWeekInfo(value: string): { weeks?: number[]; weekMode?: WeekMode } {
  const normalized = value.replace(/\s+/g, "");
  const weekMode: WeekMode =
    /(单周|单)/.test(normalized) ? "odd"
      : /(双周|双)/.test(normalized) ? "even"
        : "all";

  const rangeMatch = /(\d{1,2})\s*-\s*(\d{1,2})\s*周?/.exec(normalized);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (start <= end) return { weeks: buildWeeks(start, end, weekMode), weekMode };
  }

  const listMatch = normalized.match(/(\d{1,2}(?:,\d{1,2})+)\s*周?/);
  if (listMatch) {
    const weeks = listMatch[1]
      .split(",")
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
    return { weeks, weekMode };
  }

  if (weekMode !== "all") return { weekMode };
  return {};
}

function stripWeekInfo(value: string) {
  return value
    .replace(/\(?\d{1,2}\s*-\s*\d{1,2}\s*周(?:\((?:单|双)\))?\)?/g, "")
    .replace(/\(?\d{1,2}(?:,\d{1,2})+\s*周(?:\((?:单|双)\))?\)?/g, "")
    .replace(/\(?[单双]周\)?/g, "")
    .trim();
}

function parseCourseCell(value: string) {
  const content = normalizeSource(value).trim();
  if (!content || /^[-/]+$/.test(content) || /^(无|空|--|N\/A)$/i.test(content)) return null;

  const weekInfo = parseWeekInfo(content);
  const withoutWeeks = stripWeekInfo(content)
    .replace(/\b(第?\d{1,2}\s*-\s*\d{1,2}\s*节?|第?\d{1,2}\s*节?)\b/g, "")
    .replace(/\b(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})\b/g, "")
    .replace(/^\W+|\W+$/g, "")
    .trim();

  if (!withoutWeeks) return null;

  const parts = withoutWeeks.split(/\n+/).map((part) => part.trim()).filter(Boolean);
  const merged = parts.join(" ");
  const atMatch = merged.match(/^(.+?)@(.+)$/);
  if (atMatch) {
    return { title: atMatch[1].trim(), location: atMatch[2].trim(), ...weekInfo };
  }

  const hyphenMatch = merged.match(/^(.+?)\s*-\s*([A-Za-z0-9\u4e00-\u9fa5].+)$/);
  if (hyphenMatch && !parseWindow(merged)) {
    return { title: hyphenMatch[1].trim(), location: hyphenMatch[2].trim(), ...weekInfo };
  }

  if (parts.length >= 2) {
    return { title: parts[0], location: parts.slice(1).join(" "), ...weekInfo };
  }

  return { title: merged, location: "", ...weekInfo };
}

function splitCells(line: string) {
  return line.split(/\t+| {2,}/).map((cell) => cell.trim()).filter(Boolean);
}

function dedupeEntries(entries: ParsedScheduleEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.day}-${entry.startTime}-${entry.endTime}-${entry.title}-${entry.location}-${(entry.weeks ?? []).join(",")}-${entry.weekMode ?? "all"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createEntry(dayInfo: DayInfo, window: { startTime: string; endTime: string }, rawCell: string, source: ParsedScheduleSource) {
  const parsedCourse = parseCourseCell(rawCell);
  if (!parsedCourse) return null;
  return {
    title: parsedCourse.title,
    location: parsedCourse.location,
    startTime: window.startTime,
    endTime: window.endTime,
    day: dayInfo.label,
    weeks: parsedCourse.weeks,
    weekMode: parsedCourse.weekMode,
    source,
  } satisfies ParsedScheduleEntry;
}

function parseTabularRows(lines: string[], source: ParsedScheduleSource) {
  const entries: ParsedScheduleEntry[] = [];
  const headerIndex = lines.findIndex((line) => DAY_LABELS.filter((label) => line.includes(label)).length >= 2);
  if (headerIndex === -1) return entries;

  const dayHeaders = splitCells(lines[headerIndex])
    .map((cell) => parseDayToken(cell))
    .filter((cell): cell is DayInfo => Boolean(cell));

  if (!dayHeaders.length) return entries;

  for (const line of lines.slice(headerIndex + 1)) {
    const cells = splitCells(line);
    if (cells.length < 2) continue;
    const window = parseWindow(cells[0]);
    if (!window) continue;

    dayHeaders.forEach((dayInfo, index) => {
      const rawCell = cells[index + 1];
      if (!rawCell) return;
      const entry = createEntry(dayInfo, window, rawCell, source);
      if (entry) entries.push(entry);
    });
  }

  return entries;
}

function parseSequentialBlocks(lines: string[], source: ParsedScheduleSource) {
  const entries: ParsedScheduleEntry[] = [];
  let pendingDay: DayInfo | null = null;
  let pendingWindow: { startTime: string; endTime: string } | null = null;

  for (const line of lines) {
    const dayToken = parseDayToken(line);
    if (dayToken) {
      pendingDay = dayToken;
      const rest = stripDayToken(line);
      const inlineWindow = parseWindow(rest);
      if (inlineWindow) pendingWindow = inlineWindow;
      const inlineCourse = parseCourseCell(rest.replace(/.*?(\d{1,2}:\d{2}|\d{1,2}\s*-\s*\d{1,2}\s*节?)/, "").trim());
      if (inlineCourse && pendingWindow) {
        entries.push({
          title: inlineCourse.title,
          location: inlineCourse.location,
          startTime: pendingWindow.startTime,
          endTime: pendingWindow.endTime,
          day: dayToken.label,
          weeks: inlineCourse.weeks,
          weekMode: inlineCourse.weekMode,
          source,
        });
      }
      continue;
    }

    const window = parseWindow(line);
    if (window) {
      pendingWindow = window;
      const inlineCourse = parseCourseCell(line.replace(/.*?(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}|第?\s*\d{1,2}\s*-\s*\d{1,2}\s*节?)/, "").trim());
      if (inlineCourse && pendingDay) {
        entries.push({
          title: inlineCourse.title,
          location: inlineCourse.location,
          startTime: window.startTime,
          endTime: window.endTime,
          day: pendingDay.label,
          weeks: inlineCourse.weeks,
          weekMode: inlineCourse.weekMode,
          source,
        });
      }
      continue;
    }

    if (pendingDay && pendingWindow) {
      const course = parseCourseCell(line);
      if (!course) continue;
      entries.push({
        title: course.title,
        location: course.location,
        startTime: pendingWindow.startTime,
        endTime: pendingWindow.endTime,
        day: pendingDay.label,
        weeks: course.weeks,
        weekMode: course.weekMode,
        source,
      });
    }
  }

  return entries;
}

function normalizeRowsToLines(rows: string[][]) {
  return rows
    .map((row) => row.map((cell) => normalizeSource(cell)).filter(Boolean).join("\t"))
    .filter(Boolean);
}

function parseRows(rows: string[][], source: ParsedScheduleSource) {
  const lines = normalizeRowsToLines(rows);
  return dedupeEntries([...parseTabularRows(lines, source), ...parseSequentialBlocks(lines, source)]);
}

export function parseSchedule(rawText: string, source: ParsedScheduleSource = "text"): ParsedScheduleEntry[] {
  const normalized = normalizeSource(rawText);
  if (!normalized) return [];
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  return dedupeEntries([...parseTabularRows(lines, source), ...parseSequentialBlocks(lines, source)]);
}

export const parseScheduleText = parseSchedule;

export function parseScheduleWorkbook(data: ArrayBuffer): ParsedScheduleEntry[] {
  const workbook = XLSX.read(data, { type: "array" });
  const entries = workbook.SheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });
    const normalizedRows = rows.map((row) => row.map((cell) => String(cell ?? "").trim()));
    return parseRows(normalizedRows, "file").map((entry) => ({
      ...entry,
      source: "file" as const,
    }));
  });
  return dedupeEntries(entries);
}

export function formatWeeksSummary(weeks?: number[], weekMode?: WeekMode) {
  if (!weeks?.length) {
    if (weekMode === "odd") return "单周";
    if (weekMode === "even") return "双周";
    return "";
  }

  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  const rangeLabel = first === last ? `${first}周` : `${first}-${last}周`;
  if (weekMode === "odd") return `${rangeLabel} 单周`;
  if (weekMode === "even") return `${rangeLabel} 双周`;
  return rangeLabel;
}

export function courseMatchesTeachingWeek(course: Pick<Course, "weeks" | "weekMode">, teachingWeek: number) {
  if (!Number.isFinite(teachingWeek) || teachingWeek <= 0) return true;
  if (course.weeks?.length) return course.weeks.includes(teachingWeek);
  if (course.weekMode === "odd") return teachingWeek % 2 !== 0;
  if (course.weekMode === "even") return teachingWeek % 2 === 0;
  return true;
}

export function parsedScheduleToCourses(entries: ParsedScheduleEntry[], sourceLabel?: string): Course[] {
  const courses = entries
    .map<Course | null>((entry) => {
      const dayInfo = parseDayToken(entry.day);
      if (!dayInfo) return null;
      return {
        name: entry.title,
        location: entry.location || undefined,
        startTime: entry.startTime,
        endTime: entry.endTime,
        weekday: dayInfo.day,
        weeks: entry.weeks,
        weekMode: entry.weekMode,
        source: "imported",
        sourceLabel,
      };
    })
    .filter((course): course is Course => course !== null);

  return courses.sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
}
