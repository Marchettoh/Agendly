import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('rounded-2xl border border-slate-100 bg-white shadow-card dark:border-night-border dark:bg-night-card dark:shadow-none', className)}
      {...rest}
    />
  );
}
