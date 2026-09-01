/**
 * iOS `DueState` (ChoreDetailView.swift) — the shared due-date theme used by the
 * chore detail, chart member sheet, and chore status screens.
 */
export type DueState = 'upcoming' | 'today' | 'overdue';

export const dueAccent: Record<DueState, string> = { upcoming: '#2DA100', today: '#3F81FF', overdue: '#FF5757' };
export const dueCardFill: Record<DueState, string> = { upcoming: '#EAF6E6', today: '#DBE8FD', overdue: '#FFE7E7' };
export const dueTrackFill: Record<DueState, string> = { upcoming: '#EAF6E6', today: '#E5EDFC', overdue: '#FFE7E7' };
export const dueBarGradient: Record<DueState, [string, string]> = {
  upcoming: ['#ADF079', '#2DA100'],
  today: ['#C2E4FF', '#3F81FF'],
  overdue: ['#F88B81', '#FF5757'],
};
export const dueBarFraction: Record<DueState, number> = { upcoming: 0.4, today: 0.52, overdue: 1.0 };

const startOfDay = (date: Date) => { const copy = new Date(date); copy.setHours(0, 0, 0, 0); return copy; };
const dayDelta = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);

const DUE_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** iOS `parseDueDate`: chores store their due date as "d MMMM, yyyy". */
export function parseDueDate(value: string): Date | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2}) ([A-Za-z]+),? (\d{4})$/);
  if (!match) return null;
  // Built from components, NOT `new Date("August 27, 2026 ...")` — Hermes
  // returns Invalid Date for that non-ISO format while iOS's JSC accepts it.
  const month = DUE_MONTHS.findIndex(name => name.toLowerCase() === match[2].toLowerCase());
  if (month < 0) return null;
  const parsed = new Date(Number(match[3]), month, Number(match[1]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** iOS `DueState.live(from:)`: state buckets at ≤1 / ≤5 days, the countdown label, and the bar fraction over a 10-day horizon. */
export function liveDueState(dueDate: string, now = new Date()): { state: DueState; label: string; fraction: number } {
  return liveDueStateOn(parseDueDate(dueDate), now);
}

/**
 * The same theme keyed on a Date rather than the chore's stored anchor string.
 * A recurring chore has one `dueDate` but many occurrences, so any screen
 * showing a SPECIFIC occurrence must theme it from that occurrence's own day.
 */
export function liveDueStateOn(day: Date | null, now = new Date()): { state: DueState; label: string; fraction: number } {
  if (!day) return { state: 'today', label: 'Due today', fraction: 0.52 };
  const days = dayDelta(now, day);
  const state: DueState = days <= 1 ? 'overdue' : days <= 5 ? 'today' : 'upcoming';
  const label = days < 0 ? `Overdue by ${-days} day${days === -1 ? '' : 's'}`
    : days === 0 ? 'Due today'
      : days === 1 ? 'Due tomorrow'
        : `Due in ${days} days`;
  const fraction = days <= 0 ? 1 : Math.max(0.12, Math.min(1, 1 - days / 10));
  return { state, label, fraction };
}

/** iOS `DueState.calendarState(from:)`: the coarser overdue/today/upcoming split used by calendar cells. */
export function calendarDueState(dueDate: string, now = new Date()): { state: DueState; label: string } {
  const parsed = parseDueDate(dueDate);
  if (!parsed) return { state: 'today', label: 'Due today' };
  const days = dayDelta(now, parsed);
  if (days < 0) return { state: 'overdue', label: `Overdue by ${-days} day${days === -1 ? '' : 's'}` };
  if (days === 0) return { state: 'today', label: 'Due today' };
  return { state: 'upcoming', label: `Due in ${days} day${days === 1 ? '' : 's'}` };
}

/** iOS `ChartMemberSheet.badgeText`. */
export function occurrenceBadgeText(day: Date, now = new Date()) {
  const days = dayDelta(now, day);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due Today';
  if (days === 1) return 'Due Tomorrow';
  return `Due on ${day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

/** iOS `ChartMemberSheet.barFraction`. */
export function occurrenceBarFraction(day: Date, state: DueState, now = new Date()) {
  const days = dayDelta(now, day);
  if (days <= 0) return state === 'overdue' ? 1 : 0.52;
  return Math.max(0.15, Math.min(0.85, 1 - days / 10));
}

/** iOS `ChartMemberSheet`/`ScheduleView` treat the occurrence's own day as the due date. */
export function occurrenceDueState(day: Date, now = new Date()): DueState {
  const days = dayDelta(now, day);
  return days < 0 ? 'overdue' : days === 0 ? 'today' : 'upcoming';
}
