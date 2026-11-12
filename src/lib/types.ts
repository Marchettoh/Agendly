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
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Item extends Omit<ItemDoc, 'startAt' | 'remindAt' | 'completedAt' | 'createdAt' | 'updatedAt'> {
  id: string;
  startAt: Date;
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
}

export interface ItemInput {
  type: ItemType;
  title: string;
  description: string;
  date: string;
  time: string | null;
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
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
