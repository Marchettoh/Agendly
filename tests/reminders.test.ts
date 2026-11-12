import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeApp, deleteApp } from '../functions/node_modules/firebase-admin/lib/app/index.js';
import { getFirestore, Timestamp } from '../functions/node_modules/firebase-admin/lib/firestore/index.js';
import { buildMessage, nextReminder, processDueReminders } from '../functions/src/reminders';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
const app = initializeApp({ projectId: 'demo-agendly' }, 'reminders-test');
const db = getFirestore(app);

const base = {
  type: 'promemoria',
  title: 'Chiamare il fornitore',
  description: '',
  timezone: 'Europe/Rome',
  category: 'lavoro',
  priority: 'urgente',
  status: 'da_fare',
  reminderMinutes: 15,
} as const;

beforeEach(async () => {
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-agendly/databases/(default)/documents', { method: 'DELETE' });
});
afterAll(() => deleteApp(app));

describe('nextReminder (fuso Europe/Rome e ora legale)', () => {
  it('calcola correttamente l’istante nel giorno del cambio d’ora (29 marzo 2026)', () => {
    const r = nextReminder({ ...base, date: '2026-03-29', time: '10:00', recurrence: 'none', remindAt: null, startAt: null as never }, new Date('2026-03-01T00:00:00Z'));
    // 10:00 CEST = 08:00 UTC, meno 15 minuti
    expect(r?.at.toISOString()).toBe('2026-03-29T07:45:00.000Z');
  });

  it('per le ricorrenze giornaliere salta alla prossima occorrenza futura mantenendo l’ora locale', () => {
    const r = nextReminder({ ...base, date: '2026-03-27', time: '10:00', recurrence: 'daily', remindAt: null, startAt: null as never }, new Date('2026-03-28T09:00:00Z'));
    expect(r?.date).toBe('2026-03-29');
    expect(r?.at.toISOString()).toBe('2026-03-29T07:45:00.000Z');
  });

  it('il messaggio contiene titolo, testo, ora e link al dettaglio', () => {
    const m = buildMessage('abc', { ...base, date: '2026-03-29', time: '10:00', recurrence: 'none', remindAt: null, startAt: null as never }, new Date('2026-03-29T07:45:00Z'));
    expect(m.title).toBe('URGENTE · Chiamare il fornitore');
    expect(m.body).toContain('domenica 29 marzo alle 10:00');
    expect(m.itemId).toBe('abc');
    expect(m.urgent).toBe('true');
  });
});

describe('ricorrenze mensili', () => {
  it('dopo il completamento resta ancorata al 31 del mese', () => {
    const r = nextReminder({ ...base, date: '2026-02-28', anchorDate: '2026-01-31', time: '10:00', recurrence: 'monthly', remindAt: null, startAt: null as never }, new Date('2026-03-01T00:00:00Z'));
    expect(r?.date).toBe('2026-03-31');
  });
});

describe('processDueReminders', () => {
  it('esecuzioni concorrenti inviano una sola push per occorrenza', async () => {
    const user = db.doc('users/bob');
    await user.collection('fcmTokens').doc('good').set({ token: 'good' });
    await user.collection('items').doc('x').set({ ...base, date: '2026-03-29', time: '10:00', recurrence: 'none', remindAt: Timestamp.fromDate(new Date('2026-03-29T07:45:00Z')) });
    const send = vi.fn(async ({ tokens }: { tokens: string[] }) => ({ successCount: tokens.length, responses: tokens.map(() => ({ success: true })) }));
    const now = new Date('2026-03-29T07:46:00Z');
    await Promise.all([processDueReminders(db, { sendEachForMulticast: send } as never, now), processDueReminders(db, { sendEachForMulticast: send } as never, now)]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).not.toHaveProperty('webpush.fcmOptions');
  });

  it('se l’invio fallisce il promemoria resta in coda per un nuovo tentativo', async () => {
    const user = db.doc('users/carla');
    await user.collection('fcmTokens').doc('good').set({ token: 'good' });
    const at = Timestamp.fromDate(new Date('2026-03-29T07:45:00Z'));
    await user.collection('items').doc('y').set({ ...base, date: '2026-03-29', time: '10:00', recurrence: 'none', remindAt: at });
    const send = vi.fn(async () => { throw new Error('rete'); });
    await processDueReminders(db, { sendEachForMulticast: send } as never, new Date('2026-03-29T07:46:00Z'));
    expect(((await user.collection('items').doc('y').get()).get('remindAt') as Timestamp).toMillis()).toBe(at.toMillis());
  });

  it('invia le push, rimuove i token non validi e aggiorna remindAt', async () => {
    const now = new Date('2026-03-29T07:46:00Z');
    const user = db.doc('users/alice');
    await user.collection('fcmTokens').doc('good').set({ token: 'good' });
    await user.collection('fcmTokens').doc('bad').set({ token: 'bad' });
    await user.collection('items').doc('once').set({ ...base, date: '2026-03-29', time: '10:00', recurrence: 'none', remindAt: Timestamp.fromDate(new Date('2026-03-29T07:45:00Z')) });
    await user.collection('items').doc('daily').set({ ...base, priority: 'media', date: '2026-03-29', time: '10:00', recurrence: 'daily', remindAt: Timestamp.fromDate(new Date('2026-03-29T07:45:00Z')) });
    await user.collection('items').doc('future').set({ ...base, date: '2026-03-30', time: '10:00', recurrence: 'none', remindAt: Timestamp.fromDate(new Date('2026-03-30T07:45:00Z')) });

    const send = vi.fn(async ({ tokens }: { tokens: string[] }) => ({
      successCount: tokens.filter((t) => t === 'good').length,
      responses: tokens.map((t) => (t === 'good' ? { success: true } : { success: false, error: { code: 'messaging/registration-token-not-registered' } })),
    }));
    const result = await processDueReminders(db, { sendEachForMulticast: send } as never, now);

    expect(result.processed).toBe(2);
    expect(result.sent).toBe(2);
    expect(send).toHaveBeenCalledTimes(2);
    const first = send.mock.calls[0][0] as unknown as { data: Record<string, string>; webpush: { headers: Record<string, string> } };
    expect(first.data.title).toContain('Chiamare il fornitore');
    expect((await user.collection('fcmTokens').doc('bad').get()).exists).toBe(false);
    expect((await user.collection('items').doc('once').get()).get('remindAt')).toBeNull();
    const daily = (await user.collection('items').doc('daily').get()).get('remindAt') as Timestamp;
    expect(daily.toDate().toISOString()).toBe('2026-03-30T07:45:00.000Z');
    expect(((await user.collection('items').doc('future').get()).get('remindAt') as Timestamp).toDate().toISOString()).toBe('2026-03-30T07:45:00.000Z');
  });
});
