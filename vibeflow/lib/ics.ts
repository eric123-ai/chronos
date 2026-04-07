// Minimal ICS generator for local (client-side) export
// Generates a VCALENDAR with VEVENTs for a given day from ScheduleItem[] or Course[]

import type { ScheduleItem } from "./autoSchedule";
import type { Course } from "../types";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function yyyymmdd(date: Date) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
}

function hhmmss(value: string) {
  // value like "HH:MM" -> HHMMSS
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return "000000";
  const h = pad2(Number(m[1]));
  const mm = pad2(Number(m[2]));
  return `${h}${mm}00`;
}

function sanitizeSummary(text: string) {
  return (text || "").replace(/\n|\r/g, " ").slice(0, 120);
}

function escapeText(text: string) {
  // ICS escaping for commas, semicolons, backslashes
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildUid(parts: string[]) {
  // Deterministic-ish UID based on content, scoped to local domain
  const base = parts.join("-").replace(/[^a-zA-Z0-9_-]+/g, "");
  return `${base}@chronos.local`;
}

export function generateIcsForDay(dateISO: string, items: ScheduleItem[], options?: { timezone?: string }) {
  const tz = options?.timezone; // optional, we keep floating times for MVP
  const date = new Date(dateISO + "T00:00:00");
  const dateKey = yyyymmdd(date);

  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Chronos//VibeFlow//CN");

  for (const item of items) {
    const start = `${dateKey}T${hhmmss(item.startTime)}`;
    const end = `${dateKey}T${hhmmss(item.endTime)}`;
    const summary = sanitizeSummary(item.data.name);
    const location = (item.type === "course" && item.data.location) ? item.data.location : "";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${buildUid([item.type, summary, start, end])}`);
    // Floating times (no Z) for local calendar import; optional TZID reserved for future
    // If needed: lines.push(`DTSTART;TZID=${tz}:${start}`) and add VTIMEZONE
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    lines.push(`SUMMARY:${escapeText(summary)}`);
    if (location) lines.push(`LOCATION:${escapeText(location)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function generateIcsForCourses(dateISO: string, courses: Course[], options?: { timezone?: string }) {
  const tz = options?.timezone;
  const date = new Date(dateISO + "T00:00:00");
  const dateKey = yyyymmdd(date);

  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Chronos//VibeFlow//CN");

  for (const course of courses) {
    const start = `${dateKey}T${hhmmss(course.startTime)}`;
    const end = `${dateKey}T${hhmmss(course.endTime)}`;
    const summary = sanitizeSummary(course.name);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${buildUid(["course", summary, start, end])}`);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    lines.push(`SUMMARY:${escapeText(summary)}`);
    if (course.location) lines.push(`LOCATION:${escapeText(course.location)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// Generate all-day ICS from history (completed tasks per day)
export function generateIcsForHistory(days: Array<{ date: string; tasks: Array<{ name: string }> }>) {
  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Chronos//VibeFlow//CN");

  for (const day of days) {
    const key = day.date.replace(/-/g, "");
    for (const t of day.tasks) {
      const summary = sanitizeSummary(t.name);
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${buildUid(["history", summary, key])}`);
      // All-day event
      lines.push(`DTSTART;VALUE=DATE:${key}`);
      lines.push(`DTEND;VALUE=DATE:${key}`);
      lines.push(`SUMMARY:${escapeText(summary)}`);
      lines.push("END:VEVENT");
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
