import { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  HardHat,
  Calendar,
  Building2,
  Check,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import { useHoje, useIsAdmin } from '@/hooks';
import { SEDE, type CentroId, type StatusPresenca } from '@/domain/types';
import { LABEL_FUNCAO, getLabelFuncao } from '@/domain/labels';
import { chaveApontamento, FATOR_PRESENCA, valorDia } from '@/domain/engine';
import { addDays, eachDay, startOfWeek } from '@/lib/dates';
import { fmtBRL, fmtDate, fmtDateShort } from '@/lib/format';
import { cn, normalizarTexto } from '@/lib/utils';

const DIAS_NOMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function ApontamentoGrade() {
  const data = useData();
  const hoje = useHoje();
  const isAdmin = useIsAdmin();
  const mutate = useErp((s) => s.mutate);

  const [revelarCusto, setRevelarCusto] = useState(false);
  const timerCustoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRevelarCustoTemporario = () => {
    if (timerCustoRef.current) clearTimeout(timerCustoRef.current);
    if (revelarCusto) {
      setRevelarCusto(false);
      return;
    }
    setRevelarCusto(true);
    timerCustoRef.current = setTimeout(() => {
      setRevelarCusto(false);
    }, 10000); // 10 segundos
  };

  useEffect(() => {
    return () => {
      if (timerCustoRef.current) clearTimeout(timerCustoRef.current);
    };
  }, []);

  const [semanaInicio, setSemanaInicio] = useState(startOfWeek(hoje));

  // 7 dias da semana: Segunda a Domingo
  const diasSemana = eachDay(semanaInicio, addDays(semanaInicio, 6));

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stickyThRef = useRef<HTMLTableCellElement>(null);
  const thRefs = useRef<(HTMLTableCellElement | null)[]>([]);

  const rolarParaHoje = (smooth = true) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const hojeIdx = diasSemana.indexOf(hoje);
    if (hojeIdx === -1) return;

    // Se hoje for o primeiro dia da semana (Segunda), fica no início (0)
    // Se hoje for Terça em diante, posicionamos o dia anterior logo após a coluna fixa,
    // garantindo que "Hoje" seja a 2ª coluna visível (centralizada/em destaque)
    // e o usuário veja claramente que é possível deslizar para trás e para frente.
    const targetIdx = Math.max(0, hojeIdx - 1);
    if (targetIdx === 0) {
      container.scrollTo({ left: 0, behavior: smooth ? 'smooth' : 'auto' });
      return;
    }

    const targetTh = thRefs.current[targetIdx];
    const stickyTh = stickyThRef.current;
    if (targetTh && stickyTh) {
      const stickyWidth = stickyTh.offsetWidth;
      const scrollPos = Math.max(0, targetTh.offsetLeft - stickyWidth);
      container.scrollTo({ left: scrollPos, behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  useEffect(() => {
    if (!diasSemana.includes(hoje)) return;
    // Pequeno delay para garantir que o layout/tabela do DOM foi completamente dimensionado
    const t = setTimeout(() => {
      rolarParaHoje(true);
    }, 120);
    return () => clearTimeout(t);
  }, [semanaInicio, hoje]);

  // Modal para alocar colaborador em múltiplas obras em um dia
  const [modalObras, setModalObras] = useState<{
    funcionarioId: string;
    funcionarioNome: string;
    dia: string;
    centrosSelecionados: CentroId[];
    statusAtual: StatusPresenca;
  } | null>(null);

  const [busca, setBusca] = useState('');
  const [filtroFuncao, setFiltroFuncao] = useState('todos');

  const mudarSemana = (deltaSemanas: number) => {
    setSemanaInicio(addDays(semanaInicio, deltaSemanas * 7));
  };

  const setStatus = (
    funcionarioId: string,
    dia: string,
    novoStatus: StatusPresenca,
    centrosAtuais: CentroId[],
  ) => {
    mutate((d) => {
      const k = chaveApontamento(funcionarioId, dia);
      const centroId = centrosAtuais[0] || d.obras[0]?.id || SEDE;
      d.apontamentos[k] = {
        funcionarioId,
        data: dia,
        centroId,
        centroIds: centrosAtuais.length > 0 ? centrosAtuais : [centroId],
        status: novoStatus,
      };
    });
  };

  const abrirModalObras = (
    funcionarioId: string,
    funcionarioNome: string,
    dia: string,
    centros: CentroId[],
    status: StatusPresenca,
  ) => {
    setModalObras({
      funcionarioId,
      funcionarioNome,
      dia,
      centrosSelecionados: [...centros],
      statusAtual: status,
    });
  };

  const salvarObrasModal = () => {
    if (!modalObras) return;
    const { funcionarioId, dia, centrosSelecionados, statusAtual } = modalObras;
    if (centrosSelecionados.length === 0) {
      toast('Selecione ao menos uma obra para o apontamento.', 'error');
      return;
    }

    mutate((d) => {
      const k = chaveApontamento(funcionarioId, dia);
      d.apontamentos[k] = {
        funcionarioId,
        data: dia,
        centroId: centrosSelecionados[0],
        centroIds: centrosSelecionados,
        status: statusAtual,
      };
    });

    toast('Obras atualizadas para o colaborador no dia selecionado.');
    setModalObras(null);
  };

  const toggleCentroNoModal = (cid: CentroId) => {
    if (!modalObras) return;
    const exists = modalObras.centrosSelecionados.includes(cid);
    const next = exists
      ? modalObras.centrosSelecionados.filter((x) => x !== cid)
      : [...modalObras.centrosSelecionados, cid];
    setModalObras({ ...modalObras, centrosSelecionados: next });
  };

  const todasFuncoes = [
    ...Object.keys(LABEL_FUNCAO),
    ...(data.funcoesCustomizadas || []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const funcionariosFiltrados = data.funcionarios
    .filter((f) => f.ativo)
    .filter((f) => {
      if (filtroFuncao !== 'todos' && f.funcao !== filtroFuncao) return false;
      if (busca.trim()) {
        const qNorm = normalizarTexto(busca);
        const qDigits = busca.replace(/\D/g, '');
        const matchNome = normalizarTexto(f.nome).includes(qNorm);
        const matchApelido = f.apelido?.trim() ? normalizarTexto(f.apelido).includes(qNorm) : false;
        const matchTelefone =
          f.telefone.includes(busca.trim()) ||
          (qDigits.length > 0 && f.telefone.replace(/\D/g, '').includes(qDigits));
        const matchCpf = f.cpf
          ? f.cpf.includes(busca.trim()) || (qDigits.length > 0 && f.cpf.replace(/\D/g, '').includes(qDigits))
          : false;

        return matchNome || matchApelido || matchTelefone || matchCpf;
      }
      return true;
    });

  return (
    <div className="space-y-4">
      {/* Barra de Navegação da Semana e Filtros Rápidos */}
      <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button size="sm" variant="secondary" icon={<ChevronLeft className="size-4" />} onClick={() => mudarSemana(-1)}>
              <span className="hidden sm:inline">Semana</span> Anterior
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSemanaInicio(startOfWeek(hoje));
                setTimeout(() => rolarParaHoje(true), 80);
              }}
            >
              Hoje
            </Button>
            <Button size="sm" variant="secondary" icon={<ChevronRight className="size-4" />} onClick={() => mudarSemana(1)}>
              Próxima
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-fg">
            <Calendar className="size-4 text-brand" />
            <span>
              {fmtDateShort(semanaInicio)} até {fmtDateShort(addDays(semanaInicio, 6))}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted">
            <div className="flex items-center gap-1">
              <span className="size-4 sm:size-5 rounded bg-emerald-500 text-white font-bold grid place-items-center text-[9px] sm:text-[10px]">1</span>
              <span className="hidden sm:inline">Dia Inteiro</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="size-4 sm:size-5 rounded bg-amber-500 text-white font-bold grid place-items-center text-[9px] sm:text-[10px]">½</span>
              <span className="hidden sm:inline">Meio Período</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="size-4 sm:size-5 rounded bg-red-500 text-white font-bold grid place-items-center text-[9px] sm:text-[10px]">F</span>
              <span className="hidden sm:inline">Falta (Vermelho)</span>
            </div>
          </div>
        </div>

        {/* Linha de Busca e Filtro de Função */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Buscar por nome ou apelido na grade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full sm:w-64 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs text-fg placeholder:text-muted focus:border-brand focus:outline-none"
            />
            <select
              value={filtroFuncao}
              onChange={(e) => setFiltroFuncao(e.target.value)}
              className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-fg focus:border-brand focus:outline-none"
            >
              <option value="todos">Todas as Funções</option>
              {todasFuncoes.map((fn) => (
                <option key={fn} value={fn}>
                  {getLabelFuncao(fn)}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-muted">
            Exibindo <strong>{funcionariosFiltrados.length}</strong> profissionais ativos
          </div>
        </div>
      </div>

      {/* Grade de Apontamento com Scroll Horizontal e Coluna Fixa */}
      <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-xs">
        <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="border-b border-line bg-surface-2 text-xs font-semibold text-muted uppercase">
              <tr>
                {/* Coluna Fixa: Colaborador / Função (Compacto no Mobile) */}
                <th
                  ref={stickyThRef}
                  className="sticky left-0 top-0 z-30 bg-surface-2 px-2.5 py-3 w-32 min-w-[120px] max-w-[130px] sm:w-48 sm:min-w-[180px] sm:max-w-[200px] shadow-[2px_0_5px_rgba(0,0,0,0.06)] border-r border-line"
                >
                  Colaborador
                </th>

                {/* 7 Dias: Segunda a Domingo */}
                {diasSemana.map((dia, idx) => {
                  const isHoje = dia === hoje;
                  return (
                    <th
                      key={dia}
                      ref={(el) => {
                        thRefs.current[idx] = el;
                      }}
                      className={cn(
                        'sticky top-0 z-20 bg-surface-2 px-1 py-2 sm:py-3 text-center min-w-[66px] sm:min-w-[84px] max-w-[96px] border-r border-line/40',
                        isHoje && 'bg-brand/10 text-brand font-bold',
                      )}
                    >
                      <div className="text-[11px] font-bold">{DIAS_NOMES[idx]}</div>
                      <div className="text-[10px] font-normal text-muted lowercase">
                        {fmtDateShort(dia)}
                        {isHoje && ' • Hoje'}
                      </div>
                    </th>
                  );
                })}

                <th className="sticky top-0 z-20 bg-surface-2 px-2 sm:px-3 py-3 text-right min-w-[56px] sm:min-w-[70px]">
                  Dias
                </th>
                <th className="sticky top-0 z-20 bg-surface-2 px-2.5 sm:px-4 py-3 text-right min-w-[76px] sm:min-w-[95px]">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Custo</span>
                    {!isAdmin && (
                      <button
                        type="button"
                        onClick={handleRevelarCustoTemporario}
                        title={revelarCusto ? 'Custo visível por 10s' : 'Clique para visualizar o custo por 10 segundos'}
                        className={cn(
                          'rounded p-1 transition-colors cursor-pointer',
                          revelarCusto ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-surface hover:text-fg',
                        )}
                      >
                        {revelarCusto ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                        <span className="sr-only">Alternar visualização de custo</span>
                      </button>
                    )}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line text-xs">
              {funcionariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted">
                    Nenhum colaborador encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                funcionariosFiltrados.map((f) => {
                  let totalDiasFunc = 0;
                  let custoAcumuladoSemana = 0;

                  return (
                    <tr key={f.id} className="hover:bg-surface-2/30 transition-colors">
                      {/* Coluna Fixa do Colaborador (Adaptada para Mobile) */}
                      <td className="sticky left-0 z-10 bg-surface px-2.5 py-2.5 sm:px-4 sm:py-3 w-32 min-w-[120px] max-w-[130px] sm:w-48 sm:min-w-[180px] sm:max-w-[200px] shadow-[2px_0_5px_rgba(0,0,0,0.06)] border-r border-line">
                        {f.apelido?.trim() ? (
                          <>
                            <div
                              className="font-bold text-fg flex items-center gap-1 sm:gap-1.5 truncate text-[11px] sm:text-xs"
                              title={`${f.apelido.trim()} (${f.nome})`}
                            >
                              <HardHat className="size-3 text-brand shrink-0" />
                              <span className="truncate">{f.apelido.trim()}</span>
                            </div>
                            <div
                              className="text-[10px] sm:text-[11px] text-muted truncate mt-0.5 font-normal"
                              title={f.nome}
                            >
                              {f.nome}
                            </div>
                          </>
                        ) : (
                          <div
                            className="font-bold text-fg flex items-center gap-1 sm:gap-1.5 truncate text-[11px] sm:text-xs"
                            title={f.nome}
                          >
                            <HardHat className="size-3 text-brand shrink-0" />
                            <span className="truncate">{f.nome}</span>
                          </div>
                        )}
                        <div className="text-[10px] sm:text-[11px] text-muted flex items-center gap-1 mt-0.5 truncate">
                          <span className="truncate">{LABEL_FUNCAO[f.funcao] || f.funcao}</span>
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-muted font-medium mt-0.5 truncate">
                          {f.regime === 'mensalista'
                            ? (isAdmin ? `Mensal: ${fmtBRL(f.salario)}` : 'Mensalista')
                            : f.regime === 'diarista_quinzenal'
                            ? (isAdmin ? `Quinzenal: ${fmtBRL(f.diaria)}/dia` : 'Diarista Quinzenal')
                            : (isAdmin ? `Diária: ${fmtBRL(f.diaria)}` : 'Diarista Semanal')}
                        </div>
                      </td>

                      {/* Células dos 7 Dias da Semana (Seg a Dom) */}
                      {diasSemana.map((dia) => {
                        const k = chaveApontamento(f.id, dia);
                        const ap = data.apontamentos[k];
                        const status: StatusPresenca = ap?.status || 'falta';

                        const centros: CentroId[] =
                          ap?.centroIds && ap.centroIds.length > 0
                            ? ap.centroIds
                            : [ap?.centroId || f.obraPadraoId || data.obras[0]?.id || SEDE];

                        const fator = FATOR_PRESENCA[status];
                        totalDiasFunc += fator;
                        custoAcumuladoSemana += valorDia(f, dia) * fator;

                        const isPassadoOuHoje = dia <= hoje;
                        const obraPrincipal = data.obras.find((o) => o.id === centros[0]);
                        const corPrincipal = obraPrincipal?.cor || '#64748B';
                        const nomePrincipal = obraPrincipal ? obraPrincipal.nome : 'Sede';

                        const nomesObras = centros.map((cid) => {
                          if (cid === SEDE) return 'Sede / Matriz';
                          return data.obras.find((o) => o.id === cid)?.nome || cid;
                        });

                        return (
                          <td key={dia} className="p-1 sm:p-1.5 text-center border-r border-line/40 align-top min-w-[66px] sm:min-w-[84px]">
                            <div className="flex flex-col items-center gap-1">
                              {/* Controle Segmentado Compacto [ 1 | ½ | F ] */}
                              <div className="inline-flex rounded-lg border border-line bg-surface-2/60 p-0.5 shadow-2xs">
                                {/* Botão 1: Dia Inteiro */}
                                <button
                                  type="button"
                                  onClick={() => setStatus(f.id, dia, 'inteiro', centros)}
                                  className={cn(
                                    'size-5.5 sm:size-6 rounded text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer',
                                    status === 'inteiro'
                                      ? 'bg-emerald-500 text-white shadow-xs'
                                      : 'text-muted hover:text-fg hover:bg-surface-2',
                                  )}
                                  title="Registrar Dia Inteiro (1)"
                                >
                                  1
                                </button>

                                {/* Botão ½: Meio Período */}
                                <button
                                  type="button"
                                  onClick={() => setStatus(f.id, dia, 'meio', centros)}
                                  className={cn(
                                    'size-5.5 sm:size-6 rounded text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer',
                                    status === 'meio'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'text-muted hover:text-fg hover:bg-surface-2',
                                  )}
                                  title="Registrar Meio Período (½)"
                                >
                                  ½
                                </button>

                                {/* Botão F: Falta (Vermelho nítido se dia <= hoje, transparente se futuro) */}
                                <button
                                  type="button"
                                  onClick={() => setStatus(f.id, dia, 'falta', centros)}
                                  className={cn(
                                    'size-5.5 sm:size-6 rounded text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer',
                                    status === 'falta'
                                      ? isPassadoOuHoje
                                        ? 'bg-red-500 text-white shadow-xs font-black ring-1 ring-red-400'
                                        : 'bg-surface-2/40 text-muted/30 border border-dashed border-line/40 hover:text-muted'
                                      : 'text-muted hover:text-fg hover:bg-surface-2',
                                  )}
                                  title={
                                    status === 'falta' && !isPassadoOuHoje
                                      ? 'Data futura ainda não atingida'
                                      : 'Registrar Falta (F)'
                                  }
                                >
                                  F
                                </button>
                              </div>

                              {/* Seletor Compacto de Múltiplas Obras */}
                              {status !== 'falta' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    abrirModalObras(
                                      f.id,
                                      f.apelido?.trim() ? `${f.apelido.trim()} (${f.nome})` : f.nome,
                                      dia,
                                      centros,
                                      status,
                                    )
                                  }
                                  className="flex w-full max-w-[66px] sm:max-w-[80px] items-center justify-center gap-1 truncate rounded border border-line bg-surface px-1 py-0.5 text-[8.5px] sm:text-[9px] font-semibold text-fg hover:border-brand/60 hover:bg-surface-2 transition-colors cursor-pointer"
                                  title={`Obras em ${fmtDateShort(dia)}: ${nomesObras.join(', ')} (Clique para gerenciar múltiplas obras)`}
                                >
                                  <span
                                    className="size-1.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: corPrincipal }}
                                  />
                                  <span className="truncate">
                                    {centros.length > 1
                                      ? `${nomePrincipal.slice(0, 3)} +${centros.length - 1}`
                                      : nomePrincipal.slice(0, 7)}
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Resumo Semanal */}
                      <td className="px-2 sm:px-3 py-3 text-right font-bold tabular-nums text-fg">
                        {totalDiasFunc}d
                      </td>

                      <td className="px-2.5 sm:px-4 py-3 text-right font-bold tabular-nums text-brand">
                        {isAdmin || revelarCusto ? fmtBRL(custoAcumuladoSemana) : 'R$ •••••'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Alocação em Múltiplas Obras */}
      {modalObras && (
        <Dialog
          open={!!modalObras}
          onClose={() => setModalObras(null)}
          title="Obras Visitadas no Dia"
          subtitle={`${modalObras.funcionarioNome} • ${fmtDate(modalObras.dia)}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-muted">
              Selecione as obras onde o colaborador atuou neste dia. O valor da diária continuará sendo único,
              mas o canteiro e os relatórios terão a presença registrada em cada obra visitada.
            </p>

            <div className="space-y-2 rounded-xl border border-line bg-surface-2/40 p-3">
              {data.obras.map((obra) => {
                const checked = modalObras.centrosSelecionados.includes(obra.id);
                return (
                  <label
                    key={obra.id}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-2.5 text-xs font-semibold cursor-pointer transition-colors',
                      checked
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-line bg-surface text-fg hover:bg-surface-2',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: obra.cor }} />
                      <span>{obra.nome}</span>
                      <span className="text-[10px] text-muted">({obra.cliente || 'Obra'})</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCentroNoModal(obra.id)}
                      className="size-4 accent-brand rounded"
                    />
                  </label>
                );
              })}

              {/* Opção Sede / Matriz */}
              <label
                className={cn(
                  'flex items-center justify-between rounded-lg border p-2.5 text-xs font-semibold cursor-pointer transition-colors',
                  modalObras.centrosSelecionados.includes(SEDE)
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-line bg-surface text-fg hover:bg-surface-2',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-slate-500" />
                  <span>Sede / Matriz (Oficina / Manutenção)</span>
                </div>
                <input
                  type="checkbox"
                  checked={modalObras.centrosSelecionados.includes(SEDE)}
                  onChange={() => toggleCentroNoModal(SEDE)}
                  className="size-4 accent-brand rounded"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setModalObras(null)}>
                Cancelar
              </Button>
              <Button onClick={salvarObrasModal}>
                Salvar Obras ({modalObras.centrosSelecionados.length} selecionada{modalObras.centrosSelecionados.length > 1 ? 's' : ''})
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
