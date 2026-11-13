import type { Category, ItemType, Priority, Recurrence, Status } from './types';

export const TYPE_LABELS: Record<ItemType, string> = {
  evento: 'Evento',
  attivita: 'Attività',
  promemoria: 'Promemoria',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  lavoro: 'Lavoro',
  personale: 'Personale',
  famiglia: 'Famiglia',
  acquisti: 'Acquisti',
  salute: 'Salute',
  altro: 'Altro',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  bassa: 'Bassa',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const STATUS_LABELS: Record<Status, string> = {
  da_fare: 'Da fare',
  in_corso: 'In corso',
  completato: 'Completato',
  rinviato: 'Rinviato',
};

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: 'Una tantum',
  daily: 'Ogni giorno',
  weekly: 'Ogni settimana',
  monthly: 'Ogni mese',
};

export const REMINDER_PRESETS: { value: number; label: string }[] = [
  { value: 5, label: '5 minuti prima' },
  { value: 15, label: '15 minuti prima' },
  { value: 30, label: '30 minuti prima' },
  { value: 60, label: '1 ora prima' },
  { value: 1440, label: '1 giorno prima' },
];

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];
export const PRIORITIES = Object.keys(PRIORITY_LABELS) as Priority[];
export const STATUSES = Object.keys(STATUS_LABELS) as Status[];
export const RECURRENCES = Object.keys(RECURRENCE_LABELS) as Recurrence[];
export const TYPES = Object.keys(TYPE_LABELS) as ItemType[];

export function reminderLabel(minutes: number | null): string {
  if (minutes === null) return 'Nessun promemoria';
  const preset = REMINDER_PRESETS.find((p) => p.value === minutes);
  if (preset) return preset.label;
  if (minutes % 1440 === 0) return `${minutes / 1440} giorni prima`;
  if (minutes % 60 === 0) return `${minutes / 60} ore prima`;
  return `${minutes} minuti prima`;
}
