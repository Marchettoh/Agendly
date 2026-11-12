import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Lock, Mail, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { Segmented } from '../components/ui/Chips';
import { LogoMark } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { errorMessage } from '../lib/errors';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

type Mode = 'login' | 'register';

export default function AuthPage() {
  const { user, login, register, loginWithGoogle, resetPassword } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>(location.pathname === '/registrati' ? 'register' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'form' | 'google' | 'reset' | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/';
  if (user) return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'register' && name.trim().length < 2) return setError('Inserisci il tuo nome.');
    if (mode === 'register' && password.length < 6) return setError('La password deve contenere almeno 6 caratteri.');
    setLoading('form');
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  const google = async () => {
    setError(null);
    setLoading('google');
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  const reset = async () => {
    if (!email) return setError('Inserisci la tua email per reimpostare la password.');
    setLoading('reset');
    try {
      await resetPassword(email);
      toast.success('Ti abbiamo inviato un’email per reimpostare la password.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <div className="relative flex flex-col items-center justify-center gap-3 overflow-hidden bg-brand px-6 pb-12 pt-[calc(3rem+env(safe-area-inset-top))] text-white md:w-1/2 md:pb-0">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-brand-dark/40" aria-hidden="true" />
        <LogoMark className="relative h-16 w-16 md:h-24 md:w-24" inverted />
        <h1 className="relative text-3xl font-bold tracking-tight md:text-5xl">Agendly</h1>
        <p className="relative text-blue-100 md:text-lg">La tua giornata, sotto controllo.</p>
      </div>
      <div className="-mt-6 flex flex-1 items-start justify-center rounded-t-3xl bg-surface px-5 pb-10 pt-6 dark:bg-night md:mt-0 md:items-center md:rounded-none">
        <div className="w-full max-w-sm space-y-5">
          <Segmented
            ariaLabel="Accesso o registrazione"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
            options={[
              { value: 'login', label: 'Accedi' },
              { value: 'register', label: 'Registrati' },
            ]}
          />
          <form onSubmit={submit} className="space-y-4" noValidate>
            {mode === 'register' && <Input label="Nome" autoComplete="name" icon={<User className="h-5 w-5" />} value={name} onChange={(e) => setName(e.target.value)} placeholder="Mario Rossi" />}
            <Input label="Email" type="email" inputMode="email" autoComplete="email" icon={<Mail className="h-5 w-5" />} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it" required />
            <Input
              label="Password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              icon={<Lock className="h-5 w-5" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Almeno 6 caratteri' : '••••••••'}
              required
            />
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-urgent dark:bg-red-500/10 dark:text-red-300">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" block loading={loading === 'form'}>
              {mode === 'login' ? 'Accedi' : 'Crea account'}
            </Button>
          </form>
          {mode === 'login' && (
            <button type="button" onClick={reset} disabled={loading === 'reset'} className="block w-full text-center text-sm font-semibold text-brand hover:underline">
              Password dimenticata?
            </button>
          )}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200 dark:bg-night-border" /> oppure <span className="h-px flex-1 bg-slate-200 dark:bg-night-border" />
          </div>
          <Button variant="outline" size="lg" block onClick={google} loading={loading === 'google'} icon={<GoogleIcon />}>
            Continua con Google
          </Button>
          <p className="text-center text-xs text-slate-500">
            <Link to="/benvenuto" className="hover:underline">
              Rivedi la presentazione
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
