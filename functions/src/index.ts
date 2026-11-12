import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { processDueReminders } from './reminders';

initializeApp();

/** Ogni minuto invia le notifiche push dei promemoria in scadenza. */
export const sendDueReminders = onSchedule(
  { schedule: 'every 1 minutes', timeZone: 'Europe/Rome', region: 'europe-west1', memory: '256MiB', timeoutSeconds: 120, retryCount: 0 },
  async () => {
    const result = await processDueReminders(getFirestore(), getMessaging());
    if (result.processed) logger.info('Promemoria elaborati', result);
  },
);
