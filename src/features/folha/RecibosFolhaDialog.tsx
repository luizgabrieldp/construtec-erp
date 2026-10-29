import { useState } from 'react';
import { Printer } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui';
import { fmtBRL, fmtDate } from '@/lib/format';
import { imprimirHtmlIframe, gerarHtmlRecibosIndividuais } from '@/lib/print';

export interface DadosRecibo {
  id: string;
  funcionarioNome: string;
  funcionarioFuncao: string;
  funcionarioRegime: string;
  funcionarioTelefone?: string;
  tipo: 'semanal' | 'quinzenal' | 'mensal' | 'personalizado';
  inicio: string;
  fim: string;
  diasTrabalhados: number;
  valorBase: number;
  ajustes?: Array<{ descricao: string; valor: number }>;
  total: number;
  obrasNomes: string[];
  dataEmissao?: string;
}

interface RecibosFolhaDialogProps {
  open: boolean;
  onClose: () => void;
  recibos: DadosRecibo[];
  titulo?: string;
}

export function RecibosFolhaDialog({
  open,
  onClose,
  recibos,
  titulo = 'Recibos de Pagamento',
}: RecibosFolhaDialogProps) {
  const [imprimindo, setImprimindo] = useState(false);

  if (!open || recibos.length === 0) return null;

  const handleImprimir = (especificoId?: string) => {
    setImprimindo(true);
    const lista = especificoId ? recibos.filter((r) => r.id === especificoId) : recibos;
    const html = gerarHtmlRecibosIndividuais(lista);
    const tituloDoc = lista.length === 1 ? `Recibo - ${lista[0].funcionarioNome}` : `Recibos de Pagamento (${lista.length})`;

    try {
      imprimirHtmlIframe(html, tituloDoc);
    } finally {
      setTimeout(() => setImprimindo(false), 500);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={titulo}
      subtitle={`${recibos.length} ${recibos.length === 1 ? 'recibo individual pronto' : 'recibos individuais prontos'} para visualização e impressão`}
      wide
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-line pb-3 gap-3">
          <p className="text-xs text-muted leading-relaxed">
            Visualize o modelo do recibo abaixo. Ao clicar em <strong>Imprimir</strong>, o documento
            é processado instantaneamente sem travamentos ou páginas em branco.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              icon={<Printer className="size-4" />}
              onClick={() => handleImprimir()}
              disabled={imprimindo}
            >
              Imprimir Todos ({recibos.length})
            </Button>
          </div>
        </div>

        {/* Lista de Pré-visualização na tela */}
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
          {recibos.map((r, idx) => (
            <div
              key={r.id || idx}
              className="relative overflow-hidden rounded-xl border border-line bg-surface p-5 text-fg shadow-xs space-y-4 text-xs"
            >
              {/* Marca d'água oficial translúcida CONSTRUTEC */}
              <div
                aria-hidden="true"
                className="pointer-events-none select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.035] dark:opacity-[0.045] z-0"
              >
                <img
                  src="/logo-emblema-trim.png"
                  alt=""
                  className="w-56 h-56 object-contain"
                />
              </div>

              {/* Cabeçalho do Recibo */}
              <div className="relative z-1 flex flex-wrap items-start justify-between border-b border-line pb-3 gap-2">
                <div className="flex items-center gap-3">
                  <img src="/logo-emblema-trim.png" alt="CONSTRUTEC" className="size-10 object-contain shrink-0" />
                  <div>
                    <h3 className="text-base font-black text-brand tracking-tight">CONSTRUTEC</h3>
                    <p className="text-[11px] text-muted">Construção Civil & Reformas • CNPJ: 35.477.198/0001-83 • Petrolina/PE</p>
                    <p className="font-bold text-fg mt-0.5">
                      RECIBO DE PAGAMENTO DE SALÁRIO / DIÁRIAS (COMPROVANTE DE QUITAÇÃO)
                    </p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-muted">
                  <div><strong>Período:</strong> {fmtDate(r.inicio)} a {fmtDate(r.fim)}</div>
                  <div><strong>Tipo:</strong> {r.tipo.toUpperCase()}</div>
                  <div><strong>Recibo Nº:</strong> #{r.id.slice(-6).toUpperCase()}</div>
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Printer className="size-3 text-brand" />}
                      onClick={() => handleImprimir(r.id)}
                      disabled={imprimindo}
                      title="Imprimir apenas este recibo"
                    >
                      Imprimir Este Recibo
                    </Button>
                  </div>
                </div>
              </div>

              {/* Dados do Colaborador */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg bg-surface-2/60 p-3">
                <div>
                  <span className="text-[10px] text-muted block uppercase font-bold">Colaborador</span>
                  <strong className="text-fg">{r.funcionarioNome}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted block uppercase font-bold">Função / Cargo</span>
                  <span>{r.funcionarioFuncao}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted block uppercase font-bold">Regime</span>
                  <span className="capitalize">{r.funcionarioRegime}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted block uppercase font-bold">Canteiro(s) Atuado(s)</span>
                  <span className="truncate block" title={r.obrasNomes.join(', ')}>
                    {r.obrasNomes.join(', ') || 'Sede / Matriz'}
                  </span>
                </div>
              </div>

              {/* Discriminação de Valores */}
              <div className="border border-line rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-2 border-b border-line font-semibold text-muted text-[11px]">
                    <tr>
                      <th className="p-2.5">Descrição</th>
                      <th className="p-2.5 text-center">Referência</th>
                      <th className="p-2.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    <tr>
                      <td className="p-2.5">Valor Base apurado no período ({r.tipo})</td>
                      <td className="p-2.5 text-center">{r.diasTrabalhados} dias trabalhados</td>
                      <td className="p-2.5 text-right font-medium">{fmtBRL(r.valorBase)}</td>
                    </tr>
                    {r.ajustes && r.ajustes.map((aj, i) => (
                      <tr key={i} className="text-muted">
                        <td className="p-2.5">{aj.descricao}</td>
                        <td className="p-2.5 text-center">-</td>
                        <td className="p-2.5 text-right font-medium">
                          {aj.valor >= 0 ? `+${fmtBRL(aj.valor)}` : fmtBRL(aj.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-surface-2/80 font-bold border-t border-line text-sm">
                    <tr>
                      <td colSpan={2} className="p-2.5 text-right">TOTAL LÍQUIDO A RECEBER:</td>
                      <td className="p-2.5 text-right text-emerald-600 dark:text-emerald-400">
                        {fmtBRL(r.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Termo de Quitação */}
              <p className="text-[11px] text-muted italic border-l-2 border-brand/50 pl-2 py-0.5">
                "Declaro ter recebido da CONSTRUTEC a quantia líquida acima discriminada de {fmtBRL(r.total)},
                referente à prestação de serviços no período indicado, conferida e aprovada, dando plena e rasa quitação."
              </p>

              {/* Linhas de Assinatura */}
              <div className="pt-4 grid grid-cols-2 gap-8 text-center text-[11px]">
                <div>
                  <div className="border-t border-line pt-1 font-semibold">{r.funcionarioNome}</div>
                  <div className="text-[10px] text-muted">Assinatura do Colaborador</div>
                </div>
                <div>
                  <div className="border-t border-line pt-1 font-semibold">CONSTRUTEC</div>
                  <div className="text-[10px] text-muted">Encarregado / Responsável Financeiro</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          <Button
            icon={<Printer className="size-4" />}
            onClick={() => handleImprimir()}
            disabled={imprimindo}
          >
            Imprimir Recibos ({recibos.length})
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
