import type { ReactNode } from 'react';

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex animate-fade-in flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-light text-brand dark:bg-blue-500/15 dark:text-blue-300">{icon}</div>
      <h3 className="text-base font-semibold text-brand-dark dark:text-slate-100">{title}</h3>
      {text && <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
