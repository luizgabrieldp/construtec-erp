import { useState, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  Filter,
  DollarSign,
  Download,
  Printer,
  Users,
  Layers,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select, Badge, Card } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import { useHoje } from '@/hooks';
import { SEDE, type FechamentoFolha, type Funcionario, type CentroId } from '@/domain/types';
import { LABEL_FUNCAO, getLabelFuncao } from '@/domain/labels';
import { calcularFolha } from '@/domain/engine';
import { addDays, endOfMonth, startOfMonth, startOfWeek, today } from '@/lib/dates';
import { fmtBRL, fmtDate, round2 } from '@/lib/format';
import { uid, waUrl } from '@/lib/utils';
import { RecibosFolhaDialog, type DadosRecibo } from './RecibosFolhaDialog';
import { ReciboEmpreiteiroDialog } from './ReciboEmpreiteiroDialog';

interface FechamentoFolhaLoteDialogProps {
  open: boolean;
  onClose: () => void;
}

export function FechamentoFolhaLoteDialog({ open, onClose }: FechamentoFolhaLoteDialogProps) {
  const data = useData();
  const hoje = useHoje();
  const mutate = useErp((s) => s.mutate);

  // Parâmetros de período
  const [tipo, setTipo] = useState<'semanal' | 'quinzenal' | 'mensal'>('semanal');
  const [inicio, setInicio] = useState(startOfWeek(addDays(hoje, -7)));
  const [fim, setFim] = useState(addDays(startOfWeek(addDays(hoje, -7)), 6));
  const [vencimento, setVencimento] = useState(addDays(today(), 5));

  // Filtros rápidos
  const [filtroObra, setFiltroObra] = useState<string>('todas');
  const [filtroFuncao, setFiltroFuncao] = useState<string>('todas');
  const [filtroRegime, setFiltroRegime] = useState<string>('todos');

  const todasFuncoesDisponiveis = [
    ...Object.keys(LABEL_FUNCAO),
    ...(data.funcoesCustomizadas || []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  // Seleção de funcionários (IDs)
  const [selecionados, setSelecionados] = useState<Set<string>>(() => {
    // Inicialmente seleciona todos os ativos
    return new Set(data.funcionarios.filter((f) => f.ativo).map((f) => f.id));
  });

  // Estado após processamento para permitir exportação do lote
  const [loteProcessado, setLoteProcessado] = useState<boolean>(false);
  const [resumoUltimoLote, setResumoUltimoLote] = useState<{
    totalColaboradores: number;
    valorTotal: number;
    itens: Array<{
      funcionario: Funcionario;
      dias: number;
      total: number;
      obrasNomes: string[];
    }>;
  } | null>(null);

  const [quinzenaOpcao, setQuinzenaOpcao] = useState<string>('atual_1');
  const [modalRecibosAberto, setModalRecibosAberto] = useState(false);
  const [modalEmpreiteiroAberto, setModalEmpreiteiroAberto] = useState(false);

  const aplicarQuinzena = (opcao: string) => {
    setQuinzenaOpcao(opcao);
    const mesAtual = hoje.slice(0, 7);
    const mesAnteriorData = startOfMonth(addDays(startOfMonth(hoje), -1));
    const mesAnterior = mesAnteriorData.slice(0, 7);

    if (opcao === 'atual_1') {
      setInicio(`${mesAtual}-01`);
      setFim(`${mesAtual}-15`);
    } else if (opcao === 'atual_2') {
      setInicio(`${mesAtual}-16`);
      setFim(endOfMonth(hoje));
    } else if (opcao === 'anterior_2') {
      setInicio(`${mesAnterior}-16`);
      setFim(endOfMonth(mesAnteriorData));
    } else if (opcao === 'anterior_1') {
      setInicio(`${mesAnterior}-01`);
      setFim(`${mesAnterior}-15`);
    }
  };

  const trocarTipo = (novoTipo: 'semanal' | 'quinzenal' | 'mensal') => {
    setTipo(novoTipo);
    if (novoTipo === 'mensal') {
      const mesPassado = startOfMonth(addDays(hoje, -28));
      setInicio(mesPassado);
      setFim(endOfMonth(mesPassado));
    } else if (novoTipo === 'quinzenal') {
      aplicarQuinzena(quinzenaOpcao);
    } else {
      const semPassada = startOfWeek(addDays(hoje, -7));
      setInicio(semPassada);
      setFim(addDays(semPassada, 6));
    }
  };

  const getNomeCentro = (cid: CentroId) => {
    if (cid === SEDE) return 'Sede / Matriz';
    return data.obras.find((o) => o.id === cid)?.nome || cid;
  };

  // Identifica a obra principal de cada funcionário no período
  const getObraPrincipal = (f: Funcionario, porCentroDias: Record<CentroId, number>): { id: CentroId; nome: string } => {
    const entries = Object.entries(porCentroDias);
    if (entries.length === 0) {
      if (f.obraPadraoId) {
        const o = data.obras.find((x) => x.id === f.obraPadraoId);
        return { id: f.obraPadraoId, nome: o?.nome || 'Obra Padrão' };
      }
      return { id: SEDE, nome: 'Sede / Matriz' };
    }

    // Centro com mais dias apontados
    entries.sort((a, b) => b[1] - a[1]);
    const principalId = entries[0][0];
    if (principalId === SEDE) return { id: SEDE, nome: 'Sede / Matriz' };
    const o = data.obras.find((x) => x.id === principalId);
    return { id: principalId, nome: o?.nome || 'Obra' };
  };

  // Cálculo individual para todos os funcionários ativos no período
  const calculosTodos = useMemo(() => {
    return data.funcionarios
      .filter((f) => f.ativo)
      .map((f) => {
        const resultado = calcularFolha(f, inicio, fim, data.apontamentos, [], tipo);
        const obra = getObraPrincipal(f, resultado.porCentroDias);
        return {
          funcionario: f,
          resultado,
          obraPrincipal: obra,
        };
      });
  }, [data.funcionarios, data.apontamentos, data.obras, inicio, fim, tipo]);

  // Lista filtrada para exibição na tela
  const colaboradoresFiltrados = useMemo(() => {
    return calculosTodos.filter(({ funcionario, obraPrincipal }) => {
      if (filtroRegime !== 'todos') {
        if (filtroRegime === 'diaristas_todos') {
          if (funcionario.regime === 'mensalista') return false;
        } else if (funcionario.regime !== filtroRegime) {
          return false;
        }
      }
      if (filtroFuncao !== 'todas' && funcionario.funcao !== filtroFuncao) return false;
      if (filtroObra !== 'todas') {
        const bateuObra = obraPrincipal.id === filtroObra || funcionario.obraPadraoId === filtroObra;
        if (!bateuObra) return false;
      }
      return true;
    });
  }, [calculosTodos, filtroRegime, filtroFuncao, filtroObra]);

  // Totalizadores dos colaboradores atualmente SELECIONADOS
  const resumoLote = useMemo(() => {
    const selecionadosCalculos = calculosTodos.filter((item) => selecionados.has(item.funcionario.id));
    const totalValor = selecionadosCalculos.reduce((s, item) => s + item.resultado.total, 0);
    const totalDias = selecionadosCalculos.reduce((s, item) => s + item.resultado.diasTrabalhados, 0);

    // Agrupamento por obra
    const porObra: Record<string, { nome: string; valor: number; qtd: number }> = {};
    selecionadosCalculos.forEach((item) => {
      item.resultado.distribuicao.forEach((dist) => {
        const oNome = dist.centroId === SEDE ? 'Sede / Matriz' : data.obras.find((o) => o.id === dist.centroId)?.nome || 'Obra';
        if (!porObra[dist.centroId]) {
          porObra[dist.centroId] = { nome: oNome, valor: 0, qtd: 0 };
        }
        porObra[dist.centroId].valor += dist.valor;
      });
      const oNomePrinc = item.obraPrincipal.nome;
      if (porObra[item.obraPrincipal.id]) {
        porObra[item.obraPrincipal.id].qtd += 1;
      }
    });

    return {
      quantidade: selecionadosCalculos.length,
      totalValor: round2(totalValor),
      totalDias,
      porObra: Object.values(porObra),
      itensSelecionados: selecionadosCalculos,
    };
  }, [calculosTodos, selecionados, data.obras]);

  // Recibos formatados para pré-visualização e impressão profissional
  const recibosDoLote: DadosRecibo[] = useMemo(() => {
    if (resumoUltimoLote) {
      return resumoUltimoLote.itens.map((it, idx) => ({
        id: `lote_${idx}_${it.funcionario.id}`,
        funcionarioNome: it.funcionario.nome,
        funcionarioFuncao: LABEL_FUNCAO[it.funcionario.funcao],
        funcionarioRegime: it.funcionario.regime,
        funcionarioTelefone: it.funcionario.telefone,
        tipo,
        inicio,
        fim,
        diasTrabalhados: it.dias,
        valorBase: it.total,
        ajustes: [],
        total: it.total,
        obrasNomes: it.obrasNomes,
        dataEmissao: new Date().toISOString().slice(0, 10),
      }));
    }

    return resumoLote.itensSelecionados.map((it, idx) => {
      const centros = it.resultado.distribuicao.length > 0
        ? Array.from(new Set(it.resultado.distribuicao.map((d) => getNomeCentro(d.centroId))))
        : [it.obraPrincipal.nome];

      return {
        id: `lote_${idx}_${it.funcionario.id}`,
        funcionarioNome: it.funcionario.nome,
        funcionarioFuncao: LABEL_FUNCAO[it.funcionario.funcao],
        funcionarioRegime: it.funcionario.regime,
        funcionarioTelefone: it.funcionario.telefone,
        tipo,
        inicio,
        fim,
        diasTrabalhados: it.resultado.diasTrabalhados,
        valorBase: it.resultado.valorBase,
        ajustes: [] as Array<{ descricao: string; valor: number }>,
        total: it.resultado.total,
        obrasNomes: centros,
        dataEmissao: new Date().toISOString().slice(0, 10),
      };
    });
  }, [resumoUltimoLote, resumoLote.itensSelecionados, tipo, inicio, fim, data.obras]);

  // Ações de seleção
  const marcarTodosFiltrados = () => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      colaboradoresFiltrados.forEach((c) => next.add(c.funcionario.id));
      return next;
    });
  };

  const desmarcarTodosFiltrados = () => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      colaboradoresFiltrados.forEach((c) => next.delete(c.funcionario.id));
      return next;
    });
  };

  const toggleFuncionario = (id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Processamento do fechamento em lote
  const processarLote = () => {
    if (resumoLote.quantidade === 0) {
      toast('Selecione ao menos um colaborador com valor a receber.', 'error');
      return;
    }

    const agora = new Date().toISOString();
    const loteId = uid('lote');

    const novosFechamentos: FechamentoFolha[] = [];
    const novasContas: any[] = [];
    const resumoItens: Array<{
      funcionario: Funcionario;
      dias: number;
      total: number;
      obrasNomes: string[];
    }> = [];

    resumoLote.itensSelecionados.forEach(({ funcionario, resultado, obraPrincipal }) => {
      if (resultado.total <= 0) return;

      const contaId = uid('cp');
      const fechamentoId = uid('fol');

      novosFechamentos.push({
        id: fechamentoId,
        funcionarioId: funcionario.id,
        tipo,
        inicio,
        fim,
        diasTrabalhados: resultado.diasTrabalhados,
        valorBase: resultado.valorBase,
        ajustes: [],
        total: resultado.total,
        distribuicao: resultado.distribuicao,
        contaPagarId: contaId,
        status: 'fechado',
        criadoEm: agora,
      });

      novasContas.push({
        id: contaId,
        descricao: `Folha ${tipo} — ${funcionario.nome} (${fmtDate(inicio).slice(0, 5)} a ${fmtDate(fim).slice(0, 5)})`,
        categoria: 'mao_de_obra',
        funcionarioId: funcionario.id,
        valor: resultado.total,
        vencimento,
        parcela: 1,
        totalParcelas: 1,
        status: 'pendente',
        documento: `LOTE-${loteId.slice(-6).toUpperCase()}`,
        origem: 'folha',
        origemId: fechamentoId,
        distribuicao: resultado.distribuicao,
        criadoEm: agora,
      });

      const centros = resultado.distribuicao.length > 0
        ? Array.from(new Set(resultado.distribuicao.map((d) => getNomeCentro(d.centroId))))
        : [obraPrincipal.nome];

      resumoItens.push({
        funcionario,
        dias: resultado.diasTrabalhados,
        total: resultado.total,
        obrasNomes: centros,
      });
    });

    if (novosFechamentos.length === 0) {
      toast('Nenhum colaborador com saldo a pagar maior que zero no período selecionado.', 'error');
      return;
    }

    mutate(
      (d) => {
        d.fechamentos.push(...novosFechamentos);
        d.contasPagar.push(...novasContas);
      },
      {
        acao: 'Folha',
        descricao: `Fechou lote de folha ${tipo} com ${novosFechamentos.length} profissionais somando ${fmtBRL(resumoLote.totalValor)}`,
      },
    );

    setResumoUltimoLote({
      totalColaboradores: novosFechamentos.length,
      valorTotal: resumoLote.totalValor,
      itens: resumoItens,
    });
    setLoteProcessado(true);

    toast(`Lote processado! ${novosFechamentos.length} folhas fechadas e contas a pagar geradas.`);
  };

  // Exportação CSV / Excel
  const exportarCSV = () => {
    const itens = resumoUltimoLote
      ? resumoUltimoLote.itens.map((it) => ({
          funcionario: it.funcionario,
          dias: it.dias,
          total: it.total,
          obraNome: it.obrasNomes.join(' / '),
        }))
      : resumoLote.itensSelecionados.map((it) => ({
          funcionario: it.funcionario,
          dias: it.resultado.diasTrabalhados,
          total: it.resultado.total,
          obraNome: it.resultado.distribuicao.length > 0
            ? Array.from(new Set(it.resultado.distribuicao.map((d) => getNomeCentro(d.centroId)))).join(' / ')
            : it.obraPrincipal.nome,
        }));

    if (itens.length === 0) return;

    const headers = [
      'Nome do Profissional',
      'Funcao / Cargo',
      'Regime',
      'Obra Principal',
      'Periodo Inicio',
      'Periodo Fim',
      'Dias Trabalhados',
      'Valor Liquido (R$)',
      'Data Vencimento',
      'Telefone / Pix',
    ];

    const linhas = itens.map((it) => [
      `"${it.funcionario.nome}"`,
      `"${LABEL_FUNCAO[it.funcionario.funcao]}"`,
      `"${it.funcionario.regime}"`,
      `"${it.obraNome}"`,
      `"${fmtDate(inicio)}"`,
      `"${fmtDate(fim)}"`,
      it.dias.toString().replace('.', ','),
      it.total.toFixed(2).replace('.', ','),
      `"${fmtDate(vencimento)}"`,
      `"${it.funcionario.telefone || '-'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...linhas.map((l) => l.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `folha_pagamento_lote_${inicio}_a_${fim}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast('Planilha CSV gerada e baixada com sucesso!');
  };

  // Impressão do espelho
  const imprimirEspelho = () => {
    window.print();
  };

  return (
    <>
      <Dialog
      open={open}
      onClose={onClose}
      title="Fechamento de Folha em Lote / Bloco"
      subtitle="Feche múltiplos profissionais de uma vez por obra ou função com geração de contas a pagar e exportação consolidada"
      wide
    >
      <div className="space-y-6 no-print">
        {/* PARTE 1: Configuração do Período */}
        <div className="rounded-xl border border-line bg-surface-2 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
            <Calendar className="size-4 text-brand" />
            1. Período de Apuração e Vencimento
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Tipo da Folha">
              <Select value={tipo} onChange={(e) => trocarTipo(e.target.value as 'semanal' | 'quinzenal' | 'mensal')}>
                <option value="semanal">Semanal (Diaristas)</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal (Mensalistas)</option>
              </Select>
            </Field>

            {tipo === 'quinzenal' ? (
              <Field label="Quinzena de Apuração">
                <Select value={quinzenaOpcao} onChange={(e) => aplicarQuinzena(e.target.value)}>
                  <option value="atual_1">1ª Quinzena deste mês (Dia 01 a 15)</option>
                  <option value="atual_2">2ª Quinzena deste mês (Dia 16 ao fim)</option>
                  <option value="anterior_2">2ª Quinzena do mês anterior (Dia 16 ao fim)</option>
                  <option value="anterior_1">1ª Quinzena do mês anterior (Dia 01 a 15)</option>
                </Select>
              </Field>
            ) : (
              <Field label="Início do Período">
                <Input type="date" required value={inicio} onChange={(e) => setInicio(e.target.value)} />
              </Field>
            )}

            {tipo === 'quinzenal' ? (
              <Field label="Intervalo Selecionado">
                <div className="flex h-10 items-center rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-fg">
                  {fmtDate(inicio)} a {fmtDate(fim)}
                </div>
              </Field>
            ) : (
              <Field label="Fim do Período">
                <Input type="date" required value={fim} onChange={(e) => setFim(e.target.value)} />
              </Field>
            )}

            <Field label="Vencimento do Pagamento">
              <Input type="date" required value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </Field>
          </div>
        </div>

        {/* PARTE 2: Filtros Rápidos por Obra, Cargo e Regime */}
        <div className="rounded-xl border border-line bg-surface-2/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Filter className="size-4 text-sky-400" />
              2. Filtros de Seleção do Bloco
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={marcarTodosFiltrados} icon={<CheckSquare className="size-3.5" />}>
                Marcar Todos Filtrados
              </Button>
              <Button size="sm" variant="ghost" onClick={desmarcarTodosFiltrados} icon={<Square className="size-3.5" />}>
                Desmarcar Filtrados
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Filtrar por Obra">
              <Select value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)}>
                <option value="todas">Todas as Obras</option>
                <option value={SEDE}>Sede / Matriz</option>
                {data.obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Filtrar por Cargo / Função">
              <Select value={filtroFuncao} onChange={(e) => setFiltroFuncao(e.target.value)}>
                <option value="todas">Todas as Funções</option>
                {todasFuncoesDisponiveis.map((fn) => (
                  <option key={fn} value={fn}>
                    {getLabelFuncao(fn)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Filtrar por Regime">
              <Select value={filtroRegime} onChange={(e) => setFiltroRegime(e.target.value)}>
                <option value="todos">Todos os Regimes</option>
                <option value="diaristas_todos">Todos os Diaristas (Semanal + Quinzenal)</option>
                <option value="diarista">Diarista Semanal</option>
                <option value="diarista_quinzenal">Diarista Quinzenal</option>
                <option value="mensalista">Apenas Mensalistas</option>
              </Select>
            </Field>
          </div>
        </div>

        {/* PARTE 3: Tabela de Profissionais Disponíveis */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted px-1">
            <span>
              Exibindo {colaboradoresFiltrados.length} colaboradores ({selecionados.size} selecionados no total)
            </span>
            <span>Valores calculados automaticamente com base na frequência apontada</span>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface-2 border-b border-line text-muted font-semibold">
                <tr>
                  <th className="p-3 w-10 text-center">Sel.</th>
                  <th className="p-3">Colaborador</th>
                  <th className="p-3">Função / Regime</th>
                  <th className="p-3">Obra Principal</th>
                  <th className="p-3 text-center">Dias Apontados</th>
                  <th className="p-3 text-right">Diária / Salário</th>
                  <th className="p-3 text-right">Valor Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {colaboradoresFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted italic">
                      Nenhum colaborador encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  colaboradoresFiltrados.map(({ funcionario, resultado, obraPrincipal }) => {
                    const isChecked = selecionados.has(funcionario.id);
                    return (
                      <tr
                        key={funcionario.id}
                        onClick={() => toggleFuncionario(funcionario.id)}
                        className={`cursor-pointer transition-colors hover:bg-surface-2/70 ${
                          isChecked ? 'bg-brand/5 font-medium' : ''
                        }`}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleFuncionario(funcionario.id)}
                            className="size-4 rounded accent-brand cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-semibold text-fg">
                          <div className="flex items-center gap-1.5">
                            <span>{funcionario.nome}</span>
                            {funcionario.telefone && waUrl(funcionario.telefone) && (
                              <a
                                href={waUrl(funcionario.telefone)!}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title={`Conversar no WhatsApp (${funcionario.telefone})`}
                                className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-2xs cursor-pointer"
                              >
                                <svg className="size-3 fill-current" viewBox="0 0 24 24">
                                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.529 1.831.815 2.791.815 3.18 0 5.767-2.587 5.767-5.767.001-3.18-2.586-5.766-5.767-5.766zm10.026 5.766c-.004 5.565-4.524 10.083-10.088 10.083-1.745 0-3.415-.45-4.89-1.285l-7.079 1.856 1.89-6.897c-.928-1.528-1.426-3.29-1.427-5.109.004-5.564 4.526-10.086 10.09-10.086 2.693 0 5.226 1.05 7.133 2.956 1.905 1.907 2.954 4.439 2.951 7.132z" />
                                </svg>
                                <span className="sr-only">WhatsApp: {funcionario.telefone}</span>
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-medium">{getLabelFuncao(funcionario.funcao)}</span>
                          <span className="text-[10px] text-muted uppercase block">
                            ({funcionario.regime === 'mensalista' ? 'Mensalista' : funcionario.regime === 'diarista_quinzenal' ? 'Diarista Quinzenal' : 'Diarista Semanal'})
                          </span>
                        </td>
                        <td className="p-3 text-muted truncate max-w-[140px]">{obraPrincipal.nome}</td>
                        <td className="p-3 text-center font-bold">
                          {resultado.diasTrabalhados > 0 ? (
                            <span className="text-emerald-500">{resultado.diasTrabalhados} dias</span>
                          ) : (
                            <span className="text-muted">0 dias</span>
                          )}
                        </td>
                        <td className="p-3 text-right text-muted tabular-nums">
                          {funcionario.regime !== 'mensalista' ? fmtBRL(funcionario.diaria) : fmtBRL(funcionario.salario)}
                        </td>
                        <td className="p-3 text-right font-black tabular-nums text-fg">
                          <span className={resultado.total > 0 ? 'text-brand' : 'text-muted'}>
                            {fmtBRL(resultado.total)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PARTE 4: Card de Resumo Consolidado do Lote */}
        <div className="rounded-2xl border border-brand/30 bg-brand/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs text-muted block">Resumo do Lote Selecionado</span>
              <div className="text-xl font-black text-fg">
                {resumoLote.quantidade} profissionais marcados{' '}
                <span className="text-xs font-normal text-muted">({resumoLote.totalDias} dias trabalhados)</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-muted block">Valor Total do Lote</span>
              <div className="text-2xl font-black text-brand tabular-nums">{fmtBRL(resumoLote.totalValor)}</div>
            </div>
          </div>

          {/* Distribuição por Obra no Lote */}
          {resumoLote.porObra.length > 0 && (
            <div className="mt-3 border-t border-brand/20 pt-2 flex flex-wrap gap-2 text-xs">
              <span className="text-muted text-[11px] font-semibold py-0.5">Rateio por Obra:</span>
              {resumoLote.porObra.map((po) => (
                <span key={po.nome} className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-medium text-fg border border-line">
                  {po.nome}: <strong className="text-brand">{fmtBRL(po.valor)}</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* PARTE 5: Ações de Fechamento e Exportação */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={exportarCSV}
              disabled={resumoLote.quantidade === 0}
              icon={<Download className="size-4 text-emerald-500" />}
            >
              Baixar Planilha CSV / Excel
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalRecibosAberto(true)}
              disabled={resumoLote.quantidade === 0}
              icon={<Printer className="size-4 text-sky-400" />}
              title="Visualizar e imprimir recibos individuais de quitação"
            >
              Imprimir Recibos Individuais ({resumoLote.quantidade})
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalEmpreiteiroAberto(true)}
              icon={<Users className="size-4 text-brand" />}
              title="Gerar e imprimir o recibo consolidado da equipe para o empreiteiro"
            >
              Impressão do Empreiteiro
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={processarLote}
              disabled={resumoLote.quantidade === 0 || resumoLote.totalValor <= 0}
              icon={<CheckCircle2 className="size-4" />}
            >
              Confirmar Fechamento em Lote ({fmtBRL(resumoLote.totalValor)})
            </Button>
          </div>
        </div>

        {/* FEEDBACK DE SUCESSO DO LOTE */}
        {loteProcessado && resumoUltimoLote && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex flex-wrap items-center justify-between gap-3">
            <div>
              <strong>Lote Processado com Sucesso!</strong> {resumoUltimoLote.totalColaboradores} colaboradores foram
              fechados somando {fmtBRL(resumoUltimoLote.valorTotal)}. As contas a pagar foram geradas com débito nas obras.
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setModalRecibosAberto(true)} icon={<Printer className="size-3.5" />}>
                Imprimir Recibos Individuais
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setModalEmpreiteiroAberto(true)} icon={<Users className="size-3.5 text-brand" />}>
                Impressão do Empreiteiro
              </Button>
              <Button size="sm" onClick={onClose}>
                Concluir
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>

    {/* MODAL DE RECIBOS INDIVIDUAIS */}
    <RecibosFolhaDialog
      open={modalRecibosAberto}
      onClose={() => setModalRecibosAberto(false)}
      recibos={recibosDoLote}
      titulo="Recibos Individuais do Lote de Folha"
    />

    {/* MODAL DE RECIBO CONSOLIDADO DO EMPREITEIRO */}
    <ReciboEmpreiteiroDialog
      open={modalEmpreiteiroAberto}
      onClose={() => setModalEmpreiteiroAberto(false)}
      inicioPadrao={inicio}
      fimPadrao={fim}
      tipoPadrao={tipo}
    />
  </>
  );
}
