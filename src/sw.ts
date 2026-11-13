/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

self.skipWaiting();
clientsClaim();

// App shell offline
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/__\//, /^\/api\//] }));
registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font',
  new CacheFirst({ cacheName: 'agendly-assets', plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 })] }),
);

// Firebase Cloud Messaging: messaggi "data-only" inviati dalla Cloud Function
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Utente connesso nell'app (scritto da setPushSession in src/lib/messaging.ts). */
async function sessionUid(): Promise<string | null> {
  const res = await (await caches.open('agendly-session')).match('/__agendly_session');
  return res ? res.text() : null;
}

if (firebaseConfig.apiKey && firebaseConfig.messagingSenderId) {
  const messaging = getMessaging(initializeApp(firebaseConfig));
  onBackgroundMessage(messaging, async (payload) => {
    const d = payload.data ?? {};
    if (d.uid && d.uid !== (await sessionUid())) {
      return self.registration.showNotification('Agendly', {
        body: 'Hai un promemoria. Accedi per vederlo.',
        tag: d.tag,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-96.png',
        data: { url: '/' },
      });
    }
    const urgent = d.urgent === 'true';
    const options: NotificationOptions & { actions?: { action: string; title: string }[]; renotify?: boolean; requireInteraction?: boolean; vibrate?: number[] } = {
      body: d.body ?? '',
      tag: d.tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      data: { url: d.itemId ? `/voce/${d.itemId}` : '/' },
      actions: [{ action: 'open', title: 'Apri Agendly' }],
      requireInteraction: urgent,
      vibrate: urgent ? [200, 100, 200, 100, 200] : [100],
      timestamp: d.time ? Number(d.time) : Date.now(),
    } as NotificationOptions;
    return self.registration.showNotification(d.title ?? 'Agendly', options);
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path: string = event.notification.data?.url ?? '/';
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          await client.focus();
          if ('navigate' in client) await (client as WindowClient).navigate(target).catch(() => undefined);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
