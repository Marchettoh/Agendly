import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function PageHeader({ title, subtitle, back, actions }: { title: string; subtitle?: string; back?: boolean; actions?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 flex items-center gap-2 bg-surface/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur dark:bg-night/90 md:static md:mx-0 md:bg-transparent md:px-0 md:pt-6 md:backdrop-blur-none">
      {back && (
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          aria-label="Indietro"
          className="-ml-2 rounded-full p-2 text-brand-dark hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold tracking-tight text-brand-dark dark:text-white">{title}</h1>
        {subtitle && <p className="truncate text-sm text-slate-500 first-letter:uppercase dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </header>
  );
}
