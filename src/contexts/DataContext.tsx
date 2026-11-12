import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { subscribeItems } from '../lib/items';
import { subscribeProfile } from '../lib/profile';
import { DEFAULT_TIMEZONE } from '../lib/time';
import { errorMessage } from '../lib/errors';
import type { Item, UserProfile } from '../lib/types';

interface DataApi {
  items: Item[];
  itemsLoading: boolean;
  profile: UserProfile | null;
  timezone: string;
  error: string | null;
  getItem: (id: string) => Item | undefined;
}

const Ctx = createContext<DataApi | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setProfile(null);
      setItemsLoading(true);
      return;
    }
    const onErr = (e: Error) => setError(errorMessage(e, 'Impossibile caricare i dati. Riprova più tardi.'));
    const unsubItems = subscribeItems(
      user.uid,
      (list) => {
        setItems(list);
        setItemsLoading(false);
        setError(null);
      },
      (e) => {
        setItemsLoading(false);
        onErr(e);
      },
    );
    const unsubProfile = subscribeProfile(user.uid, setProfile, onErr);
    return () => {
      unsubItems();
      unsubProfile();
    };
  }, [user]);

  const value = useMemo<DataApi>(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    return {
      items,
      itemsLoading,
      profile,
      timezone: profile?.timezone || DEFAULT_TIMEZONE,
      error,
      getItem: (id) => byId.get(id),
    };
  }, [items, itemsLoading, profile, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData fuori da DataProvider');
  return ctx;
}
