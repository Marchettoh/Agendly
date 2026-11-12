import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, CalendarCheck2, Sparkles, WifiOff } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../components/ui/Button';
import { LogoMark } from '../components/Logo';

export const ONBOARDING_KEY = 'agendly.onboarded';

const SLIDES = [
  {
    icon: CalendarCheck2,
    title: 'Tutta la giornata in un colpo d’occhio',
    text: 'Eventi, attività e promemoria nella vista “Oggi”, con settimana e mese a portata di tap.',
  },
  {
    icon: BellRing,
    title: 'Notifiche quando contano davvero',
    text: 'Imposta la priorità “Urgente” e Agendly ti avvisa in tempo, anche ad app chiusa.',
  },
  {
    icon: Sparkles,
    title: 'Aggiungi un impegno in 10 secondi',
    text: 'Pochi campi, bottoni grandi, completamento con un tap. Pensata per lo smartphone.',
  },
  {
    icon: WifiOff,
    title: 'Funziona anche offline',
    text: 'Installala sulla schermata Home: consulti e modifichi l’agenda anche senza rete.',
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const last = step === SLIDES.length - 1;
  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    navigate('/accedi', { replace: true });
  };
  const slide = SLIDES[step];
  const Icon = slide.icon;

  return (
    <div className="flex min-h-dvh flex-col bg-surface px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] dark:bg-night">
      <div className="flex items-center justify-between">
        <LogoMark className="h-9 w-9" />
        {!last && (
          <button onClick={finish} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:text-brand">
            Salta
          </button>
        )}
      </div>
      <div key={step} className="mx-auto flex w-full max-w-sm flex-1 animate-fade-in flex-col items-center justify-center text-center">
        <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-brand-light text-brand dark:bg-blue-500/15 dark:text-blue-300">
          <Icon className="h-14 w-14" strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-dark dark:text-white">{slide.title}</h1>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-300">{slide.text}</p>
      </div>
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="flex justify-center gap-2" aria-label={`Passo ${step + 1} di ${SLIDES.length}`}>
          {SLIDES.map((_, i) => (
            <span key={i} className={clsx('h-2 rounded-full transition-all', i === step ? 'w-6 bg-brand' : 'w-2 bg-slate-300 dark:bg-slate-600')} />
          ))}
        </div>
        <Button size="lg" block onClick={() => (last ? finish() : setStep(step + 1))}>
          {last ? 'Inizia' : 'Avanti'}
        </Button>
      </div>
    </div>
  );
}
