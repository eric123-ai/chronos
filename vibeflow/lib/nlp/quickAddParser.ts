import { ParsedTask, Priority } from './types';

// Minimal deterministic CN quick-add parser (rule-based)
// NOTE: This is an initial version to unblock integration; expand rules & tests.

const pad = (n: number) => String(n).padStart(2, '0');

function toLocalISO(d: Date): string {
  // format as local naive ISO (no timezone designator)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function parseTimeToken(s: string): { hour: number; minute: number } | null {
  // 7:30 / 19:00 / 七点半 / 7点 / 21点15
  const m1 = s.match(/(?:(\d{1,2})[:：](\d{2}))|(?:(\d{1,2})\s*点(?:\s*(\d{1,2})\s*分)?)/);
  if (m1) {
    const h = Number(m1[1] ?? m1[3]);
    const mm = Number(m1[2] ?? m1[4] ?? 0);
    if (h >= 0 && h <= 23 && mm >= 0 && mm <= 59) return { hour: h, minute: mm };
  }
  if (/半/.test(s)) {
    const m2 = s.match(/(\d{1,2})\s*点/);
    if (m2) {
      const h = Number(m2[1]);
      if (h >= 0 && h <= 23) return { hour: h, minute: 30 };
    }
  }
  return null;
}

function mapPriority(word: string): Priority | undefined {
  if (/^(高|重要|urgent)$/i.test(word)) return 'high';
  if (/^(低|不急|low)$/i.test(word)) return 'low';
  if (/^(一般|normal|中)$/i.test(word)) return 'normal';
  return undefined;
}

function relativeDateToken(s: string): Date | null {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (/今天/.test(s)) return base;
  if (/明天|明日/.test(s)) return new Date(base.getTime() + 86400000);
  if (/后天/.test(s)) return new Date(base.getTime() + 2 * 86400000);
  if (/今晚/.test(s)) { const d = base; d.setHours(21, 0, 0, 0); return d; }
  if (/明早|明晨|明天早上/.test(s)) { const d = new Date(base.getTime() + 86400000); d.setHours(9, 0, 0, 0); return d; }
  if (/下午|午后|傍晚/.test(s)) { const d = base; d.setHours(14, 0, 0, 0); return d; }
  if (/中午/.test(s)) { const d = base; d.setHours(12, 0, 0, 0); return d; }
  return null;
}

function parseDurationMin(s: string): number | undefined {
  const mm = s.match(/(\d+)\s*(?:m|min|分钟)/i);
  if (mm) return Math.max(5, parseInt(mm[1]!, 10));
  const hm = s.match(/(\d+)\s*h(?:our|)s?\s*(\d+)?|(?:(\d+)\s*小时(?:\s*(\d+)\s*分)?)/i);
  if (hm) {
    const h = Number(hm[1] ?? hm[3] ?? 0);
    const m = Number(hm[2] ?? hm[4] ?? 0);
    return Math.max(5, h * 60 + m);
  }
  return undefined;
}

function buildWeeklyByDay(text: string): string | undefined {
  const map: Record<string, string> = { '一': 'MO', '二': 'TU', '三': 'WE', '四': 'TH', '五': 'FR', '六': 'SA', '日': 'SU', '天': 'SU' };
  const days = Array.from(text.matchAll(/周([一二三四五六日天])/g)).map(m => map[m[1]!]);
  if (/工作日/.test(text)) return 'MO,TU,WE,TH,FR';
  if (/周末/.test(text)) return 'SA,SU';
  // also support 英文缩写/中文全称
  const englishDays = Array.from(text.matchAll(/\b(MO|TU|WE|TH|FR|SA|SU)\b/ig)).map(m => m[1]!.toUpperCase());
  if (englishDays.length) return englishDays.join(',');
  if (days.length > 0) return days.join(',');
  return undefined;
}

function parseMonthDay(text: string): number | 'LAST' | undefined {
  if (/最后一天/.test(text)) return 'LAST';
  const m = text.match(/(?:每月|本月|下月)?\s*(\d{1,2})\s*(?:号|日)/);
  if (m) return Number(m[1]);
  return undefined;
}

