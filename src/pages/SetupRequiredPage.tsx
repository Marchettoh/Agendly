import { Logo } from '../components/Logo';
import { Card } from '../components/ui/Card';

export default function SetupRequiredPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface p-6 dark:bg-night">
      <Card className="max-w-lg space-y-4 p-6">
        <Logo />
        <h1 className="text-xl font-bold text-brand-dark dark:text-white">Configurazione Firebase mancante</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Copia <code className="rounded bg-slate-100 px-1 dark:bg-white/10">.env.example</code> in <code className="rounded bg-slate-100 px-1 dark:bg-white/10">.env</code> e inserisci i valori della tua Web App Firebase, poi riavvia il server di sviluppo. Trovi le istruzioni complete nel README.
        </p>
      </Card>
    </div>
  );
}
