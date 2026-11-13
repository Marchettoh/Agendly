import { useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { completeItem, moveItem, reopenItem } from '../lib/items';
import { errorMessage } from '../lib/errors';
import { relativeDayLabel } from '../lib/time';
import type { Item } from '../lib/types';

export function useItemActions() {
  const { user } = useAuth();
  const { timezone } = useData();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggle = useCallback(
    async (item: Item) => {
      if (!user) return;
      setBusyId(item.id);
      try {
        if (item.status === 'completato') {
          await reopenItem(user.uid, item);
          toast.show('Segnato come da fare');
        } else {
          const next = await completeItem(user.uid, item);
          toast.success(next ? `Completato. Prossima volta: ${relativeDayLabel(next, timezone).toLowerCase()}` : 'Completato!', next ? undefined : { label: 'Annulla', onClick: () => reopenItem(user.uid, { ...item, status: 'completato' }) });
        }
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setBusyId(null);
      }
    },
    [user, toast, timezone],
  );

  const move = useCallback(
    async (item: Item, date: string) => {
      if (!user) return;
      try {
        await moveItem(user.uid, item, date);
        toast.success(`Spostato a ${relativeDayLabel(date, timezone).toLowerCase()}`);
      } catch (e) {
        toast.error(errorMessage(e));
        throw e;
      }
    },
    [user, toast, timezone],
  );

  return { toggle, move, busyId };
}
