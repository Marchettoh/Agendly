import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, Globe, LogOut, Moon, Smartphone, User } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Field';
import { Segmented } from '../components/ui/Chips';
import { LogoMark } from '../components/Logo';
import { PushStatusPill } from './NotificationsPage';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { usePushState } from '../hooks/usePushState';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { updateProfile } from '../lib/profile';
import { hasDeviceToken } from '../lib/messaging';
import { errorMessage } from '../lib/errors';
import { COMMON_TIMEZONES, detectTimezone, formatInTz } from '../lib/time';
import type { ThemePref } from '../lib/types';
import type { ReactNode } from 'react';

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h2 className="mb-2 mt-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {icon} {children}
    </h2>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { profile, timezone } = useData();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const push = usePushState();
  const install = useInstallPrompt();
  const [name, setName] = useState(profile?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => setName(profile?.displayName ?? ''), [profile?.displayName]);

  const tzOptions = Array.from(new Set([timezone, detectTimezone(), ...COMMON_TIMEZONES]));

  const save = async (patch: Parameters<typeof updateProfile>[1], msg: string) => {
    if (!user) return;
    try {
      await updateProfile(user.uid, patch);
      toast.success(msg);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const saveName = async () => {
    if (name.trim().length < 2) return toast.error('Il nome deve contenere almeno 2 caratteri.');
    setSavingName(true);
    await save({ displayName: name.trim() }, 'Nome aggiornato');
    setSavingName(false);
  };

  const changeTheme = (t: ThemePref) => {
    setTheme(t);
    if (user) updateProfile(user.uid, { theme: t }).catch(() => undefined);
  };

  return (
    <>
      <PageHeader title="Impostazioni" />

      <SectionTitle icon={<User className="h-4 w-4" />}>Profilo</SectionTitle>
      <Card className="space-y-4 p-5">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <Button variant="secondary" className="h-12" loading={savingName} disabled={name.trim() === (profile?.displayName ?? '')} onClick={saveName}>
            Salva
          </Button>
        </div>
        <Input label="Email" value={user?.email ?? ''} readOnly disabled />
      </Card>

      <SectionTitle icon={<Globe className="h-4 w-4" />}>Fuso orario</SectionTitle>
      <Card className="p-5">
        <Select
          label="Fuso orario"
          value={timezone}
          onChange={(e) => save({ timezone: e.target.value }, 'Fuso orario aggiornato')}
          hint={`Ora attuale: ${formatInTz(new Date(), timezone, "HH:mm (zzz)")}. L’ora legale è gestita automaticamente.`}
        >
          {tzOptions.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </Card>

      <SectionTitle icon={<Bell className="h-4 w-4" />}>Notifiche</SectionTitle>
      <Link to="/notifiche">
        <Card className="flex items-center gap-3 p-5 transition hover:border-brand/30">
          <div className="flex-1">
            <p className="font-medium text-ink dark:text-slate-100">Notifiche push</p>
            <p className="text-sm text-slate-500">Gestisci permessi e prova le notifiche</p>
          </div>
          <PushStatusPill state={push} enabled={!!user && hasDeviceToken(user.uid)} />
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Card>
      </Link>

      <SectionTitle icon={<Moon className="h-4 w-4" />}>Aspetto</SectionTitle>
      <Card className="p-5">
        <Segmented
          ariaLabel="Tema"
          value={theme}
          onChange={changeTheme}
          options={[
            { value: 'light', label: 'Chiaro' },
            { value: 'dark', label: 'Scuro' },
            { value: 'system', label: 'Sistema' },
          ]}
        />
      </Card>

      {install.canInstall && (
        <>
          <SectionTitle icon={<Smartphone className="h-4 w-4" />}>App</SectionTitle>
          <Card className="flex items-center gap-3 p-5">
            <LogoMark className="h-10 w-10" />
            <p className="flex-1 text-sm text-slate-600 dark:text-slate-300">Installa Agendly sulla schermata Home per usarla come un’app, anche offline.</p>
            <Button onClick={install.prompt}>Installa</Button>
          </Card>
        </>
      )}

      <Button
        variant="ghost"
        size="lg"
        block
        className="mt-8 text-urgent hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
        icon={<LogOut className="h-5 w-5" />}
        loading={loggingOut}
        onClick={async () => {
          setLoggingOut(true);
          try {
            await logout();
          } catch (e) {
            toast.error(errorMessage(e));
            setLoggingOut(false);
          }
        }}
      >
        Esci
      </Button>
      <p className="mt-4 text-center text-xs text-slate-400">Agendly v{__APP_VERSION__} · La tua giornata, sotto controllo.</p>
    </>
  );
}
