import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { subscribeAgendaItems, subscribeItems } from '../lib/items';
import { subscribeAgendas } from '../lib/agendas';
import { subscribeProfile } from '../lib/profile';
import { DEFAULT_TIMEZONE } from '../lib/time';
import { errorMessage } from '../lib/errors';
import type { Agenda, Item, UserProfile } from '../lib/types';

interface DataApi {
  /** Voci personali e delle agende condivise di cui l'utente è membro */
  items: Item[];
  itemsLoading: boolean;
  profile: UserProfile | null;
  agendas: Agenda[];
  /** Agenda predefinita per i nuovi impegni, null = personale */
  defaultAgendaId: string | null;
  agendaName: (id: string | null) => string | null;
  timezone: string;
  error: string | null;
  getItem: (id: string) => Item | undefined;
}

const Ctx = createContext<DataApi | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [personal, setPersonal] = useState<Item[]>([]);
  const [shared, setShared] = useState<Record<string, Item[]>>({});
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPersonal([]);
      setShared({});
      setAgendas([]);
      setProfile(null);
      setItemsLoading(true);
      return;
    }
    const onErr = (e: Error) => setError(errorMessage(e, 'Impossibile caricare i dati. Riprova più tardi.'));
    const unsubItems = subscribeItems(
      user.uid,
      (list) => {
        setPersonal(list);
        setItemsLoading(false);
        setError(null);
      },
      (e) => {
        setItemsLoading(false);
        onErr(e);
      },
    );
    const unsubProfile = subscribeProfile(user.uid, setProfile, onErr);
    const unsubAgendas = subscribeAgendas(user.uid, setAgendas, onErr);
    return () => {
      unsubItems();
      unsubProfile();
      unsubAgendas();
    };
  }, [user]);

  const agendaIds = agendas.map((a) => a.id).join(',');
  useEffect(() => {
    if (!agendaIds) {
      setShared({});
      return;
    }
    const ids = agendaIds.split(',');
    setShared((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => ids.includes(id))));
    const unsubs = ids.map((id) =>
      subscribeAgendaItems(
        id,
        (list) => setShared((prev) => ({ ...prev, [id]: list })),
        (e) => console.error('Agenda condivisa non disponibile', id, e),
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [agendaIds]);

  const value = useMemo<DataApi>(() => {
    const items = [...personal, ...Object.values(shared).flat()].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    const byId = new Map(items.map((i) => [i.id, i]));
    const names = new Map(agendas.map((a) => [a.id, a.name]));
    const preferred = profile?.defaultAgendaId ?? null;
    return {
      items,
      itemsLoading,
      profile,
      agendas,
      defaultAgendaId: preferred && names.has(preferred) ? preferred : null,
      agendaName: (id) => (id ? (names.get(id) ?? 'Agenda condivisa') : null),
      timezone: profile?.timezone || DEFAULT_TIMEZONE,
      error,
      getItem: (id) => byId.get(id),
    };
  }, [personal, shared, agendas, itemsLoading, profile, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData fuori da DataProvider');
  return ctx;
}
