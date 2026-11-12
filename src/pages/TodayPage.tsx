import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, BellOff, CalendarDays, CalendarPlus, ListTodo, Plus } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ItemCard } from '../components/ItemCard';
import { UrgentBanner } from '../components/UrgentBanner';
import { MoveSheet } from '../components/MoveSheet';
import { EmptyState } from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { useData } from '../contexts/DataContext';
import { useItemActions } from '../hooks/useItemActions';
import { useNow } from '../hooks/useNow';
import { usePushState } from '../hooks/usePushState';
import { imminentUrgent, todaySummary } from '../lib/selectors';
import { formatInTz } from '../lib/time';
import type { Item, Occurrence } from '../lib/types';
import type { ReactNode } from 'react';

function Section({ title, icon, count, children }: { title: string; icon: ReactNode; count: number; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {icon} {title} <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">{count}</span>
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function greeting(hour: number) {
  if (hour < 5) return 'Buonanotte';
  if (hour < 13) return 'Buongiorno';
  if (hour < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export default function TodayPage() {
  const { items, itemsLoading, profile, timezone, error } = useData();
  const now = useNow();
  const { toggle, move, busyId } = useItemActions();
  const [moving, setMoving] = useState<Item | null>(null);
  const push = usePushState();

  const summary = useMemo(() => todaySummary(items, timezone, now), [items, timezone, now]);
  const urgent = useMemo(() => imminentUrgent(items, timezone, now), [items, timezone, now]);
  const hour = Number(formatInTz(now, timezone, 'H'));
  const name = profile?.displayName?.split(' ')[0];
  const progress = summary.totalToday ? Math.round((summary.completedToday / summary.totalToday) * 100) : 0;

  const renderList = (list: Occurrence[], showDate = false) =>
    list.map((o) => (
      <ItemCard key={`${o.item.id}-${o.date}`} occurrence={o} timezone={timezone} showDate={showDate} busy={busyId === o.item.id} onToggle={() => toggle(o.item)} onMove={() => setMoving(o.item)} />
    ));

  const nothing = summary.totalToday === 0 && summary.overdue.length === 0;

  return (
    <>
      <PageHeader title={`${greeting(hour)}${name ? `, ${name}` : ''}`} subtitle={formatInTz(now, timezone, 'EEEE d MMMM')} />

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-urgent dark:bg-red-500/10">{error}</p>}

      <UrgentBanner items={urgent} timezone={timezone} now={now} />

      {push === 'default' && (
        <Link to="/notifiche" className="mb-5 flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand-light p-4 text-sm text-brand-dark dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
          <BellOff className="h-5 w-5 shrink-0 text-brand" />
          <span className="flex-1">Attiva le notifiche per non perdere gli impegni urgenti.</span>
          <span className="font-semibold text-brand">Attiva</span>
        </Link>
      )}

      {itemsLoading ? (
        <PageLoader />
      ) : nothing ? (
        <EmptyState
          icon={<CalendarPlus className="h-8 w-8" />}
          title="Nessun impegno per oggi"
          text="Aggiungine uno in 10 secondi."
          action={
            <Link to="/nuovo">
              <Button icon={<Plus className="h-5 w-5" />}>Aggiungi impegno</Button>
            </Link>
          }
        />
      ) : (
        <>
          {summary.totalToday > 0 && (
            <div className="mb-6 rounded-2xl bg-brand-dark p-4 text-white">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-blue-200">Avanzamento di oggi</p>
                <p className="text-sm font-semibold">
                  {summary.completedToday}/{summary.totalToday}
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {summary.overdue.length > 0 && (
            <Section title="In ritardo" icon={<AlarmClock className="h-4 w-4 text-warning" />} count={summary.overdue.length}>
              {renderList(summary.overdue.map((item) => ({ item, date: item.date, startAt: item.startAt, isRecurringInstance: false })), true)}
            </Section>
          )}
          {summary.events.length > 0 && (
            <Section title="Eventi di oggi" icon={<CalendarDays className="h-4 w-4" />} count={summary.events.length}>
              {renderList(summary.events)}
            </Section>
          )}
          {summary.tasks.length > 0 && (
            <Section title="Attività da completare" icon={<ListTodo className="h-4 w-4" />} count={summary.tasks.length}>
              {renderList(summary.tasks)}
            </Section>
          )}
          {summary.reminders.length > 0 && (
            <Section title="Promemoria in scadenza" icon={<AlarmClock className="h-4 w-4" />} count={summary.reminders.length}>
              {renderList(summary.reminders)}
            </Section>
          )}
        </>
      )}
      <MoveSheet item={moving} timezone={timezone} onClose={() => setMoving(null)} onMove={move} />
    </>
  );
}