export function quickAddParser(input: string): ParsedTask {
  let text = input.trim();
  const out: ParsedTask = { title: text };

  // Priority
  const prMatch = text.match(/(高|重要|一般|低|urgent|normal|low)/i);
  if (prMatch) {
    const p = mapPriority(prMatch[1]!);
    if (p) out.priority = p;
    text = text.replace(prMatch[0]!, '').trim();
  }

  // Duration
  const durMatch = text.match(/(\d+\s*(?:m|min|分钟))|((\d+)\s*h(?:our|)s?(?:\s*(\d+)\s*m)?)|((\d+)\s*小时(?:\s*(\d+)\s*分)?)/i);
  if (durMatch) {
    const dm = parseDurationMin(durMatch[0]!);
    if (dm) out.durationMin = dm;
    text = text.replace(durMatch[0]!, '').trim();
  }

  // Relative date words
  const rel = relativeDateToken(text);
  let plannedDate: Date | null = rel ? new Date(rel) : null;

  // Absolute date yyyy-mm-dd
  // Absolute date yyyy-mm-dd or mm-dd (assume this year, roll to next year if past)
  let usedAbs = false;
  const dmy = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dmy) {
    const d = new Date(Number(dmy[1]), Number(dmy[2]) - 1, Number(dmy[3]));
    plannedDate = new Date(d);
    text = text.replace(dmy[0]!, '').trim();
    usedAbs = true;
  } else {
    const mdOnly = text.match(/(\d{1,2})-(\d{1,2})/);
    if (mdOnly) {
      const now = new Date();
      let y = now.getFullYear();
      const m = Number(mdOnly[1]) - 1;
      const d = Number(mdOnly[2]);
      const candidate = new Date(y, m, d);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (candidate < today) candidate.setFullYear(y + 1);
      plannedDate = candidate;
      text = text.replace(mdOnly[0]!, '').trim();
      usedAbs = true;
    }
  }

  // Time @HH:MM or HH:MM or 七点半
  let timeToken: { hour: number; minute: number } | null = null;
  const atTime = text.match(/@([0-2]?\d[:：]\d{2})|(?:^|\s)((?:[01]?\d|2[0-3])[:：]\d{2})(?=\s|$)/);
  if (atTime) {
    const [_, t] = atTime;
    const parsed = parseTimeToken(t);
    if (parsed) timeToken = parsed;
    text = text.replace(atTime[0]!, '').trim();
  } else {
    const timeGuess = parseTimeToken(text);
    if (timeGuess) {
      timeToken = timeGuess;
      // remove first occurrence roughly
      text = text.replace(/(\d{1,2}[:：]\d{2}|\d{1,2}\s*点(?:\s*\d+\s*分)?|\d{1,2}\s*点半)/, '').trim();
    }
  }

  if (plannedDate) {
    if (timeToken) {
      plannedDate.setHours(timeToken.hour, timeToken.minute, 0, 0);
    } else {
      plannedDate.setHours(9, 0, 0, 0); // default morning
    }
    out.plannedDate = toLocalISO(plannedDate);
  } else if (timeToken) {
    // time only, assume today
    const base = new Date();
    base.setHours(timeToken.hour, timeToken.minute, 0, 0);
    out.plannedDate = toLocalISO(base);
  }

  // Reminder: 提前X分钟/小时
  const rem = text.match(/(提前|提醒提前)\s*(\d+)\s*(分钟|分|小时|h)/);
  if (rem && out.plannedDate) {
    const amt = Number(rem[2]);
    const unit = rem[3];
    const d = new Date(out.plannedDate.replace('T', ' ') + ':00');
    if (unit.startsWith('小') || /h/i.test(unit)) d.setMinutes(d.getMinutes() - amt * 60);
    else d.setMinutes(d.getMinutes() - amt);
    out.reminders = [toLocalISO(d)];
    text = text.replace(rem[0]!, '').trim();
  }

  // Repeats
  // 每天/每日
  if (/每\s*(天|日)/.test(text)) {
    out.rrule = 'FREQ=DAILY';
  } else {
    const byday = buildWeeklyByDay(text);
    if (byday) out.rrule = `FREQ=WEEKLY;BYDAY=${byday}`;
    const md = parseMonthDay(text);
    if (md === 'LAST') out.rrule = 'FREQ=MONTHLY;BYMONTHDAY=-1';
    else if (typeof md === 'number') out.rrule = `FREQ=MONTHLY;BYMONTHDAY=${md}`;
    const everyN = text.match(/每\s*(\d+)\s*(周|星期|月)/);
    if (everyN) {
      const n = Number(everyN[1]);
      const unit = everyN[2];
      if (/月/.test(unit)) out.rrule = `FREQ=MONTHLY;INTERVAL=${n}`;
      else out.rrule = `FREQ=WEEKLY;INTERVAL=${n}`;
    }
    // Support "每2周 周二" style combined interval + weekday
    const intervalDay = text.match(/每\s*(\d+)\s*周.*?(周[一二三四五六日天])/);
    if (!out.rrule && intervalDay) {
      const n = Number(intervalDay[1]);
      const map: Record<string, string> = { '周一':'MO','周二':'TU','周三':'WE','周四':'TH','周五':'FR','周六':'SA','周日':'SU','周天':'SU' };
      const day = map[intervalDay[2]];
      if (day) out.rrule = `FREQ=WEEKLY;INTERVAL=${n};BYDAY=${day}`;
    }
  }

  // Residual as notes/title cleanup
  out.title = text.replace(/\s+/g, ' ').trim() || input.trim();
  if (out.title === '') out.title = input.trim();

  return out;
}

export default quickAddParser;
