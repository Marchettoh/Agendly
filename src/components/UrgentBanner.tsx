import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { formatInTz, relativeDayLabel } from '../lib/time';
import type { Item } from '../lib/types';

export function UrgentBanner({ items, timezone, now }: { items: Item[]; timezone: string; now: Date }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Notifiche urgenti" className="mb-5 animate-fade-in overflow-hidden rounded-2xl bg-urgent text-white shadow-lg shadow-red-500/20">
      <div className="flex items-center gap-2 px-4 pt-3 text-sm font-semibold uppercase tracking-wide text-red-100">
        <AlertTriangle className="h-4 w-4" /> {items.length === 1 ? 'Impegno urgente' : `${items.length} impegni urgenti`}
      </div>
      <ul className="divide-y divide-white/15">
        {items.slice(0, 3).map((i) => {
          const late = i.time ? i.startAt < now : false;
          return (
            <li key={i.id}>
              <Link to={`/voce/${i.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/10">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{i.title}</p>
                  <p className="text-sm text-red-100">
                    {late ? 'Scaduto · ' : ''}
                    {relativeDayLabel(i.date, timezone)}
                    {i.time ? ` alle ${formatInTz(i.startAt, timezone, 'HH:mm')}` : ''}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 opacity-80" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
