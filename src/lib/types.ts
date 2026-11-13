import type { Timestamp } from 'firebase/firestore';

export type ItemType = 'evento' | 'attivita' | 'promemoria';
export type Category = 'lavoro' | 'personale' | 'famiglia' | 'acquisti' | 'salute' | 'altro';
export type Priority = 'bassa' | 'media' | 'alta' | 'urgente';
export type Status = 'da_fare' | 'in_corso' | 'completato' | 'rinviato';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

/** Documento Firestore: users/{uid}/items/{itemId} */
export interface ItemDoc {
  type: ItemType;
  title: string;
  description: string;
  /** Data locale nel fuso dell'utente, formato YYYY-MM-DD */
  date: string;
  /** Ora locale HH:mm, null se senza orario (es. attività con sola scadenza) */
  time: string | null;
  /** Fuso orario IANA con cui sono espressi date/time */
  timezone: string;
  /** Istante UTC di inizio/scadenza (per ordinamento e query) */
  startAt: Timestamp;
  category: Category;
  priority: Priority;
  status: Status;
  /** Minuti di anticipo del promemoria, null = nessun promemoria */
  reminderMinutes: number | null;
  /** Prossimo istante in cui inviare la notifica push, null se nessuna in sospeso */
  remindAt: Timestamp | null;
  recurrence: Recurrence;
  /** Data della prima occorrenza della serie, base per calcolare le ricorrenze */
  anchorDate?: string;
  /** Fine facoltativa: endDate solo se diversa da date (più giorni), endTime nello stesso fuso */
  endDate?: string | null;
  endTime?: string | null;
  endAt?: Timestamp | null;
  /** Solo nelle agende condivise: chi ha creato la voce */
  createdBy?: string;
  createdByName?: string;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Item extends Omit<ItemDoc, 'startAt' | 'endAt' | 'remindAt' | 'completedAt' | 'createdAt' | 'updatedAt'> {
  id: string;
  /** null = agenda personale, altrimenti id dell'agenda condivisa */
  agendaId: string | null;
  startAt: Date;
  endAt: Date | null;
  remindAt: Date | null;
  completedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/** Occorrenza visualizzata (gli elementi ricorrenti vengono espansi nelle viste). */
export interface Occurrence {
  item: Item;
  date: string;
  startAt: Date;
  isRecurringInstance: boolean;
  /** Giorno successivo al primo di un impegno su più giorni */
  continued?: boolean;
}

export interface ItemInput {
  type: ItemType;
  title: string;
  description: string;
  date: string;
  time: string | null;
  endDate: string | null;
  endTime: string | null;
  category: Category;
  priority: Priority;
  status: Status;
  reminderMinutes: number | null;
  recurrence: Recurrence;
}

export type ThemePref = 'system' | 'light' | 'dark';

/** Documento Firestore: users/{uid} */
export interface UserProfile {
  displayName: string;
  email: string;
  timezone: string;
  notificationsEnabled: boolean;
  theme: ThemePref;
  /** Agenda in cui finiscono i nuovi impegni (null = personale) */
  defaultAgendaId?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/** Documento Firestore: agendas/{agendaId} */
export interface Agenda {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  memberNames: Record<string, string>;
  inviteCode: string;
  /** Scrittura locale non ancora confermata dal server */
  pending?: boolean;
}
