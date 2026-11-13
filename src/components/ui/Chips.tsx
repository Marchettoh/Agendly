import clsx from 'clsx';
import type { ReactNode } from 'react';

interface ChipGroupProps<T extends string> {
  value: T;
  options: { value: T; label: string; icon?: ReactNode; activeClass?: string }[];
  onChange: (v: T) => void;
  label?: string;
  scroll?: boolean;
}

export function ChipGroup<T extends string>({ value, options, onChange, label, scroll }: ChipGroupProps<T>) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>}
      <div role="radiogroup" aria-label={label} className={clsx('flex gap-2', scroll ? 'no-scrollbar -mx-4 overflow-x-auto px-4' : 'flex-wrap')}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={clsx(
                'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition',
                active
                  ? (o.activeClass ?? 'border-brand bg-brand text-white')
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-night-border dark:bg-night-card dark:text-slate-300',
              )}
            >
              {o.icon}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}

export function Segmented<T extends string>({ value, options, onChange, ariaLabel }: SegmentedProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/5">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'h-9 flex-1 rounded-lg text-sm font-semibold transition',
            o.value === value ? 'bg-white text-brand shadow-sm dark:bg-night-card dark:text-blue-300' : 'text-slate-500 dark:text-slate-400',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
