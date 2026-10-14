import { useState, useMemo } from 'react';
import { Calendar, DollarSign, Layers } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select, Badge } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import { today } from '@/lib/dates';
import { fmtBRL, fmtDate, round2 } from '@/lib/format';
import { uid } from '@/lib/utils';
import type { ContaReceber, PeriodicidadeRecebimento } from '@/domain/types';
import { gerarParcelasCronograma } from '@/domain/engine';
import { LABEL_PERIODICIDADE_RECEBIMENTO } from '@/domain/labels';

interface MedicaoReceberFormDialogProps {
  open: boolean;
  onClose: () => void;
  obraPadraoId?: string;
}

export function MedicaoReceberFormDialog({ open, onClose, obraPadraoId }: MedicaoReceberFormDialogProps) {
  const data = useData();
  const mutate = useErp((s) => s.mutate);

  const [modo, setModo] = useState<'individual' | 'cronograma'>('individual');
  const [obraId, setObraId] = useState(obraPadraoId || data.obras[0]?.id || '');

  // Modo Individual
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState(today());
  const [documento, setDocumento] = useState('');

  // Modo Cronograma
  const [descricaoGeral, setDescricaoGeral] = useState('Parcelamento Contratual');
  const [valorTotalContrato, setValorTotalContrato] = useState('');
  const [numParcelas, setNumParcelas] = useState(4);
  const [periodicidade, setPeriodicidade] = useState<PeriodicidadeRecebimento>('quinzenal');
  const [primeiroVencimento, setPrimeiroVencimento] = useState(today());

  const obraSel = data.obras.find((o) => o.id === obraId);

  // Preencher valor com o contrato da obra
  const usarValorContratoObra = () => {
    if (obraSel && obraSel.valorContrato > 0) {
      setValorTotalContrato(String(obraSel.valorContrato));
    }
  };

  // Cálculo das parcelas no modo cronograma
  const parcelasPrevia = useMemo(() => {
    const total = round2(Number(valorTotalContrato.replace(',', '.')) || 0);
    if (total <= 0 || numParcelas <= 0) return [];
    return gerarParcelasCronograma(total, numParcelas, primeiroVencimento, periodicidade);
  }, [valorTotalContrato, numParcelas, primeiroVencimento, periodicidade]);

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();

    if (!obraId) {
      toast('Selecione a obra de destino.', 'error');
      return;
    }

    if (modo === 'individual') {
      const vNum = round2(Number(valor.replace(',', '.')) || 0);
      if (!descricao.trim() || vNum <= 0) {
        toast('Informe a descrição e um valor válido.', 'error');
        return;
      }

      const nova: ContaReceber = {
        id: uid('cr'),
        obraId,
        descricao: descricao.trim(),
        valor: vNum,
        vencimento,
        status: 'pendente',
        documento: documento.trim(),
      };

      mutate(
        (d) => {
          d.contasReceber.push(nova);
        },
        {
          acao: 'Contas a Receber',
          descricao: `Cadastrou medição de cliente "${descricao.trim()}" no valor de ${fmtBRL(vNum)} na obra ${obraSel?.nome}`,
        },
      );

      toast('Medição cadastrada com sucesso!');
    } else {
      // Modo Cronograma
      if (parcelasPrevia.length === 0) {
        toast('Informe um valor total válido para gerar as parcelas.', 'error');
        return;
      }

      const novasContas: ContaReceber[] = parcelasPrevia.map((p) => ({
        id: uid('cr'),
        obraId,
        descricao: `${descricaoGeral.trim()} (${p.numero}/${parcelasPrevia.length})`,
        valor: p.valor,
        vencimento: p.vencimento,
        status: 'pendente',
        documento: `Cronograma ${LABEL_PERIODICIDADE_RECEBIMENTO[periodicidade].split(' ')[0]}`,
      }));

      mutate(
        (d) => {
          d.contasReceber.push(...novasContas);
        },
        {
          acao: 'Cronograma a Receber',
          descricao: `Gerou ${novasContas.length} parcelas ${periodicidade}s de recebimento no total de ${fmtBRL(
            parcelasPrevia.reduce((s, p) => s + p.valor, 0),
          )} para a obra ${obraSel?.nome}`,
        },
      );

      toast(`${novasContas.length} parcelas a receber geradas com sucesso!`);
    }

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Medições & Cronograma a Receber (Cliente)"
      subtitle="Cadastre medições avulsas ou gere o cronograma contratual completo da obra"
      wide={modo === 'cronograma'}
    >
      <form onSubmit={salvar} className="space-y-5">
        {/* Alternador de Modo */}
        <div className="flex rounded-xl border border-line bg-surface-2 p-1 text-xs">
          <button
            type="button"
            onClick={() => setModo('individual')}
            className={`flex-1 rounded-lg py-1.5 font-semibold transition-colors ${
              modo === 'individual' ? 'bg-surface text-fg shadow-xs' : 'text-muted hover:text-fg'
            }`}
          >
            Medição Avulsa
          </button>
          <button
            type="button"
            onClick={() => setModo('cronograma')}
            className={`flex-1 rounded-lg py-1.5 font-semibold transition-colors ${
              modo === 'cronograma' ? 'bg-surface text-fg shadow-xs' : 'text-muted hover:text-fg'
            }`}
          >
            Gerador de Cronograma (Semanal / Quinzenal / Mensal)
          </button>
        </div>

        {/* Obra Vinculada */}
        <Field label="Obra Vinculada">
          <Select value={obraId} onChange={(e) => setObraId(e.target.value)} required>
            {data.obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome} (Cliente: {o.cliente || '—'} • Contrato: {fmtBRL(o.valorContrato)})
              </option>
            ))}
          </Select>
        </Field>

        {modo === 'individual' ? (
          <>
            <Field label="Descrição da Medição / Parcela">
              <Input
                required
                placeholder="Ex.: 4ª Medição Construtiva, Sinal de Contrato..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Valor da Medição (R$)">
                <Input
                  required
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ''))}
                />
              </Field>

              <Field label="Data de Vencimento">
                <Input type="date" required value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
              </Field>
            </div>

            <Field label="Nº Contrato / Documento / Aditivo">
              <Input
                placeholder="Ex.: Medição 04 / Contrato 2026-A"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
              />
            </Field>
          </>
        ) : (
          /* MODO CRONOGRAMA AUTOMÁTICO */
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título / Referência do Cronograma">
                <Input
                  required
                  value={descricaoGeral}
                  onChange={(e) => setDescricaoGeral(e.target.value)}
                  placeholder="Ex: Parcelamento do Contrato"
                />
              </Field>

              <Field
                label="Valor Total a Parcelar (R$)"
                hint={
                  obraSel?.valorContrato ? (
                    <button
                      type="button"
                      onClick={usarValorContratoObra}
                      className="text-brand hover:underline cursor-pointer"
                    >
                      Puxar valor do contrato ({fmtBRL(obraSel.valorContrato)})
                    </button>
                  ) : undefined
                }
              >
                <Input
                  required
                  placeholder="0,00"
                  value={valorTotalContrato}
                  onChange={(e) => setValorTotalContrato(e.target.value.replace(/[^\d,.]/g, ''))}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Periodicidade de Recebimento">
                <Select
                  value={periodicidade}
                  onChange={(e) => setPeriodicidade(e.target.value as PeriodicidadeRecebimento)}
                >
                  <option value="quinzenal">Quinzenal (a cada 15 dias)</option>
                  <option value="semanal">Semanal (a cada 7 dias)</option>
                  <option value="mensal">Mensal (a cada 30 dias)</option>
                </Select>
              </Field>

              <Field label="Quantidade de Parcelas">
                <Select
                  value={numParcelas}
                  onChange={(e) => setNumParcelas(Number(e.target.value))}
                >
                  {[2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24].map((n) => (
                    <option key={n} value={n}>
                      {n} parcelas
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="1º Vencimento">
                <Input
                  type="date"
                  required
                  value={primeiroVencimento}
                  onChange={(e) => setPrimeiroVencimento(e.target.value)}
                />
              </Field>
            </div>

            {/* Prévia das parcelas */}
            {parcelasPrevia.length > 0 && (
              <div className="rounded-xl border border-line bg-surface-2/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-fg">
                  <span>Pré-visualização do Cronograma de Recebimento</span>
                  <Badge tone="blue">{parcelasPrevia.length} parcelas {periodicidade}s</Badge>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-lg border border-line bg-surface">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-2/60 text-muted border-b border-line">
                      <tr>
                        <th className="py-2 px-3">Parcela</th>
                        <th className="py-2 px-3">Vencimento Previsto</th>
                        <th className="py-2 px-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {parcelasPrevia.map((p) => (
                        <tr key={p.numero}>
                          <td className="py-2 px-3 font-semibold">
                            {p.numero}ª Parcela ({descricaoGeral})
                          </td>
                          <td className="py-2 px-3 tabular-nums">{fmtDate(p.vencimento)}</td>
                          <td className="py-2 px-3 text-right font-bold tabular-nums text-emerald-500">
                            {fmtBRL(p.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2 justify-end border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            {modo === 'individual' ? 'Cadastrar Medição' : `Gerar ${parcelasPrevia.length || ''} Parcelas`}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
