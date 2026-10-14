import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Construction,
  DollarSign,
  FileSpreadsheet,
  HardHat,
  HelpCircle,
  Layers,
  Maximize,
  Minimize,
  Package,
  Presentation,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Tv,
  Users,
  Wallet,
  Wrench,
  X,
  MessageCircle,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { WhatsAppIcon } from '@/components/brand/WhatsAppIcon';
import { Button, Badge } from '@/components/ui';
import { fmtBRL, fmtPct } from '@/lib/format';

interface SlideConfig {
  id: string;
  tag: string;
  titulo: string;
  subtitulo: string;
}

const SLIDES: SlideConfig[] = [
  {
    id: 'capa',
    tag: 'APRESENTAÇÃO EXECUTIVA',
    titulo: 'CONSTRUTEC ERP',
    subtitulo: 'A Plataforma Inteligente de Gestão de Canteiro, Custos e Resultados para Construtoras',
  },
  {
    id: 'dores',
    tag: 'O DIAGNÓSTICO',
    titulo: 'Onde o Dinheiro Está Vazando no Canteiro?',
    subtitulo: 'Os 4 vilões invisíveis que corroem de 8% a 15% do lucro líquido de uma obra',
  },
  {
    id: 'solucao',
    tag: 'A RESPOSTA DEFINITIVA',
    titulo: 'O Ecossistema CONSTRUTEC',
    subtitulo: 'Tão simples para o mestre no canteiro quanto cirúrgico para a diretoria na sede',
  },
  {
    id: 'obras_curvas',
    tag: 'PILAR 1 • OBRAS & ORÇAMENTO',
    titulo: 'Curva S e Saúde Financeira em Tempo Real',
    subtitulo: 'Saiba no mesmo dia se a obra está dentro do custo e do prazo previsto',
  },
  {
    id: 'compras_rateio',
    tag: 'PILAR 2 • SUPRIMENTOS',
    titulo: 'Compras Centralizadas com Rateio Automático',
    subtitulo: 'Compre carretas fechadas com desconto e distribua as cotas exatas entre as obras',
  },
  {
    id: 'maquinas',
    tag: 'PILAR 3 • EQUIPAMENTOS',
    titulo: 'Controle Rigoroso de Máquinas e Locações',
    subtitulo: 'Elimine a máquina esquecida na obra gerando diárias de aluguel desnecessárias',
  },
  {
    id: 'equipe_servicos',
    tag: 'PILAR 4 • PESSOAS & CONTRATOS',
    titulo: 'Diárias, Empreitadas Fechadas e Folha Quinzenal',
    subtitulo: 'Controle de pedreiros a terceirizados (eletricista, pintor) com quitação por etapas',
  },
  {
    id: 'modo_tv',
    tag: 'PILAR 5 • IMPACTO & GESTÃO',
    titulo: 'O "Efeito Uau": Modo TV / Wallboard ao Vivo',
    subtitulo: 'Painel em tela cheia na recepção e sala de reuniões que impressiona clientes e investidores',
  },
  {
    id: 'comparativo',
    tag: 'BENCHMARK DE MERCADO',
    titulo: 'Por Que o CONSTRUTEC Supera o Mercado?',
    subtitulo: 'Sem a burocracia pesada do Sienge e sem o caos e perda de dados do Excel',
  },
  {
    id: 'roi',
    tag: 'RETORNO SOBRE O INVESTIMENTO',
    titulo: 'Simulador de Economia Real (ROI)',
    subtitulo: 'Como a ferramenta se paga por completo logo no primeiro mês de uso',
  },
  {
    id: 'investimento',
    tag: 'PROPOSTA COMERCIAL',
    titulo: 'Condições Especiais de Implantação',
    subtitulo: 'Dois formatos flexíveis projetados para caber no fluxo de caixa da construtora',
  },
  {
    id: 'fechamento',
    tag: 'PRÓXIMOS PASSOS',
    titulo: 'Transforme o Controle da Sua Construtora Hoje',
    subtitulo: 'Implantação rápida em menos de 48 horas, sem travar sua rotina de obras',
  },
];

