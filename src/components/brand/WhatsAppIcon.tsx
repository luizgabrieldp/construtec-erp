import type { SVGProps } from 'react';
import { cn, waUrl } from '@/lib/utils';

export interface WhatsAppIconProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Ícone oficial de alta definição do WhatsApp.
 * Apresenta o balão de fala oficial em verde (#25D366) e o monofone clássico branco (#FFFFFF) em curvas perfeitas.
 */
export function WhatsAppIcon({ className = 'size-4', ...props }: WhatsAppIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden="true"
      {...props}
    >
      {/* Balão de fala oficial WhatsApp verde #25D366 */}
      <path
        d="M12.05 0C5.49 0 .16 5.33.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.558 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413A11.815 11.815 0 0012.05 0z"
        fill="#25D366"
      />
      {/* Monofone de telefone clássico WhatsApp em branco (#FFFFFF) com curvas perfeitamente finalizadas */}
      <path
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * Badge pill oficial do WhatsApp com ícone e número de telefone formatado.
 */
export function WhatsAppBadge({
  telefone,
  className,
  showNumber = true,
}: {
  telefone?: string | null;
  className?: string;
  showNumber?: boolean;
}) {
  const url = waUrl(telefone);
  if (!telefone || !url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`Conversar no WhatsApp (${telefone})`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 transition-all hover:border-[#25D366] hover:bg-[#25D366] hover:text-white shadow-2xs hover:shadow-xs active:scale-95 group cursor-pointer select-none',
        className,
      )}
    >
      <WhatsAppIcon className="size-3.5 shrink-0 transition-transform group-hover:scale-110" />
      {showNumber && (
        <span className="font-mono text-[11px] tabular-nums font-semibold group-hover:text-white">{telefone}</span>
      )}
      <span className="sr-only">WhatsApp: {telefone}</span>
    </a>
  );
}

/**
 * Botão circular compacto oficial do WhatsApp.
 */
export function WhatsAppButton({
  telefone,
  className,
  size = 'md',
}: {
  telefone?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const url = waUrl(telefone);
  if (!telefone || !url) return null;

  const sizeClasses = {
    sm: 'size-5',
    md: 'size-6',
    lg: 'size-7',
  }[size];

  const iconSizes = {
    sm: 'size-3.5',
    md: 'size-4.5',
    lg: 'size-5',
  }[size];

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`Conversar no WhatsApp (${telefone})`}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full hover:scale-110 active:scale-95 transition-all shadow-2xs hover:shadow-xs cursor-pointer',
        sizeClasses,
        className,
      )}
    >
      <WhatsAppIcon className={cn('shrink-0', iconSizes)} />
      <span className="sr-only">WhatsApp: {telefone}</span>
    </a>
  );
}
