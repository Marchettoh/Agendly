import { addDays, addMonths, addWeeks, differenceInCalendarDays, parseISO, format as formatPlain } from 'date-fns';
import { it } from 'date-fns/locale';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { Recurrence } from './types';

export const DEFAULT_TIMEZONE = 'Europe/Rome';
/** Ora usata come riferimento per i promemoria delle voci senza orario. */
export const DEFAULT_REMINDER_TIME = '09:00';

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat('it-IT', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Converte data/ora "da parete" nel fuso indicato in un istante UTC (gestisce l'ora legale). */
export function zonedToUtc(date: string, time: string | null, tz: string): Date {
  return fromZonedTime(`${date}T${time ?? '00:00'}:00`, tz);
}

/** Data locale YYYY-MM-DD dell'istante nel fuso indicato. */
export function toDateKey(instant: Date, tz: string): string {
  return formatInTimeZone(instant, tz, 'yyyy-MM-dd');
}

export function toTimeKey(instant: Date, tz: string): string {
  return formatInTimeZone(instant, tz, 'HH:mm');
}

export function todayKey(tz: string): string {
  return toDateKey(new Date(), tz);
}

/** Somma giorni a una data YYYY-MM-DD senza passare dal fuso del dispositivo. */
export function addDaysKey(dateKey: string, days: number): string {
  return formatPlain(addDays(parseISO(dateKey), days), 'yyyy-MM-dd');
}

export function diffDaysKey(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(a), parseISO(b));
}

export function nextOccurrenceDate(dateKey: string, recurrence: Recurrence, step = 1): string {
  const d = parseISO(dateKey);
  switch (recurrence) {
    case 'daily':
      return formatPlain(addDays(d, step), 'yyyy-MM-dd');
    case 'weekly':
      return formatPlain(addWeeks(d, step), 'yyyy-MM-dd');
    case 'monthly':
      return formatPlain(addMonths(d, step), 'yyyy-MM-dd');
    default:
      return dateKey;
  }
}

/**
 * Date delle occorrenze in [from, to] (YYYY-MM-DD inclusi), non precedenti a `base`.
 * Le occorrenze sono calcolate dalla data di ancoraggio, così il 31 del mese non slitta al 28.
 */
export function occurrencesInRange(base: string, recurrence: Recurrence, from: string, to: string, anchor = base): string[] {
  if (recurrence === 'none') return base >= from && base <= to ? [base] : [];
  const out: string[] = [];
  const start = base > from ? base : from;
  let step = recurrence === 'daily' ? Math.max(0, diffDaysKey(start, anchor)) : 0;
  let current = nextOccurrenceDate(anchor, recurrence, step);
  for (let guard = 0; current <= to && out.length < 400 && guard < 10_000; guard++) {
    if (current >= start) out.push(current);
    step += 1;
    current = nextOccurrenceDate(anchor, recurrence, step);
  }
  return out;
}

/** Prossima occorrenza dopo `current` e non prima di `minDate` (le occorrenze perse vengono saltate). */
export function nextRecurringDate(anchor: string, current: string, recurrence: Recurrence, minDate: string): string {
  if (recurrence === 'none') return current;
  const floor = current > minDate ? current : minDate;
  let step = recurrence === 'daily' ? Math.max(1, diffDaysKey(floor, anchor)) : 1;
  for (let guard = 0; guard < 10_000; guard++, step++) {
    const d = nextOccurrenceDate(anchor, recurrence, step);
    if (d > current && d >= minDate) return d;
  }
  return nextOccurrenceDate(current, recurrence);
}

/** Formatta una data YYYY-MM-DD in italiano, es. "lunedì 3 marzo". */
export function formatDateKey(dateKey: string, pattern = 'EEEE d MMMM'): string {
  return formatPlain(parseISO(dateKey), pattern, { locale: it });
}

export function formatInTz(instant: Date, tz: string, pattern: string): string {
  return formatInTimeZone(instant, tz, pattern, { locale: it });
}

export function relativeDayLabel(dateKey: string, tz: string): string {
  const diff = diffDaysKey(dateKey, todayKey(tz));
  if (diff === 0) return 'Oggi';
  if (diff === 1) return 'Domani';
  if (diff === -1) return 'Ieri';
  return capitalize(formatDateKey(dateKey, diff > 0 && diff < 7 ? 'EEEE' : 'EEE d MMM'));
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Lunedì della settimana che contiene la data. */
export function startOfWeekKey(dateKey: string): string {
  const d = parseISO(dateKey);
  const dow = (d.getDay() + 6) % 7;
  return addDaysKey(dateKey, -dow);
}

export function startOfMonthKey(dateKey: string): string {
  return `${dateKey.slice(0, 7)}-01`;
}

export function addMonthsKey(dateKey: string, months: number): string {
  return formatPlain(addMonths(parseISO(dateKey), months), 'yyyy-MM-dd');
}

export const COMMON_TIMEZONES = [
  'Europe/Rome',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Zurich',
  'Europe/Athens',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];
