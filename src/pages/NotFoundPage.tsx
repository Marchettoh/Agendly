import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="pt-16">
      <EmptyState icon={<Compass className="h-8 w-8" />} title="Pagina non trovata" text="Il collegamento potrebbe essere errato o non più valido." action={<Link to="/"><Button>Torna a Oggi</Button></Link>} />
    </div>
  );
}
