import { useEffect } from 'react';
import { useNow } from './useNow';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { listenForeground, showLocalNotification } from '../lib/messaging';
import { capitalize, formatInTz } from '../lib/time';
import type { Item } from '../lib/types';

const MAX_TIMEOUT = 2_147_000_000;
const shownTags = new Set<string>();

/** Stesso formato delle push del server: "Agendly" in alto, sotto nome e dettagli dell'impegno. */
export function notificationText(item: Item, tz: string, agendaName?: string | null) {
  let when = item.time ? formatInTz(item.startAt, tz, 'EEEE d MMMM, HH:mm') : `${formatInTz(item.startAt, tz, 'EEEE d MMMM')} (in giornata)`;
  if (item.endAt) {
    if (item.endDate) when += ` → ${formatInTz(item.endAt, tz, item.endTime ? 'EEEE d MMMM, HH:mm' : 'EEEE d MMMM')}`;
    else if (item.endTime) when += `–${formatInTz(item.endAt, tz, 'HH:mm')}`;
  }
  return {
    title: item.priority === 'urgente' ? 'Agendly · Urgente' : 'Agendly',
    body: [item.title, capitalize(when), agendaName ? `Agenda: ${agendaName}` : '', item.description.slice(0, 120)].filter(Boolean).join('\n'),
  };
}

/**
 * Con l'app aperta programma localmente i promemoria imminenti (stesso tag usato dalle
 * push del server, così il sistema non mostra duplicati) e intercetta le push in primo piano.
 */
export function useReminderWatcher() {
  const { items, timezone, agendaName } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  // Riprogramma periodicamente: i promemoria oltre le 24 ore vengono armati quando si avvicinano.
  const tick = useNow(15 * 60_000);

  useEffect(() => {
    const now = tick.getTime();
    const timers = items
      .filter((i) => i.remindAt && i.remindAt.getTime() > now && i.remindAt.getTime() - now < MAX_TIMEOUT && i.remindAt.getTime() - now < 86_400_000)
      .map((i) =>
        setTimeout(() => {
          const { title, body } = notificationText(i, timezone, agendaName(i.agendaId));
          const tag = `${i.id}-${i.remindAt!.getTime()}`;
          if (shownTags.has(tag)) return;
          shownTags.add(tag);
          showLocalNotification({ title, body, itemId: i.id, tag, urgent: i.priority === 'urgente' });
          toast.show(i.title, i.priority === 'urgente' ? 'error' : 'info', { label: 'Apri', onClick: () => navigate(`/voce/${i.id}`) });
        }, i.remindAt!.getTime() - now),
      );
    return () => timers.forEach(clearTimeout);
  }, [items, timezone, toast, navigate, tick, agendaName]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    listenForeground((payload) => {
      const d = payload.data ?? {};
      if (d.tag && shownTags.has(d.tag)) return;
      if (d.tag) shownTags.add(d.tag);
      const title = d.itemTitle ?? d.title ?? payload.notification?.title ?? 'Agendly';
      toast.show(title, d.urgent === 'true' ? 'error' : 'info', d.itemId ? { label: 'Apri', onClick: () => navigate(`/voce/${d.itemId}`) } : undefined);
    }).then((u) => (unsub = u));
    return () => unsub?.();
  }, [toast, navigate]);
}
