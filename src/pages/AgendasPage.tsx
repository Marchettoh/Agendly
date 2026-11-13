import { useState } from 'react';
import { Crown, Link2, LogOut, RefreshCw, Share2, Trash2, UserMinus, Users } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Field';
import { Sheet } from '../components/ui/Sheet';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { createAgenda, deleteAgenda, inviteLink, regenerateInvite, removeMember } from '../lib/agendas';
import { updateProfile } from '../lib/profile';
import { errorMessage } from '../lib/errors';
import type { Agenda } from '../lib/types';

export default function AgendasPage() {
  const { user } = useAuth();
  const { agendas, profile, defaultAgendaId } = useData();
  const toast = useToast();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ agenda: Agenda; action: 'delete' | 'leave' } | null>(null);
  const myName = profile?.displayName || user?.displayName || user?.email || 'Utente';

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const create = async () => {
    if (!user) return;
    if (name.trim().length < 2) return toast.error('Dai un nome all’agenda (es. Famiglia).');
    setCreating(true);
    try {
      const id = await createAgenda(user.uid, myName, name);
      if (!defaultAgendaId) await updateProfile(user.uid, { defaultAgendaId: id });
      setName('');
      toast.success('Agenda creata. Ora condividi il link di invito.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const share = async (agenda: Agenda) => {
    const url = inviteLink(agenda.inviteCode);
    const text = `Unisciti all’agenda “${agenda.name}” su Agendly`;
    try {
      if (navigator.share) await navigator.share({ title: 'Agendly', text, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiato negli appunti');
      }
    } catch {
      /* condivisione annullata */
    }
  };

  const confirmAction = async () => {
    if (!confirm || !user) return;
    const { agenda, action } = confirm;
    setConfirm(null);
    if (defaultAgendaId === agenda.id) await updateProfile(user.uid, { defaultAgendaId: null }).catch(console.error);
    if (action === 'delete') await run(agenda.id, () => deleteAgenda(agenda), 'Agenda eliminata');
    else await run(agenda.id, () => removeMember(agenda.id, user.uid), 'Sei uscito dall’agenda');
  };

  return (
    <>
      <PageHeader title="Agende condivise" back />
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        Condividi un’agenda con la famiglia: tutti i membri vedono e modificano gli stessi impegni e ricevono i promemoria. La tua agenda personale resta privata.
      </p>

      {agendas.length > 0 && (
        <Card className="mb-4 p-5">
          <Select
            label="Nuovi impegni in"
            value={defaultAgendaId ?? ''}
            onChange={(e) => user && updateProfile(user.uid, { defaultAgendaId: e.target.value || null }).then(() => toast.success('Agenda predefinita aggiornata'))}
            hint="L’agenda proposta quando aggiungi un impegno. Puoi sempre cambiarla dal modulo."
          >
            <option value="">Personale</option>
            {agendas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Card>
      )}

      {agendas.map((a) => {
        const owner = a.ownerId === user?.uid;
        return (
          <Card key={a.id} className="mb-4 p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand dark:bg-blue-500/15">
                <Users className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink dark:text-slate-100">{a.name}</p>
                <p className="text-xs text-slate-500">
                  {a.members.length} {a.members.length === 1 ? 'membro' : 'membri'}
                  {defaultAgendaId === a.id ? ' · predefinita' : ''}
                </p>
              </div>
            </div>
            <ul className="mb-4 divide-y divide-slate-100 dark:divide-night-border">
              {a.members.map((m) => (
                <li key={m} className="flex items-center gap-2 py-2 text-sm">
                  <span className="flex-1 text-ink dark:text-slate-200">
                    {a.memberNames[m] ?? 'Membro'}
                    {m === user?.uid ? ' (tu)' : ''}
                  </span>
                  {m === a.ownerId && <Crown className="h-4 w-4 text-warning" aria-label="Proprietario" />}
                  {owner && m !== a.ownerId && (
                    <button
                      type="button"
                      aria-label={`Rimuovi ${a.memberNames[m] ?? 'membro'}`}
                      className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-urgent dark:hover:bg-red-500/10"
                      onClick={() => run(a.id, () => removeMember(a.id, m), 'Membro rimosso')}
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button icon={<Share2 className="h-4 w-4" />} onClick={() => share(a)}>
                Invita con un link
              </Button>
              {owner ? (
                <>
                  <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} loading={busy === `code-${a.id}`} onClick={() => run(`code-${a.id}`, () => regenerateInvite(a, myName), 'Nuovo link creato: quello vecchio non funziona più')}>
                    Nuovo link
                  </Button>
                  <Button variant="ghost" className="text-urgent sm:col-span-2" icon={<Trash2 className="h-4 w-4" />} loading={busy === a.id} onClick={() => setConfirm({ agenda: a, action: 'delete' })}>
                    Elimina agenda
                  </Button>
                </>
              ) : (
                <Button variant="ghost" className="text-urgent" icon={<LogOut className="h-4 w-4" />} loading={busy === a.id} onClick={() => setConfirm({ agenda: a, action: 'leave' })}>
                  Esci dall’agenda
                </Button>
              )}
            </div>
          </Card>
        );
      })}

      <Card className="p-5">
        <p className="mb-3 flex items-center gap-2 font-semibold text-ink dark:text-slate-100">
          <Link2 className="h-5 w-5 text-brand" /> Crea un’agenda condivisa
        </p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Famiglia" maxLength={60} />
          </div>
          <Button className="h-12" loading={creating} onClick={create}>
            Crea
          </Button>
        </div>
      </Card>

      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.action === 'delete' ? 'Eliminare l’agenda?' : 'Uscire dall’agenda?'}>
        <p className="mb-5 text-sm text-slate-600 dark:text-slate-300">
          {confirm?.action === 'delete'
            ? `“${confirm.agenda.name}” e tutti i suoi impegni verranno eliminati per tutti i membri.`
            : `Non vedrai più gli impegni di “${confirm?.agenda.name}”. Potrai rientrare con un nuovo invito.`}
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" size="lg" block onClick={() => setConfirm(null)}>
            Annulla
          </Button>
          <Button variant="danger" size="lg" block onClick={confirmAction}>
            {confirm?.action === 'delete' ? 'Elimina' : 'Esci'}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
