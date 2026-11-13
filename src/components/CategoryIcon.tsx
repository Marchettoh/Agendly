import { Briefcase, HeartPulse, House, ShoppingCart, Shapes, User } from 'lucide-react';
import type { Category } from '../lib/types';

const ICONS = { lavoro: Briefcase, personale: User, famiglia: House, acquisti: ShoppingCart, salute: HeartPulse, altro: Shapes } as const;

export function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  const Icon = ICONS[category];
  return <Icon className={className ?? 'h-4 w-4'} aria-hidden="true" />;
}
