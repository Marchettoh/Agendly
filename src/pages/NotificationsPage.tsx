import { useState } from 'react';
import { BellOff, BellRing, CheckCircle2, Globe, Share, ShieldAlert, Smartphone } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageLoader } from '../components/ui/Spinner';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usePushStateWithRefresh } from '../hooks/usePushState';
import { disablePush, enablePush, hasDeviceToken, isIOS, isStandalone, showLocalNotification } from '../lib/messaging';
import { updateProfile } from '../lib/profile';
import { errorMessage } from '../lib/errors';

export function PushStatusPill({ state, enabled }: { state: string | null; enabled: boolean }) {
  if (state === 'granted' && enabled) return <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-success dark:bg-green-500/15 dark:text-green-300">Attive</span>;
  if (state === 'denied') return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-urgent dark:bg-red-500/15 dark:text-red-300">Bloccate</span>;
  if (state === 'unsupported') return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">Non supportate</span>;
  if (state === 'granted') return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">Non attive</span>;
  return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">Da concedere</span>;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [state, refresh] = usePushStateWithRefresh();
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(() => !!user && hasDeviceToken(user.uid));
  const iosNeedsInstall = isIOS() && !isStandalone();

  const enable = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const result = await enablePush(user.uid);
      if (result === 'granted') {
        setEnabled(true);
        await updateProfile(user.uid, { notificationsEnabled: true }).catch(console.error);
        toast.success('Notifiche attivate');
      } else if (result === 'denied') toast.error('Permesso negato. Segui le istruzioni qui sotto per riattivarle.');
      else if (result === 'unsupported') toast.error('Questo browser non supporta le notifiche push.');
    } catch (e) {
      toast.error(errorMessage(e, 'Impossibile attivare le notifiche. Riprova.'));
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await disablePush(user.uid);
      setEnabled(false);
      toast.show('Notifiche disattivate su questo dispositivo');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const test = () =>
    showLocalNotification({ title: 'Notifica di prova', body: 'Le notifiche funzionano correttamente.', itemId: '', tag: `test-${Date.now()}` }).then(() =>
      toast.success('Notifica di prova inviata'),
    );

  if (state === null) return <PageLoader />;

  return (
    <>
      <PageHeader title="Notifiche" subtitle="Promemoria e avvisi urgenti" back />

      <Card className="mb-4 flex items-center gap-4 p-5">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${state === 'granted' && enabled ? 'bg-green-50 text-success dark:bg-green-500/15' : 'bg-brand-light text-brand dark:bg-blue-500/15'}`}>
          {state === 'granted' && enabled ? <BellRing className="h-7 w-7" /> : <BellOff className="h-7 w-7" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-brand-dark dark:text-white">Notifiche push</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Stato su questo dispositivo</p>
        </div>
        <PushStatusPill state={state} enabled={enabled} />
      </Card>

      {iosNeedsInstall ? (
        <Card className="mb-4 p-5">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-brand-dark dark:text-white">
            <Smartphone className="h-5 w-5" /> Su iPhone e iPad installa prima l’app
          </h2>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">Safari consente le notifiche solo alle app aggiunte alla schermata Home (iOS 16.4 o successivo).</p>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>
              Tocca <Share className="inline h-4 w-4 align-text-bottom" /> <strong>Condividi</strong> in Safari.
            </li>
            <li>
              Scegli <strong>Aggiungi alla schermata Home</strong>.
            </li>
            <li>Apri Agendly dall’icona e torna in questa pagina.</li>
          </ol>
        </Card>
      ) : state === 'denied' ? (
        <Card className="mb-4 border-red-200 p-5 dark:border-red-500/40">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-urgent">
            <ShieldAlert className="h-5 w-5" /> Le notifiche sono bloccate
          </h2>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">Hai negato il permesso in passato. Il browser non ci permette di chiederlo di nuovo: riattivalo manualmente.</p>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div>
              <p className="flex items-center gap-1.5 font-semibold text-ink dark:text-slate-100">
                <Globe className="h-4 w-4" /> Chrome / Edge (Android e desktop)
              </p>
              <p>Tocca l’icona del lucchetto accanto all’indirizzo → Autorizzazioni → Notifiche → Consenti. Poi ricarica la pagina.</p>
            </div>
            <div>
              <p className="font-semibold text-ink dark:text-slate-100">App installata su Android</p>
              <p>Impostazioni del telefono → App → Agendly (o Chrome) → Notifiche → Attiva.</p>
            </div>
            <div>
              <p className="font-semibold text-ink dark:text-slate-100">iPhone (app installata)</p>
              <p>Impostazioni → Notifiche → Agendly → Consenti notifiche.</p>
            </div>
          </div>
          <Button variant="outline" block className="mt-4" onClick={() => window.location.reload()}>
            Ho riattivato, ricarica
          </Button>
        </Card>
      ) : state === 'unsupported' ? (
        <Card className="mb-4 p-5 text-sm text-slate-600 dark:text-slate-300">
          Questo browser non supporta le notifiche push. Usa Chrome, Edge o Firefox aggiornati, oppure installa Agendly sulla schermata Home.
        </Card>
      ) : (
        <Card className="mb-4 p-5">
          {state === 'granted' && enabled ? (
            <>
              <p className="mb-4 flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-5 w-5" /> Riceverai promemoria e avvisi urgenti anche ad app chiusa.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" block onClick={test}>
                  Invia notifica di prova
                </Button>
                <Button variant="ghost" block loading={busy} onClick={disable}>
                  Disattiva su questo dispositivo
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="mb-2 font-semibold text-brand-dark dark:text-white">Perché attivarle?</h2>
              <ul className="mb-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                <li>• Promemoria all’orario scelto (5, 15, 30, 60 minuti, 1 giorno prima…)</li>
                <li>• Avvisi immediati per gli impegni con priorità “Urgente”</li>
                <li>• Un tap sulla notifica apre direttamente l’impegno</li>
              </ul>
              <Button size="lg" block loading={busy} icon={<BellRing className="h-5 w-5" />} onClick={enable}>
                Attiva notifiche
              </Button>
              <p className="mt-2 text-center text-xs text-slate-500">Il browser ti chiederà il permesso.</p>
            </>
          )}
        </Card>
      )}
    </>
  );
}
