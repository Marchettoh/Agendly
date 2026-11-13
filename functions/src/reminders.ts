import { addDays, addMonths, addWeeks, format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { Firestore, QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';

type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

interface ItemData {
  title: string;
  description?: string;
  date: string;
  time: string | null;
  timezone: string;
  startAt: Timestamp;
  priority: 'bassa' | 'media' | 'alta' | 'urgente';
  status: string;
  reminderMinutes: number | null;
  remindAt: Timestamp | null;
  recurrence: Recurrence;
  anchorDate?: string;
  endDate?: string | null;
  endTime?: string | null;
  endAt?: Timestamp | null;
}

// Deve restare allineato a src/lib/items.ts e src/lib/time.ts dell'app web.
const DEFAULT_REMINDER_TIME = '09:00';
const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

function nextOccurrenceDate(dateKey: string, recurrence: Recurrence, step: number): string {
  const d = parseISO(dateKey);
  if (recurrence === 'daily') return format(addDays(d, step), 'yyyy-MM-dd');
  if (recurrence === 'weekly') return format(addWeeks(d, step), 'yyyy-MM-dd');
  if (recurrence === 'monthly') return format(addMonths(d, step), 'yyyy-MM-dd');
  return dateKey;
}

function reminderInstant(date: string, time: string | null, tz: string, minutes: number): Date {
  return new Date(fromZonedTime(`${date}T${time ?? DEFAULT_REMINDER_TIME}:00`, tz).getTime() - minutes * 60_000);
}

/** Prossima occorrenza (data + istante del promemoria) successiva a `after`. */
export function nextReminder(item: ItemData, after: Date): { date: string; at: Date } | null {
  if (item.reminderMinutes == null || item.status === 'completato') return null;
  const anchor = item.anchorDate ?? item.date;
  for (let step = 0; step < 5000; step++) {
    const date = item.recurrence === 'none' ? item.date : nextOccurrenceDate(anchor, item.recurrence, step);
    if (date < item.date) continue;
    const at = reminderInstant(date, item.time, item.timezone, item.reminderMinutes);
    if (at.getTime() > after.getTime()) return { date, at };
    if (item.recurrence === 'none') return null;
  }
  return null;
}

/** Occorrenza a cui si riferisce il promemoria scattato a `remindAt`. */
function occurrenceFor(item: ItemData, remindAt: Date): { date: string; start: Date } {
  const target = new Date(remindAt.getTime() + (item.reminderMinutes ?? 0) * 60_000);
  const date = formatInTimeZone(target, item.timezone, 'yyyy-MM-dd');
  return { date, start: fromZonedTime(`${date}T${item.time ?? '00:00'}:00`, item.timezone) };
}

/** Notifica: il sistema mostra già "Agendly" in alto; titolo = impegno, sotto orario, agenda e descrizione. */
export function buildMessage(id: string, item: ItemData, remindAt: Date, uid = '', agendaName?: string) {
  const { start } = occurrenceFor(item, remindAt);
  const tz = item.timezone;
  const fmt = (d: Date, pattern: string) => formatInTimeZone(d, tz, pattern, { locale: it });
  let when = item.time ? fmt(start, 'EEEE d MMMM, HH:mm') : `${fmt(start, 'EEEE d MMMM')} (in giornata)`;
  if (item.endAt && item.startAt) {
    const end = new Date(item.endAt.toMillis() + (start.getTime() - item.startAt.toMillis()));
    if (item.endDate) when += ` → ${fmt(end, item.endTime ? 'EEEE d MMMM, HH:mm' : 'EEEE d MMMM')}`;
    else if (item.endTime) when += `–${fmt(end, 'HH:mm')}`;
  }
  when = when.charAt(0).toUpperCase() + when.slice(1);
  const urgent = item.priority === 'urgente';
  return {
    title: urgent ? `Urgente · ${item.title}` : item.title,
    body: [when, agendaName ? `Agenda: ${agendaName}` : '', item.description?.slice(0, 120) ?? ''].filter(Boolean).join('\n'),
    itemTitle: item.title,
    itemId: id,
    uid,
    tag: `${id}-${remindAt.getTime()}`,
    urgent: String(urgent),
    time: String(start.getTime()),
  };
}

async function processOne(db: Firestore, messaging: Messaging, snap: QueryDocumentSnapshot, now: Date) {
  const item = snap.data() as ItemData;
  const parent = snap.ref.parent.parent;
  if (!parent || !item.remindAt) return { sent: 0 };
  const remindAt = item.remindAt.toDate();
  const nextRemindAt = item.recurrence === 'none' ? null : (nextReminder(item, now)?.at ?? null);

  // Prenota l'occorrenza prima di inviare: un'esecuzione concorrente non la ritrova più scaduta.
  const claimed = await db.runTransaction(async (tx) => {
    const fresh = await tx.get(snap.ref);
    const current = fresh.get('remindAt') as Timestamp | null | undefined;
    if (!fresh.exists || !current || current.toMillis() !== remindAt.getTime()) return false;
    tx.update(snap.ref, { remindAt: nextRemindAt });
    return true;
  });
  if (!claimed) return { sent: 0 };

  // I promemoria scaduti da più di 6 ore (es. dopo un'interruzione) non vengono inviati.
  const stale = now.getTime() - remindAt.getTime() > 6 * 3_600_000;
  if (item.status === 'completato' || stale) return { sent: 0 };

  // Voci personali: solo il proprietario. Agende condivise: tutti i membri.
  let recipients = [parent.id];
  let agendaName: string | undefined;
  if (parent.parent.id === 'agendas') {
    const agenda = await parent.get();
    recipients = (agenda.get('members') as string[] | undefined) ?? [];
    agendaName = agenda.get('name') as string | undefined;
  }

  let sent = 0;
  let attempts = 0;
  let failures = 0;
  let lastError: unknown;
  for (const uid of recipients) {
    const userRef = db.collection('users').doc(uid);
    const tokens = (await userRef.collection('fcmTokens').get()).docs.map((d) => d.id);
    if (!tokens.length) continue;
    attempts++;
    const data = buildMessage(snap.id, item, remindAt, uid, agendaName);
    let res: Awaited<ReturnType<Messaging['sendEachForMulticast']>>;
    try {
      res = await messaging.sendEachForMulticast({
        tokens,
        data,
        webpush: { headers: { Urgency: data.urgent === 'true' ? 'high' : 'normal', TTL: '86400' } },
      });
    } catch (e) {
      failures++;
      lastError = e;
      continue;
    }
    const invalid = res.responses
      .map((r, i) => (!r.success && r.error && INVALID_TOKEN_CODES.has(r.error.code) ? tokens[i] : null))
      .filter((t): t is string => t !== null);
    await Promise.all(invalid.map((t) => userRef.collection('fcmTokens').doc(t).delete()));
    sent += res.successCount;
  }

  if (attempts > 0 && failures === attempts) {
    // Invio non riuscito: ripristina il promemoria così verrà ritentato al prossimo giro.
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(snap.ref);
      const current = (fresh.get('remindAt') as Timestamp | null | undefined)?.toMillis() ?? null;
      if (fresh.exists && current === (nextRemindAt?.getTime() ?? null)) tx.update(snap.ref, { remindAt: item.remindAt });
    });
    throw lastError;
  }
  return { sent };
}

/** Invia le notifiche dei promemoria scaduti e programma le ricorrenze successive. */
export async function processDueReminders(db: Firestore, messaging: Messaging, now = new Date()) {
  const { Timestamp } = await import('firebase-admin/firestore');
  const due = await db.collectionGroup('items').where('remindAt', '<=', Timestamp.fromDate(now)).limit(500).get();
  let sent = 0;
  for (const doc of due.docs) {
    try {
      sent += (await processOne(db, messaging, doc, now)).sent;
    } catch (e) {
      console.error(`Errore promemoria ${doc.ref.path}`, e);
    }
  }
  return { processed: due.size, sent };
}
