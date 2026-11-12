import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

const item = (over: Record<string, unknown> = {}) => ({
  type: 'attivita',
  title: 'Pagare fattura',
  description: '',
  date: '2026-03-29',
  time: '10:00',
  timezone: 'Europe/Rome',
  startAt: Timestamp.fromDate(new Date('2026-03-29T08:00:00Z')),
  category: 'lavoro',
  priority: 'urgente',
  status: 'da_fare',
  reminderMinutes: 15,
  remindAt: null,
  recurrence: 'none',
  completedAt: null,
  ...over,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-agendly',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
beforeEach(() => env.clearFirestore());
afterAll(() => env.cleanup());

describe('Firestore rules', () => {
  it('il proprietario può creare, leggere, modificare ed eliminare le proprie voci', async () => {
    const db = env.authenticatedContext('alice').firestore();
    const ref = doc(db, 'users/alice/items/1');
    await assertSucceeds(setDoc(ref, item()));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(getDocs(collection(db, 'users/alice/items')));
    await assertSucceeds(updateDoc(ref, { status: 'completato' }));
    await assertSucceeds(deleteDoc(ref));
  });

  it('un altro utente non può leggere né scrivere le voci altrui', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'users/alice/items/1'), item()));
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(bob, 'users/alice/items/1')));
    await assertFails(getDocs(collection(bob, 'users/alice/items')));
    await assertFails(setDoc(doc(bob, 'users/alice/items/2'), item()));
    await assertFails(updateDoc(doc(bob, 'users/alice/items/1'), { title: 'hack' }));
    await assertFails(deleteDoc(doc(bob, 'users/alice/items/1')));
  });

  it('gli utenti non autenticati non hanno accesso', async () => {
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'users/alice')));
    await assertFails(setDoc(doc(anon, 'users/alice/items/1'), item()));
  });

  it('rifiuta voci non valide', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'users/alice/items/a'), item({ title: '' })));
    await assertFails(setDoc(doc(db, 'users/alice/items/b'), item({ priority: 'altissima' })));
    await assertFails(setDoc(doc(db, 'users/alice/items/c'), item({ date: '29/03/2026' })));
    await assertFails(setDoc(doc(db, 'users/alice/items/d'), item({ owner: 'bob' })));
    await assertFails(setDoc(doc(db, 'users/alice/items/e'), item({ reminderMinutes: -5 })));
  });

  it('profilo e token FCM: solo il proprietario', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    const bob = env.authenticatedContext('bob').firestore();
    const profile = { displayName: 'Alice', email: 'a@x.it', timezone: 'Europe/Rome', notificationsEnabled: false, theme: 'system' };
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), profile));
    await assertFails(getDoc(doc(bob, 'users/alice')));
    await assertFails(setDoc(doc(alice, 'users/alice'), { ...profile, isAdmin: true }));
    await assertSucceeds(setDoc(doc(alice, 'users/alice/fcmTokens/tok1'), { token: 'tok1', userAgent: 'test' }));
    await assertFails(setDoc(doc(alice, 'users/alice/fcmTokens/tok2'), { token: 'altro', userAgent: 'test' }));
    await assertFails(getDoc(doc(bob, 'users/alice/fcmTokens/tok1')));
  });
});
