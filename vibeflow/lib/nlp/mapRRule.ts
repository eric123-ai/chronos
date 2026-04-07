import type { RecurrenceRule, Weekday } from "../../types";
import type { ParsedTask } from "./types";

function bydayToWeekdays(byday: string): Weekday[] {
  const map: Record<string, Weekday> = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 };
  return byday
    .split(",")
    .map((d) => map[d.trim().toUpperCase()])
    .filter((x): x is Weekday => Boolean(x));
}

export function mapParsedToRule(
  parsed: ParsedTask,
  opts: {
    draftTitle: string;
    seedMinutes: number;
    urgency: number;
    energy: "low" | "medium" | "high";
    category: string; // cast later
    startsOn: string; // yyyy-MM-dd
  },
): RecurrenceRule | null {
  const r = parsed.rrule || "";
  if (!r) return null;
  const parts = r.split(";").reduce<Record<string, string>>((acc, seg) => {
    const [k, v] = seg.split("=");
    if (k && v) acc[k.toUpperCase()] = v;
    return acc;
  }, {});

  const FREQ = parts["FREQ"];
  const INTERVAL = parts["INTERVAL"] ? Math.max(1, Number(parts["INTERVAL"])) : undefined;

  if (FREQ === "DAILY") {
    return {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: opts.draftTitle.trim(),
      kind: "every_x_days",
      interval: INTERVAL ?? 1,
      category: opts.category as any,
      goalId: undefined,
      estimatedMinutes: Math.max(10, opts.seedMinutes),
      seedMinutes: Math.max(5, opts.seedMinutes),
      urgency: Math.max(0, Math.min(1, opts.urgency)),
      energyCost: opts.energy,
      createdAt: new Date().toISOString(),
      startsOn: opts.startsOn,
      active: true,
    };
  }

  if (FREQ === "WEEKLY") {
    const byday = parts["BYDAY"]; // e.g., MO,WE,FR
    const weekDays = byday ? bydayToWeekdays(byday) : [];
    return {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: opts.draftTitle.trim(),
      kind: "specific_week_days",
      interval: INTERVAL, // may be used for every-N-weeks matching
      weekDays,
      category: opts.category as any,
      goalId: undefined,
      estimatedMinutes: Math.max(10, opts.seedMinutes),
      seedMinutes: Math.max(5, opts.seedMinutes),
      urgency: Math.max(0, Math.min(1, opts.urgency)),
      energyCost: opts.energy,
      createdAt: new Date().toISOString(),
      startsOn: opts.startsOn,
      active: true,
    };
  }

  if (FREQ === "MONTHLY") {
    const byMonthDay = parts["BYMONTHDAY"] ? Number(parts["BYMONTHDAY"]) : undefined; // can be -1
    return {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: opts.draftTitle.trim(),
      kind: "day_of_month",
      dayOfMonth: byMonthDay ?? 1,
      interval: INTERVAL, // not used by current matcher, kept for future
      category: opts.category as any,
      goalId: undefined,
      estimatedMinutes: Math.max(10, opts.seedMinutes),
      seedMinutes: Math.max(5, opts.seedMinutes),
      urgency: Math.max(0, Math.min(1, opts.urgency)),
      energyCost: opts.energy,
      createdAt: new Date().toISOString(),
      startsOn: opts.startsOn,
      active: true,
    } as RecurrenceRule;
  }

  return null;
}

export default mapParsedToRule;
