import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import { Toggle } from '../components/ui/Toggle';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { getInvite, joinAgenda, type InviteInfo } from '../lib/agendas';
import { updateProfile } from '../lib/profile';
import { errorMessage } from '../lib/errors';

export default function JoinAgendaPage() {
  const { code = '' } = useParams();
  const { user } = useAuth();
  const { agendas, profile } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InviteInfo | null | undefined>(undefined);
  const [makeDefault, setMakeDefault] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    getInvite(code)
      .then(setInvite)
      .catch(() => setInvite(null));
  }, [code]);

  if (invite === undefined) return <PageLoader />;
  if (!invite)
    return (
      <>
        <PageHeader title="Invito" back />
        <EmptyState icon={<Users className="h-8 w-8" />} title="Invito non valido" text="Il link potrebbe essere scaduto. Chiedi un nuovo invito a chi gestisce l’agenda." action={<Link to="/"><Button>Torna a Oggi</Button></Link>} />
      </>
    );

  const already = agendas.some((a) => a.id === invite.agendaId);

  const join = async () => {
    if (!user) return;
    setJoining(true);
    try {
      await joinAgenda(user.uid, profile?.displayName || user.displayName || user.email || 'Utente', code, invite.agendaId);
      if (makeDefault) await updateProfile(user.uid, { defaultAgendaId: invite.agendaId });
      toast.success(`Ora fai parte di “${invite.name}”`);
      navigate('/agende', { replace: true });
    } catch (e) {
      toast.error(errorMessage(e, 'Impossibile entrare nell’agenda. Chiedi un nuovo invito.'));
      setJoining(false);
    }
  };

  return (
    <>
      <PageHeader title="Invito" back />
      <Card className="p-6 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand dark:bg-blue-500/15">
          <Users className="h-7 w-7" />
        </span>
        <h2 className="text-xl font-bold text-brand-dark dark:text-white">{invite.name}</h2>
        <p className="mt-1 text-sm text-slate-500">{invite.ownerName} ti invita a condividere questa agenda.</p>
        {already ? (
          <Link to="/agende" className="mt-6 block">
            <Button block size="lg">Fai già parte di questa agenda</Button>
          </Link>
        ) : (
          <>
            <div className="my-6 text-left">
              <Toggle checked={makeDefault} onChange={setMakeDefault} label="Aggiungi i nuovi impegni in questa agenda" />
            </div>
            <Button block size="lg" loading={joining} onClick={join}>
              Unisciti
            </Button>
          </>
        )}
      </Card>
    </>
  );
}
