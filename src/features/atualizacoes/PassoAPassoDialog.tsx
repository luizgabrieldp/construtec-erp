import { useEffect, useRef } from 'react';
import {
  Printer,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  MapPin,
  LayoutGrid,
  ArrowUpDown,
  Users,
  CheckSquare,
  Smartphone,
  Truck,
  Building2,
  CloudCheck,
  MousePointerClick,
  Bell,
} from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import type { ReleaseVersao } from '@/data/atualizacoes';

interface PassoAPassoDialogProps {
  versao: ReleaseVersao | null;
  open: boolean;
  onClose: () => void;
  autoPrint?: boolean;
}

export function PassoAPassoDialog({ versao, open, onClose, autoPrint = false }: PassoAPassoDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && autoPrint && versao) {
      const timer = setTimeout(() => {
        window.print();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [open, autoPrint, versao]);

  if (!versao) return null;

  const handlePrint = () => {
    window.print();
  };

  const getIconePasso = (iconeNome: string) => {
    switch (iconeNome) {
      case 'LayoutGrid':
        return <LayoutGrid className="size-5 text-brand" />;
      case 'ArrowUpDown':
        return <ArrowUpDown className="size-5 text-brand" />;
      case 'Users':
        return <Users className="size-5 text-brand" />;
      case 'CheckSquare':
        return <CheckSquare className="size-5 text-emerald-500" />;
      case 'Printer':
        return <Printer className="size-5 text-brand" />;
      case 'Smartphone':
        return <Smartphone className="size-5 text-blue-500" />;
      case 'Truck':
        return <Truck className="size-5 text-amber-500" />;
      case 'Building2':
        return <Building2 className="size-5 text-brand" />;
      case 'CloudCheck':
        return <CloudCheck className="size-5 text-sky-500" />;
      case 'Bell':
        return <Bell className="size-5 text-amber-500" />;
      case 'Touchpad':
      case 'MousePointerClick':
        return <MousePointerClick className="size-5 text-violet-500" />;
      default:
        return <Sparkles className="size-5 text-brand" />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Guia Passo a Passo • ${versao.versao}`}
      subtitle={versao.titulo}
      wide
      className="cx-printable-dialog"
      footer={
        <div className="flex w-full items-center justify-between no-print">
          <span className="text-xs text-muted">
            {versao.passosVisuais.length} passos ilustrados disponíveis
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Fechar
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Printer className="size-4" />}
              onClick={handlePrint}
            >
              Imprimir / Salvar em PDF
            </Button>
          </div>
        </div>
      }
    >
      <div ref={contentRef} id="passo-a-passo-print-area" className="space-y-6">
        {/* Cabeçalho de Impressão Oficial (Apenas no Print) */}
        <div className="hidden print:block border-b-2 border-brand pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">CONSTRUTEC ERP</h1>
              <p className="text-xs text-gray-600">Documentação Oficial do Sistema • Guia Passo a Passo</p>
            </div>
            <div className="text-right">
              <span className="inline-block rounded bg-orange-600 px-2.5 py-1 text-xs font-bold text-white">
                {versao.versao}
              </span>
              <p className="text-[10px] text-gray-500 mt-1">{versao.dataPublicacao}</p>
            </div>
          </div>
          <h2 className="text-base font-semibold text-gray-800 mt-3">{versao.titulo}</h2>
        </div>

        {/* Botão de topo para impressão rápida (no-print) */}
        <div className="no-print flex items-center justify-between rounded-xl bg-brand/10 p-3.5 border border-brand/20">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-5 text-brand shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-fg block">Guia Ilustrado de Instruções</span>
              <span className="text-muted">Gere um documento formatado em PDF para compartilhar com encarregados e clientes.</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            icon={<Printer className="size-4" />}
            onClick={handlePrint}
            className="shrink-0"
          >
            Imprimir / PDF
          </Button>
        </div>

        {/* Cartão de Resumo da Release */}
        <div className="rounded-2xl border border-line bg-surface-2/60 p-4 sm:p-5 print:border-gray-300 print:bg-gray-50">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted print:text-gray-600">
              Sobre esta atualização
            </span>
            <span className="text-xs text-muted print:text-gray-500">{versao.dataPublicacao}</span>
          </div>
          <p className="text-sm text-fg leading-relaxed print:text-gray-900">{versao.descricao}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {versao.mudancas.map((m, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-muted print:border-gray-300 print:bg-white print:text-gray-800"
              >
                <span
                  className={`size-1.5 rounded-full ${
                    m.tag === 'Novo'
                      ? 'bg-emerald-500'
                      : m.tag === 'Melhoria'
                      ? 'bg-blue-500'
                      : 'bg-amber-500'
                  }`}
                />
                <strong className="text-fg print:text-black">{m.tag}:</strong> {m.texto}
              </span>
            ))}
          </div>
        </div>

        {/* Lista de Passos Visuais Ilustrados */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 print:text-gray-700">
            <CheckCircle2 className="size-4 text-brand" />
            <span>Instruções Práticas para o Usuário</span>
          </h3>

          <div className="grid gap-4">
            {versao.passosVisuais.map((passo) => (
              <div
                key={passo.passo}
                className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-xs transition-shadow hover:border-brand/40 break-inside-avoid print:border-gray-300 print:bg-white"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Badge do Número do Passo */}
                  <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white font-bold text-sm shadow-sm shadow-brand/30 print:bg-orange-600">
                    {passo.passo}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2">
                        {getIconePasso(passo.icone)}
                        <h4 className="text-sm sm:text-base font-bold text-fg print:text-black">{passo.titulo}</h4>
                      </div>
                    </div>

                    <p className="mt-2 text-xs sm:text-sm text-fg/90 leading-relaxed print:text-gray-800">
                      {passo.descricao}
                    </p>

                    {/* Caixa de Onde Encontrar & Dica */}
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {passo.ondeEncontrar && (
                        <div className="flex items-start gap-2 rounded-xl bg-surface-2 p-2.5 text-xs text-muted print:border print:border-gray-200 print:bg-gray-50 print:text-gray-700">
                          <MapPin className="size-3.5 text-brand shrink-0 mt-0.5 print:text-orange-600" />
                          <div>
                            <span className="font-semibold text-fg block text-[11px] print:text-black">Onde encontrar:</span>
                            <span>{passo.ondeEncontrar}</span>
                          </div>
                        </div>
                      )}

                      {passo.dica && (
                        <div className="flex items-start gap-2 rounded-xl bg-brand/5 border border-brand/15 p-2.5 text-xs text-muted print:border print:border-orange-200 print:bg-orange-50/50 print:text-gray-800">
                          <HelpCircle className="size-3.5 text-brand shrink-0 mt-0.5 print:text-orange-600" />
                          <div>
                            <span className="font-semibold text-brand block text-[11px] print:text-orange-700">Dica de Produtividade:</span>
                            <span className="text-fg/80 print:text-gray-800">{passo.dica}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé do Guia com orientações para a equipe */}
        <div className="rounded-2xl border border-dashed border-line p-4 text-center text-xs text-muted break-inside-avoid print:border-gray-300 print:text-gray-600">
          <p className="font-semibold text-fg print:text-black">Dúvidas operacionais sobre esta versão?</p>
          <p className="mt-1">
            Compartilhe este guia em PDF com seus encarregados de obras ou consulte o suporte técnico do Construtec ERP.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
