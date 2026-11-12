import { Link } from 'react-router-dom';
import { Bell, CalendarClock, Check, Repeat } from 'lucide-react';
import clsx from 'clsx';
import { PRIORITY_STYLES, PriorityBadge } from './ui/Badges';
import { CategoryIcon } from './CategoryIcon';
import { CATEGORY_LABELS, TYPE_LABELS } from '../lib/labels';
import { isOverdue } from '../lib/selectors';
import { formatInTz, relativeDayLabel } from '../lib/time';
import type { Occurrence } from '../lib/types';

interface ItemCardProps {
  occurrence: Occurrence;
  timezone: string;
  onToggle?: () => void;
  onMove?: () => void;
  showDate?: boolean;
  busy?: boolean;
}

export function ItemCard({ occurrence, timezone, onToggle, onMove, showDate, busy }: ItemCardProps) {
  const { item, date, isRecurringInstance } = occurrence;
  const done = item.status === 'completato';
  const overdue = !isRecurringInstance && isOverdue(item, timezone);
  const canToggle = item.type !== 'evento' || item.status !== 'completato';
  const toggleable = !isRecurringInstance && onToggle;

  return (
    <div
      className={clsx(
        'group relative flex animate-fade-in items-stretch gap-3 overflow-hidden rounded-2xl border bg-white p-3 pl-4 shadow-card transition dark:bg-night-card dark:shadow-none',
        item.priority === 'urgente' && !done ? 'border-red-200 dark:border-red-500/40' : 'border-slate-100 dark:border-night-border',
        done && 'opacity-60',
      )}
    >
      <span className={clsx('absolute inset-y-0 left-0 w-1', PRIORITY_STYLES[item.priority].bar)} aria-hidden="true" />
      {toggleable && canToggle && (
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          aria-label={done ? `Segna “${item.title}” come da fare` : `Completa “${item.title}”`}
          className={clsx(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90',
            done ? 'border-success bg-success text-white' : 'border-slate-300 text-transparent hover:border-success hover:text-success dark:border-slate-500',
          )}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </button>
      )}
      <Link to={`/voce/${item.id}`} className="min-w-0 flex-1 focus:outline-none">
        <div className="flex items-start justify-between gap-2">
          <p className={clsx('font-semibold leading-snug text-ink dark:text-slate-100', done && 'line-through')}>{item.title}</p>
          {item.time && (
            <span className={clsx('shrink-0 text-sm font-semibold tabular-nums', overdue ? 'text-warning' : 'text-brand-dark dark:text-blue-300')}>{formatInTz(occurrence.startAt, timezone, 'HH:mm')}</span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          {item.priority !== 'bassa' && item.priority !== 'media' ? <PriorityBadge priority={item.priority} /> : null}
          <span className="inline-flex items-center gap-1">
            <CategoryIcon category={item.category} className="h-3.5 w-3.5" />
            {CATEGORY_LABELS[item.category]}
          </span>
          <span>{TYPE_LABELS[item.type]}</span>
          {showDate && <span className="font-medium">{relativeDayLabel(date, timezone)}</span>}
          {overdue && <span className="font-semibold text-warning">In ritardo</span>}
          {item.reminderMinutes !== null && <Bell className="h-3.5 w-3.5" aria-label="Promemoria attivo" />}
          {item.recurrence !== 'none' && <Repeat className="h-3.5 w-3.5" aria-label="Ricorrente" />}
        </div>
      </Link>
      {onMove && !done && !isRecurringInstance && item.type !== 'evento' && (
        <button
          type="button"
          onClick={onMove}
          aria-label={`Sposta “${item.title}”`}
          className="-mr-1 self-center rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-brand dark:hover:bg-white/5"
        >
          <CalendarClock className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
