import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bell, CalendarClock, CalendarDays, Check, Clock, Pencil, Repeat, RotateCcw, Tag, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PriorityBadge, StatusBadge } from '../components/ui/Badges';
import { EmptyState } from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import { Sheet } from '../components/ui/Sheet';
import { MoveSheet } from '../components/MoveSheet';
import { CategoryIcon } from '../components/CategoryIcon';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { useItemActions } from '../hooks/useItemActions';
import { deleteItem, setItemStatus } from '../lib/items';
import { errorMessage } from '../lib/errors';
import { CATEGORY_LABELS, RECURRENCE_LABELS, STATUSES, STATUS_LABELS, TYPE_LABELS, reminderLabel } from '../lib/labels';
import { isOverdue } from '../lib/selectors';
import { capitalize, formatDateKey, formatInTz, relativeDayLabel } from '../lib/time';
import type { ReactNode } from 'react';
import type { Status } from '../lib/types';

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <div className="mt-0.5 text-[15px] text-ink dark:text-slate-100">{children}</div>
      </div>
    </div>
  );
}

export default function ItemDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { getItem, itemsLoading, timezone } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const { toggle, move, busyId } = useItemActions();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moving, setMoving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const item = getItem(id);

  if (itemsLoading) return <PageLoader />;
  if (!item)
    return (
      <>
        <PageHeader title="Dettaglio" back />
        <EmptyState icon={<CalendarDays className="h-8 w-8" />} title="Impegno non trovato" text="Potrebbe essere stato eliminato." action={<Link to="/"><Button>Torna a Oggi</Button></Link>} />
      </>
    );

  const done = item.status === 'completato';
  const overdue = isOverdue(item, timezone);

  const changeStatus = async (s: Status) => {
    if (!user) return;
    try {
      const next = await setItemStatus(user.uid, item, s);
      toast.success(next ? `Completato. Prossima volta: ${relativeDayLabel(next, timezone).toLowerCase()}` : `Stato: ${STATUS_LABELS[s]}`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await deleteItem(user.uid, item.id);
      toast.success('Impegno eliminato');
      navigate('/', { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={TYPE_LABELS[item.type]}
        back
        actions={
          <Link to={`/voce/${item.id}/modifica`} aria-label="Modifica" className="rounded-full p-2 text-brand hover:bg-brand-light dark:hover:bg-blue-500/10">
            <Pencil className="h-5 w-5" />
          </Link>
        }
      />

      {item.priority === 'urgente' && !done && (
        <div className="mb-4 rounded-2xl bg-urgent px-4 py-3 text-sm font-semibold text-white">Priorità urgente{overdue ? ' · scaduto' : ''}</div>
      )}

      <Card className="mb-4 p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <PriorityBadge priority={item.priority} />
          <StatusBadge status={item.status} />
          {overdue && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">In ritardo</span>}
        </div>
        <h2 className={`text-2xl font-bold tracking-tight text-brand-dark dark:text-white ${done ? 'line-through opacity-70' : ''}`}>{item.title}</h2>
        {item.description && <p className="mt-2 whitespace-pre-wrap text-[15px] text-slate-600 dark:text-slate-300">{item.description}</p>}

        <div className="mt-3 divide-y divide-slate-100 dark:divide-night-border">
          <Row icon={<CalendarDays className="h-5 w-5" />} label={item.type === 'evento' ? 'Data' : 'Scadenza'}>
            {capitalize(formatDateKey(item.date, 'EEEE d MMMM yyyy'))}
          </Row>
          <Row icon={<Clock className="h-5 w-5" />} label="Ora">
            {item.time ? `${item.time}${item.timezone !== timezone ? ` (${item.timezone})` : ''}` : 'In giornata, senza orario'}
            {item.timezone !== timezone && item.time && <span className="block text-sm text-slate-500">Nel tuo fuso: {formatInTz(item.startAt, timezone, 'HH:mm')}</span>}
          </Row>
          <Row icon={<CategoryIcon category={item.category} className="h-5 w-5" />} label="Categoria">
            {CATEGORY_LABELS[item.category]}
          </Row>
          <Row icon={<Bell className="h-5 w-5" />} label="Promemoria">
            {reminderLabel(item.reminderMinutes)}
            {item.remindAt && <span className="block text-sm text-slate-500">Prossimo avviso: {formatInTz(item.remindAt, timezone, "EEE d MMM 'alle' HH:mm")}</span>}
          </Row>
          <Row icon={<Repeat className="h-5 w-5" />} label="Ripetizione">
            {RECURRENCE_LABELS[item.recurrence]}
          </Row>
          <Row icon={<Tag className="h-5 w-5" />} label="Stato">
            <div className="mt-1 flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={s === item.status}
                  className={`h-9 rounded-full border px-3 text-sm font-medium transition ${s === item.status ? 'border-brand bg-brand text-white' : 'border-slate-200 text-slate-600 hover:border-brand dark:border-night-border dark:text-slate-300'}`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </Row>
        </div>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button size="lg" variant={done ? 'outline' : 'success'} icon={done ? <RotateCcw className="h-5 w-5" /> : <Check className="h-5 w-5" />} loading={busyId === item.id} onClick={() => toggle(item)}>
          {done ? 'Segna come da fare' : item.recurrence !== 'none' ? 'Completa questa occorrenza' : 'Completa'}
        </Button>
        <Button size="lg" variant="secondary" icon={<CalendarClock className="h-5 w-5" />} onClick={() => setMoving(true)}>
          Sposta data
        </Button>
        <Button size="lg" variant="ghost" className="text-urgent hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 sm:col-span-2" icon={<Trash2 className="h-5 w-5" />} onClick={() => setConfirmDelete(true)}>
          Elimina
        </Button>
      </div>

      <MoveSheet item={moving ? item : null} timezone={timezone} onClose={() => setMoving(false)} onMove={move} />
      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Eliminare questo impegno?">
        <p className="mb-5 text-sm text-slate-600 dark:text-slate-300">“{item.title}” verrà eliminato definitivamente{item.recurrence !== 'none' ? ', insieme a tutte le ripetizioni future' : ''}.</p>
        <div className="flex gap-3">
          <Button variant="ghost" size="lg" block onClick={() => setConfirmDelete(false)}>
            Annulla
          </Button>
          <Button variant="danger" size="lg" block loading={deleting} onClick={remove}>
            Elimina
          </Button>
        </div>
      </Sheet>
    </>
  );
}
