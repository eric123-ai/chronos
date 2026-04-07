export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface ParsedTask {
  title: string;
  plannedDate?: string; // ISO local (yyyy-MM-ddTHH:mm:ss)
  durationMin?: number;
  priority?: Priority;
  rrule?: string; // RFC5545 subset
  reminders?: string[]; // ISO local
  notes?: string; // any leftover hints or metadata like deadline
}
