import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Construction,
  HardHat,
  Maximize,
  Minimize,
  Pause,
  Play,
  Wallet,
  X,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { useData } from '@/data/store';
import { useHoje, useResumo } from '@/hooks';
import { LABEL_FUNCAO, LABEL_OBRA_STATUS } from '@/domain/labels';
import { diffDays } from '@/lib/dates';
import { fmtBRL, fmtBRLCompact } from '@/lib/format';

const SLIDES = [
  { id: 'visao_geral', titulo: 'Panorama Geral da CONSTRUTEC' },
  { id: 'obras', titulo: 'Status e Consumo por Obra' },
  { id: 'locacoes', titulo: 'Equipamentos e Máquinas em Campo' },
  { id: 'equipe', titulo: 'Presença e Operários Hoje' },
];

const TEMPO_SLIDE_SEGUNDOS = 20;

export function TvPage() {
  const data = useData();
  const hoje = useHoje();
  const r = useResumo();

  const [slideAtual, setSlideAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [progresso, setProgresso] = useState(0); // 0 a 100%
  const [agora, setAgora] = useState(new Date());
  const [telaCheia, setTelaCheia] = useState(!!document.fullscreenElement);

  // Relógio
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const onFs = () => setTelaCheia(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Timer de transição automática de slides
  useEffect(() => {
    if (pausado) return;

    const intervaloMs = 100;
    const incremento = 100 / ((TEMPO_SLIDE_SEGUNDOS * 1000) / intervaloMs);

    const timer = setInterval(() => {
      setProgresso((p) => {
        if (p >= 100) {
          setSlideAtual((s) => (s + 1) % SLIDES.length);
          return 0;
        }
        return p + incremento;
      });
    }, intervaloMs);

    return () => clearInterval(timer);
  }, [pausado, slideAtual]);

  const alternarTelaCheia = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const proximoSlide = () => {
    setSlideAtual((s) => (s + 1) % SLIDES.length);
    setProgresso(0);
  };

  const slideAnterior = () => {
    setSlideAtual((s) => (s - 1 + SLIDES.length) % SLIDES.length);
    setProgresso(0);
  };

  return (
    <div className="dark flex min-h-dvh flex-col bg-[#0B1118] text-white select-none overflow-hidden" style={{ colorScheme: 'dark' }}>
      {/* Barra de Progresso no topo absoluto */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-slate-900 z-50">
        <div
          className="h-full bg-brand transition-all duration-100 ease-linear shadow-[0_0_12px_#FF6B00]"
          style={{ width: `${progresso}%` }}
        />
      </div>

      {/* Header do Wallboard */}
      <header className="flex items-center justify-between border-b border-[#1E293B] px-8 py-5">
        <div className="flex items-center gap-6">
          <Logo size="lg" onDark />
          <div className="h-8 w-px bg-[#1E293B]" />
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">PAINEL DE CONTROLE CENTRAL</div>
            <div className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{SLIDES[slideAtual].titulo}</span>
              <span className="text-xs text-brand font-semibold">({slideAtual + 1}/{SLIDES.length})</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Indicador AO VIVO pulsante */}
          <div className="flex items-center gap-3 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <span className="cx-live-dot" />
            <span className="text-sm font-extrabold tracking-widest text-emerald-400">TEMPO REAL</span>
          </div>

          {/* Relógio Digital */}
          <div className="text-right">
            <div className="text-3xl font-black tabular-nums tracking-tight">
              {agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {agora.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </div>
          </div>

          {/* Controles de Navegação */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#1E293B] bg-[#111A24] p-1.5">
            <button
              onClick={slideAnterior}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Slide Anterior"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={() => setPausado(!pausado)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title={pausado ? 'Continuar rotação' : 'Pausar rotação'}
            >
              {pausado ? <Play className="size-5 text-emerald-400" /> : <Pause className="size-5" />}
            </button>
            <button
              onClick={proximoSlide}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Próximo Slide"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          {/* Ações de Janela */}
          <div className="flex items-center gap-2">
            <button
              onClick={alternarTelaCheia}
              className="rounded-xl border border-[#1E293B] bg-[#111A24] p-3 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title={telaCheia ? 'Sair da Tela Cheia' : 'Tela Cheia'}
            >
              {telaCheia ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
            </button>
            <Link
              to="/"
              className="rounded-xl border border-[#1E293B] bg-[#111A24] p-3 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
              title="Voltar ao ERP"
            >
              <X className="size-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo Dinâmico dos Slides */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* SLIDE 1: PANORAMA GERAL EXECUTIVO */}
        {slideAtual === 0 && (
          <div className="space-y-8 animate-fadeIn">
            {/* Linha de Big Numbers */}
            <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
              <div className="rounded-3xl border border-[#1E293B] bg-[#111A24] p-7 shadow-lg">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-base font-semibold uppercase tracking-wider">Saldo Geral Caixa</span>
                  <Wallet className="size-6 text-brand" />
                </div>
                <div className="mt-4 text-4xl xl:text-5xl font-black tabular-nums text-white">
                  {fmtBRL(r.saldoCaixa)}
                </div>
                <div className="mt-3 text-sm text-slate-400 flex items-center gap-2">
                  <span>Mês:</span>
                  <span className="text-emerald-400 font-semibold">+{fmtBRLCompact(r.entradasMes)}</span>
                  <span>/</span>
                  <span className="text-red-400 font-semibold">−{fmtBRLCompact(r.saidasMes)}</span>
                </div>
              </div>

              <div className="rounded-3xl border border-[#1E293B] bg-[#111A24] p-7 shadow-lg">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-base font-semibold uppercase tracking-wider">Obras Ativas (Comprometido)</span>
                  <Building2 className="size-6 text-sky-400" />
                </div>
                <div className="mt-4 text-4xl xl:text-5xl font-black tabular-nums text-white">
                  {fmtBRL(r.comprometidoObrasAtivas)}
                </div>
                <div className="mt-3 text-sm text-slate-400">
                  {data.obras.filter((o) => o.status === 'andamento').length} canteiros em execução simultânea
                </div>
              </div>

              <div className="rounded-3xl border border-[#1E293B] bg-[#111A24] p-7 shadow-lg">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-base font-semibold uppercase tracking-wider">A Pagar (7 Dias)</span>
                  <CalendarClock className="size-6 text-amber-400" />
                </div>
                <div className="mt-4 text-4xl xl:text-5xl font-black tabular-nums text-amber-400">
                  {fmtBRL(r.aVencer7d.total)}
                </div>
                <div className="mt-3 text-sm text-slate-400">
                  {r.aVencer7d.quantidade} boletos e pagamentos próximos
                </div>
              </div>

              <div className="rounded-3xl border border-[#1E293B] bg-[#111A24] p-7 shadow-lg">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-base font-semibold uppercase tracking-wider">Operação Hoje</span>
                  <HardHat className="size-6 text-emerald-400" />
                </div>
                <div className="mt-4 text-4xl xl:text-5xl font-black tabular-nums text-emerald-400 flex items-baseline gap-4">
                  <span>{r.equipeHoje} <span className="text-2xl font-semibold text-slate-400">operários</span></span>
                </div>
                <div className="mt-3 text-sm text-slate-400">
                  {r.maquinasAtivas} máquinas e equipamentos alugados ativos
                </div>
              </div>
            </div>

            {/* Segunda Linha: Composição e Status dos Canteiros */}
            <div className="grid gap-6 xl:grid-cols-3">
              {/* Composição de Custos */}
              <div className="rounded-3xl border border-[#1E293B] bg-[#111A24] p-7 xl:col-span-1">
                <h3 className="text-lg font-bold uppercase tracking-wide text-slate-300">Composição Global de Custos</h3>
                <div className="mt-6 space-y-4">
                  {[
                    { label: 'Materiais (Estoque & Compras)', valor: r.composicao.materiais, cor: '#FF6B00' },
                    { label: 'Mão de Obra (Diárias & Folha)', valor: r.composicao.mao_de_obra, cor: '#38BDF8' },
                    { label: 'Locação de Máquinas', valor: r.composicao.locacao, cor: '#A78BFA' },
                    { label: 'Serviços & Empreitadas', valor: r.composicao.servicos, cor: '#10B981' },
                    { label: 'Custos Fixos / Matriz', valor: r.composicao.outros, cor: '#64748B' },
                  ].map((item) => {
                    const totalGeral = Object.values(r.composicao).reduce((s, v) => s + v, 0) || 1;
                    const pct = (item.valor / totalGeral) * 100;
                    return (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-2 text-slate-300">
                            <span className="size-3 rounded-full" style={{ background: item.cor }} />
                            {item.label}
                          </span>
                          <span className="font-bold tabular-nums">{fmtBRL(item.valor)}</span>
                        </div>
                        <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: item.cor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Rápido das Obras */}
              <div className="rounded-3xl border border-[#1E293B] bg-[#111A24] p-7 xl:col-span-2">
                <h3 className="text-lg font-bold uppercase tracking-wide text-slate-300">Orçamento Comprometido por Obra</h3>
                <div className="mt-6 space-y-5">
                  {data.obras.map((o) => {
                    const ro = r.porObra[o.id];
                    const pct = ro ? ro.consumoPct * 100 : 0;
                    return (
                      <div key={o.id} className="rounded-2xl border border-slate-800 bg-[#16212E] p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="size-3 rounded-full" style={{ background: o.cor }} />
                            <span className="text-lg font-bold text-white">{o.nome}</span>
                            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300 font-semibold">
                              {o.responsavel}
                            </span>
                          </div>
                          <div className="text-right font-bold tabular-nums">
                            <span className="text-brand text-lg">{fmtBRL(ro?.comprometido || 0)}</span>
                            <span className="text-slate-400 text-sm"> / {fmtBRL(o.orcamento)}</span>
                          </div>
                        </div>
                        <div className="mt-3 h-3 w-full rounded-full bg-slate-900 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, pct)}%`,
                              background: pct > 90 ? '#EF4444' : pct > 75 ? '#F59E0B' : '#FF6B00',
                            }}
                          />
                        </div>
                        <div className="mt-2 flex justify-between text-xs text-slate-400">
                          <span>{pct.toFixed(1)}% do orçamento previsto consumido</span>
                          <span>{ro?.equipeHoje || 0} operários no local · {ro?.maquinasAtivas || 0} máquinas</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 2: DETALHES DE OBRAS & SERVIÇOS */}
        {slideAtual === 1 && (
          <div className="grid gap-6 md:grid-cols-3 animate-fadeIn">
            {data.obras.map((o) => {
              const ro = r.porObra[o.id];
              const prazo = Math.max(1, diffDays(o.dataInicio, o.previsaoEntrega));
              const decorridoPct = Math.max(0, Math.min(1, diffDays(o.dataInicio, hoje) / prazo)) * 100;
              const consumoPct = (ro?.consumoPct || 0) * 100;

              return (
                <div key={o.id} className="flex flex-col justify-between rounded-3xl border border-[#1E293B] bg-[#111A24] p-7 shadow-xl">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider" style={{ background: `${o.cor}25`, color: o.cor }}>
                        {LABEL_OBRA_STATUS[o.status]}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">{o.responsavel}</span>
                    </div>

                    <h2 className="mt-4 text-2xl font-black text-white">{o.nome}</h2>
                    <p className="text-xs text-slate-400 mt-1">{o.endereco}</p>

                    <div className="mt-6 rounded-2xl bg-[#16212E] p-4 space-y-4">
                      <div>
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Consumo Financeiro</span>
                          <span className="font-bold text-white">{consumoPct.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1.5 h-3 w-full rounded-full bg-slate-900 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, consumoPct)}%`, background: o.cor }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Cronograma Decorrido</span>
                          <span className="font-bold text-white">{decorridoPct.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1.5 h-3 w-full rounded-full bg-slate-900 overflow-hidden">
                          <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(100, decorridoPct)}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="rounded-xl bg-[#16212E] p-3">
                        <div className="text-[11px] text-slate-400 uppercase font-semibold">Orçamento Total</div>
                        <div className="mt-1 text-lg font-black text-white">{fmtBRL(o.orcamento)}</div>
                      </div>
                      <div className="rounded-xl bg-[#16212E] p-3">
                        <div className="text-[11px] text-slate-400 uppercase font-semibold">Comprometido</div>
                        <div className="mt-1 text-lg font-black text-brand">{fmtBRL(ro?.comprometido || 0)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-800 pt-4 flex items-center justify-between text-sm text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <HardHat className="size-4 text-emerald-400" />
                      <strong>{ro?.equipeHoje || 0}</strong> operários hoje
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Construction className="size-4 text-violet-400" />
                      <strong>{ro?.maquinasAtivas || 0}</strong> máquinas
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SLIDE 3: EQUIPAMENTOS E LOCAÇÕES */}
        {slideAtual === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-800 bg-[#111A24] p-5">
                <span className="text-xs uppercase text-slate-400 font-bold">Máquinas Ativas em Canteiro</span>
                <div className="mt-2 text-4xl font-black text-violet-400">{r.maquinasAtivas}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#111A24] p-5">
                <span className="text-xs uppercase text-slate-400 font-bold">Contratos Vigentes</span>
                <div className="mt-2 text-4xl font-black text-white">{data.locacoes.filter((l) => l.status === 'ativa').length}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#111A24] p-5">
                <span className="text-xs uppercase text-slate-400 font-bold">Custo de Locação Acumulado</span>
                <div className="mt-2 text-4xl font-black text-brand">{fmtBRL(r.composicao.locacao)}</div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#1E293B] bg-[#111A24] p-6">
              <h3 className="text-lg font-bold text-white mb-4">Equipamentos em Operação por Obra</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-base">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-bold uppercase text-slate-400">
                      <th className="pb-4">Equipamento</th>
                      <th className="pb-4">Obra / Local</th>
                      <th className="pb-4">Fornecedor Locador</th>
                      <th className="pb-4">Quantidade</th>
                      <th className="pb-4">Tarifa Contratada</th>
                      <th className="pb-4 text-right">Data Retirada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {data.locacoes
                      .filter((l) => l.status === 'ativa')
                      .map((loc) => {
                        const obra = data.obras.find((o) => o.id === loc.obraId);
                        const fornecedor = data.fornecedores.find((f) => f.id === loc.fornecedorId);
                        return (
                          <tr key={loc.id} className="hover:bg-slate-800/30">
                            <td className="py-4 font-bold text-white flex items-center gap-2">
                              <Construction className="size-5 text-violet-400 shrink-0" />
                              {loc.equipamento}
                            </td>
                            <td className="py-4">
                              <span className="flex items-center gap-2 font-semibold">
                                <span className="size-2.5 rounded-full" style={{ background: obra?.cor }} />
                                {obra?.nome}
                              </span>
                            </td>
                            <td className="py-4 text-slate-300">{fornecedor?.nome}</td>
                            <td className="py-4 font-extrabold text-white">{loc.quantidade} un.</td>
                            <td className="py-4 font-semibold text-slate-300">
                              {fmtBRL(loc.valor)} / {loc.tarifa}
                            </td>
                            <td className="py-4 text-right tabular-nums text-slate-400">
                              {new Date(loc.dataRetirada + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 4: EQUIPE & PRESENÇA HOJE */}
        {slideAtual === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-4 gap-6">
              <div className="rounded-2xl border border-slate-800 bg-[#111A24] p-5">
                <span className="text-xs uppercase text-slate-400 font-bold">Total em Campo Hoje</span>
                <div className="mt-2 text-4xl font-black text-emerald-400">{r.equipeHoje}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#111A24] p-5">
                <span className="text-xs uppercase text-slate-400 font-bold">Quadro Ativo</span>
                <div className="mt-2 text-4xl font-black text-white">{data.funcionarios.filter((f) => f.ativo).length}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#111A24] p-5">
                <span className="text-xs uppercase text-slate-400 font-bold">Mão de Obra Acumulada</span>
                <div className="mt-2 text-4xl font-black text-sky-400">{fmtBRL(r.composicao.mao_de_obra)}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#111A24] p-5">
                <span className="text-xs uppercase text-slate-400 font-bold">Diaristas vs Mensalistas</span>
                <div className="mt-2 text-2xl font-bold text-white">
                  {data.funcionarios.filter((f) => f.regime === 'diarista' && f.ativo).length}D / {data.funcionarios.filter((f) => f.regime === 'mensalista' && f.ativo).length}M
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {data.obras.map((o) => {
                const operariosNaObra = data.funcionarios.filter((f) => {
                  const k = `${f.id}|${hoje}`;
                  const ap = data.apontamentos[k];
                  return ap && ap.centroId === o.id && ap.status !== 'falta';
                });

                return (
                  <div key={o.id} className="rounded-3xl border border-slate-800 bg-[#111A24] p-6 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="size-3 rounded-full" style={{ background: o.cor }} />
                        <h3 className="text-lg font-black text-white">{o.nome}</h3>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                        {operariosNaObra.length} em campo
                      </span>
                    </div>

                    <ul className="mt-4 space-y-3">
                      {operariosNaObra.map((f) => (
                        <li key={f.id} className="flex items-center justify-between rounded-xl bg-[#16212E] p-3">
                          <div>
                            <div className="font-bold text-white">{f.apelido?.trim() || f.nome}</div>
                            <div className="text-xs text-slate-400">
                              {f.apelido?.trim() ? `${f.nome} • ` : ''}{LABEL_FUNCAO[f.funcao]}
                            </div>
                          </div>
                          <span className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 capitalize">
                            {f.regime}
                          </span>
                        </li>
                      ))}
                      {operariosNaObra.length === 0 && (
                        <li className="py-6 text-center text-sm text-slate-500">
                          Nenhum colaborador apontado nesta obra hoje.
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer com indicadores de status e atalhos */}
      <footer className="flex items-center justify-between border-t border-[#1E293B] bg-[#0E151F] px-8 py-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span>CONSTRUTEC SISTEMA INTEGRADO DE GESTÃO</span>
          <span>·</span>
          <span>Transição automática a cada {TEMPO_SLIDE_SEGUNDOS}s</span>
          {pausado && <span className="font-bold text-amber-400 uppercase">[ROTAÇÃO PAUSADA]</span>}
        </div>
        <div className="flex items-center gap-2">
          {SLIDES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => {
                setSlideAtual(idx);
                setProgresso(0);
              }}
              className={`h-2 rounded-full transition-all ${
                slideAtual === idx ? 'w-8 bg-brand' : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
              title={s.titulo}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}