export function ApresentacaoPage() {
  const navigate = useNavigate();
  const [slideAtual, setSlideAtual] = useState(0);
  const [telaCheia, setTelaCheia] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  // Simulador interativo de ROI
  const [obrasAtivasSimulacao, setObrasAtivasSimulacao] = useState(3);
  const [gastoMensalEstimado, setGastoMensalEstimado] = useState(150000);

  // Economia estimada conservadora: 4.5% sobre o custo da obra
  const economiaEstimadaMes = useMemo(() => {
    return gastoMensalEstimado * obrasAtivasSimulacao * 0.045;
  }, [obrasAtivasSimulacao, gastoMensalEstimado]);

  // Navegação
  const proximo = () => {
    setSlideAtual((s) => (s < SLIDES.length - 1 ? s + 1 : s));
  };

  const anterior = () => {
    setSlideAtual((s) => (s > 0 ? s - 1 : s));
  };

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        proximo();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        anterior();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setSlideAtual(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setSlideAtual(SLIDES.length - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        alternarTelaCheia();
      } else if (e.key === 'Escape') {
        if (menuAberto) {
          setMenuAberto(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuAberto]);

  // Listener para fullscreen
  useEffect(() => {
    const onFs = () => setTelaCheia(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const alternarTelaCheia = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const slide = SLIDES[slideAtual];
  const pctProgresso = ((slideAtual + 1) / SLIDES.length) * 100;

  return (
    <div className="dark relative flex min-h-dvh flex-col bg-[#0B1118] text-slate-100 select-none overflow-hidden" style={{ colorScheme: 'dark' }}>
      {/* Barra de Progresso no Topo */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1.5 bg-slate-900">
        <div
          className="h-full bg-brand transition-all duration-300 ease-out shadow-[0_0_12px_#FF6B00]"
          style={{ width: `${pctProgresso}%` }}
        />
      </div>

      {/* Header Superior da Apresentação */}
      <header className="relative z-40 flex h-16 items-center justify-between border-b border-[#1E293B] bg-[#111A24]/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            title="Voltar ao ERP"
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#18222F] px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand/40 hover:text-brand"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Voltar ao ERP</span>
          </Link>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="rounded-md bg-brand/15 px-2 py-0.5 text-[10px] font-black tracking-widest text-brand uppercase">
              PITCH COMERCIAL
            </span>
          </div>
        </div>

        {/* Seletor Central de Slides */}
        <div className="relative">
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#18222F] px-3.5 py-1.5 text-xs font-bold text-slate-200 transition-colors hover:border-brand/40"
          >
            <Presentation className="size-3.5 text-brand" />
            <span>
              Slide {slideAtual + 1} de {SLIDES.length}
            </span>
            <ChevronDown className="size-3 text-slate-400" />
          </button>

          {/* Menu Dropdown de Navegação Rápida entre Slides */}
          {menuAberto && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 max-h-96 overflow-y-auto rounded-2xl border border-slate-800 bg-[#111A24] p-2 shadow-2xl z-50">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                Pular para o slide:
              </div>
              {SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSlideAtual(idx);
                    setMenuAberto(false);
                  }}
                  className={`w-full text-left rounded-xl px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                    slideAtual === idx ? 'bg-brand text-white font-bold' : 'text-slate-300 hover:bg-[#18222F]'
                  }`}
                >
                  <span className="truncate">{idx + 1}. {s.titulo}</span>
                  {slideAtual === idx && <CheckCircle2 className="size-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ações da Direita */}
        <div className="flex items-center gap-2">
          <button
            onClick={alternarTelaCheia}
            title={telaCheia ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'}
            className="grid size-9 place-items-center rounded-xl border border-slate-800 bg-[#18222F] text-slate-300 transition-colors hover:border-brand/50 hover:text-brand"
          >
            {telaCheia ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>

          <a
            href="https://wa.me/?text=Ol%C3%A1%2C%20gostaria%20de%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20do%20CONSTRUTEC%20ERP"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex"
          >
            <Button size="sm" icon={<WhatsAppIcon className="size-4" />}>
              Falar no WhatsApp
            </Button>
          </a>
        </div>
      </header>

      {/* ÁREA CENTRAL DO SLIDE */}
      <main className="relative flex-1 flex flex-col justify-center px-6 py-6 md:px-16 lg:px-24 max-w-7xl mx-auto w-full">
        {/* SLIDE 1: CAPA */}
        {slideAtual === 0 && (
          <div className="space-y-8 text-center animate-fadeIn py-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-bold text-brand">
              <Sparkles className="size-4" />
              SISTEMA INTEGRADO DE GESTÃO PARA CONSTRUÇÃO CIVIL
            </div>

            <div className="space-y-4 max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-white">
                O Controle Total da Sua Obra em <span className="text-brand">Tempo Real</span>
              </h1>
              <p className="text-lg md:text-2xl text-slate-300 font-medium leading-relaxed max-w-3xl mx-auto">
                Diga adeus às planilhas soltas e à surpresa no final do mês. Gerencie obras, compras com rateio,
                locação de máquinas e diárias com precisão cirúrgica.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 max-w-4xl mx-auto pt-4 text-left">
              <div className="rounded-2xl border border-slate-800 bg-[#111A24] p-4">
                <div className="text-brand font-black text-2xl md:text-3xl">0%</div>
                <div className="text-xs text-slate-400 font-medium mt-1">Máquinas esquecidas gerando custo ocioso</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#111A24] p-4">
                <div className="text-sky-400 font-black text-2xl md:text-3xl">100%</div>
                <div className="text-xs text-slate-400 font-medium mt-1">Compras rateadas com precisão por obra</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#111A24] p-4">
                <div className="text-emerald-400 font-black text-2xl md:text-3xl">-12h</div>
                <div className="text-xs text-slate-400 font-medium mt-1">Horas gastas pelo engenheiro em fechamentos</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#111A24] p-4">
                <div className="text-violet-400 font-black text-2xl md:text-3xl">LIVE</div>
                <div className="text-xs text-slate-400 font-medium mt-1">Modo TV para recepção e salas de reunião</div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-center gap-4">
              <Button size="lg" onClick={proximo} icon={<ArrowRight className="size-5" />}>
                Iniciar Apresentação (Avançar)
              </Button>
              <Link to="/tv" target="_blank" rel="noreferrer">
                <Button variant="secondary" size="lg" icon={<Tv className="size-5 text-violet-400" />}>
                  Ver Modo TV ao Vivo
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* SLIDE 2: AS DORES CRÍTICAS */}
        {slideAtual === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <Badge tone="amber">{slide.tag}</Badge>
              <h2 className="text-3xl md:text-5xl font-black text-white">{slide.titulo}</h2>
              <p className="text-slate-400 text-sm md:text-base">{slide.subtitulo}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-2">
              <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-red-500/20 text-red-400">
                    <Construction className="size-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">1. Máquinas e Equipamentos Esquecidos</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Andaimes, betoneiras ou retroescavadeiras continuam gerando custo de diária mesmo depois que o
                  serviço já acabou, porque ninguém avisou o administrativo para devolver à locadora.
                </p>
                <div className="text-xs font-semibold text-red-400">
                  Prejuízo médio estimado: R$ 1.200 a R$ 3.500 por mês por obra.
                </div>
              </div>

              <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-red-500/20 text-red-400">
                    <ShoppingCart className="size-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">2. Compras em Massa sem Rateio Real</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  A construtora compra uma carreta fechada de cimento ou 10.000 tijolos com desconto, mas lança tudo
                  em uma única obra ou na sede, distorcendo completamente o lucro real de cada canteiro.
                </p>
                <div className="text-xs font-semibold text-red-400">
                  Impacto: Você não sabe qual obra deu lucro e qual deu prejuízo.
                </div>
              </div>

              <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-red-500/20 text-red-400">
                    <HardHat className="size-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">3. Apontamento de Diárias em Papel</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Cadernos de obra molhados, mensagens de WhatsApp perdidas e pagamento duplo ou indevido de diárias
                  na sexta-feira. Falta de controle de quais operários estavam em qual canteiro.
                </p>
                <div className="text-xs font-semibold text-red-400">
                  Impacto: Conflitos trabalhistas e estresse semanal no fechamento financeiro.
                </div>
              </div>

              <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-red-500/20 text-red-400">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">4. O "Cemitério de Planilhas Excel"</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Planilhas desatualizadas, fórmulas corrompidas e a diretoria só descobre que o orçamento estourou
                  quando a obra já está em 80% e não há mais como corrigir o rumo.
                </p>
                <div className="text-xs font-semibold text-red-400">
                  Impacto: Decisões tomadas no escuro com atraso de semanas.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 3: A SOLUÇÃO CONSTRUTEC */}
        {slideAtual === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <Badge tone="orange">{slide.tag}</Badge>
              <h2 className="text-3xl md:text-5xl font-black text-white">{slide.titulo}</h2>
              <p className="text-slate-400 text-sm md:text-base">{slide.subtitulo}</p>
            </div>

            <div className="grid gap-5 md:grid-cols-3 pt-2">
              <div className="rounded-3xl border border-[#1E293B] bg-[#111A24] p-6 space-y-4">
                <div className="grid size-12 place-items-center rounded-2xl bg-brand/20 text-brand">
                  <HardHat className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-white">No Canteiro (Mobile)</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Interface ultrarrápida pensada para uso no celular sob a luz do sol: apontamento de presença com 1
                  clique, solicitação de material e lançamento de despesa rápida com comprovante.
                </p>
                <div className="rounded-xl bg-[#18222F] p-3 text-xs text-slate-400">
                  ✨ Sem burocracia para o mestre e engenheiro.
                </div>
              </div>

              <div className="rounded-3xl border border-brand/40 bg-[#16212E] p-6 space-y-4 shadow-xl shadow-brand/10 ring-1 ring-brand/30">
                <div className="grid size-12 place-items-center rounded-2xl bg-sky-500/20 text-sky-400">
                  <Building2 className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-white">No Escritório (Desktop)</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Controle financeiro rigoroso com rateio de compras por cota percentual, gestão de fornecedores,
                  contas a pagar e a receber com cronogramas semanais, quinzenais e mensais.
                </p>
                <div className="rounded-xl bg-[#111A24] p-3 text-xs text-slate-400">
                  ✨ Fechamentos de folha e extrato em segundos.
                </div>
              </div>

              <div className="rounded-3xl border border-[#1E293B] bg-[#111A24] p-6 space-y-4">
                <div className="grid size-12 place-items-center rounded-2xl bg-violet-500/20 text-violet-400">
                  <Tv className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Na Sala da Diretoria (TV)</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Wallboard interativo que roda na Smart TV da sede sem precisar de teclado ou mouse: KPIs
                  estratégicos, operários ativos, equipamentos locados e alertas de vencimentos ao vivo.
                </p>
                <div className="rounded-xl bg-[#18222F] p-3 text-xs text-slate-400">
                  ✨ Autoridade máxima para sócios e clientes.
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm font-semibold text-emerald-300">
              💡 Um único ecossistema conectando o canteiro de obras, o escritório de engenharia e a diretoria financeira.
            </div>
          </div>
        )}

        {/* SLIDE 4: PILAR 1 - OBRAS E CURVA S */}
        {slideAtual === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <Badge tone="blue">{slide.tag}</Badge>
              <h2 className="text-3xl md:text-5xl font-black text-white">{slide.titulo}</h2>
              <p className="text-slate-400 text-sm md:text-base">{slide.subtitulo}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 pt-2">
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#1E293B] bg-[#111A24] p-5 space-y-3">
                  <div className="flex items-center gap-2 text-brand font-bold text-sm">
                    <TrendingUp className="size-4" />
                    Curva S Financeira Automática
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Compare a linha de <strong>Desembolso Realizado</strong> contra o <strong>Orçamento Previsto</strong> ao
                    longo de todo o cronograma da obra. O sistema aponta tendências de estouro antes que elas aconteçam.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#1E293B] bg-[#111A24] p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                    <Layers className="size-4" />
                    Decomposição dos 4 Centros de Custo
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Visualização instantânea de quanto da verba da obra foi para <strong>Materiais</strong>,{' '}
                    <strong>Mão de Obra</strong>, <strong>Locações de Máquinas</strong> e <strong>Empreitadas</strong>.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#1E293B] bg-[#111A24] p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Wallet className="size-4" />
                    Controle de Saldo Restante em R$
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    O engenheiro e o financeiro sabem na hora o saldo exato restante de verba para concluir a obra sem
                    precisar somar notas à mão.
                  </p>
                </div>
              </div>

              {/* Mockup Ilustrativo da Tela */}
              <div className="rounded-3xl border border-[#1E293B] bg-[#111A24] p-6 flex flex-col justify-between shadow-2xl">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold uppercase text-slate-400">Resumo da Obra em Tela</span>
                    <Badge tone="green">No Prazo</Badge>
                  </div>

                  <div className="mt-4">
                    <div className="text-xl font-black text-white">Residencial Jardins — Torre A</div>
                    <div className="text-xs text-slate-400 mt-0.5">Orçamento Aprovado: R$ 450.000,00</div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                        <span>Consumo do Orçamento</span>
                        <span className="text-brand">61,8% (R$ 278.300,00)</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-brand rounded-full" style={{ width: '61.8%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                        <span>Prazo Físico Decorrido</span>
                        <span className="text-sky-400">55,0%</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-sky-400 rounded-full" style={{ width: '55%' }} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#16212E] p-3">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Saldo Disponível</span>
                      <div className="text-base font-black text-emerald-400">R$ 171.700,00</div>
                    </div>
                    <div className="rounded-xl bg-[#16212E] p-3">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Operários Hoje</span>
                      <div className="text-base font-black text-white">9 no local</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                  <Link to="/obras" target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="sm" className="w-full" icon={<ExternalLink className="size-3.5" />}>
                      Abrir Módulo de Obras no Sistema Real
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 5: PILAR 2 - COMPRAS COM RATEIO */}
        {slideAtual === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <Badge tone="orange">{slide.tag}</Badge>
              <h2 className="text-3xl md:text-5xl font-black text-white">{slide.titulo}</h2>
              <p className="text-slate-400 text-sm md:text-base">{slide.subtitulo}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 pt-2 items-center">
              <div className="space-y-4">
                <div className="rounded-2xl border border-brand/30 bg-brand/5 p-5 space-y-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-brand" />
                    Como funciona o Rateio Inteligente?
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Você negocia com o fornecedor o pedido grande com desconto (ex: R$ 30.000 em cimento ou aço) e no
                    momento de registrar a compra, simplesmente seleciona quais obras vão receber o material e suas
                    respectivas cotas (ex: 50% Obra A, 30% Obra B, 20% Obra C).
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#111A24] p-3 text-xs">
                    <div className="font-bold text-brand shrink-0">1. Débito no Centro de Custo:</div>
                    <div className="text-slate-300">
                      O sistema desconta automaticamente o valor proporcional do orçamento de cada obra participante.
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#111A24] p-3 text-xs">
                    <div className="font-bold text-sky-400 shrink-0">2. Contas a Pagar Único:</div>
                    <div className="text-slate-300">
                      Gera uma única duplicata/boleto para o fornecedor com vencimento centralizado, sem confusão contábil.
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#111A24] p-3 text-xs">
                    <div className="font-bold text-emerald-400 shrink-0">3. Entrada no Estoque:</div>
                    <div className="text-slate-300">
                      O estoque físico da obra recebe as quantidades corretas de sacos ou unidades imediatamente.
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulação Visual do Rateio */}
              <div className="rounded-3xl border border-[#1E293B] bg-[#111A24] p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold uppercase text-slate-400">Exemplo Prático de Lançamento</span>
                  <Badge tone="blue">Cimento Votoran 50kg (600 sacos)</Badge>
                </div>

                <div className="rounded-2xl bg-[#16212E] p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400">Valor Total da Nota Fiscal</span>
                    <div className="text-2xl font-black text-white">R$ 21.000,00</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Fornecedor</span>
                    <div className="text-xs font-semibold text-slate-200">Depósito Central da Construção</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-300 uppercase">Distribuição Automática entre Obras:</div>

                  <div className="space-y-2">
                    <div className="rounded-xl border border-slate-800 bg-[#18222F] p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">Residencial Jardins</span>
                        <div className="text-[10px] text-slate-400">300 sacos (50% da carga)</div>
                      </div>
                      <span className="font-black text-brand text-sm">R$ 10.500,00</span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#18222F] p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">Galeria Central</span>
                        <div className="text-[10px] text-slate-400">180 sacos (30% da carga)</div>
                      </div>
                      <span className="font-black text-sky-400 text-sm">R$ 6.300,00</span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#18222F] p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">Condomínio Vista Bela</span>
                        <div className="text-[10px] text-slate-400">120 sacos (20% da carga)</div>
                      </div>
                      <span className="font-black text-emerald-400 text-sm">R$ 4.200,00</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-center text-xs text-slate-400">
                  🎯 Fim do descontrole contábil e das horas gastas rateando planilhas na mão.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 6: PILAR 3 - MÁQUINAS E LOCAÇÕES */}
        {slideAtual === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <Badge tone="blue">{slide.tag}</Badge>
              <h2 className="text-3xl md:text-5xl font-black text-white">{slide.titulo}</h2>
              <p className="text-slate-400 text-sm md:text-base">{slide.subtitulo}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 pt-2 items-center">
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#1E293B] bg-[#111A24] p-5 space-y-2">
                  <h3 className="text-base font-bold text-violet-400 flex items-center gap-2">
                    <Clock className="size-5" />
                    Cronômetro de Custo Acumulado
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Cada equipamento alugado (andaimes tubulares, betoneiras, escoras, retroescavadeira) possui um
                    cálculo contínuo de custo acumulado baseado na diária, hora ou mensalidade contratada.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#1E293B] bg-[#111A24] p-5 space-y-2">
                  <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                    <ShieldAlert className="size-5" />
                    Alerta de Devolução Imediata
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    O sistema sinaliza máquinas cuja fase da obra já terminou ou que estão atingindo o limite de prazo,
                    evitando a renovação automática desnecessária com a locadora.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#1E293B] bg-[#111A24] p-5 space-y-2">
                  <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="size-5" />
                    Histórico por Fornecedor Locador
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Compare os preços praticados por cada locadora de equipamentos para negociar descontos em novos
                    contratos de longo prazo.
                  </p>
                </div>
              </div>

              {/* Card Ilustrativo de Maquinário */}
              <div className="rounded-3xl border border-[#1E293B] bg-[#111A24] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold uppercase text-slate-400">Rastreamento Ativo no Canteiro</span>
                  <Badge tone="blue">3 Ativos</Badge>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-800 bg-[#16212E] p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-white">Betoneira 400L Trifásica</div>
                      <div className="text-[11px] text-slate-400">Residencial Jardins • Locadora Rental Equip</div>
                      <div className="text-[10px] text-amber-400 mt-1 font-semibold">Uso: 18 dias decorridos</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-violet-400">R$ 1.800,00</div>
                      <div className="text-[10px] text-slate-400">R$ 100,00 / dia</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-[#16212E] p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-white">Andaime Fachadeiro (80m²)</div>
                      <div className="text-[11px] text-slate-400">Galeria Central • Andaimes & Formas Brasil</div>
                      <div className="text-[10px] text-emerald-400 mt-1 font-semibold">Uso: Mensalidade ativa</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-violet-400">R$ 2.450,00</div>
                      <div className="text-[10px] text-slate-400">R$ 2.450,00 / mês</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-[#16212E] p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-white">Retroescavadeira CAT 416</div>
                      <div className="text-[11px] text-slate-400">Condomínio Vista Bela • Terraplenagem Aliança</div>
                      <div className="text-[10px] text-sky-400 mt-1 font-semibold">Uso: 24 horas registradas</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-violet-400">R$ 4.320,00</div>
                      <div className="text-[10px] text-slate-400">R$ 180,00 / hora</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#18222F] p-3 text-center text-xs text-slate-300">
                  Total de máquinas locadas em operação hoje: <strong className="text-white">R$ 8.570,00 acumulado</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 7: PILAR 4 - EQUIPE E EMPREITADAS */}
        {slideAtual === 6 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <Badge tone="green">{slide.tag}</Badge>
              <h2 className="text-3xl md:text-5xl font-black text-white">{slide.titulo}</h2>
              <p className="text-slate-400 text-sm md:text-base">{slide.subtitulo}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 pt-2 items-center">
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#1E293B] bg-[#111A24] p-5 space-y-2">
                  <h3 className="text-base font-bold text-sky-400 flex items-center gap-2">
                    <Users className="size-5" />
                    Apontamento Semanal de Diárias
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Grade intuitiva de segunda a sábado onde o encarregado apenas clica nos dias trabalhados e na obra
                    correspondente. Cálculo automático: <em>Dias × Diária = Total da Semana</em>, debitando diretamente
                    na obra correta.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#1E293B] bg-[#111A24] p-5 space-y-2">
                  <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                    <Wrench className="size-5" />
                    Contratos de Empreitadas Fechadas
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Eletricistas, pintores, gesseiros e azulejistas não recebem por diária, e sim por <strong>valor
                    fechado e etapas concluídas</strong>. O sistema permite cadastrar o contrato total e liberar o
                    pagamento somente quando a medição física for aprovada.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#1E293B] bg-[#111A24] p-5 space-y-2">
                  <h3 className="text-base font-bold text-brand flex items-center gap-2">
                    <Calendar className="size-5" />
                    Flexibilidade de Pagamento
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Fechamento de folha e recebimentos de clientes com suporte completo para periodicidade{' '}
                    <strong>Semanal</strong>, <strong>Quinzenal</strong> ou <strong>Mensal</strong>.
                  </p>
                </div>
              </div>

              {/* Demonstração de Empreitada */}
              <div className="rounded-3xl border border-[#1E293B] bg-[#111A24] p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold uppercase text-slate-400">Exemplo de Empreitada no Sistema</span>
                  <Badge tone="blue">Em Andamento</Badge>
                </div>

                <div>
                  <div className="text-lg font-black text-white">Instalação Elétrica Completa</div>
                  <div className="text-xs text-slate-400">Prestador: Carlos Eletricista • Galeria Central</div>
                </div>

                <div className="rounded-2xl bg-[#16212E] p-4 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-400">Contrato Fechado</span>
                    <div className="text-xl font-black text-white">R$ 14.500,00</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-emerald-400 font-semibold">Já Quitado: R$ 5.000,00 (34,5%)</span>
                    <div className="text-xs text-slate-400">Restante: R$ 9.500,00</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-400">Parcelas e Medições:</span>

                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-400" />
                      <span>1ª Etapa: Tubulação e Eletrodutos</span>
                    </div>
                    <span className="font-bold text-emerald-400">R$ 5.000,00 (PAGO)</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#16212E] p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-amber-400" />
                      <span>2ª Etapa: Passagem de Fiação</span>
                    </div>
                    <span className="font-bold text-slate-200">R$ 4.500,00 (A Vencer)</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#16212E] p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-slate-500" />
                      <span>3ª Etapa: Tomadas, Painéis e Teste</span>
                    </div>
                    <span className="font-bold text-slate-400">R$ 5.000,00 (Final)</span>
                  </div>
                </div>

                <div className="pt-2 text-center text-xs text-slate-400">
                  🔒 Nenhuma etapa é paga sem a medição e autorização do responsável técnico.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 8: PILAR 5 - MODO TV / WALLBOARD */}
        {slideAtual === 7 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <Badge tone="blue">{slide.tag}</Badge>
              <h2 className="text-3xl md:text-5xl font-black text-white">{slide.titulo}</h2>
              <p className="text-slate-400 text-sm md:text-base">{slide.subtitulo}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 pt-2 items-center">
              <div className="space-y-4">
                <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-5 space-y-2">
                  <h3 className="text-base font-bold text-violet-300 flex items-center gap-2">
                    <Tv className="size-5" />
                    O Maior Diferencial Comercial da Sua Sede
                  </h3>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    Imagine o cliente de um apartamento de R$ 500.000 ou o investidor entrando na sede da sua
                    construtora e vendo em uma tela de 65 polegadas o status ao vivo de todas as obras, máquinas em
                    campo e o controle financeiro sem ninguém precisar tocar no computador.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#111A24] p-3 text-xs text-slate-300">
                    <div className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
                    <span><strong>100% Automático:</strong> Slides com transição inteligente e atualização em tempo real sem recarregar a página.</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#111A24] p-3 text-xs text-slate-300">
                    <div className="size-2 rounded-full bg-brand shadow-[0_0_8px_#FF6B00]" />
                    <span><strong>Alta Legibilidade:</strong> Tipografia grande de alta resolução legível mesmo a 6 metros de distância.</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#111A24] p-3 text-xs text-slate-300">
                    <div className="size-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38BDF8]" />
                    <span><strong>Modo Escuro Nativo:</strong> Visual moderno e imersivo com baixo consumo e alto contraste.</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link to="/tv" target="_blank" rel="noreferrer">
                    <Button size="lg" className="w-full" icon={<ExternalLink className="size-4" />}>
                      Abrir Demonstração Real do Modo TV Agora
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Preview Gráfica da TV */}
              <div className="rounded-3xl border-4 border-slate-700 bg-black p-4 shadow-2xl relative">
                <div className="absolute top-2 left-6 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-red-500" />
                  <span className="size-2 rounded-full bg-amber-500" />
                  <span className="size-2 rounded-full bg-emerald-500" />
                </div>
                <div className="text-center text-[10px] text-slate-400 font-bold mb-3 uppercase tracking-wider">
                  SALA DE REUNIÕES • WALLBOARD SMART TV
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#0B1118] p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <Logo size="sm" />
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-400">LIVE FEED</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#111A24] p-3">
                      <span className="text-[10px] text-slate-400 uppercase">Saldo de Caixa</span>
                      <div className="text-lg font-black text-white">R$ 142.850,00</div>
                    </div>
                    <div className="rounded-xl bg-[#111A24] p-3">
                      <span className="text-[10px] text-slate-400 uppercase">Em Obras Ativas</span>
                      <div className="text-lg font-black text-brand">R$ 720.500,00</div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#111A24] p-3 space-y-2">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Equipe em Campo Hoje</span>
                      <strong className="text-emerald-400">22 operários</strong>
                    </div>
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Máquinas Locadas em Ação</span>
                      <strong className="text-violet-400">7 equipamentos</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 9: COMPARATIVO DE MERCADO */}
        {slideAtual === 8 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <Badge tone="blue">{slide.tag}</Badge>
              <h2 className="text-3xl md:text-5xl font-black text-white">{slide.titulo}</h2>
              <p className="text-slate-400 text-sm md:text-base">{slide.subtitulo}</p>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-[#1E293B] bg-[#111A24] shadow-2xl pt-2">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#16212E]/80 text-slate-300">
                    <th className="py-4 px-6 font-bold">Critério de Avaliação</th>
                    <th className="py-4 px-4 font-bold text-slate-400">Planilhas Excel</th>
                    <th className="py-4 px-4 font-bold text-slate-400">Sistemas Antigos (Sienge/TOTVS)</th>
                    <th className="py-4 px-6 font-extrabold text-brand bg-brand/10 border-x border-brand/20">
                      CONSTRUTEC ERP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-white">Custo de Implantação</td>
                    <td className="py-3.5 px-4 text-emerald-400">R$ 0 (mas custa tempo)</td>
                    <td className="py-3.5 px-4 text-red-400 font-semibold">R$ 15.000 a R$ 40.000</td>
                    <td className="py-3.5 px-6 font-bold text-emerald-400 bg-brand/5 border-x border-brand/20">
                      A partir de R$ 1.800 (Acessível)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-white">Mensalidade Recorrente</td>
                    <td className="py-3.5 px-4 text-slate-400">R$ 0</td>
                    <td className="py-3.5 px-4 text-red-400 font-semibold">R$ 2.000 a R$ 5.000 / mês</td>
                    <td className="py-3.5 px-6 font-bold text-emerald-400 bg-brand/5 border-x border-brand/20">
                      R$ 650 a R$ 890 / mês
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-white">Facilidade de Uso no Canteiro</td>
                    <td className="py-3.5 px-4 text-red-400">Péssima no celular</td>
                    <td className="py-3.5 px-4 text-red-400">Muito complexo e travado</td>
                    <td className="py-3.5 px-6 font-bold text-white bg-brand/5 border-x border-brand/20">
                      ✅ 100% Mobile First e Rápido
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-white">Rateio Inteligente de Compras</td>
                    <td className="py-3.5 px-4 text-amber-400">Manual (fácil de errar)</td>
                    <td className="py-3.5 px-4 text-slate-400">Exige módulos caros</td>
                    <td className="py-3.5 px-6 font-bold text-white bg-brand/5 border-x border-brand/20">
                      ✅ Automático por porcentagem
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-white">Rastreamento de Máquinas Locadas</td>
                    <td className="py-3.5 px-4 text-red-400">Não calcula diária corrida</td>
                    <td className="py-3.5 px-4 text-slate-400">Burocrático</td>
                    <td className="py-3.5 px-6 font-bold text-white bg-brand/5 border-x border-brand/20">
                      ✅ Cronômetro de custos em tempo real
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-white">Modo TV para Sala da Diretoria</td>
                    <td className="py-3.5 px-4 text-red-400">Inexistente</td>
                    <td className="py-3.5 px-4 text-red-400">Inexistente</td>
                    <td className="py-3.5 px-6 font-bold text-violet-400 bg-brand/5 border-x border-brand/20">
                      ✅ Exclusivo e Integrado
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SLIDE 10: SIMULADOR DE ROI */}
        {slideAtual === 9 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <Badge tone="green">{slide.tag}</Badge>
              <h2 className="text-3xl md:text-5xl font-black text-white">{slide.titulo}</h2>
              <p className="text-slate-400 text-sm md:text-base">{slide.subtitulo}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 pt-2 items-center">
              <div className="rounded-3xl border border-[#1E293B] bg-[#111A24] p-6 space-y-6">
                <h3 className="text-base font-bold text-white">Simule o Cenário da Sua Construtora:</h3>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 font-semibold mb-2">
                      <span>Quantidade de Obras Simultâneas:</span>
                      <span className="text-brand text-sm font-bold">{obrasAtivasSimulacao} obras</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={obrasAtivasSimulacao}
                      onChange={(e) => setObrasAtivasSimulacao(Number(e.target.value))}
                      className="w-full accent-brand cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 font-semibold mb-2">
                      <span>Custo Médio Mensal por Obra (Materiais + Equipe):</span>
                      <span className="text-sky-400 text-sm font-bold">{fmtBRL(gastoMensalEstimado)}</span>
                    </div>
                    <input
                      type="range"
                      min={30000}
                      max={500000}
                      step={10000}
                      value={gastoMensalEstimado}
                      onChange={(e) => setGastoMensalEstimado(Number(e.target.value))}
                      className="w-full accent-brand cursor-pointer"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#16212E] p-4 text-xs text-slate-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    Premissas de Redução de Perdas:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                    <li>Devolução pontual de equipamentos locados (evita diárias extras).</li>
                    <li>Compras com rateio correto e fim de desperdício em estoque.</li>
                    <li>Fim de erros em pagamentos de diárias e etapas não conferidas.</li>
                  </ul>
                </div>
              </div>

              {/* Resultado do ROI */}
              <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/5 p-8 space-y-6 text-center shadow-2xl">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  ECONOMIA ESTIMADA PARA SUA CONSTRUTORA
                </span>

                <div>
                  <div className="text-4xl md:text-5xl font-black text-white">{fmtBRL(economiaEstimadaMes)}</div>
                  <div className="text-sm text-emerald-400 font-semibold mt-1">por mês economizados diretamente</div>
                </div>

                <div className="border-y border-emerald-500/20 py-4 space-y-1">
                  <span className="text-xs text-slate-400">Economia Anual Consolidada:</span>
                  <div className="text-2xl font-black text-emerald-300">{fmtBRL(economiaEstimadaMes * 12)}</div>
                </div>

                <div className="rounded-2xl bg-[#111A24] p-4 text-xs text-slate-300">
                  O investimento no sistema (a partir de R$ 650/mês) representa{' '}
                  <strong className="text-brand font-bold">menos de 5%</strong> do dinheiro que você deixará de
                  perder todo mês.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 11: PROPOSTA COMERCIAL */}
        {slideAtual === 10 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-2 text-center max-w-2xl mx-auto">
              <Badge tone="orange">{slide.tag}</Badge>
              <h2 className="text-3xl md:text-5xl font-black text-white">{slide.titulo}</h2>
              <p className="text-slate-400 text-sm md:text-base">{slide.subtitulo}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 pt-2 max-w-4xl mx-auto w-full">
              {/* Opção 1: Recorrência */}
              <div className="rounded-3xl border-2 border-brand bg-[#16212E] p-7 space-y-6 relative shadow-2xl shadow-brand/10">
                <div className="absolute -top-3.5 right-6 rounded-full bg-brand px-3 py-1 text-[11px] font-black uppercase text-white tracking-wider">
                  MAIS POPULAR
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">Modelo Assinatura (SaaS)</h3>
                  <p className="text-xs text-slate-400 mt-1">Ideal para começar imediatamente com baixo desembolso inicial.</p>
                </div>

                <div className="space-y-2 border-y border-slate-800 py-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl md:text-4xl font-black text-white">R$ 650</span>
                    <span className="text-xs text-slate-400">/ mês</span>
                  </div>
                  <div className="text-xs text-brand font-semibold">
                    + Taxa Única de Setup & Treinamento: R$ 1.800
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>Até 5 obras ativas simultâneas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>Modo TV / Wallboard liberado</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>Cadastro de obras, fornecedores e equipe</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>Suporte contínuo e atualizações inclusas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>Backup diário e dados 100% seguros</span>
                  </li>
                </ul>

                <a
                  href="https://wa.me/?text=Ol%C3%A1%2C%20tenho%20interesse%20no%20Plano%20Assinatura%20do%20CONSTRUTEC%20ERP"
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <Button size="lg" className="w-full" icon={<MessageCircle className="size-4" />}>
                    Contratar Plano Assinatura
                  </Button>
                </a>
              </div>

              {/* Opção 2: Licença Vitalícia */}
              <div className="rounded-3xl border border-[#1E293B] bg-[#111A24] p-7 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Licença Vitalícia / Fechada</h3>
                  <p className="text-xs text-slate-400 mt-1">Para construtoras que preferem ser donas do sistema sem mensalidade.</p>
                </div>

                <div className="space-y-2 border-y border-slate-800 py-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl md:text-4xl font-black text-white">R$ 12.000</span>
                    <span className="text-xs text-slate-400">à vista ou em 3x</span>
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold">
                    Sem mensalidades obrigatórias de licença
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>Obras e usuários ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>Instalação personalizada com a marca da construtora</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>Treinamento completo para toda a equipe</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>3 meses de suporte técnico dedicado inclusos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>Suporte opcional após 3 meses por R$ 500/mês</span>
                  </li>
                </ul>

                <a
                  href="https://wa.me/?text=Ol%C3%A1%2C%20tenho%20interesse%20na%20Licen%C3%A7a%20Vital%C3%ADcia%20do%20CONSTRUTEC%20ERP"
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <Button variant="secondary" size="lg" className="w-full" icon={<MessageCircle className="size-4" />}>
                    Contratar Licença Vitalícia
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 12: FECHAMENTO / PRÓXIMOS PASSOS */}
        {slideAtual === 11 && (
          <div className="space-y-8 text-center animate-fadeIn py-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="size-4" />
              IMPLANTAÇÃO EXPRESSA EM 48 HORAS
            </div>

            <div className="space-y-3 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-black text-white">
                Pronto para Ter o Controle Total das Suas Obras?
              </h2>
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                Nós configuramos suas obras ativas, cadastramos os fornecedores e treinamos sua equipe para você
                começar a economizar já nesta semana.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto text-left pt-2">
              <div className="rounded-2xl border border-slate-800 bg-[#111A24] p-5 space-y-2">
                <div className="text-brand font-black text-lg">Passo 1: Setup</div>
                <p className="text-xs text-slate-400">
                  Subimos o sistema em nuvem com o logotipo e identidade da sua construtora.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#111A24] p-5 space-y-2">
                <div className="text-sky-400 font-black text-lg">Passo 2: Carga Inicial</div>
                <p className="text-xs text-slate-400">
                  Importamos suas obras vigentes, contratos de fornecedores e operários de canteiro.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#111A24] p-5 space-y-2">
                <div className="text-emerald-400 font-black text-lg">Passo 3: Treinamento</div>
                <p className="text-xs text-slate-400">
                  Sessão prática com o engenheiro, administrativo e encarregados em menos de 1 hora.
                </p>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://wa.me/?text=Ol%C3%A1%2C%20quero%20fechar%20a%20implanta%C3%A7%C3%A3o%20do%20CONSTRUTEC%20ERP%20para%20minha%20construtora"
                target="_blank"
                rel="noreferrer"
              >
                <Button size="lg" icon={<WhatsAppIcon className="size-5" />}>
                  Iniciar Implantação no WhatsApp
                </Button>
              </a>

              <Link to="/">
                <Button variant="secondary" size="lg" icon={<ExternalLink className="size-5" />}>
                  Navegar pelo ERP ao Vivo
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* RODAPÉ DE NAVEGAÇÃO DOS SLIDES */}
      <footer className="relative z-40 flex h-16 items-center justify-between border-t border-[#1E293B] bg-[#111A24]/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={anterior}
            disabled={slideAtual === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#18222F] px-4 py-2 text-xs font-bold text-slate-200 transition-colors hover:border-brand/50 hover:text-brand disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="size-4" />
            <span>Anterior</span>
          </button>

          <button
            onClick={proximo}
            disabled={slideAtual === SLIDES.length - 1}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-30 disabled:pointer-events-none shadow-md shadow-brand/20"
          >
            <span>Próximo</span>
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Indicadores de Pílulas dos Slides */}
        <div className="hidden md:flex items-center gap-1.5">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setSlideAtual(idx)}
              title={`Ir para slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                slideAtual === idx ? 'w-8 bg-brand' : 'w-2 bg-slate-800 hover:bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold">
          <span className="hidden sm:inline">Use as teclas ⬅️ / ➡️ do teclado</span>
          <span className="rounded-md bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300">
            {slideAtual + 1} / {SLIDES.length}
          </span>
        </div>
      </footer>
    </div>
  );
}
