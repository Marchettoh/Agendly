import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlarmClock, CalendarDays, ChevronDown, ListTodo } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Field';
import { ChipGroup } from '../components/ui/Chips';
import { PRIORITY_STYLES } from '../components/ui/Badges';
import { CategoryIcon } from '../components/CategoryIcon';
import { PageLoader } from '../components/ui/Spinner';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { createItem, toInput, updateItem } from '../lib/items';
import { errorMessage } from '../lib/errors';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  RECURRENCES,
  RECURRENCE_LABELS,
  REMINDER_PRESETS,
  STATUSES,
  STATUS_LABELS,
} from '../lib/labels';
import { todayKey } from '../lib/time';
import type { ItemInput, ItemType } from '../lib/types';

const TYPE_OPTIONS: { value: ItemType; label: string; icon: JSX.Element }[] = [
  { value: 'evento', label: 'Evento', icon: <CalendarDays className="h-4 w-4" /> },
  { value: 'attivita', label: 'Attività', icon: <ListTodo className="h-4 w-4" /> },
  { value: 'promemoria', label: 'Promemoria', icon: <AlarmClock className="h-4 w-4" /> },
];

type ReminderChoice = 'none' | `${number}` | 'custom';
type CustomUnit = 'minuti' | 'ore' | 'giorni';
const UNIT_FACTOR: Record<CustomUnit, number> = { minuti: 1, ore: 60, giorni: 1440 };

function defaults(type: ItemType, date: string): ItemInput {
  return {
    type,
    title: '',
    description: '',
    date,
    time: type === 'evento' ? '09:00' : null,
    category: 'personale',
    priority: 'media',
    status: 'da_fare',
    reminderMinutes: type === 'attivita' ? null : 15,
    recurrence: 'none',
  };
}

function splitCustom(minutes: number): { amount: number; unit: CustomUnit } {
  if (minutes % 1440 === 0) return { amount: minutes / 1440, unit: 'giorni' };
  if (minutes % 60 === 0) return { amount: minutes / 60, unit: 'ore' };
  return { amount: minutes, unit: 'minuti' };
}

