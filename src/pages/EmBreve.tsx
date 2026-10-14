import { Hammer } from 'lucide-react';
import { PageHeader } from '@/components/ui';

export function EmBreve({ titulo, fase, itens }: { titulo: string; fase: number; itens: string[] }) {
  return (
    <>
      <PageHeader title={titulo} />
      <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand">
          <Hammer className="size-7" />
        </span>
        <h2 className="mt-4 text-lg font-bold">Em obra — Fase {fase}</h2>
        <p className="mt-1 text-sm text-muted">Este módulo será entregue na Fase {fase}. Os dados de demonstração já estão carregados.</p>
        <ul className="mt-5 space-y-1.5 text-left text-sm text-muted">
          {itens.map((i) => (
            <li key={i} className="flex gap-2">
              <span className="text-brand">•</span>
              {i}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
