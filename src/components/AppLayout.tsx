import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, CalendarDays, Home, Plus, Settings } from 'lucide-react';
import clsx from 'clsx';
import { Logo } from './Logo';
import { OfflineBanner } from './OfflineBanner';
import { useReminderWatcher } from '../hooks/useReminderWatcher';

const NAV = [
  { to: '/', label: 'Oggi', icon: Home, end: true },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/nuovo', label: 'Aggiungi', icon: Plus, primary: true },
  { to: '/promemoria', label: 'Promemoria', icon: Bell },
  { to: '/impostazioni', label: 'Impostazioni', icon: Settings },
];

export function AppLayout() {
  const { pathname } = useLocation();
  useReminderWatcher();
  const hideNav = pathname.startsWith('/nuovo') || pathname.includes('/modifica');

  return (
    <div className="min-h-dvh bg-surface dark:bg-night md:flex">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-100 bg-white px-4 py-6 dark:border-night-border dark:bg-night-card md:flex">
        <Logo className="mb-8 px-2" />
        <nav className="flex flex-col gap-1" aria-label="Navigazione principale">
          {NAV.map(({ to, label, icon: Icon, end, primary }) =>
            primary ? (
              <NavLink key={to} to={to} className="mb-3 flex h-12 items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-white shadow-fab hover:bg-blue-700">
                <Icon className="h-5 w-5" /> Nuovo impegno
              </NavLink>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx(
                    'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition',
                    isActive ? 'bg-brand-light text-brand dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5',
                  )
                }
              >
                <Icon className="h-5 w-5" /> {label}
              </NavLink>
            ),
          )}
        </nav>
        <p className="mt-auto px-2 text-xs text-slate-400">La tua giornata, sotto controllo.</p>
      </aside>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-8 md:pb-10">
        <OfflineBanner />
        <Outlet />
      </main>

      {/* Bottom navigation mobile */}
      {!hideNav && (
        <nav
          aria-label="Navigazione principale"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-night-border dark:bg-night-card/95 md:hidden"
        >
          <ul className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center">
            {NAV.map(({ to, label, icon: Icon, end, primary }) => (
              <li key={to} className="flex justify-center">
                {primary ? (
                  <NavLink to={to} aria-label={label} className="-mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-fab transition active:scale-95">
                    <Icon className="h-7 w-7" strokeWidth={2.5} />
                  </NavLink>
                ) : (
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      clsx('flex w-full flex-col items-center gap-0.5 py-1 text-[11px] font-medium transition', isActive ? 'text-brand dark:text-blue-300' : 'text-slate-500 dark:text-slate-400')
                    }
                  >
                    <Icon className="h-6 w-6" />
                    {label}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
