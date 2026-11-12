import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { listenForeground, showLocalNotification } from '../lib/messaging';
import { formatInTz } from '../lib/time';
import type { Item } from '../lib/types';

const MAX_TIMEOUT = 2_147_000_000;
const shownTags = new Set<string>();

export function notificationText(item: Item, tz: string) {
  const when = item.time ? formatInTz(item.startAt, tz, "EEEE d MMMM 'alle' HH:mm") : `${formatInTz(item.startAt, tz, 'EEEE d MMMM')} (in giornata)`;
  return {
    title: item.priority === 'urgente' ? `URGENTE · ${item.title}` : item.title,
    body: `${item.description ? `${item.description.slice(0, 80)}\n` : ''}${when}`,
  };
}

/**
 * Con l'app aperta programma localmente i promemoria imminenti (stesso tag usato dalle
 * push del server, così il sistema non mostra duplicati) e intercetta le push in primo piano.
 */
export function useReminderWatcher() {
  const { items, timezone } = useData();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const now = Date.now();
    const timers = items
      .filter((i) => i.remindAt && i.remindAt.getTime() > now && i.remindAt.getTime() - now < MAX_TIMEOUT && i.remindAt.getTime() - now < 86_400_000)
      .map((i) =>
        setTimeout(() => {
          const { title, body } = notificationText(i, timezone);
          const tag = `${i.id}-${i.remindAt!.getTime()}`;
          if (shownTags.has(tag)) return;
          shownTags.add(tag);
          showLocalNotification({ title, body, itemId: i.id, tag, urgent: i.priority === 'urgente' });
          toast.show(title, i.priority === 'urgente' ? 'error' : 'info', { label: 'Apri', onClick: () => navigate(`/voce/${i.id}`) });
        }, i.remindAt!.getTime() - now),
      );
    return () => timers.forEach(clearTimeout);
  }, [items, timezone, toast, navigate]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    listenForeground((payload) => {
      const d = payload.data ?? {};
      if (d.tag && shownTags.has(d.tag)) return;
      if (d.tag) shownTags.add(d.tag);
      const title = d.title ?? payload.notification?.title ?? 'Agendly';
      toast.show(title, d.urgent === 'true' ? 'error' : 'info', d.itemId ? { label: 'Apri', onClick: () => navigate(`/voce/${d.itemId}`) } : undefined);
    }).then((u) => (unsub = u));
    return () => unsub?.();
  }, [toast, navigate]);
}
