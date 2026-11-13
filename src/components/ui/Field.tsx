import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

const base =
  'w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-ink md:text-[15px] placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 dark:border-night-border dark:bg-night dark:text-slate-100 dark:placeholder:text-slate-500';

interface FieldWrapProps {
  label?: string;
  hint?: string;
  error?: string;
  id: string;
  children: ReactNode;
}

export function FieldWrap({ label, hint, error, id, children }: FieldWrapProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-sm text-urgent" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string; icon?: ReactNode };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, hint, error, icon, className, id, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldWrap label={label} hint={hint} error={error} id={fid}>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
        <input ref={ref} id={fid} className={clsx(base, 'h-12', icon && 'pl-11', error && 'border-urgent', className)} aria-invalid={!!error} {...rest} />
      </div>
    </FieldWrap>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string; error?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, hint, error, className, id, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldWrap label={label} hint={hint} error={error} id={fid}>
      <textarea ref={ref} id={fid} className={clsx(base, 'min-h-[96px] py-3', className)} {...rest} />
    </FieldWrap>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string; error?: string };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, hint, error, className, id, children, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldWrap label={label} hint={hint} error={error} id={fid}>
      <select ref={ref} id={fid} className={clsx(base, 'h-12 appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10 select-chevron', className)} {...rest}>
        {children}
      </select>
    </FieldWrap>
  );
});
