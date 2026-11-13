import { WifiOff } from 'lucide-react';
import { useOnline } from '../hooks/useOnline';

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="sticky top-0 z-40 -mx-4 flex items-center justify-center gap-2 bg-ink px-4 py-2 text-xs font-medium text-white md:mx-0 md:mt-4 md:rounded-xl">
      <WifiOff className="h-4 w-4" /> Sei offline: le modifiche verranno sincronizzate al ritorno della connessione.
    </div>
  );
}
