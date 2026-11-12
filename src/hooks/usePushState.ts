import { useCallback, useEffect, useState } from 'react';
import { getPushState, type PushState } from '../lib/messaging';

export function usePushState(): PushState | null {
  return usePushStateWithRefresh()[0];
}

export function usePushStateWithRefresh(): [PushState | null, () => Promise<void>] {
  const [state, setState] = useState<PushState | null>(null);
  const refresh = useCallback(async () => setState(await getPushState()), []);
  useEffect(() => {
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [refresh]);
  return [state, refresh];
}
