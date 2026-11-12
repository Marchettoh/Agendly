import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { getFirebase } from './firebase';
import { DEFAULT_REMINDER_TIME, nextOccurrenceDate, nextRecurringDate, todayKey, zonedToUtc } from './time';
import type { Item, ItemDoc, ItemInput, Recurrence, Status } from './types';

const itemsCol = (uid: string) => collection(getFirebase().db, 'users', uid, 'items');
const itemRef = (uid: string, id: string) => doc(getFirebase().db, 'users', uid, 'items', id);

/**
 * Le scritture Firestore vengono applicate subito alla cache locale, ma la Promise
 * si risolve solo alla conferma del server. Offline non attendiamo, così l'interfaccia
 * resta reattiva e la sincronizzazione avviene al ritorno della rete.
 */
async function commit(write: Promise<void>): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    write.catch((e) => console.error('Sincronizzazione fallita', e));
    return;
  }
  await write;
}

export function reminderInstant(date: string, time: string | null, tz: string, minutes: number): Date {
  return new Date(zonedToUtc(date, time ?? DEFAULT_REMINDER_TIME, tz).getTime() - minutes * 60_000);
}

/** Prossimo istante futuro in cui inviare il promemoria (considera le ricorrenze). */
export function computeRemindAt(
  fields: {
    date: string;
    anchorDate?: string;
    time: string | null;
    timezone: string;
    reminderMinutes: number | null;
    recurrence: Recurrence;
    status: Status;
  },
  now = new Date(),
): Date | null {
  if (fields.reminderMinutes === null || fields.status === 'completato') return null;
  const anchor = fields.anchorDate ?? fields.date;
  for (let step = 0; step < 5000; step++) {
    const date = fields.recurrence === 'none' ? fields.date : nextOccurrenceDate(anchor, fields.recurrence, step);
    if (date < fields.date) continue;
    const at = reminderInstant(date, fields.time, fields.timezone, fields.reminderMinutes);
    if (at.getTime() > now.getTime()) return at;
    if (fields.recurrence === 'none') return null;
  }
  return null;
}

function derived(input: Pick<ItemInput, 'date' | 'time' | 'reminderMinutes' | 'recurrence' | 'status'>, timezone: string, anchorDate: string) {
  const startAt = zonedToUtc(input.date, input.time, timezone);
  const remindAt = computeRemindAt({ ...input, anchorDate, timezone });
  return {
    startAt: Timestamp.fromDate(startAt),
    remindAt: remindAt ? Timestamp.fromDate(remindAt) : null,
  };
}

export function fromSnapshot(snap: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): Item | null {
  const d = snap.data({ serverTimestamps: 'estimate' }) as ItemDoc | undefined;
  if (!d) return null;
  return {
    ...d,
    id: snap.id,
    description: d.description ?? '',
    startAt: d.startAt.toDate(),
    remindAt: d.remindAt ? d.remindAt.toDate() : null,
    completedAt: d.completedAt ? d.completedAt.toDate() : null,
    createdAt: d.createdAt ? d.createdAt.toDate() : null,
    updatedAt: d.updatedAt ? d.updatedAt.toDate() : null,
  };
}

export function subscribeItems(uid: string, onData: (items: Item[]) => void, onError: (e: Error) => void) {
  const q = query(itemsCol(uid), orderBy('startAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => fromSnapshot(d)).filter((x): x is Item => x !== null)),
    onError,
  );
}

export async function createItem(uid: string, rawInput: ItemInput, timezone: string): Promise<string> {
  const ref = doc(itemsCol(uid));
  const anchorDate = rawInput.date;
  const input = advanceIfRecurringCompleted(rawInput, anchorDate, timezone);
  const data = {
    ...input,
    anchorDate,
    title: input.title.trim(),
    description: input.description.trim(),
    timezone,
    ...derived(input, timezone, anchorDate),
    completedAt: input.status === 'completato' ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await commit(setDoc(ref, data));
  return ref.id;
}

/** Completare una voce ricorrente la sposta alla prossima occorrenza invece di chiuderla. */
function advanceIfRecurringCompleted(input: ItemInput, anchorDate: string, timezone: string): ItemInput {
  if (input.recurrence === 'none' || input.status !== 'completato') return input;
  return { ...input, date: nextRecurringDate(anchorDate, input.date, input.recurrence, todayKey(timezone)), status: 'da_fare' };
}

export async function updateItem(uid: string, item: Item, rawInput: ItemInput): Promise<void> {
  const seriesChanged = rawInput.date !== item.date || rawInput.recurrence !== item.recurrence;
  const anchorDate = seriesChanged ? rawInput.date : (item.anchorDate ?? item.date);
  const input = advanceIfRecurringCompleted(rawInput, anchorDate, item.timezone);
  const wasCompleted = item.status === 'completato';
  const isCompleted = input.status === 'completato';
  await commit(
    updateDoc(itemRef(uid, item.id), {
      ...input,
      anchorDate,
      title: input.title.trim(),
      description: input.description.trim(),
      ...derived(input, item.timezone, anchorDate),
      completedAt: isCompleted ? (wasCompleted ? item.completedAt : serverTimestamp()) : null,
      updatedAt: serverTimestamp(),
    }),
  );
}

export function toInput(item: Item): ItemInput {
  return {
    type: item.type,
    title: item.title,
    description: item.description,
    date: item.date,
    time: item.time,
    category: item.category,
    priority: item.priority,
    status: item.status,
    reminderMinutes: item.reminderMinutes,
    recurrence: item.recurrence,
  };
}

/**
 * Completa una voce. Per le voci ricorrenti l'occorrenza corrente viene chiusa e la voce
 * avanza alla data successiva. Restituisce la nuova data se la voce è stata spostata.
 */
export async function completeItem(uid: string, item: Item): Promise<string | null> {
  await updateItem(uid, item, { ...toInput(item), status: 'completato' });
  return item.recurrence !== 'none' ? nextRecurringDate(item.anchorDate ?? item.date, item.date, item.recurrence, todayKey(item.timezone)) : null;
}

export async function reopenItem(uid: string, item: Item): Promise<void> {
  await updateItem(uid, item, { ...toInput(item), status: 'da_fare' });
}

/** Restituisce la data della prossima occorrenza se una voce ricorrente è stata completata. */
export async function setItemStatus(uid: string, item: Item, status: Status): Promise<string | null> {
  if (status === 'completato') return completeItem(uid, item);
  await updateItem(uid, item, { ...toInput(item), status });
  return null;
}

export async function moveItem(uid: string, item: Item, date: string): Promise<void> {
  await updateItem(uid, item, { ...toInput(item), date, status: item.status === 'completato' ? 'da_fare' : 'rinviato' });
}

export async function deleteItem(uid: string, id: string): Promise<void> {
  await commit(deleteDoc(itemRef(uid, id)));
}
