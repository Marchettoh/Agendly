import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarPlus, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../components/PageHeader';
import { ItemCard } from '../components/ItemCard';
import { MoveSheet } from '../components/MoveSheet';
import { Segmented } from '../components/ui/Chips';
import { EmptyState } from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { PRIORITY_STYLES } from '../components/ui/Badges';
import { useData } from '../contexts/DataContext';
import { useItemActions } from '../hooks/useItemActions';
import { expandOccurrences } from '../lib/selectors';
import { addDaysKey, addMonthsKey, capitalize, formatDateKey, startOfMonthKey, startOfWeekKey, todayKey } from '../lib/time';
import type { Item, Occurrence } from '../lib/types';

type View = 'settimana' | 'mese';
const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

export default function AgendaPage() {
  const { items, itemsLoading, timezone } = useData();
  const { toggle, move, busyId } = useItemActions();
  const [moving, setMoving] = useState<Item | null>(null);
  const [params, setParams] = useSearchParams();
  const today = todayKey(timezone);
  const view: View = params.get('vista') === 'mese' ? 'mese' : 'settimana';
  const selected = params.get('giorno') ?? today;

  const setState = (next: { vista?: View; giorno?: string }) => {
    const p = new URLSearchParams(params);
    if (next.vista) p.set('vista', next.vista);
    if (next.giorno) p.set('giorno', next.giorno);
    setParams(p, { replace: true });
  };

  const range = useMemo(() => {
    if (view === 'settimana') {
      const start = startOfWeekKey(selected);
      return { start, end: addDaysKey(start, 6) };
    }
    const monthStart = startOfMonthKey(selected);
    const start = startOfWeekKey(monthStart);
    const monthEnd = addDaysKey(addMonthsKey(monthStart, 1), -1);
    const end = addDaysKey(startOfWeekKey(monthEnd), 6);
    return { start, end, monthStart };
  }, [view, selected]);

  const occurrences = useMemo(() => expandOccurrences(items, range.start, range.end), [items, range]);
  const byDay = useMemo(() => {
    const m = new Map<string, Occurrence[]>();
    for (const o of occurrences) m.set(o.date, [...(m.get(o.date) ?? []), o]);
    return m;
  }, [occurrences]);

  const days: string[] = [];
  for (let d = range.start; d <= range.end; d = addDaysKey(d, 1)) days.push(d);
  const selectedList = byDay.get(selected) ?? [];

  const shift = (dir: number) => setState({ giorno: view === 'settimana' ? addDaysKey(selected, 7 * dir) : addMonthsKey(startOfMonthKey(selected), dir) });
  const title = view === 'settimana' ? `${formatDateKey(range.start, 'd MMM')} – ${formatDateKey(range.end, 'd MMM yyyy')}` : capitalize(formatDateKey(selected, 'MMMM yyyy'));

  return (
    <>
      <PageHeader title="Agenda" subtitle={title} />
      <div className="mb-4 space-y-3">
        <Segmented
          ariaLabel="Vista agenda"
          value={view}
          onChange={(v) => setState({ vista: v })}
          options={[
            { value: 'settimana', label: 'Settimana' },
            { value: 'mese', label: 'Mese' },
          ]}
        />
        <div className="flex items-center justify-between">
          <button onClick={() => shift(-1)} aria-label="Periodo precedente" className="rounded-full p-2 text-brand-dark hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setState({ giorno: today })} className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand-light dark:hover:bg-blue-500/10">
            Oggi
          </button>
          <button onClick={() => shift(1)} aria-label="Periodo successivo" className="rounded-full p-2 text-brand-dark hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {view === 'settimana' ? (
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const list = byDay.get(d) ?? [];
              const active = d === selected;
              return (
                <button
                  key={d}
                  onClick={() => setState({ giorno: d })}
                  aria-label={formatDateKey(d)}
                  aria-pressed={active}
                  className={clsx(
                    'flex flex-col items-center gap-1 rounded-2xl py-2 transition',
                    active ? 'bg-brand text-white shadow-fab' : d === today ? 'bg-brand-light text-brand dark:bg-blue-500/15 dark:text-blue-300' : 'text-ink hover:bg-white dark:text-slate-200 dark:hover:bg-white/5',
                  )}
                >
                  <span className={clsx('text-[11px] font-medium uppercase', active ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400')}>{formatDateKey(d, 'EEEEEE')}</span>
                  <span className="text-lg font-semibold tabular-nums">{formatDateKey(d, 'd')}</span>
                  <DayDots list={list} active={active} />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-card dark:border-night-border dark:bg-night-card dark:shadow-none">
            <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400">
              {WEEKDAYS.map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((d) => {
                const list = byDay.get(d) ?? [];
                const inMonth = d.slice(0, 7) === selected.slice(0, 7);
                const active = d === selected;
                return (
                  <button
                    key={d}
                    onClick={() => setState({ giorno: d })}
                    aria-label={formatDateKey(d)}
                    aria-pressed={active}
                    className={clsx(
                      'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl text-sm transition md:aspect-[4/3]',
                      active ? 'bg-brand font-semibold text-white' : d === today ? 'bg-brand-light font-semibold text-brand dark:bg-blue-500/15 dark:text-blue-300' : 'hover:bg-slate-50 dark:hover:bg-white/5',
                      !inMonth && !active && 'text-slate-300 dark:text-slate-600',
                      inMonth && !active && d !== today && 'text-ink dark:text-slate-200',
                    )}
                  >
                    <span className="tabular-nums">{formatDateKey(d, 'd')}</span>
                    <DayDots list={list} active={active} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{capitalize(formatDateKey(selected))}</h2>
      {itemsLoading ? (
        <PageLoader />
      ) : selectedList.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus className="h-8 w-8" />}
          title="Giornata libera"
          text="Nessun impegno in questa data."
          action={
            <Link to={`/nuovo?data=${selected}`}>
              <Button variant="secondary" icon={<Plus className="h-5 w-5" />}>
                Aggiungi in questa data
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {selectedList.map((o) => (
            <ItemCard key={`${o.item.id}-${o.date}`} occurrence={o} timezone={timezone} busy={busyId === o.item.id} onToggle={() => toggle(o.item)} onMove={() => setMoving(o.item)} />
          ))}
        </div>
      )}
      <MoveSheet item={moving} timezone={timezone} onClose={() => setMoving(null)} onMove={move} />
    </>
  );
}

function DayDots({ list, active }: { list: Occurrence[]; active: boolean }) {
  const open = list.filter((o) => o.item.status !== 'completato');
  return (
    <span className="flex h-1.5 gap-0.5">
      {open.slice(0, 3).map((o, i) => (
        <span key={i} className={clsx('h-1.5 w-1.5 rounded-full', active ? 'bg-white' : PRIORITY_STYLES[o.item.priority].dot)} />
      ))}
    </span>
  );
}