export default function ItemFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { getItem, itemsLoading, timezone } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const editing = id ? getItem(id) : undefined;
  const initialType = (params.get('tipo') as ItemType) || 'evento';

  const [form, setForm] = useState<ItemInput>(() => defaults(initialType, params.get('data') ?? todayKey(timezone)));
  const [hasTime, setHasTime] = useState(initialType === 'evento');
  const [reminder, setReminder] = useState<ReminderChoice>(initialType === 'attivita' ? 'none' : '15');
  const [custom, setCustom] = useState<{ amount: number; unit: CustomUnit }>({ amount: 2, unit: 'ore' });
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    if (!editing || loaded) return;
    const input = toInput(editing);
    setForm(input);
    setHasTime(input.time !== null);
    if (input.reminderMinutes === null) setReminder('none');
    else if (REMINDER_PRESETS.some((p) => p.value === input.reminderMinutes)) setReminder(`${input.reminderMinutes}`);
    else {
      setReminder('custom');
      setCustom(splitCustom(input.reminderMinutes));
    }
    setShowMore(true);
    setLoaded(true);
  }, [editing, loaded]);

  const reminderMinutes = useMemo(() => {
    if (reminder === 'none') return null;
    if (reminder === 'custom') return Math.max(1, Math.round(custom.amount * UNIT_FACTOR[custom.unit]));
    return Number(reminder);
  }, [reminder, custom]);

  if (id && !itemsLoading && !editing) return <Navigate to="/" replace />;
  if (id && !loaded) return <PageLoader />;

  const set = <K extends keyof ItemInput>(key: K, value: ItemInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const changeType = (type: ItemType) => {
    set('type', type);
    if (!editing) {
      const timed = type === 'evento';
      setHasTime(timed);
      set('time', timed ? (form.time ?? '09:00') : null);
    }
  };

  const changePriority = (p: ItemInput['priority']) => {
    set('priority', p);
    if (p === 'urgente' && reminder === 'none') setReminder('15');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Inserisci un titolo.';
    if (!form.date) errs.date = 'Scegli una data.';
    if (hasTime && !form.time) errs.time = 'Scegli un orario o disattiva “Orario preciso”.';
    if (reminder === 'custom' && (!custom.amount || custom.amount <= 0)) errs.reminder = 'Indica un anticipo valido.';
    setErrors(errs);
    if (Object.keys(errs).length || !user) return;

    const input: ItemInput = { ...form, time: hasTime ? form.time : null, reminderMinutes };
    setSaving(true);
    try {
      if (editing) {
        await updateItem(user.uid, editing, input);
        toast.success('Modifiche salvate');
        navigate(`/voce/${editing.id}`, { replace: true });
      } else {
        const newId = await createItem(user.uid, input, timezone);
        toast.success('Impegno aggiunto', { label: 'Vedi', onClick: () => navigate(`/voce/${newId}`) });
        navigate(-1);
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Impossibile salvare. Riprova.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="pb-28 md:pb-0">
      <PageHeader title={editing ? 'Modifica' : 'Nuovo impegno'} back />
      <div className="space-y-5">
        <ChipGroup label="Tipo" value={form.type} options={TYPE_OPTIONS} onChange={changeType} />

        <Input
          label="Titolo"
          autoFocus={!editing}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder={form.type === 'promemoria' ? 'Es. Pagare fattura' : form.type === 'attivita' ? 'Es. Preparare preventivo' : 'Es. Riunione con il fornitore'}
          error={errors.title}
          maxLength={140}
          enterKeyHint="done"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label={form.type === 'evento' ? 'Data' : 'Scadenza'} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} error={errors.date} />
          {hasTime ? (
            <Input label="Ora" type="time" value={form.time ?? ''} onChange={(e) => set('time', e.target.value || null)} error={errors.time} />
          ) : (
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                size="md"
                block
                className="h-12"
                onClick={() => {
                  setHasTime(true);
                  set('time', form.time ?? '09:00');
                }}
              >
                + Aggiungi orario
              </Button>
            </div>
          )}
        </div>
        {hasTime && form.type !== 'evento' && (
          <button
            type="button"
            className="-mt-3 text-sm font-medium text-slate-500 hover:text-brand"
            onClick={() => {
              setHasTime(false);
              set('time', null);
            }}
          >
            Rimuovi orario (solo scadenza)
          </button>
        )}

        <ChipGroup
          label="Priorità"
          value={form.priority}
          onChange={changePriority}
          options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p], activeClass: PRIORITY_STYLES[p].chip }))}
        />

        <div className="space-y-1.5">
          <Select label="Promemoria" value={reminder} onChange={(e) => setReminder(e.target.value as ReminderChoice)} error={errors.reminder}>
            <option value="none">Nessun promemoria</option>
            {REMINDER_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
            <option value="custom">Personalizzato…</option>
          </Select>
          {reminder === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" min={1} inputMode="numeric" aria-label="Anticipo" value={custom.amount || ''} onChange={(e) => setCustom((c) => ({ ...c, amount: Number(e.target.value) }))} />
              <Select aria-label="Unità" value={custom.unit} onChange={(e) => setCustom((c) => ({ ...c, unit: e.target.value as CustomUnit }))}>
                <option value="minuti">minuti prima</option>
                <option value="ore">ore prima</option>
                <option value="giorni">giorni prima</option>
              </Select>
            </div>
          )}
          {!hasTime && reminderMinutes !== null && <p className="text-xs text-slate-500">Senza orario, il promemoria è calcolato rispetto alle 09:00 del giorno di scadenza.</p>}
        </div>

        <button type="button" onClick={() => setShowMore((s) => !s)} className="flex items-center gap-1 text-sm font-semibold text-brand" aria-expanded={showMore}>
          <ChevronDown className={clsx('h-4 w-4 transition', showMore && 'rotate-180')} /> {showMore ? 'Meno opzioni' : 'Altre opzioni'}
        </button>

        {showMore && (
          <div className="animate-fade-in space-y-5">
            <ChipGroup
              label="Categoria"
              value={form.category}
              onChange={(c) => set('category', c)}
              options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c], icon: <CategoryIcon category={c} /> }))}
            />
            <Textarea label="Descrizione (facoltativa)" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Note, indirizzo, dettagli…" maxLength={2000} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Ripetizione" value={form.recurrence} onChange={(e) => set('recurrence', e.target.value as ItemInput['recurrence'])}>
                {RECURRENCES.map((r) => (
                  <option key={r} value={r}>
                    {RECURRENCE_LABELS[r]}
                  </option>
                ))}
              </Select>
              <Select label="Stato" value={form.status} onChange={(e) => set('status', e.target.value as ItemInput['status'])}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur dark:border-night-border dark:bg-night-card/95 md:static md:mt-8 md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-3xl gap-3">
          <Button type="button" variant="ghost" size="lg" onClick={() => navigate(-1)}>
            Annulla
          </Button>
          <Button type="submit" size="lg" block loading={saving}>
            {editing ? 'Salva modifiche' : 'Aggiungi'}
          </Button>
        </div>
      </div>
    </form>
  );
}
