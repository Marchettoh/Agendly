import clsx from 'clsx';
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../../lib/labels';
import type { Category, Priority, Status } from '../../lib/types';

export const PRIORITY_STYLES: Record<Priority, { badge: string; dot: string; bar: string; chip: string }> = {
  bassa: {
    badge: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
    dot: 'bg-slate-400',
    bar: 'bg-slate-300 dark:bg-slate-600',
    chip: 'border-slate-500 bg-slate-500 text-white',
  },
  media: {
    badge: 'bg-brand-light text-brand dark:bg-blue-500/15 dark:text-blue-300',
    dot: 'bg-brand',
    bar: 'bg-brand',
    chip: 'border-brand bg-brand text-white',
  },
  alta: {
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    dot: 'bg-warning',
    bar: 'bg-warning',
    chip: 'border-warning bg-warning text-white',
  },
  urgente: {
    badge: 'bg-red-50 text-urgent dark:bg-red-500/15 dark:text-red-300',
    dot: 'bg-urgent',
    bar: 'bg-urgent',
    chip: 'border-urgent bg-urgent text-white',
  },
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', PRIORITY_STYLES[priority].badge, className)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', PRIORITY_STYLES[priority].dot)} />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

const STATUS_STYLES: Record<Status, string> = {
  da_fare: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  in_corso: 'bg-brand-light text-brand dark:bg-blue-500/15 dark:text-blue-300',
  completato: 'bg-green-50 text-success dark:bg-green-500/15 dark:text-green-300',
  rinviato: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={clsx('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_STYLES[status])}>{STATUS_LABELS[status]}</span>;
}

export function CategoryTag({ category }: { category: Category }) {
  return <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{CATEGORY_LABELS[category]}</span>;
}
