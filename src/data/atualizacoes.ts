export type TagAtualizacao = 'Novo' | 'Melhoria' | 'Correção';

export interface PassoVisual {
  passo: number;
  titulo: string;
  descricao: string;
  icone: string;
  ondeEncontrar?: string;
  dica?: string;
}

export interface ItemMudanca {
  tag: TagAtualizacao;
  texto: string;
  detalhe?: string;
}

export interface ReleaseVersao {
  versao: string;
  dataPublicacao: string;
  dataIso: string;
  titulo: string;
  descricao: string;
  tags: TagAtualizacao[];
  mudancas: ItemMudanca[];
  passosVisuais: PassoVisual[];
}

export const ATUALIZACOES_SISTEMA: ReleaseVersao[] = [
  {
    versao: 'v1.8.1',
    dataPublicacao: '27 de Outubro de 2026 às 22:20',
    dataIso: '2026-10-27T22:20:00Z',
    titulo: 'Notificações In-App no Topo, Destinatários de Lembretes & Ajustes em Obras',
    descricao:
      'Nova Central de Notificações In-App com ícone de sino no topo do sistema para acesso instantâneo a lembretes do dia e novidades da plataforma sem depender de autorização do navegador; sistema completo de atribuição de tarefas e lembretes para destinatários específicos (eu mesmo, todos os usuários ou administradores/encarregados selecionados); remoção total de máquinas e locações de Obras; e histórico de atualizações padronizado.',
    tags: ['Novo', 'Melhoria', 'Correção'],
    mudancas: [
      {
        tag: 'Novo',
        texto:
          'Central de Notificações In-App com ícone de sino no topo do sistema, mostrando lembretes pendentes, tarefas atribuídas e avisos de novas versões sem depender de permissões do navegador',
        detalhe:
          'Acesse rapidamente no topo direito da tela todas as pendências de hoje e avisos de atualizações com badges visuais e atalhos rápidos para conclusão.',
      },
      {
        tag: 'Novo',
        texto:
          'Atribuição de Lembretes e Tarefas por Usuário (Eu mesmo / Todos os usuários / Usuário específico com conta de Administrador ou Encarregado)',
        detalhe:
          'Direcione cada tarefa para quem realmente precisa executá-la, garantindo que o alerta seja disparado para a pessoa certa no canteiro ou escritório.',
      },
      {
        tag: 'Correção',
        texto: 'Remoção completa de máquinas e locações do módulo de Obras',
        detalhe:
          'Interface e orçamentos de obras despoluídos, mantendo o foco exclusivo em materiais, mão de obra e serviços essenciais.',
      },
      {
        tag: 'Melhoria',
        texto: 'Histórico de Atualizações padronizado a partir da v1.7.0',
        detalhe:
          'Visualização limpa e documentada no formato de aplicativo profissional, pronta para exportação ilustrada em PDF.',
      },
    ],
    passosVisuais: [
      {
        passo: 1,
        titulo: 'Acessar a Central de Notificações In-App no Topo',
        descricao:
          'Clique no ícone de sino no canto superior direito (ao lado do status de conexão) para abrir o painel de lembretes pendentes de hoje e avisos de novas versões.',
        icone: 'Bell',
        ondeEncontrar: 'Cabeçalho Superior > Ícone de Sino (ao lado do indicador de conexão)',
        dica: 'O badge vermelho indica a quantidade de notificações não lidas ou pendências atribuídas a você.',
      },
      {
        passo: 2,
        titulo: 'Atribuir Destinatário ao Criar ou Editar Tarefas',
        descricao:
          "No formulário de Tarefas, selecione o 'Destinatário do Lembrete': apenas para você, para todos os usuários com conta ou para um profissional específico.",
        icone: 'Users',
        ondeEncontrar: "Menu Principal > Tarefas > 'Nova Tarefa' > Campo 'Destinatário do Lembrete'",
        dica: 'Ao atribuir a um encarregado ou administrador específico, o lembrete programado alertará diretamente aquele usuário.',
      },
      {
        passo: 3,
        titulo: 'Identificar Responsáveis na Lista de Tarefas',
        descricao:
          "Cada tarefa na listagem agora exibe uma tag sutil indicando se foi designada 'Para todos' ou para um responsável específico com ícone de usuário.",
        icone: 'CheckSquare',
        ondeEncontrar: 'Menu Principal > Tarefas > Lista de Atividades',
        dica: 'Utilize o filtro de busca para encontrar rapidamente tarefas atribuídas a determinados colaboradores.',
      },
      {
        passo: 4,
        titulo: 'Concluir Tarefas Diretamente pelo Sino de Notificações',
        descricao:
          'No popover do sino, clique no botão de marcar como concluída para dar baixa na pendência imediatamente, sem precisar sair da tela atual.',
        icone: 'CheckCircle2',
        ondeEncontrar: 'Central de Notificações (Sino) > Aba de Lembretes > Botão de Concluir',
        dica: 'Ao concluir ou clicar em "Marcar todas como lidas", o contador vermelho é zerado automaticamente.',
      },
      {
        passo: 5,
        titulo: 'Exportar o Guia de Novidades v1.8.1 em PDF',
        descricao:
          "Na aba 'Configurações > Atualizações', clique em 'Passo a Passo Visual' da versão v1.8.1 e depois em 'Imprimir / Salvar em PDF' para compartilhar as novidades.",
        icone: 'Printer',
        ondeEncontrar: "Configurações > Aba 'Atualizações' > Versão v1.8.1",
        dica: 'A formatação é otimizada para impressão física ou envio por WhatsApp.',
      },
    ],
  },
  {
    versao: 'v1.8.0',
    dataPublicacao: '27 de Outubro de 2026 às 21:00',
    dataIso: '2026-10-27T21:00:00Z',
    titulo: 'Ordenação Inteligente de Obras & Equipe e Central de Atualizações',
    descricao:
      'Nova experiência de visualização flexível em Obras com alternador entre Cards e Lista em tabela compacta; ordenação multifatorial por prazos, status e entrega; cabeçalhos clicáveis e interativos na gestão de colaboradores; grade de presença semanal com ordenação alfabética automática; e a nova Central de Atualizações com exportação de passo a passo ilustrado em PDF.',
    tags: ['Novo', 'Melhoria'],
    mudancas: [
      {
        tag: 'Novo',
        texto: 'Modo de visualização em Lista em Obras',
        detalhe:
          'Alterne entre a grade tradicional de cards e uma tabela limpa e compacta com colunas de cliente, responsável/arquiteto, fase atual, status e progresso de prazo decorrido.',
      },
      {
        tag: 'Melhoria',
        texto: 'Ordenação de Obras por múltiplos critérios operacionais',
        detalhe:
          'Ordene obras por nome (A-Z e Z-A), status (Andamento -> Planejamento -> Pausada -> Concluída), prazo mais próximo de finalizar, maior prazo decorrido ou previsão de entrega.',
      },
      {
        tag: 'Melhoria',
        texto: 'Cabeçalhos ordenáveis na tabela da Equipe com setinhas interativas',
        detalhe:
          'Clique em qualquer coluna (Colaborador A-Z/Z-A, Função, Remuneração maior/menor, Obra padrão e Status) para reordenar com setinhas interativas instantaneamente.',
      },
      {
        tag: 'Melhoria',
        texto: 'Grade semanal de presença ordenada alfabeticamente',
        detalhe:
          'A lista de colaboradores no apontamento de frequência é automaticamente ordenada de A a Z considerando apelido ou nome para agilizar a chamada em campo.',
      },
      {
        tag: 'Novo',
        texto: 'Central de Atualizações com histórico e exportação de Passo a Passo',
        detalhe:
          'Acompanhe todas as novidades com changelog no padrão de lojas de aplicativos e exporte guias passo a passo ilustrados em PDF pronto para compartilhar com a equipe e clientes.',
      },
    ],
    passosVisuais: [
      {
        passo: 1,
        titulo: 'Alternar entre Cards e Lista em Obras',
        descricao:
          "Na página de 'Obras', utilize os botões de alternância no canto superior direito da barra de filtros para alternar instantaneamente entre os cards visuais e a tabela de lista compacta.",
        icone: 'LayoutGrid',
        ondeEncontrar: "Menu Principal > Obras & Empreendimentos (topo direito da barra de busca)",
        dica: 'A visão em lista é perfeita para telas menores ou para conferir rapidamente cliente, arquiteto e prazo de muitas obras ao mesmo tempo.',
      },
      {
        passo: 2,
        titulo: 'Ordenar as Obras por Prazo, Status ou Nome',
        descricao:
          "No seletor de ordenação de Obras, escolha o critério desejado: ordem alfabética (A-Z ou Z-A), por status operacional, por proximidade de entrega ou prazo decorrido.",
        icone: 'ArrowUpDown',
        ondeEncontrar: "Menu Principal > Obras > Seletor 'Ordenar'",
        dica: "A opção 'Mais Próxima de Finalizar' coloca no topo as obras com prazo iminente para foco prioritário da gestão.",
      },
      {
        passo: 3,
        titulo: 'Ordenar Colaboradores com 1 Clique na Tabela',
        descricao:
          "Na página de 'Equipe', role até a tabela de 'Cadastro de Colaboradores' e clique em qualquer cabeçalho de coluna para inverter a ordenação entre A-Z, maior remuneração ou profissionais ativos.",
        icone: 'Users',
        ondeEncontrar: "Menu Principal > Equipe > Tabela 'Cadastro de Colaboradores'",
        dica: 'As setinhas interativas (▲ / ▼) mostram o sentido da ordenação ativa de forma clara e visual.',
      },
      {
        passo: 4,
        titulo: 'Conferência Rápida na Grade Semanal de Presença',
        descricao:
          'A grade semanal de frequência organiza automaticamente os profissionais em ordem alfabética (respeitando apelido se houver), tornando a chamada diária rápida e sem confusão.',
        icone: 'CheckSquare',
        ondeEncontrar: "Menu Principal > Equipe > 'Frequência Semanal'",
        dica: 'Mesmo aplicando filtros por obra ou função, a ordenação alfabética é preservada.',
      },
      {
        passo: 5,
        titulo: 'Exportar o Guia de Novidades em PDF Formatado',
        descricao:
          "Na aba 'Configurações > Atualizações', clique em 'Ver Passo a Passo Visual' na versão desejada e depois em 'Imprimir / Salvar em PDF' para gerar o documento formatado sem cabeçalhos do sistema.",
        icone: 'Printer',
        ondeEncontrar: "Configurações > Aba 'Atualizações' > Botão 'Exportar Passo a Passo'",
        dica: 'O PDF gerado é limpo e ideal para impressão em papel A4 ou envio direto via WhatsApp para mestres de obras e clientes.',
      },
    ],
  },
  {
    versao: 'v1.7.2',
    dataPublicacao: '26 de Outubro de 2026 às 18:30',
    dataIso: '2026-10-26T18:30:00Z',
    titulo: 'Sincronização Multi-Dispositivo Resiliente & Relógio Monotônico',
    descricao:
      'Aprimoramentos profundos no motor de sincronização em tempo real na nuvem para suportar múltiplos dispositivos simultâneos (iPhones, iPads e computadores) com relógios descalibrados (Clock Skew), evitando sobrescritas acidentais.',
    tags: ['Melhoria', 'Correção'],
    mudancas: [
      {
        tag: 'Melhoria',
        texto: 'Relógio Lógico Monotônico para múltiplos dispositivos',
        detalhe:
          'Garante que edições simultâneas feitas no canteiro e no escritório nunca percam informações nem sejam descartadas por atraso de relógio dos aparelhos.',
      },
      {
        tag: 'Correção',
        texto: 'Tratamento de latência e conexão intermitente no canteiro',
        detalhe:
          'Fila offline aprimorada com reconciliação imediata assim que a internet 4G/5G for restabelecida.',
      },
    ],
    passosVisuais: [
      {
        passo: 1,
        titulo: 'Uso Simultâneo no Celular e Tablet',
        descricao:
          'Abra o sistema no iPhone no canteiro de obras e no iPad no escritório; os dados se sincronizam automaticamente em segundo plano.',
        icone: 'Smartphone',
        ondeEncontrar: 'Disponível automaticamente em todos os dispositivos conectados',
        dica: 'Você pode trabalhar normalmente mesmo quando o sinal de celular estiver fraco.',
      },
      {
        passo: 2,
        titulo: 'Sincronização Automática ao Reconectar',
        descricao:
          'Ao retornar à área com internet, o sistema envia todas as marcações pendentes de forma segura sem risco de perda.',
        icone: 'CloudCheck',
        ondeEncontrar: 'Indicador de status no topo da aplicação',
        dica: 'O ícone de status de nuvem confirma quando todos os dados estão 100% atualizados.',
      },
    ],
  },
  {
    versao: 'v1.7.0',
    dataPublicacao: '24 de Outubro de 2026 às 14:15',
    dataIso: '2026-10-24T14:15:00Z',
    titulo: 'StatCards Navegáveis no Dashboard & Atalhos Operacionais',
    descricao:
      'Os cartões de métricas do Dashboard agora são interativos com feedback tátil no celular, permitindo navegar com 1 toque para as telas de Obras e Equipe.',
    tags: ['Novo', 'Melhoria'],
    mudancas: [
      {
        tag: 'Novo',
        texto: 'Navegação por 1 toque nos StatCards do Dashboard',
        detalhe:
          'Cards de Obras Ativas, Em Campo, Faltas Hoje e Prazo Médio levam diretamente para suas respectivas áreas com foco operacional imediato.',
      },
      {
        tag: 'Melhoria',
        texto: 'Feedback tátil e acessibilidade móvel',
        detalhe:
          'Transições suaves, tags semânticas para leitores de tela e áreas de clique otimizadas para dedos no celular.',
      },
    ],
    passosVisuais: [
      {
        passo: 1,
        titulo: 'Toque nos Cards de Presença do Dashboard',
        descricao:
          "Toque no card 'Em Campo' ou 'Faltas Hoje' na tela inicial para ir instantaneamente para a grade da equipe conferir o apontamento.",
        icone: 'Touchpad',
        ondeEncontrar: "Tela Inicial > Dashboard > Cards superiores",
        dica: 'Evita navegar por menus quando você precisa agir rápido no início da manhã.',
      },
      {
        passo: 2,
        titulo: 'Acesso Rápido a Obras Ativas',
        descricao:
          "Toque no card 'Obras Ativas' para ver a lista completa de canteiros em execução.",
        icone: 'Building2',
        ondeEncontrar: "Dashboard > Card 'Obras Ativas'",
        dica: 'O card exibe o número de canteiros ativos e o total de obras em planejamento.',
      },
    ],
  },
];

export const HISTORICO_ATUALIZACOES = ATUALIZACOES_SISTEMA;

