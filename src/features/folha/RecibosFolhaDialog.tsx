import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Check, FileText } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui';
import { fmtBRL, fmtDate } from '@/lib/format';
import { today } from '@/lib/dates';

export interface DadosRecibo {
  id: string;
  funcionarioNome: string;
  funcionarioFuncao: string;
  funcionarioRegime: string;
  funcionarioTelefone?: string;
  tipo: 'semanal' | 'quinzenal' | 'mensal';
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
  const [reciboAlvoId, setReciboAlvoId] = useState<string | null>(null);

  if (!open || recibos.length === 0) return null;

  const dataAtual = today();

  const handleImprimir = (especificoId?: string) => {
    setReciboAlvoId(especificoId || null);
    document.body.classList.add('imprimindo-recibos');

    const finalizar = () => {
      document.body.classList.remove('imprimindo-recibos');
      setReciboAlvoId(null);
    };

    window.addEventListener('afterprint', finalizar, { once: true });
    // Timeout de fallback para navegadores que não disparam afterprint
    setTimeout(() => {
      window.print();
      setTimeout(finalizar, 2000);
    }, 50);
  };

  const listaParaImprimir = reciboAlvoId
    ? recibos.filter((r) => r.id === reciboAlvoId)
    : recibos;


  return (
    <>
      {/* Modal na Tela (não impresso) */}
      <Dialog
        open={open}
        onClose={onClose}
        title={titulo}
        subtitle={`${recibos.length} ${recibos.length === 1 ? 'recibo individual pronto' : 'recibos individuais prontos'} para visualização e impressão`}
        wide
      >
        <div className="space-y-6 no-print">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <p className="text-xs text-muted">
              Visualize o modelo do recibo abaixo. Ao clicar em <strong>Imprimir</strong>, cada colaborador
              será impresso em formato oficial de quitação sem páginas em branco desnecessárias.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                icon={<Printer className="size-4" />}
                onClick={() => handleImprimir()}
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
                className="rounded-xl border border-line bg-surface p-5 text-fg shadow-xs space-y-4 text-xs"
              >
                {/* Cabeçalho do Recibo */}
                <div className="flex flex-wrap items-start justify-between border-b border-line pb-3 gap-2">
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
                    <div className="border-t border-line pt-1 font-semibold">CONSTRUTEC ENGENHARIA</div>
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
            <Button icon={<Printer className="size-4" />} onClick={() => handleImprimir()}>
              Imprimir Recibos ({recibos.length})
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ÁREA DE IMPRESSÃO VIA PORTAL DIRETO NO BODY (Garante 1 página por recibo, zero páginas em branco) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="construtec-print-area">
            {listaParaImprimir.map((r, idx) => (
              <div
                key={r.id || idx}
                className="receipt-page font-sans text-black bg-white"
              >
                {/* Topo do Recibo */}
                <div className="flex justify-between items-start border-b border-black pb-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <img src="/logo-emblema-trim.png" alt="CONSTRUTEC" className="size-10 object-contain shrink-0" />
                    <div>
                      <h1 className="text-xl font-black tracking-tight leading-none">CONSTRUTEC</h1>
                      <p className="text-[10px] uppercase tracking-wider text-gray-700 mt-0.5">Construção Civil & Reformas em Geral</p>
                      <p className="text-[9px] text-gray-600">CNPJ: 35.477.198/0001-83 • Petrolina - PE</p>
                    </div>
                  </div>
                  <div className="text-right text-[10px]">
                    <div className="font-bold uppercase bg-gray-100 px-2 py-0.5 rounded border border-gray-400 inline-block">
                      RECIBO DE PAGAMENTO #{r.id.slice(-6).toUpperCase()}
                    </div>
                    <div className="mt-1"><strong>Emissão:</strong> {fmtDate(r.dataEmissao || dataAtual)}</div>
                    <div><strong>Período:</strong> {fmtDate(r.inicio)} a {fmtDate(r.fim)}</div>
                    <div className="uppercase"><strong>Tipo:</strong> {r.tipo}</div>
                  </div>
                </div>

                {/* Dados do Colaborador */}
                <div className="border border-gray-400 rounded p-2 text-[10px] grid grid-cols-2 gap-1.5 bg-gray-50 mb-2">
                  <div>
                    <span className="text-[9px] uppercase text-gray-600 block font-bold">Colaborador:</span>
                    <span className="font-bold text-xs">{r.funcionarioNome}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-gray-600 block font-bold">Função / Cargo:</span>
                    <span>{r.funcionarioFuncao} ({r.funcionarioRegime})</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-gray-600 block font-bold">Telefone / Pix:</span>
                    <span>{r.funcionarioTelefone || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-gray-600 block font-bold">Canteiro(s) Atuado(s):</span>
                    <span className="truncate block">{r.obrasNomes.join(', ') || 'Sede / Matriz'}</span>
                  </div>
                </div>

                {/* Tabela de Valores */}
                <table className="w-full text-left text-[10px] border border-gray-400 border-collapse mb-2">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-400 font-bold">
                      <th className="p-1.5 border-r border-gray-400">Discriminação das Diárias e Serviços</th>
                      <th className="p-1.5 border-r border-gray-400 text-center w-32">Referência</th>
                      <th className="p-1.5 text-right w-28">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-300">
                      <td className="p-1.5 border-r border-gray-300 font-medium">
                        Remuneração Base apurada no período ({r.tipo})
                      </td>
                      <td className="p-1.5 border-r border-gray-300 text-center">
                        {r.diasTrabalhados} dias trabalhados
                      </td>
                      <td className="p-1.5 text-right font-medium">{fmtBRL(r.valorBase)}</td>
                    </tr>
                    {r.ajustes && r.ajustes.map((aj, i) => (
                      <tr key={i} className="border-b border-gray-300">
                        <td className="p-1.5 border-r border-gray-300">{aj.descricao}</td>
                        <td className="p-1.5 border-r border-gray-300 text-center">-</td>
                        <td className="p-1.5 text-right">
                          {aj.valor >= 0 ? `+${fmtBRL(aj.valor)}` : fmtBRL(aj.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold border-t border-black text-xs">
                      <td colSpan={2} className="p-1.5 text-right border-r border-gray-400 uppercase">
                        VALOR LÍQUIDO A RECEBER:
                      </td>
                      <td className="p-1.5 text-right font-black">
                        {fmtBRL(r.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Declaração de Quitação */}
                <div className="border border-gray-300 p-2 rounded text-[9.5px] text-gray-800 leading-snug bg-gray-50 mb-4">
                  Declaro que recebi da empresa <strong>CONSTRUTEC</strong> a quantia líquida de{' '}
                  <strong>{fmtBRL(r.total)}</strong> discriminada neste comprovante, correspondente à quitação
                  integral dos serviços e diárias prestados no período de <strong>{fmtDate(r.inicio)} a {fmtDate(r.fim)}</strong>,
                  dando plena, rasa e irrevogável quitação.
                </div>

                {/* Assinaturas */}
                <div className="grid grid-cols-2 gap-10 text-center text-[10px] pt-3">
                  <div>
                    <div className="border-t border-black pt-1 w-52 mx-auto font-bold">{r.funcionarioNome}</div>
                    <div className="text-[9px] text-gray-600">Assinatura do Colaborador</div>
                  </div>
                  <div>
                    <div className="border-t border-black pt-1 w-52 mx-auto font-bold">CONSTRUTEC ENGENHARIA</div>
                    <div className="text-[9px] text-gray-600">Encarregado / Responsável Financeiro</div>
                  </div>
                </div>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
