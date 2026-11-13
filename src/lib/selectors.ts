import { addDaysKey, diffDaysKey, occurrencesInRange, startOfWeekKey, todayKey, zonedToUtc } from './time';
import type { Item, Occurrence } from './types';

export const URGENT_WINDOW_HOURS = 24;

const PRIORITY_WEIGHT = { urgente: 0, alta: 1, media: 2, bassa: 3 } as const;

export function sortOccurrences(a: Occurrence, b: Occurrence): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  const at = a.item.time;
  const bt = b.item.time;
  if (at && bt && at !== bt) return at < bt ? -1 : 1;
  if (!at && bt) return 1;
  if (at && !bt) return -1;
  return PRIORITY_WEIGHT[a.item.priority] - PRIORITY_WEIGHT[b.item.priority];
}

/** Espande le voci (anche ricorrenti) nelle occorrenze comprese tra due date incluse. */
export function expandOccurrences(items: Item[], from: string, to: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (const item of items) {
    const span = spanDays(item);
    const dates = occurrencesInRange(item.date, item.recurrence, span ? addDaysKey(from, -span) : from, to, item.anchorDate ?? item.date);
    for (const date of dates) {
      const startAt = date === item.date ? item.startAt : zonedToUtc(date, item.time, item.timezone);
      for (let k = 0; k <= span; k++) {
        const day = k ? addDaysKey(date, k) : date;
        if (day < from || day > to) continue;
        out.push({ item, date: day, startAt, isRecurringInstance: date !== item.date, continued: k > 0 });
      }
    }
  }
  return out.sort(sortOccurrences);
}

/** Giorni aggiuntivi coperti da un impegno su più giorni (massimo 31). */
export function spanDays(item: Item): number {
  return item.endDate ? Math.min(31, Math.max(0, diffDaysKey(item.endDate, item.date))) : 0;
}

/** Fine dell'occorrenza (stessa durata della voce originale). */
export function occurrenceEnd(o: Occurrence): Date | null {
  return o.item.endAt ? new Date(o.item.endAt.getTime() + (o.startAt.getTime() - o.item.startAt.getTime())) : null;
}

export const isDone = (item: Item) => item.status === 'completato';

export function isOverdue(item: Item, tz: string, now = new Date()): boolean {
  if (isDone(item)) return false;
  if (item.time) return item.startAt.getTime() < now.getTime();
  return item.date < todayKey(tz);
}

/** Voci urgenti non completate, in ritardo o in scadenza nelle prossime 24 ore. */
export function imminentUrgent(items: Item[], tz: string, now = new Date()): Item[] {
  const limit = now.getTime() + URGENT_WINDOW_HOURS * 3_600_000;
  const today = todayKey(tz);
  return items
    .filter((i) => i.priority === 'urgente' && !isDone(i))
    .filter((i) => {
      if (!i.time) return i.date <= addDaysKey(today, 1);
      return i.startAt.getTime() <= limit;
    })
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

export type QuickFilter = 'oggi' | 'domani' | 'settimana' | 'ritardo' | 'completati';

export const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'oggi', label: 'Oggi' },
  { id: 'domani', label: 'Domani' },
  { id: 'settimana', label: 'Questa settimana' },
  { id: 'ritardo', label: 'In ritardo' },
  { id: 'completati', label: 'Completati' },
];

export function applyQuickFilter(items: Item[], filter: QuickFilter, tz: string, now = new Date()): Occurrence[] {
  const today = todayKey(tz);
  switch (filter) {
    case 'oggi':
      return expandOccurrences(items.filter((i) => !isDone(i)), today, today);
    case 'domani': {
      const t = addDaysKey(today, 1);
      return expandOccurrences(items.filter((i) => !isDone(i)), t, t);
    }
    case 'settimana': {
      const start = startOfWeekKey(today);
      return expandOccurrences(items.filter((i) => !isDone(i)), start < today ? today : start, addDaysKey(start, 6));
    }
    case 'ritardo':
      return items
        .filter((i) => isOverdue(i, tz, now))
        .map((item) => ({ item, date: item.date, startAt: item.startAt, isRecurringInstance: false }))
        .sort(sortOccurrences);
    case 'completati':
      return items
        .filter(isDone)
        .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
        .map((item) => ({ item, date: item.date, startAt: item.startAt, isRecurringInstance: false }));
  }
}

export interface TodaySummary {
  events: Occurrence[];
  tasks: Occurrence[];
  reminders: Occurrence[];
  overdue: Item[];
  completedToday: number;
  totalToday: number;
}

export function todaySummary(items: Item[], tz: string, now = new Date()): TodaySummary {
  const today = todayKey(tz);
  const occ = expandOccurrences(items, today, today);
  const overdue = items.filter((i) => i.type !== 'evento' && isOverdue(i, tz, now) && i.date < today);
  const completedToday = occ.filter((o) => isDone(o.item)).length;
  return {
    events: occ.filter((o) => o.item.type === 'evento'),
    tasks: occ.filter((o) => o.item.type === 'attivita'),
    reminders: occ.filter((o) => o.item.type === 'promemoria'),
    overdue,
    completedToday,
    totalToday: occ.length,
  };
}
