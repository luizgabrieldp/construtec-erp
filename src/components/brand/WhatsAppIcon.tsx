import type { SVGProps } from 'react';
import { cn, waUrl } from '@/lib/utils';

export interface WhatsAppIconProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Ícone oficial de alta definição do WhatsApp.
 * Apresenta o balão de fala oficial em verde (#25D366) e o monofone clássico branco (#FFFFFF).
 */
export function WhatsAppIcon({ className, ...props }: WhatsAppIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-4 shrink-0', className)}
      aria-hidden="true"
      {...props}
    >
      {/* Balão de fala oficial WhatsApp verde #25D366 */}
      <path
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"
        fill="#25D366"
      />
      {/* Monofone de telefone clássico WhatsApp em branco (#FFFFFF) */}
      <path
        d="M8.53 7.33c-.2-.43-.41-.44-.61-.45l-.52-.01c-.18 0-.47.07-.72.34-.25.27-.95.93-.95 2.27s.97 2.64 1.11 2.82c.14.18 1.9 2.9 4.6 4.07.65.28 1.15.44 1.54.57.65.21 1.24.18 1.71.11.52-.08 1.6-.65 1.82-1.28.23-.64.23-1.18.16-1.29-.07-.11-.25-.18-.52-.32s-1.6-.79-1.85-.88c-.25-.09-.43-.14-.62.14-.18.27-.71.88-.87 1.07-.16.18-.32.2-.6.07-.27-.14-1.15-.42-2.19-1.35-.81-.72-1.36-1.62-1.52-1.89-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.47.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48s-.6-1.45-.82-1.99"
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
      title={`Conversar no WhatsApp (${telefone})`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 transition-all hover:border-[#25D366] hover:bg-[#25D366] hover:text-white shadow-2xs hover:shadow-xs active:scale-95 group cursor-pointer select-none',
        className,
      )}
    >
      <WhatsAppIcon className="size-3.5 shrink-0" />
      {showNumber && (
        <span className="font-mono text-[11px] tabular-nums group-hover:text-white">{telefone}</span>
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
}: {
  telefone?: string | null;
  className?: string;
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
        'inline-flex size-6 shrink-0 items-center justify-center rounded-full hover:scale-110 active:scale-95 transition-all shadow-2xs cursor-pointer',
        className,
      )}
    >
      <WhatsAppIcon className="size-4 shrink-0" />
      <span className="sr-only">WhatsApp: {telefone}</span>
    </a>
  );
}
