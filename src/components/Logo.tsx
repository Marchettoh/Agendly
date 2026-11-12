import clsx from 'clsx';

/** Simbolo Agendly: calendario minimal con check che prosegue in una freccia in avanti. */
export function LogoMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 512 512" className={clsx('shrink-0', className ?? 'h-10 w-10')} aria-hidden="true">
      <rect width="512" height="512" rx="112" fill={inverted ? '#FFFFFF' : '#2563EB'} />
      <g transform="translate(256 256) scale(0.92) translate(-256 -256)" fill="none" stroke={inverted ? '#2563EB' : '#FFFFFF'} strokeLinecap="round" strokeLinejoin="round">
        <rect x="112" y="128" width="288" height="272" rx="56" strokeWidth="32" />
        <path d="M192 96v64M320 96v64" strokeWidth="32" />
        <path d="M176 296l52 52 108-108" strokeWidth="40" />
        <path d="M300 240h36v36" strokeWidth="28" />
      </g>
    </svg>
  );
}

export function Logo({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const mark = size === 'lg' ? 'h-16 w-16' : size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const text = size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-xl' : 'text-2xl';
  return (
    <div className={clsx('flex items-center gap-2.5', className)}>
      <LogoMark className={mark} />
      <span className={clsx('font-bold tracking-tight text-brand-dark dark:text-white', text)}>Agendly</span>
    </div>
  );
}

export function SplashScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-brand text-white">
      <LogoMark className="h-20 w-20 animate-pulse" inverted />
      <div className="text-3xl font-bold tracking-tight">Agendly</div>
      <p className="text-sm text-blue-100">La tua giornata, sotto controllo.</p>
    </div>
  );
}
