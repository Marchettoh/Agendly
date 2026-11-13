import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlarmClock, CheckCircle2, Plus } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ItemCard } from '../components/ItemCard';
import { MoveSheet } from '../components/MoveSheet';
import { ChipGroup, Segmented } from '../components/ui/Chips';
import { EmptyState } from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { useData } from '../contexts/DataContext';
import { useItemActions } from '../hooks/useItemActions';
import { useNow } from '../hooks/useNow';
import { applyQuickFilter, isOverdue, QUICK_FILTERS, type QuickFilter } from '../lib/selectors';
import type { Item } from '../lib/types';

type Kind = 'tutti' | 'promemoria' | 'attivita';

const EMPTY: Record<QuickFilter, string> = {
  oggi: 'Niente in scadenza oggi.',
  domani: 'Domani sei libero.',
  settimana: 'Nessuna scadenza questa settimana.',
  ritardo: 'Ottimo, nessuna attività in ritardo!',
  completati: 'Le voci completate appariranno qui.',
};

export default function RemindersPage() {
  const { items, itemsLoading, timezone } = useData();
  const now = useNow();
  const { toggle, move, busyId } = useItemActions();
  const [moving, setMoving] = useState<Item | null>(null);
  const [params, setParams] = useSearchParams();
  const filter = (params.get('filtro') as QuickFilter) || 'oggi';
  const kind = (params.get('tipo') as Kind) || 'tutti';

  const update = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    p.set(k, v);
    setParams(p, { replace: true });
  };

  const base = useMemo(() => items.filter((i) => i.type !== 'evento' && (kind === 'tutti' || i.type === kind)), [items, kind]);
  const list = useMemo(() => applyQuickFilter(base, filter, timezone, now), [base, filter, timezone, now]);
  const overdueCount = useMemo(() => base.filter((i) => isOverdue(i, timezone, now)).length, [base, timezone, now]);

  return (
    <>
      <PageHeader title="Promemoria" subtitle="Attività e cose da non dimenticare" />
      <div className="mb-4 space-y-3">
        <Segmented
          ariaLabel="Tipo"
          value={kind}
          onChange={(v) => update('tipo', v)}
          options={[
            { value: 'tutti', label: 'Tutti' },
            { value: 'promemoria', label: 'Promemoria' },
            { value: 'attivita', label: 'Attività' },
          ]}
        />
        <ChipGroup
          scroll
          value={filter}
          onChange={(v) => update('filtro', v)}
          options={QUICK_FILTERS.map((f) => ({
            value: f.id,
            label: f.id === 'ritardo' && overdueCount ? `${f.label} (${overdueCount})` : f.label,
            activeClass: f.id === 'ritardo' ? 'border-warning bg-warning text-white' : f.id === 'completati' ? 'border-success bg-success text-white' : undefined,
          }))}
        />
      </div>
      {itemsLoading ? (
        <PageLoader />
      ) : list.length === 0 ? (
        <EmptyState
          icon={filter === 'completati' || filter === 'ritardo' ? <CheckCircle2 className="h-8 w-8" /> : <AlarmClock className="h-8 w-8" />}
          title={EMPTY[filter]}
          text={filter === 'completati' ? undefined : 'Es. “Chiamare il fornitore”, “Pagare fattura”, “Ritirare merce”.'}
          action={
            filter !== 'completati' && (
              <Link to="/nuovo?tipo=promemoria">
                <Button variant="secondary" icon={<Plus className="h-5 w-5" />}>
                  Nuovo promemoria
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-2">
          {list.map((o) => (
            <ItemCard key={`${o.item.id}-${o.date}`} occurrence={o} timezone={timezone} showDate busy={busyId === o.item.id} onToggle={() => toggle(o.item)} onMove={() => setMoving(o.item)} />
          ))}
        </div>
      )}
      <MoveSheet item={moving} timezone={timezone} onClose={() => setMoving(null)} onMove={move} />
    </>
  );
}
