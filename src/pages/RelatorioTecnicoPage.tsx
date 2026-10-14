import { Printer, ArrowLeft, Download, Code2, Server, Database, Layers, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui';

export function RelatorioTecnicoPage() {
  const imprimir = () => {
    window.print();
  };

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900 print:bg-white print:text-black">
      {/* Barra de Ações Superior (Oculta na impressão) */}
      <header className="no-print sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-brand">
            <ArrowLeft className="size-4" />
            Voltar ao ERP
          </Link>
          <div className="h-4 w-px bg-slate-300" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Dossiê Técnico & Funcional do Sistema
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={imprimir} icon={<Printer className="size-4" />}>
            Imprimir / Salvar em PDF (Cmd+P)
          </Button>
        </div>
      </header>

      {/* Conteúdo do Relatório Formatado para Impressão A4 */}
      <main className="mx-auto max-w-4xl bg-white p-8 md:p-14 my-6 shadow-xl rounded-2xl print:m-0 print:p-0 print:shadow-none print:rounded-none">
        {/* Cabeçalho do Dossiê */}
        <div className="border-b-2 border-slate-900 pb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black tracking-tight text-slate-900">CONSTRUTEC</span>
                <span className="rounded-md bg-[#FF6B00] px-2 py-0.5 text-xs font-black text-white">ERP</span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mt-1">
                Construção e Reformas em Geral • Especificação Técnica de Software
              </p>
            </div>
            <div className="text-right text-xs text-slate-600 space-y-0.5">
              <div><strong>Documento:</strong> Dossiê de Engenharia & Funcionalidades</div>
              <div><strong>Versão da Aplicação:</strong> 0.2.0 (Produção / Release)</div>
              <div><strong>Data de Emissão:</strong> 06 de Outubro de 2026</div>
              <div><strong>Público:</strong> Desenvolvedor Parceiro / Equipe Técnica</div>
            </div>
          </div>
        </div>

        {/* 1. VISÃO GERAL & OBJETIVO */}
        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-black uppercase text-slate-900 border-l-4 border-[#FF6B00] pl-3">
            1. Visão Geral do Sistema
          </h2>
          <p className="text-xs leading-relaxed text-slate-700">
            O <strong>CONSTRUTEC ERP</strong> é uma aplicação completa de gestão empresarial e controle operacional de
            canteiro de obras desenvolvida sob medida para construtoras e empreiteiras de pequeno e médio porte. O
            sistema integra a rotina física de campo (frequência de operários, maquinário locado e consumo de materiais)
            com o controle financeiro de sede (compras centralizadas com rateio automático, contas a pagar/receber,
            contratos de empreitada por etapas e Curva S de desembolso financeiro em tempo real).
          </p>
        </section>

        {/* 2. STACK TECNOLÓGICA */}
        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-black uppercase text-slate-900 border-l-4 border-[#FF6B00] pl-3">
            2. Stack Tecnológica & Arquitetura de Software
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <strong className="block text-slate-900 font-bold mb-1">Frontend & Linguagem:</strong>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                <li><strong>Linguagem:</strong> TypeScript (ESNext) com tipagem estrita.</li>
                <li><strong>Framework:</strong> React 19 (Componentes funcionais com Hooks).</li>
                <li><strong>Roteamento:</strong> React Router DOM v7 (Browser Router).</li>
                <li><strong>Estilização:</strong> Tailwind CSS v4 (Design tokens nativos).</li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <strong className="block text-slate-900 font-bold mb-1">Engenharia & Dados:</strong>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                <li><strong>Gerenciamento de Estado:</strong> Zustand v5 com persistência reativa (Local Storage / Store Modular).</li>
                <li><strong>Build & Dev Server:</strong> Vite 8 (Hot Module Replacement instantâneo).</li>
                <li><strong>Visualização de Dados:</strong> Recharts (Curva S, Donut e Barras Empilhadas).</li>
                <li><strong>Ícones & Assets:</strong> Lucide React + Vetor oficial SVG Construtec.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
            <strong>Padrão de Arquitetura:</strong> Arquitetura modular limpa em camadas:
            <span className="font-mono text-[11px] block mt-1 text-slate-800">
              • <code>src/domain/</code>: Entidades puras, regras de negócio e funções matemáticas (cálculo de folha, Curva S, rateio).<br />
              • <code>src/data/</code>: Gerenciamento do estado global via Zustand e camada de persistência.<br />
              • <code>src/features/</code>: Componentes ricos e diálogos de negócio organizados por domínio.<br />
              • <code>src/pages/</code>: Páginas principais da aplicação e layouts de exibição.<br />
              • <code>src/lib/</code>: Utilitários matemáticos, formatadores (BRL, datas ISO) e helpers (WhatsApp).
            </span>
          </div>
        </section>

        {/* 3. MAPA COMPLETO DE FUNCIONALIDADES */}
        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-black uppercase text-slate-900 border-l-4 border-[#FF6B00] pl-3">
            3. Dossiê Detalhado dos Módulos & Funcionalidades
          </h2>

          {/* Módulo 1 */}
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="text-[#FF6B00]">3.1</span> Dashboard Executivo & Análise Financeira
            </h3>
            <ul className="mt-1 list-disc list-inside text-xs text-slate-700 space-y-1">
              <li><strong>Big Numbers em Tempo Real:</strong> Saldo de caixa geral (entradas vs. saídas), custo total comprometido em obras ativas, alertas de pagamentos a vencer em 7 dias e contagem de operários e máquinas em operação hoje.</li>
              <li><strong>Curva S de Desembolso Financeiro:</strong> Comparativo acumulado entre Orçamento Previsto, Custo Comprometido e Desembolso Realizado (Caixa), com alternância entre modo Linhas e Área preenchida.</li>
              <li><strong>Composição de Custos Moderna:</strong> Gráfico Donut sem sobreposição com lista de barras de progresso proporcionais para 5 centros de custo: Materiais, Mão de Obra, Locações, Serviços e Despesas Gerais/Sede.</li>
            </ul>
          </div>

          {/* Módulo 2 */}
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="text-[#FF6B00]">3.2</span> Gestão de Obras & Serviços
            </h3>
            <ul className="mt-1 list-disc list-inside text-xs text-slate-700 space-y-1">
              <li>Cadastro completo de obras simultâneas com cliente, endereço, responsável técnico, datas de início e entrega prevista, e orçamento aprovado.</li>
              <li><strong>Visão Detalhada por Obra:</strong> Painel modal com acompanhamento de materiais alocados com saldo físico/financeiro, equipamentos alugados ativos e equipe de operários alocada.</li>
              <li>Cálculo dinâmico de consumo de orçamento em R$ e saldo remanescente, com alertas visuais de estouro de verba.</li>
            </ul>
          </div>

          {/* Módulo 3 */}
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="text-[#FF6B00]">3.3</span> Serviços Terceirizados & Empreitadas Fechadas
            </h3>
            <ul className="mt-1 list-disc list-inside text-xs text-slate-700 space-y-1">
              <li>Gestão de contratos com autônomos por valor fechado e prazo (eletricistas, pintores, gesseiros, serralheiros) sem pagamento por diária simples.</li>
              <li><strong>Condições de Pagamento:</strong> Parcela Única ou Parcelamento por Etapas de Medição física (ex: Tubulação, Fiação, Acabamento).</li>
              <li>Geração automática de contas a pagar debitadas diretamente no centro de custo da respectiva obra, com liquidação rápida via Pix e barra de progresso financeiro.</li>
              <li>Página dedicada no menu principal (<code>/servicos</code> ou atalho <code>Alt+S</code>) e aba integrada nos detalhes de cada obra.</li>
            </ul>
          </div>

          {/* Módulo 4 */}
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="text-[#FF6B00]">3.4</span> Máquinas & Equipamentos Locados
            </h3>
            <ul className="mt-1 list-disc list-inside text-xs text-slate-700 space-y-1">
              <li>Controle de equipamentos alugados (betoneiras, andaimes tubulares, escoras, retroescavadeiras) vinculados à obra e à locadora fornecedora.</li>
              <li>Suporte a modalidades de tarifa: <strong>Diária</strong>, <strong>Mensal</strong> ou <strong>Por Hora</strong> com apontamento de horas trabalhadas.</li>
              <li><strong>Cronômetro de Custo Acumulado:</strong> Cálculo automático contínuo do valor devido acumulado até a data atual ou data de devolução, evitando máquinas ociosas gerando custos extras.</li>
            </ul>
          </div>

          {/* Módulo 5 */}
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="text-[#FF6B00]">3.5</span> Compras & Rateio Inteligente de Notas
            </h3>
            <ul className="mt-1 list-disc list-inside text-xs text-slate-700 space-y-1">
              <li><strong>Mecanismo de Compra Centralizada:</strong> Compra de cargas fechadas (ex: carreta de cimento, 10.000 tijolos, aço) com distribuição por cotas percentuais entre as obras participantes.</li>
              <li>Débito automático da fração exata no orçamento de cada obra participante e geração de duplicata consolidada nas contas a pagar do fornecedor.</li>
              <li>Alimentação instantânea dos saldos de estoque físico de cada obra.</li>
            </ul>
          </div>

          {/* Módulo 6 */}
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="text-[#FF6B00]">3.6</span> Gestão de Equipe, Presença & WhatsApp Direto
            </h3>
            <ul className="mt-1 list-disc list-inside text-xs text-slate-700 space-y-1">
              <li>Cadastro de colaboradores com regime <strong>Diarista</strong> (valor da diária) ou <strong>Mensalista</strong> (salário fixo).</li>
              <li>Grade semanal ágil de frequência onde o encarregado marca presença de dia inteiro, meio período ou falta, apontando em qual obra o operário atuou.</li>
              <li><strong>Integração com WhatsApp:</strong> Todos os números de telefone de colaboradores são links clicáveis (com ícone oficial verde) que abrem diretamente a conversa no WhatsApp Web ou App com DDI (+55) pré-formatado.</li>
            </ul>
          </div>

          {/* Módulo 7 */}
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="text-[#FF6B00]">3.7</span> Folha de Pagamento & Fechamento em Lote / Bloco
            </h3>
            <ul className="mt-1 list-disc list-inside text-xs text-slate-700 space-y-1">
              <li>Cálculo automático de proventos: <em>Dias Trabalhados × Diária</em> (ou fração salarial), com suporte a adicionais (horas extras, bônus) e deduções (vales, adiantamentos).</li>
              <li>Suporte nativo a periodicidades <strong>Semanal</strong>, <strong>Quinzenal</strong> (15 dias) e <strong>Mensal</strong>.</li>
              <li><strong>Fechamento em Lote / Bloco:</strong> Modal com filtros em cascata por Obra, Cargo/Função e Regime, permitindo selecionar 10, 20 ou 50 profissionais de uma vez e gerar todas as contas a pagar simultaneamente.</li>
              <li><strong>Exportação em Lote:</strong> Download imediato de planilha CSV/Excel UTF-8 com dados bancários/Pix e geração de <strong>Espelho de Folha formatado para Impressão A4</strong> com campo para assinatura física de cada trabalhador.</li>
            </ul>
          </div>

          {/* Módulo 8 */}
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="text-[#FF6B00]">3.8</span> Financeiro (Contas a Pagar & Receber)
            </h3>
            <ul className="mt-1 list-disc list-inside text-xs text-slate-700 space-y-1">
              <li>Contas a pagar com classificação por fornecedor, categoria, obra debitada, vencimento e status (Pendente, Pago, Vencido).</li>
              <li>Contas a receber de clientes com <strong>Gerador de Cronograma de Medições</strong> (Semanal, Quinzenal ou Mensal) com cálculo automático de parcelas iguais e datas de vencimento.</li>
              <li>Alertas inteligentes de títulos vencidos e pagamentos programados para os próximos 7 dias.</li>
            </ul>
          </div>

          {/* Módulo 9 */}
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="text-[#FF6B00]">3.9</span> Modo TV / Wallboard em Tela Cheia (Sede & Reuniões)
            </h3>
            <ul className="mt-1 list-disc list-inside text-xs text-slate-700 space-y-1">
              <li>Painel em rotação automática em tela cheia (rota <code>/tv</code> ou atalho <code>Alt+T</code>) desenhado para Smart TVs em salas de reunião ou recepção da construtora.</li>
              <li>Indicador de <em>Live Feed</em> com pulso luminoso esmeralda e reatividade instantânea dos KPIs sem necessidade de recarregar a página.</li>
              <li>Slides automáticos: Panorama Geral, Status por Obra, Máquinas em Campo e Presença de Operários Hoje.</li>
            </ul>
          </div>

          {/* Módulo 10 */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="text-[#FF6B00]">3.10</span> Pitch Deck Comercial Web Integrado
            </h3>
            <ul className="mt-1 list-disc list-inside text-xs text-slate-700 space-y-1">
              <li>Apresentação de slides comercial navegável em tela cheia (rota <code>/apresentacao</code> ou <code>Alt+P</code>) no estilo Keynote/Apple.</li>
              <li>12 slides conceituais com narrativa de vendas completa: dores de canteiro, Curva S, rateio de notas, comparativo vs. Sienge/Excel, simulador interativo de ROI e proposta de investimento.</li>
            </ul>
          </div>
        </section>

        {/* 4. GUIA DE INTEGRAÇÃO & PRÓXIMOS PASSOS PARA O DESENVOLVEDOR */}
        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-black uppercase text-slate-900 border-l-4 border-[#FF6B00] pl-3">
            4. Guia de Integração & Evolução para o Desenvolvedor Parceiro
          </h2>
          <p className="text-xs leading-relaxed text-slate-700">
            A aplicação foi concebida com padrão de arquitetura modular, permitindo que um desenvolvedor parceiro conecte
            um backend e banco de dados relacional na nuvem de forma ágil e sem refatorações drásticas de interface:
          </p>

          <div className="space-y-2 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <strong className="text-slate-900 block font-bold">1. Conexão de Banco de Dados (Supabase ou PostgreSQL/Node):</strong>
              <span className="text-slate-700 block mt-0.5">
                O arquivo <code>src/domain/types.ts</code> contém toda a modelagem de entidades pronta (Obras, Funcionários, Locações, Compras, Fechamentos, Contas a Pagar/Receber). As tabelas SQL no banco de dados podem ser criadas com mapeamento direto 1:1 dessas interfaces TypeScript.
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <strong className="text-slate-900 block font-bold">2. Camada de Persistência (Store):</strong>
              <span className="text-slate-700 block mt-0.5">
                Atualmente os dados reativos residem em <code>src/data/store.ts</code> via Zustand. Para conectar uma API REST ou cliente Supabase, basta substituir as mutações locais por chamadas assíncronas (ex: <code>fetch</code>, <code>axios</code> ou <code>@supabase/supabase-js</code>).
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <strong className="text-slate-900 block font-bold">3. Autenticação e Multi-Tenancy:</strong>
              <span className="text-slate-700 block mt-0.5">
                O sistema já possui separação de papéis (perfis <code>admin</code> e <code>encarregado</code> definidos em <code>types.ts</code> e guardas de rota em <code>AppShell.tsx</code>). Para transformar em SaaS multi-empresa, basta adicionar uma coluna <code>tenant_id / empresa_id</code> nas tabelas do banco.
              </span>
            </div>
          </div>
        </section>

        {/* Rodapé e Assinatura Técnica */}
        <div className="mt-12 border-t-2 border-slate-900 pt-4 flex justify-between items-center text-xs text-slate-500">
          <div>
            <strong>CONSTRUTEC ERP</strong> • Código-fonte modular em React 19 + TypeScript
          </div>
          <div>
            Documentação gerada para desenvolvimento e auditoria de software
          </div>
        </div>
      </main>
    </div>
  );
}
