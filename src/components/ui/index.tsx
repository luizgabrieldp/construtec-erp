import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------- Button
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover shadow-sm shadow-brand/20',
  secondary: 'bg-surface-2 text-fg border border-line hover:border-brand/50',
  ghost: 'text-muted hover:text-fg hover:bg-surface-2',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

// ---------------------------------------------------------------- Card
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-line bg-surface', className)} {...rest} />;
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 pt-5', className)}>
      <div>
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------- Badge
type Tone = 'neutral' | 'orange' | 'green' | 'red' | 'amber' | 'blue';
const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border-line',
  orange: 'bg-brand/10 text-brand border-brand/25',
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
  blue: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25',
};

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap', TONES[tone], className)}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- Form fields
export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

const inputBase =
  'h-10 w-full rounded-xl border border-line bg-bg px-3 text-base sm:text-sm text-fg placeholder:text-muted/70 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 user-invalid:border-red-500';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(inputBase, className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...rest }, ref) {
  return <select ref={ref} className={cn(inputBase, 'pr-8', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(inputBase, 'h-auto min-h-20 py-2', className)} {...rest} />;
});

// ---------------------------------------------------------------- Page header
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 no-print">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Progress
export function Progress({ value, className, tone }: { value: number; className?: string; tone?: 'auto' | 'brand' }) {
  const pct = Math.max(0, Math.min(1, value));
  const color =
    tone === 'brand' ? 'bg-brand' : value > 1 ? 'bg-red-500' : value > 0.85 ? 'bg-amber-500' : 'bg-brand';
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${pct * 100}%` }} />
    </div>
  );
}
