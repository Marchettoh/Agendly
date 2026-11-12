import { useState } from 'react';
import { CalendarArrowUp, CalendarDays, CalendarPlus } from 'lucide-react';
import { Sheet } from './ui/Sheet';
import { Button } from './ui/Button';
import { Input } from './ui/Field';
import { addDaysKey, formatDateKey, startOfWeekKey, todayKey } from '../lib/time';
import type { Item } from '../lib/types';

interface MoveSheetProps {
  item: Item | null;
  timezone: string;
  onClose: () => void;
  onMove: (item: Item, date: string) => Promise<void>;
}

export function MoveSheet({ item, timezone, onClose, onMove }: MoveSheetProps) {
  const today = todayKey(timezone);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const nextMonday = addDaysKey(startOfWeekKey(today), 7);

  const move = async (date: string, key: string) => {
    if (!item) return;
    setBusy(key);
    try {
      await onMove(item, date);
      onClose();
      setCustom('');
    } finally {
      setBusy(null);
    }
  };

  const options = [
    { key: 'oggi', label: 'Oggi', date: today, icon: <CalendarDays className="h-5 w-5" /> },
    { key: 'domani', label: 'Domani', date: addDaysKey(today, 1), icon: <CalendarArrowUp className="h-5 w-5" /> },
    { key: 'lunedi', label: 'Lunedì prossimo', date: nextMonday, icon: <CalendarPlus className="h-5 w-5" /> },
  ].filter((o) => o.date !== item?.date);

  return (
    <Sheet open={!!item} onClose={onClose} title="Sposta a…">
      <div className="space-y-2">
        {options.map((o) => (
          <Button key={o.key} variant="outline" size="lg" block className="justify-start" icon={o.icon} loading={busy === o.key} onClick={() => move(o.date, o.key)}>
            <span className="flex-1 text-left">{o.label}</span>
            <span className="text-sm font-normal text-slate-500">{formatDateKey(o.date, 'EEE d MMM')}</span>
          </Button>
        ))}
        <div className="flex items-end gap-2 pt-2">
          <div className="flex-1">
            <Input type="date" label="Un’altra data" value={custom} min={today} onChange={(e) => setCustom(e.target.value)} />
          </div>
          <Button size="lg" disabled={!custom} loading={busy === 'custom'} onClick={() => move(custom, 'custom')}>
            Sposta
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
