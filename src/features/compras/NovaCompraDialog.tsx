import { useState } from 'react';
import { Plus, Trash2, SplitSquareVertical } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import { SEDE, type CentroId, type CompraItem, type CompraDestino, type ModoRateio, type Compra } from '@/domain/types';
import { LABEL_UNIDADE } from '@/domain/labels';
import { compraDistribuicao, escalarDistribuicao, gerarParcelas } from '@/domain/engine';
import { today, addDays } from '@/lib/dates';
import { fmtBRL, round2 } from '@/lib/format';
import { uid } from '@/lib/utils';

interface NovaCompraDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ItemRascunho {
  id: string;
  materialId: string;
  quantidade: string;
  valorUnitario: string;
}

export function NovaCompraDialog({ open, onClose }: NovaCompraDialogProps) {
  const data = useData();
  const mutate = useErp((s) => s.mutate);

  const [fornecedorId, setFornecedorId] = useState(data.fornecedores[0]?.id || '');
  const [dataCompra, setDataCompra] = useState(today());
  const [descricao, setDescricao] = useState('');
  const [documento, setDocumento] = useState('');

  // Itens
  const [itens, setItens] = useState<ItemRascunho[]>([
    { id: uid('ci'), materialId: data.materiais[0]?.id || '', quantidade: '100', valorUnitario: '35' },
  ]);

  // Centros participantes do rateio (padrão: todas as obras ativas)
  const [centrosSelecionados, setCentrosSelecionados] = useState<CentroId[]>(
    data.obras.filter((o) => o.status === 'andamento').map((o) => o.id)
  );

  const [modoRateio, setModoRateio] = useState<ModoRateio>('quantidade');
  // Matriz de rateio: centroId -> itemId -> valor (qtd ou percentual)
  const [distribuicoes, setDistribuicoes] = useState<Record<CentroId, Record<string, string>>>({});

  // Condição de pagamento
  const [parcelasQtd, setParcelasQtd] = useState('1');
  const [primeiroVenc, setPrimeiroVenc] = useState('30');
  const [intervaloDias, setIntervaloDias] = useState('30');

  const alternarCentro = (cid: CentroId) => {
    if (centrosSelecionados.includes(cid)) {
      if (centrosSelecionados.length === 1) {
        toast('Selecione pelo menos um destino para a compra', 'error');
        return;
      }
      setCentrosSelecionados(centrosSelecionados.filter((c) => c !== cid));
    } else {
      setCentrosSelecionados([...centrosSelecionados, cid]);
    }
  };

  const addItem = () => {
    setItens([
      ...itens,
      { id: uid('ci'), materialId: data.materiais[0]?.id || '', quantidade: '10', valorUnitario: '10' },
    ]);
  };

  const removeItem = (id: string) => {
    if (itens.length === 1) return;
    setItens(itens.filter((it) => it.id !== id));
  };

  const atualizarItem = (id: string, campo: keyof ItemRascunho, val: string) => {
    setItens(itens.map((it) => (it.id === id ? { ...it, [campo]: val } : it)));
  };

  const dividirIgualmente = () => {
    const n = centrosSelecionados.length;
    if (n === 0) return;

    const novaDist: Record<CentroId, Record<string, string>> = {};
    centrosSelecionados.forEach((cid) => (novaDist[cid] = {}));

    itens.forEach((it) => {
      const qTotal = parseFloat(it.quantidade.replace(',', '.')) || 0;
      if (modoRateio === 'percentual') {
        const pctBase = round2(100 / n);
        centrosSelecionados.forEach((cid) => {
          novaDist[cid][it.id] = String(pctBase);
        });
      } else {
        const qBase = Math.floor((qTotal / n) * 100) / 100;
        centrosSelecionados.forEach((cid) => {
          novaDist[cid][it.id] = String(qBase);
        });
      }
    });

    setDistribuicoes(novaDist);
    toast('Distribuição dividida igualmente entre os destinos!');
  };

  const getNomeCentro = (cid: CentroId) => {
    if (cid === SEDE) return 'Sede / Estoque Central';
    return data.obras.find((o) => o.id === cid)?.nome || cid;
  };

  // Cálculo total da compra
  const totalGeral = itens.reduce((s, it) => {
    const q = parseFloat(it.quantidade.replace(',', '.')) || 0;
    const v = parseFloat(it.valorUnitario.replace(',', '.')) || 0;
    return s + q * v;
  }, 0);

  const parcelasSimuladas = gerarParcelas(
    totalGeral,
    Math.max(1, parseInt(parcelasQtd, 10) || 1),
    addDays(dataCompra, parseInt(primeiroVenc, 10) || 30),
    parseInt(intervaloDias, 10) || 30
  );

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim() || !fornecedorId || totalGeral <= 0) return;

    // Converter itens rascunho para CompraItem oficial
    const itensOficiais: CompraItem[] = itens.map((it) => ({
      id: it.id,
      materialId: it.materialId,
      quantidade: round2(parseFloat(it.quantidade.replace(',', '.')) || 0),
      valorUnitario: round2(parseFloat(it.valorUnitario.replace(',', '.')) || 0),
    }));

    // Montar os destinos
    const destinosOficiais: CompraDestino[] = centrosSelecionados.map((cid) => {
      const qtdsMap: Record<string, number> = {};

      itensOficiais.forEach((it) => {
        const valDigitado = parseFloat(distribuicoes[cid]?.[it.id]?.replace(',', '.') || '0') || 0;
        if (modoRateio === 'percentual') {
          // Converte percentual digitado para quantidade real
          qtdsMap[it.id] = round2((it.quantidade * valDigitado) / 100);
        } else {
          qtdsMap[it.id] = round2(valDigitado);
        }
      });

      return {
        centroId: cid,
        quantidades: qtdsMap,
      };
    });

    // Se o usuário não preencheu a distribuição manualmente, divide por padrão igualmente
    const temPreenchimento = destinosOficiais.some((d) => Object.values(d.quantidades).some((q) => q > 0));
    if (!temPreenchimento) {
      const n = centrosSelecionados.length;
      destinosOficiais.forEach((dest) => {
        itensOficiais.forEach((it) => {
          dest.quantidades[it.id] = round2(it.quantidade / n);
        });
      });
    }

    const novaCompra: Compra = {
      id: uid('cmp'),
      data: dataCompra,
      fornecedorId,
      descricao: descricao.trim(),
      documento: documento.trim() || 'Sem NF',
      itens: itensOficiais,
      modoRateio,
      destinos: destinosOficiais,
      status: 'ativa',
    };

    const distCompra = compraDistribuicao(novaCompra);
    const nParc = Math.max(1, parseInt(parcelasQtd, 10) || 1);

    mutate(
      (d) => {
        d.compras.push(novaCompra);

        // Gerar Contas a Pagar
        parcelasSimuladas.forEach((p) => {
          d.contasPagar.push({
            id: uid('cp'),
            descricao: `${descricao.trim()}${nParc > 1 ? ` (${p.numero}/${nParc})` : ''}`,
            categoria: 'materiais',
            fornecedorId,
            valor: p.valor,
            vencimento: p.vencimento,
            parcela: p.numero,
            totalParcelas: nParc,
            status: 'pendente',
            documento: documento.trim(),
            origem: 'compra',
            origemId: novaCompra.id,
            distribuicao: escalarDistribuicao(distCompra, p.valor),
            criadoEm: new Date().toISOString(),
          });
        });
      },
      {
        acao: 'Compras',
        descricao: `Lançou compra centralizada "${descricao.trim()}" (${fmtBRL(totalGeral)}) com rateio em ${centrosSelecionados.length} centros`,
      },
    );

    toast(`Compra de ${fmtBRL(totalGeral)} lançada com rateio com sucesso!`);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nova Compra Centralizada com Rateio"
      subtitle="Lance compras de materiais e distribua cotas e custos entre as obras ativas"
      wide
    >
      <form onSubmit={salvar} className="space-y-6">
        {/* Cabeçalho */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Fornecedor">
            <Select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)} required>
              {data.fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data da Compra">
            <Input type="date" required value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} />
          </Field>
          <Field label="Nº NF / Pedido">
            <Input placeholder="Ex.: NF 18.990" value={documento} onChange={(e) => setDocumento(e.target.value)} />
          </Field>
          <Field label="Descrição Resumida">
            <Input required placeholder="Ex.: Carga fechada de Cimento..." value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Field>
        </div>

        {/* Lista de Itens */}
        <div className="rounded-xl border border-line p-4 bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-fg">Itens da Compra</span>
            <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={addItem}>
              Adicionar Item
            </Button>
          </div>

          <div className="space-y-2">
            {itens.map((it) => {
              const subtotal = (parseFloat(it.quantidade) || 0) * (parseFloat(it.valorUnitario) || 0);

              return (
                <div key={it.id} className="grid grid-cols-12 gap-2 items-center bg-surface-2/40 p-2 rounded-xl text-xs">
                  <div className="col-span-5">
                    <Select value={it.materialId} onChange={(e) => atualizarItem(it.id, 'materialId', e.target.value)}>
                      {data.materiais.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome} ({LABEL_UNIDADE[m.unidade]})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="any"
                      min="1"
                      required
                      placeholder="Qtd"
                      value={it.quantidade}
                      onChange={(e) => atualizarItem(it.id, 'quantidade', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      inputMode="decimal"
                      required
                      placeholder="R$ Unit"
                      value={it.valorUnitario}
                      onChange={(e) => atualizarItem(it.id, 'valorUnitario', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 text-right font-bold tabular-nums text-fg">
                    {fmtBRL(subtotal)}
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      disabled={itens.length === 1}
                      onClick={() => removeItem(it.id)}
                      className="text-muted hover:text-red-500 disabled:opacity-20"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 text-right font-bold text-base text-fg border-t border-line/60 pt-2">
            Total da Compra: <span className="text-brand">{fmtBRL(totalGeral)}</span>
          </div>
        </div>

        {/* Destinos e Rateio */}
        <div className="rounded-xl border border-line p-4 bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-sm font-bold text-fg">Rateio entre Obras & Sede</span>
              <p className="text-xs text-muted">Selecione as obras participantes e informe as cotas ou divida igualmente</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" icon={<SplitSquareVertical className="size-3.5" />} onClick={dividirIgualmente}>
                Dividir Igualmente
              </Button>
              <div className="flex rounded-lg border border-line p-0.5 bg-surface-2 text-xs">
                <button
                  type="button"
                  onClick={() => setModoRateio('quantidade')}
                  className={`px-2 py-1 rounded font-semibold ${modoRateio === 'quantidade' ? 'bg-surface text-brand shadow-sm' : 'text-muted'}`}
                >
                  Por Qtd
                </button>
                <button
                  type="button"
                  onClick={() => setModoRateio('percentual')}
                  className={`px-2 py-1 rounded font-semibold ${modoRateio === 'percentual' ? 'bg-surface text-brand shadow-sm' : 'text-muted'}`}
                >
                  Por %
                </button>
              </div>
            </div>
          </div>

          {/* Seleção de destinos */}
          <div className="flex flex-wrap gap-2 mb-4">
            {data.obras.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => alternarCentro(o.id)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  centrosSelecionados.includes(o.id)
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-line bg-surface-2 text-muted'
                }`}
              >
                {o.nome}
              </button>
            ))}
            <button
              type="button"
              onClick={() => alternarCentro(SEDE)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                centrosSelecionados.includes(SEDE)
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-line bg-surface-2 text-muted'
              }`}
            >
              Sede / Estoque Central
            </button>
          </div>

          {/* Grid de Rateio */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 text-muted border-b border-line">
                <tr>
                  <th className="p-2">Destino / Centro</th>
                  {itens.map((it) => {
                    const mat = data.materiais.find((m) => m.id === it.materialId);
                    return (
                      <th key={it.id} className="p-2 text-center">
                        {mat?.nome} ({it.quantidade} {mat?.unidade})
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {centrosSelecionados.map((cid) => (
                  <tr key={cid}>
                    <td className="p-2 font-semibold text-fg">{getNomeCentro(cid)}</td>
                    {itens.map((it) => {
                      const val = distribuicoes[cid]?.[it.id] || '';
                      return (
                        <td key={it.id} className="p-1.5 text-center">
                          <Input
                            className="h-8 text-center text-xs"
                            placeholder={modoRateio === 'percentual' ? '%' : 'Qtd'}
                            value={val}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDistribuicoes((prev) => ({
                                ...prev,
                                [cid]: { ...prev[cid], [it.id]: v },
                              }));
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Condição de Pagamento / Parcelas */}
        <div className="rounded-xl border border-line p-4 bg-surface">
          <span className="text-sm font-bold text-fg block mb-2">Condição de Pagamento (Contas a Pagar ao Fornecedor)</span>
          <div className="grid gap-3 sm:grid-cols-3 mb-3">
            <Field label="Nº de Parcelas">
              <Select value={parcelasQtd} onChange={(e) => setParcelasQtd(e.target.value)}>
                {[1, 2, 3, 4, 5, 6, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n}x {n === 1 ? '(À vista / Parcela única)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="1º Vencimento (dias após compra)">
              <Input
                type="number"
                min="0"
                value={primeiroVenc}
                onChange={(e) => setPrimeiroVenc(e.target.value)}
              />
            </Field>
            <Field label="Intervalo entre parcelas (dias)">
              <Input
                type="number"
                min="1"
                value={intervaloDias}
                onChange={(e) => setIntervaloDias(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {parcelasSimuladas.map((p) => (
              <span key={p.numero} className="rounded-lg bg-surface-2 px-2.5 py-1 border border-line">
                <span className="font-semibold text-fg">{p.numero}ª:</span> {fmtBRL(p.valor)} ({p.vencimento.split('-').reverse().join('/')})
              </span>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={totalGeral <= 0}>
            Confirmar e Lançar Compra ({fmtBRL(totalGeral)})
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
