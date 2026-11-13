import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteToken, getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging';
import { getFirebase, vapidKey } from './firebase';

export type PushState = 'granted' | 'denied' | 'default' | 'unsupported';

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export async function pushSupported(): Promise<boolean> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
  return isSupported().catch(() => false);
}

export async function getPushState(): Promise<PushState> {
  if (!(await pushSupported())) return 'unsupported';
  return Notification.permission as PushState;
}

async function swRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return navigator.serviceWorker.ready;
}

const tokenKey = (uid: string) => `agendly.fcmToken.${uid}`;
const SESSION_CACHE = 'agendly-session';
const SESSION_URL = '/__agendly_session';

/** Questo dispositivo ha un token push registrato per l'utente? */
export function hasDeviceToken(uid: string): boolean {
  return !!localStorage.getItem(tokenKey(uid));
}

/**
 * Comunica al service worker l'utente attualmente connesso: le push destinate a un altro
 * utente (es. token non revocato dopo un logout offline) vengono mostrate senza contenuti privati.
 */
export async function setPushSession(uid: string | null): Promise<void> {
  if (!('caches' in window)) return;
  const cache = await caches.open(SESSION_CACHE);
  if (uid) await cache.put(SESSION_URL, new Response(uid));
  else await cache.delete(SESSION_URL);
}

/** Chiede il permesso, ottiene il token FCM e lo salva in users/{uid}/fcmTokens/{token}. */
export async function enablePush(uid: string): Promise<PushState> {
  if (!(await pushSupported())) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission as PushState;
  if (!vapidKey) throw new Error('Chiave VAPID mancante: imposta VITE_FIREBASE_VAPID_KEY.');
  const messaging = getMessaging(getFirebase().app);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: await swRegistration() });
  if (!token) throw new Error('Impossibile ottenere il token per le notifiche. Riprova.');
  await setDoc(doc(getFirebase().db, 'users', uid, 'fcmTokens', token), {
    token,
    userAgent: navigator.userAgent.slice(0, 300),
    createdAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
  });
  localStorage.setItem(tokenKey(uid), token);
  return 'granted';
}

export async function disablePush(uid: string): Promise<void> {
  const token = localStorage.getItem(tokenKey(uid));
  if (await pushSupported()) {
    await deleteToken(getMessaging(getFirebase().app)).catch(() => undefined);
  }
  if (token) {
    await deleteDoc(doc(getFirebase().db, 'users', uid, 'fcmTokens', token)).catch(() => undefined);
    localStorage.removeItem(tokenKey(uid));
  }
}

/** Notifiche ricevute con l'app in primo piano. */
export async function listenForeground(cb: (payload: MessagePayload) => void): Promise<() => void> {
  if (!(await pushSupported())) return () => undefined;
  return onMessage(getMessaging(getFirebase().app), cb);
}

export interface LocalNotification {
  title: string;
  body: string;
  itemId: string;
  tag: string;
  urgent?: boolean;
}

/** Mostra una notifica di sistema tramite il service worker (stesso formato delle push). */
export async function showLocalNotification(n: LocalNotification): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker?.getRegistration();
  const options: NotificationOptions & { actions?: { action: string; title: string }[]; renotify?: boolean; requireInteraction?: boolean } = {
    body: n.body,
    tag: n.tag,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    data: { url: `/voce/${n.itemId}` },
    actions: [{ action: 'open', title: 'Apri Agendly' }],
    requireInteraction: n.urgent,
  };
  if (reg) await reg.showNotification(n.title, options);
  else new Notification(n.title, options);
}
