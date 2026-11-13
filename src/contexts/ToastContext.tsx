import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import clsx from 'clsx';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  show: (message: string, kind?: ToastKind, action?: Toast['action']) => void;
  success: (message: string, action?: Toast['action']) => void;
  error: (message: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback<ToastApi['show']>(
    (message, kind = 'info', action) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, kind, message, action }]);
      setTimeout(() => dismiss(id), action ? 6000 : 3500);
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(
    () => ({ show, success: (m, a) => show(m, 'success', a), error: (m) => show(m, 'error') }),
    [show],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
        {toasts.map((t) => {
          const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertCircle : Info;
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              className={clsx(
                'pointer-events-auto flex w-full max-w-md animate-fade-in items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white shadow-lg',
                t.kind === 'success' && 'bg-success',
                t.kind === 'error' && 'bg-urgent',
                t.kind === 'info' && 'bg-ink dark:bg-slate-700',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{t.message}</span>
              {t.action && (
                <button
                  className="rounded-lg px-2 py-1 font-semibold underline-offset-2 hover:underline"
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button aria-label="Chiudi" onClick={() => dismiss(t.id)} className="opacity-80 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast fuori da ToastProvider');
  return ctx;
}
