import { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  HardHat,
  Calendar,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import { useHoje, useIsAdmin } from '@/hooks';
import { SEDE, type CentroId, type StatusPresenca } from '@/domain/types';
import { LABEL_FUNCAO, getLabelFuncao } from '@/domain/labels';
import { chaveApontamento, FATOR_PRESENCA, valorDia } from '@/domain/engine';
import { addDays, eachDay, startOfWeek } from '@/lib/dates';
import { fmtBRL, fmtDate, fmtDateShort } from '@/lib/format';
import { cn } from '@/lib/utils';
import { TableWatermark } from '@/components/brand/TableWatermark';
import {
  encontrarUltimoDiaComApontamentos,
  filtrarColaboradoresGrade,
  planejarCopiaUltimoDia,
} from './apontamentoUtils';

const DIAS_NOMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function ApontamentoGrade() {
  const data = useData();
  const hoje = useHoje();
  const isAdmin = useIsAdmin();
  const mutate = useErp((s) => s.mutate);

  const [semanaInicio, setSemanaInicio] = useState(startOfWeek(hoje));

  // 7 dias da semana: Segunda a Domingo
  const diasSemana = eachDay(semanaInicio, addDays(semanaInicio, 6));

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stickyThRef = useRef<HTMLTableCellElement>(null);
  const thRefs = useRef<(HTMLTableCellElement | null)[]>([]);
  const isInitialMount = useRef(true);

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
      const targetRect = targetTh.getBoundingClientRect();
      const stickyRect = stickyTh.getBoundingClientRect();
      let scrollPos = 0;

      if (targetRect.width > 0 && stickyRect.width > 0) {
        // Cálculo geométrico de alta fidelidade imune a zoom e peculiaridades de tabelas
        const delta = targetRect.left - stickyRect.right;
        scrollPos = Math.max(0, container.scrollLeft + delta);
      } else {
        // Fallback por offsetLeft
        const stickyWidth = stickyTh.offsetWidth;
        scrollPos = Math.max(0, targetTh.offsetLeft - stickyWidth);
      }

      container.scrollTo({ left: scrollPos, behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  useEffect(() => {
    if (!diasSemana.includes(hoje)) return;

    // No carregamento inicial, abre direto no dia de hoje (sem atraso perceptível)
    // Em mudanças posteriores de semana pelo usuário, anima suavemente
    const smooth = !isInitialMount.current;
    isInitialMount.current = false;

    const rafId = requestAnimationFrame(() => {
      rolarParaHoje(smooth);
    });

    const t = setTimeout(() => {
      rolarParaHoje(smooth);
    }, 100);

    const handleResize = () => {
      rolarParaHoje(false);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t);
      window.removeEventListener('resize', handleResize);
    };
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
  const [filtroObra, setFiltroObra] = useState<string>('todas');
  const [filtroEmpreiteiro, setFiltroEmpreiteiro] = useState<string>('todos');
  const [modalCopiarDia, setModalCopiarDia] = useState<{ diaDestino: string } | null>(null);

  // Lista de empreiteiros para filtro
  const empreiteirosDisponiveis = data.funcionarios.filter(
    (f) => f.ativo && (f.funcao === 'empreiteiro' || f.funcao.toLowerCase().includes('empreiteir')),
  );

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
      const obraPadrao = filtroObra !== 'todas' ? filtroObra : (centrosAtuais[0] || d.obras[0]?.id || SEDE);
      const centros = centrosAtuais.length > 0 ? centrosAtuais : [obraPadrao];
      d.apontamentos[k] = {
        funcionarioId,
        data: dia,
        centroId: centros[0],
        centroIds: centros,
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

  const funcionariosFiltrados = filtrarColaboradoresGrade(data.funcionarios, {
    busca,
    filtroFuncao,
    filtroObra,
    filtroEmpreiteiro,
    isAdmin,
    apontamentos: data.apontamentos,
    diasSemana,
  });

  const diaPadraoCopia = diasSemana.includes(hoje) ? hoje : diasSemana[0];
  const diaDestinoCopia = modalCopiarDia?.diaDestino || diaPadraoCopia;
  const ultimoDiaOrigem = encontrarUltimoDiaComApontamentos(data.apontamentos, diaDestinoCopia);
  const itensParaCopiar = ultimoDiaOrigem
    ? planejarCopiaUltimoDia(funcionariosFiltrados, data.apontamentos, ultimoDiaOrigem, diaDestinoCopia)
    : [];

  const abrirModalCopiarUltimoDia = () => {
    setModalCopiarDia({ diaDestino: diaPadraoCopia });
  };

  const confirmarCopiaUltimoDia = () => {
    if (!modalCopiarDia || !ultimoDiaOrigem) return;
    if (itensParaCopiar.length === 0) {
      toast('Nenhum colaborador pendente para preencher nesta data.', 'info');
      setModalCopiarDia(null);
      return;
    }

    mutate((d) => {
      for (const item of itensParaCopiar) {
        const k = chaveApontamento(item.funcionarioId, modalCopiarDia.diaDestino);
        if (d.apontamentos[k]) continue;
        const centros =
          item.origem.centroIds && item.origem.centroIds.length > 0
            ? [...item.origem.centroIds]
            : [item.origem.centroId];
        d.apontamentos[k] = {
          funcionarioId: item.funcionarioId,
          data: modalCopiarDia.diaDestino,
          centroId: centros[0],
          centroIds: centros,
          status: item.origem.status,
        };
      }
    });

    toast(
      `${itensParaCopiar.length} apontamento${itensParaCopiar.length > 1 ? 's' : ''} copiado${itensParaCopiar.length > 1 ? 's' : ''} de ${fmtDateShort(ultimoDiaOrigem)} para ${fmtDateShort(modalCopiarDia.diaDestino)}.`,
    );
    setModalCopiarDia(null);
  };

  return (
    <div className="space-y-4">
      {/* Barra de Navegação da Semana e Filtros Rápidos */}
      <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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
            <Button
              size="sm"
              variant="secondary"
              icon={<Copy className="size-3.5" />}
              onClick={abrirModalCopiarUltimoDia}
              title={`Copiar lançamentos do último dia registrado para preencher pendentes em ${fmtDateShort(diaPadraoCopia)}`}
            >
              Copiar último dia
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
              <span className="hidden sm:inline">Falta</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="size-4 sm:size-5 rounded border border-dashed border-line bg-surface-2 text-muted font-bold grid place-items-center text-[9px] sm:text-[10px]">—</span>
              <span className="hidden sm:inline">Pendente</span>
            </div>
          </div>
        </div>

        {/* Linha de Busca e Filtros Rápidos (Obra, Empreiteiro, Função) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line/60 pt-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-full sm:w-56">
              <input
                type="text"
                placeholder={isAdmin ? 'Buscar nome, função, tel ou CPF...' : 'Buscar por nome ou função...'}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs text-fg placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>

            {/* Filtro por Obra */}
            <select
              value={filtroObra}
              onChange={(e) => setFiltroObra(e.target.value)}
              className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-fg focus:border-brand focus:outline-none"
              title="Filtrar colaboradores por Obra"
            >
              <option value="todas">Todas as Obras</option>
              <option value={SEDE}>Sede / Matriz</option>
              {data.obras.map((o) => (
                <option key={o.id} value={o.id}>
                  Obra: {o.nome}
                </option>
              ))}
            </select>

            {/* Filtro por Empreiteiro */}
            <select
              value={filtroEmpreiteiro}
              onChange={(e) => setFiltroEmpreiteiro(e.target.value)}
              className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-fg focus:border-brand focus:outline-none"
              title="Filtrar colaboradores por Empreiteiro responsável"
            >
              <option value="todos">Todos os Empreiteiros</option>
              {empreiteirosDisponiveis.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  Empr.: {emp.apelido?.trim() ? `${emp.apelido.trim()} (${emp.nome})` : emp.nome}
                </option>
              ))}
            </select>

            {/* Filtro por Função */}
            <select
              value={filtroFuncao}
              onChange={(e) => setFiltroFuncao(e.target.value)}
              className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-fg focus:border-brand focus:outline-none"
              title="Filtrar por Cargo / Função"
            >
              <option value="todos">Todas as Funções</option>
              {todasFuncoes.map((fn) => (
                <option key={fn} value={fn}>
                  {getLabelFuncao(fn)}
                </option>
              ))}
            </select>

            {(filtroObra !== 'todas' || filtroEmpreiteiro !== 'todos' || filtroFuncao !== 'todos' || busca.trim()) && (
              <button
                type="button"
                onClick={() => {
                  setFiltroObra('todas');
                  setFiltroEmpreiteiro('todos');
                  setFiltroFuncao('todos');
                  setBusca('');
                }}
                className="text-[11px] text-brand hover:underline font-semibold cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="text-[11px] text-muted">
            Exibindo <strong>{funcionariosFiltrados.length}</strong> profissionais ativos
          </div>
        </div>
      </div>

      {/* Grade de Apontamento com Scroll Horizontal e Coluna Fixa */}
      <div className="relative rounded-2xl border border-line bg-surface overflow-hidden shadow-xs">
        {/* Marca d'água oficial CONSTRUTEC com posicionamento inteligente Sticky Viewport */}
        <TableWatermark size="xl" />

        <div ref={scrollContainerRef} className="relative z-1 overflow-x-auto">
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
                        'sticky top-0 z-20 bg-surface-2 px-1.5 py-2 sm:py-3 text-center min-w-[150px] sm:min-w-[136px] border-r border-line/40',
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
                {isAdmin && (
                  <th className="sticky top-0 z-20 bg-surface-2 px-2.5 sm:px-4 py-3 text-right min-w-[76px] sm:min-w-[95px]">
                    <span>Custo</span>
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-line text-xs">
              {funcionariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9} className="p-8 text-center text-muted">
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
                          <span className="truncate">{getLabelFuncao(f.funcao)}</span>
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
                        const status: StatusPresenca | null = ap?.status ?? null;
                        const isPendente = status === null;

                        const centroPadrao = filtroObra !== 'todas' ? filtroObra : (f.obraPadraoId || data.obras[0]?.id || SEDE);
                        const centros: CentroId[] =
                          ap?.centroIds && ap.centroIds.length > 0
                            ? ap.centroIds
                            : [ap?.centroId || centroPadrao];

                        const fator = status ? FATOR_PRESENCA[status] : 0;
                        totalDiasFunc += fator;
                        if (isAdmin) {
                          custoAcumuladoSemana += valorDia(f, dia) * fator;
                        }

                        const obraPrincipal = data.obras.find((o) => o.id === centros[0]);
                        const corPrincipal = obraPrincipal?.cor || '#64748B';
                        const nomePrincipal = obraPrincipal ? obraPrincipal.nome : 'Sede / Matriz';

                        const nomesObras = centros.map((cid) => {
                          if (cid === SEDE) return 'Sede / Matriz';
                          return data.obras.find((o) => o.id === cid)?.nome || cid;
                        });

                        return (
                          <td key={dia} className="p-1.5 text-center border-r border-line/40 align-top min-w-[150px] sm:min-w-[136px]">
                            <div className="flex flex-col items-center gap-1.5">
                              {/* Controle Segmentado Tátil para Canteiro [ 1 | ½ | F ] */}
                              <div className="inline-flex rounded-lg border border-line bg-surface-2/60 p-0.5 shadow-2xs gap-0.5">
                                {/* Botão 1: Dia Inteiro */}
                                <button
                                  type="button"
                                  onClick={() => setStatus(f.id, dia, 'inteiro', centros)}
                                  className={cn(
                                    'min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded text-xs font-bold transition-all cursor-pointer',
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
                                    'min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded text-xs font-bold transition-all cursor-pointer',
                                    status === 'meio'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'text-muted hover:text-fg hover:bg-surface-2',
                                  )}
                                  title="Registrar Meio Período (½)"
                                >
                                  ½
                                </button>

                                {/* Botão F: Falta (apenas quando clicado explicitamente) */}
                                <button
                                  type="button"
                                  onClick={() => setStatus(f.id, dia, 'falta', centros)}
                                  className={cn(
                                    'min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded text-xs font-bold transition-all cursor-pointer',
                                    status === 'falta'
                                      ? 'bg-red-500 text-white shadow-xs font-black ring-1 ring-red-400'
                                      : 'text-muted hover:text-fg hover:bg-surface-2',
                                  )}
                                  title="Registrar Falta (F)"
                                >
                                  F
                                </button>
                              </div>

                              {/* Indicação discreta Pendente quando não lançado */}
                              {isPendente && (
                                <span className="text-[10px] font-medium text-muted/80 px-1.5 py-0.5 rounded border border-dashed border-line/60">
                                  Pendente
                                </span>
                              )}

                              {/* Seletor Legível de Múltiplas Obras */}
                              {(status === 'inteiro' || status === 'meio') && (
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
                                  className="flex w-full max-w-[140px] sm:max-w-[128px] items-center justify-center gap-1.5 rounded border border-line bg-surface px-2 py-1 text-[10px] font-semibold text-fg hover:border-brand/60 hover:bg-surface-2 transition-colors cursor-pointer"
                                  title={`Obras em ${fmtDateShort(dia)}: ${nomesObras.join(', ')} (Clique para gerenciar múltiplas obras)`}
                                >
                                  <span
                                    className="size-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: corPrincipal }}
                                  />
                                  <span className="truncate">
                                    {centros.length > 1
                                      ? `${nomePrincipal} (+${centros.length - 1})`
                                      : nomePrincipal}
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

                      {isAdmin && (
                        <td className="px-2.5 sm:px-4 py-3 text-right font-bold tabular-nums text-brand">
                          {fmtBRL(custoAcumuladoSemana)}
                        </td>
                      )}
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

      {/* Modal de Confirmação: Copiar último dia */}
      {modalCopiarDia && (
        <Dialog
          open={!!modalCopiarDia}
          onClose={() => setModalCopiarDia(null)}
          title="Copiar apontamentos do último dia"
          subtitle={`Destino: ${fmtDate(modalCopiarDia.diaDestino)}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Dia a preencher (apenas pendentes)
              </label>
              <select
                value={modalCopiarDia.diaDestino}
                onChange={(e) => setModalCopiarDia({ diaDestino: e.target.value })}
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-fg focus:border-brand focus:outline-none"
              >
                {diasSemana.map((d, idx) => (
                  <option key={d} value={d}>
                    {DIAS_NOMES[idx]} — {fmtDate(d)} {d === hoje ? '(Hoje)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {!ultimoDiaOrigem ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-fg">
                Nenhum dia anterior recente possui apontamentos registrados para copiar.
              </div>
            ) : (
              <div className="rounded-xl border border-line bg-surface-2/60 p-3.5 text-xs space-y-1.5">
                <p className="text-fg">
                  Último dia com apontamentos encontrado: <strong>{fmtDate(ultimoDiaOrigem)}</strong>
                </p>
                <p className="text-muted">
                  Colaboradores ainda em estado <strong>Pendente</strong> em {fmtDateShort(modalCopiarDia.diaDestino)} que serão preenchidos:{' '}
                  <strong className="text-fg">{itensParaCopiar.length}</strong>
                </p>
                <p className="text-[11px] text-muted">
                  Lançamentos já marcados manualmente neste dia não serão sobrescritos.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setModalCopiarDia(null)}>
                Cancelar
              </Button>
              <Button
                onClick={confirmarCopiaUltimoDia}
                disabled={!ultimoDiaOrigem || itensParaCopiar.length === 0}
              >
                Confirmar Cópia ({itensParaCopiar.length})
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
