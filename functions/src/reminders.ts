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

export function buildMessage(id: string, item: ItemData, remindAt: Date, uid = '') {
  const { start } = occurrenceFor(item, remindAt);
  const tz = item.timezone;
  const when = item.time
    ? formatInTimeZone(start, tz, "EEEE d MMMM 'alle' HH:mm", { locale: it })
    : `${formatInTimeZone(start, tz, 'EEEE d MMMM', { locale: it })} (in giornata)`;
  const urgent = item.priority === 'urgente';
  return {
    title: urgent ? `URGENTE · ${item.title}` : item.title,
    body: `${item.description ? `${item.description.slice(0, 80)}\n` : ''}${when}`,
    itemId: id,
    uid,
    tag: `${id}-${remindAt.getTime()}`,
    urgent: String(urgent),
    time: String(start.getTime()),
  };
}

async function processOne(db: Firestore, messaging: Messaging, snap: QueryDocumentSnapshot, now: Date) {
  const item = snap.data() as ItemData;
  const userRef = snap.ref.parent.parent;
  if (!userRef || !item.remindAt) return { sent: 0 };
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

  const tokensSnap = await userRef.collection('fcmTokens').get();
  const tokens = tokensSnap.docs.map((d) => d.id);
  if (!tokens.length) return { sent: 0 };

  const data = buildMessage(snap.id, item, remindAt, userRef.id);
  let res: Awaited<ReturnType<Messaging['sendEachForMulticast']>>;
  try {
    res = await messaging.sendEachForMulticast({
      tokens,
      data,
      webpush: { headers: { Urgency: data.urgent === 'true' ? 'high' : 'normal', TTL: '86400' } },
    });
  } catch (e) {
    // Invio non riuscito: ripristina il promemoria così verrà ritentato al prossimo giro.
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(snap.ref);
      const current = (fresh.get('remindAt') as Timestamp | null | undefined)?.toMillis() ?? null;
      if (fresh.exists && current === (nextRemindAt?.getTime() ?? null)) tx.update(snap.ref, { remindAt: item.remindAt });
    });
    throw e;
  }
  const invalid = res.responses
    .map((r, i) => (!r.success && r.error && INVALID_TOKEN_CODES.has(r.error.code) ? tokens[i] : null))
    .filter((t): t is string => t !== null);
  await Promise.all(invalid.map((t) => userRef.collection('fcmTokens').doc(t).delete()));
  return { sent: res.successCount };
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
