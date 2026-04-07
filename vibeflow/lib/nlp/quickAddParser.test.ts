import { describe, it, expect, beforeAll } from 'vitest';
import quickAddParser from './quickAddParser';

// NOTE: This is a minimal starter test set; expand to 30+ later

describe('quickAddParser', () => {
  it('parses time and duration and priority and reminder', () => {
    const r = quickAddParser('明早9点 复习英语 30m 高 提前10分钟 每周一三');
    expect(r.title).toContain('复习英语');
    expect(r.durationMin).toBeGreaterThanOrEqual(30);
    expect(r.priority === 'high' || r.priority === 'normal' || r.priority === 'low').toBeTruthy();
    expect(r.rrule?.startsWith('FREQ=WEEKLY')).toBeTruthy();
  });
  it('parses monthly last day', () => {
    const r = quickAddParser('每月最后一天 20:00 结算账目');
    expect(r.rrule).toContain('FREQ=MONTHLY');
  });
});
