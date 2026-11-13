import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ThemePref } from '../lib/types';

interface ThemeApi {
  theme: ThemePref;
  resolved: 'light' | 'dark';
  setTheme: (t: ThemePref) => void;
}

const Ctx = createContext<ThemeApi | null>(null);
const KEY = 'agendly.theme';

function systemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>(() => (localStorage.getItem(KEY) as ThemePref) || 'system');
  const [sysDark, setSysDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSysDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = theme === 'system' ? (sysDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0B1220' : '#2563EB');
  }, [resolved]);

  const setTheme = useCallback((t: ThemePref) => {
    localStorage.setItem(KEY, t);
    setThemeState(t);
  }, []);

  return <Ctx.Provider value={{ theme, resolved, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme fuori da ThemeProvider');
  return ctx;
}
