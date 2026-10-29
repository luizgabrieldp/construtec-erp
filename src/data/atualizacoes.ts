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
    versao: 'v1.8.4',
    dataPublicacao: '28 de Outubro de 2026 às 21:40',
    dataIso: '2026-10-28T21:40:00Z',
    titulo: 'Identidade Visual Reforçada: Marcas d\'Água & Selos Institucionais para Mídia',
    descricao:
      'Reforço na presença institucional da marca CONSTRUTEC em todo o sistema. Introdução de marca d\'água monumental translúcida nas áreas operacionais e no Dashboard para captura de prints e gravações corporativas para redes sociais com proteção de autoria; selos institucionais oficiais com localização Petrolina - PE integrados no rodapé dos menus laterais desktop e mobile; e marcas d\'água oficiais translúcidas e cabeçalhos refinados em todos os recibos individuais e de empreiteiros para impressão e geração de PDF.',
    tags: ['Novo', 'Melhoria'],
    mudancas: [
      {
        tag: 'Novo',
        texto:
          'Marca d\'água monumental translúcida da CONSTRUTEC integrada no fundo das telas e no Dashboard, perfeita para captura de prints e divulgação em mídias sociais',
        detalhe:
          'O emblema oficial da construtora agora fica suavemente visível ao fundo das telas sem interferir na leitura ou cliques, ideal para gravar stories, reels e capturar telas para envio a clientes e redes sociais.',
      },
      {
        tag: 'Novo',
        texto:
          'Selo institucional oficial da CONSTRUTEC com localização Petrolina - PE integrado no rodapé da barra lateral de menus (Sidebar e Mobile Drawer)',
        detalhe:
          'Novo badge corporativo oficial posicionado na base dos menus de navegação desktop e celular, exibindo o emblema de alta resolução e a assinatura de Petrolina - PE com indicador ativo.',
      },
      {
        tag: 'Melhoria',
        texto:
          'Marca d\'água oficial translúcida e cabeçalho refinado em todos os recibos individuais e de empreiteiros para impressão e PDF',
        detalhe:
          'Todos os recibos e comprovantes emitidos na Folha de Pagamento passam a contar com a marca d\'água oficial translúcida centralizada na folha A4 e cabeçalho institucional corporativo completo.',
      },
    ],
    passosVisuais: [
      {
        passo: 1,
        titulo: 'Marca d\'Água Monumental de Fundo',
        descricao:
          'Navegue por qualquer tela do sistema ou pelo Dashboard e observe o emblema oficial CONSTRUTEC no fundo. Ideal para gravar vídeos e tirar prints para Instagram e WhatsApp com a marca sempre presente.',
        icone: 'Sparkles',
        ondeEncontrar: 'Fundo de todas as telas operacionais e Dashboard',
        dica: 'A marca d\'água é 100% translúcida e não interfere em nenhum botão, clique ou rolagem de página.',
      },
      {
        passo: 2,
        titulo: 'Selo Institucional no Menu Desktop',
        descricao:
          'Na barra lateral de navegação no computador, confira o selo oficial com emblema e identificação Petrolina - PE no rodapé, que se adapta automaticamente quando o menu é recolhido.',
        icone: 'Building2',
        ondeEncontrar: 'Rodapé do Menu Lateral Esquerdo (Desktop)',
        dica: 'Ao recolher o menu, passe o mouse sobre o selo para visualizar as informações completas.',
      },
      {
        passo: 3,
        titulo: 'Selo Oficial no Menu Mobile',
        descricao:
          'No smartphone ou tablet, abra o menu lateral clicando no ícone do cabeçalho para visualizar o selo da CONSTRUTEC posicionado acima do botão de saída.',
        icone: 'Smartphone',
        ondeEncontrar: 'Menu de Navegação em Dispositivos Móveis',
        dica: 'Garante a autoridade corporativa em qualquer tamanho de tela.',
      },
      {
        passo: 4,
        titulo: 'Marca d\'Água nos Recibos e Impressões PDF',
        descricao:
          'Ao emitir recibos individuais ou do empreiteiro na Folha de Pagamento, cada página A4 impressa ou salva em PDF exibe a marca d\'água oficial da CONSTRUTEC ao centro.',
        icone: 'Printer',
        ondeEncontrar: 'Menu Folha > Recibos > Imprimir / Salvar PDF',
        dica: 'As assinaturas e valores permanecem com legibilidade impecável sobre a marca.',
      },
      {
        passo: 5,
        titulo: 'Exportação do Guia v1.8.4 em PDF',
        descricao:
          'Exporte este guia completo em PDF para manter seu time alinhado com os novos padrões visuais e institucionais da empresa.',
        icone: 'Printer',
        ondeEncontrar: 'Rodapé deste modal > Exportar em PDF',
        dica: 'O layout é pré-formatado para folha A4 limpa e profissional.',
      },
    ],
  },
  {
    versao: 'v1.8.3',
    dataPublicacao: '27 de Outubro de 2026 às 23:45',
    dataIso: '2026-10-27T23:45:00Z',
    titulo: 'Gestão Contínua de Tarefas Atrasadas, Exclusão Ágil & Notificações em Segundo Plano',
    descricao:
      'Aprimoramento abrangente no ciclo de vida de tarefas operacionais com persistência e destaque contínuo de tarefas atrasadas no Dashboard, Central de Notificações e Lista Geral; exclusão ágil de tarefas diretamente pelo widget da tela inicial e popover de notificações; e aprimoramento do Service Worker com suporte estendido para PWA na tela de início (iOS/Android) para recebimento de alertas com o app fechado ou em segundo plano.',
    tags: ['Novo', 'Melhoria', 'Correção'],
    mudancas: [
      {
        tag: 'Melhoria',
        texto:
          'Tarefas e Lembretes contínuos: qualquer tarefa não realizada na data prevista passa automaticamente para o status \'Atrasada\' e permanece em destaque no topo das listas dia após dia, nunca sumindo até que seja marcada como feita ou excluída',
        detalhe:
          'Tarefas atrasadas agora são acumulativas e continuam visíveis na aba "Hoje / Urgentes", no widget da tela inicial e no popover de notificações, calculando os dias de atraso e exigindo resolução ativa da equipe.',
      },
      {
        tag: 'Novo',
        texto:
          'Botão de exclusão rápida de tarefas no widget do Dashboard e na Central de Notificações com confirmação ágil',
        detalhe:
          'Agora é possível excluir tarefas diretamente a partir do widget na tela inicial ou pelo popover do sino no cabeçalho com confirmação ágil, sem necessidade de navegar até a tela completa de edição.',
      },
      {
        tag: 'Melhoria',
        texto:
          'Notificações nativas em segundo plano: aprimoramento no Service Worker com suporte a PWA instalado na tela de início (iOS/Android), garantindo recebimento de alertas com o app fechado ou em segundo plano',
        detalhe:
          'O Service Worker agora conta com canais de push e suporte a background sync em PWAs instalados, além de card explicativo com orientações claras para dispositivos Apple iOS e botão de teste de notificação.',
      },
    ],
    passosVisuais: [
      {
        passo: 1,
        titulo: 'Tarefas Atrasadas Sempre Visíveis e Acumulativas',
        descricao:
          'Se uma tarefa não foi concluída na data estipulada, ela não se perde: continua em destaque vermelho no topo da lista do dia e do Dashboard com contagem de dias de atraso.',
        icone: 'AlertCircle',
        ondeEncontrar: 'Menu Lateral > Tarefas (aba Hoje / Urgentes) e Dashboard',
        dica: 'A tarefa só sai da listagem ativa se você marcá-la como concluída ou se optar por excluí-la.',
      },
      {
        passo: 2,
        titulo: 'Exclusão Ágil no Widget do Dashboard',
        descricao:
          'No painel inicial, visualize a tarefa e clique no ícone da lixeira para remover tarefas desnecessárias na hora com confirmação ágil.',
        icone: 'Trash2',
        ondeEncontrar: 'Tela Inicial (Dashboard) > Widget Tarefas & Lembretes',
        dica: 'Ideal para limpar rapidamente pendências canceladas sem abrir formulários modais.',
      },
      {
        passo: 3,
        titulo: 'Exclusão e Conclusão Direto pelo Sino',
        descricao:
          'Abra a Central de Notificações no topo para visualizar todas as pendências e tarefas atrasadas, podendo concluir ou excluir com um clique.',
        icone: 'Bell',
        ondeEncontrar: 'Cabeçalho Superior > Ícone de Sino > Lembretes & Tarefas',
        dica: 'O contador de notificações reflete as pendências em tempo real.',
      },
      {
        passo: 4,
        titulo: 'Notificações em Segundo Plano com PWA',
        descricao:
          'Em Configurações > Notificações & PWA, confira instruções para adicionar o app à Tela de Início no iPhone/iPad e Android para receber alertas com a tela bloqueada.',
        icone: 'Smartphone',
        ondeEncontrar: 'Menu Lateral > Configurações > Notificações & PWA',
        dica: 'Utilize o botão "Testar Notificação Agora" para validar as notificações em segundo plano no seu aparelho.',
      },
      {
        passo: 5,
        titulo: 'Exportação do Guia v1.8.3 em PDF',
        descricao:
          'Imprima ou exporte este guia completo em PDF para distribuir o treinamento de uso e procedimentos com toda a equipe do canteiro.',
        icone: 'Printer',
        ondeEncontrar: 'Rodapé deste modal > Exportar em PDF',
        dica: 'A formatação A4 limpa oculta cabeçalhos e menus, gerando um documento pronto para impressão.',
      },
    ],
  },
  {
    versao: 'v1.8.2',
    dataPublicacao: '27 de Outubro de 2026 às 23:10',
    dataIso: '2026-10-27T23:10:00Z',
    titulo: 'Notificação Automática de Novas Versões & Leitura Inteligente sem Cliques Extras',
    descricao:
      'Disparo automático de notificação nativa (push web e toast in-app) sempre que uma nova versão do CONSTRUTEC for publicada; leitura inteligente de notificações ao visualizar a Central no sino ou ao navegar pela página de tarefas e aba de atualizações, zerando badges sem exigir cliques manuais em botões; e correção no isolamento de leitura com armazenamento individual per-user no dispositivo.',
    tags: ['Novo', 'Melhoria', 'Correção'],
    mudancas: [
      {
        tag: 'Novo',
        texto:
          'Disparo automático de notificação nativa (push web / toast) aos usuários quando uma nova atualização do aplicativo for publicada',
        detalhe:
          'O sistema agora verifica a versão do sistema automaticamente no boot e dispara push notification no navegador e toast in-app avisando os colaboradores sobre as novidades publicadas.',
      },
      {
        tag: 'Melhoria',
        texto:
          'Leitura inteligente ao visualizar: ao abrir a Central de Notificações no topo ou acessar a página de Tarefas e a aba de Atualizações, as notificações correspondentes já são consideradas lidas automaticamente, limpando o badge vermelho sem exigir que o usuário clique em "Marcar como lida"',
        detalhe:
          'Fluxo mais ágil e natural: basta abrir o popover do sino ou entrar nas telas de tarefas e novidades para que o contador de pendências seja zerado na hora.',
      },
      {
        tag: 'Correção',
        texto:
          'Varredura geral de ciclo de vida das notificações: sincronização de leitura com o localStorage per-user, evitando contaminação entre contas no mesmo dispositivo',
        detalhe:
          'Chaves de leitura no armazenamento local agora são estritamente isoladas por ID do usuário conectado, impedindo que acessos compartilhados no mesmo aparelho herdem o estado de leitura de outro colaborador.',
      },
    ],
    passosVisuais: [
      {
        passo: 1,
        titulo: 'Notificação Automática de Novas Atualizações',
        descricao:
          'Sempre que uma nova atualização for ao ar, você receberá instantaneamente uma notificação nativa e um aviso toast no rodapé da aplicação.',
        icone: 'Bell',
        ondeEncontrar: 'Ao carregar a plataforma ou após novas publicações',
        dica: 'O aviso traz o resumo das novidades para manter toda a equipe alinhada com as melhorias.',
      },
      {
        passo: 2,
        titulo: 'Leitura Inteligente ao Abrir a Central de Notificações',
        descricao:
          'Ao clicar no ícone de sino no cabeçalho superior, todas as notificações visíveis são marcadas como lidas na hora, limpando o badge vermelho imediatamente.',
        icone: 'MousePointerClick',
        ondeEncontrar: 'Cabeçalho Superior > Ícone de Sino (Central de Notificações)',
        dica: 'Você não precisa mais clicar em "Marcar todas como lidas" para apagar o indicador.',
      },
      {
        passo: 3,
        titulo: 'Marcação Automática em Tarefas e Atualizações',
        descricao:
          'Ao navegar até a tela de Tarefas ou a aba de Atualizações em Configurações, as notificações relacionadas são marcadas como visualizadas automaticamente.',
        icone: 'CheckSquare',
        ondeEncontrar: 'Menu Lateral > Tarefas e Configurações > Atualizações',
        dica: 'A sincronização em tempo real atualiza o sino no topo sem precisar recarregar a página.',
      },
      {
        passo: 4,
        titulo: 'Isolamento de Leitura por Conta de Usuário',
        descricao:
          'O histórico de itens lidos é armazenado de forma individualizada para cada conta de administrador ou encarregado no mesmo aparelho.',
        icone: 'Users',
        ondeEncontrar: 'Central de Notificações em ambientes multiusuário',
        dica: 'Cada profissional no canteiro mantém suas notificações intactas e personalizadas.',
      },
      {
        passo: 5,
        titulo: 'Exportação do Guia v1.8.2 em PDF',
        descricao:
          'Na aba de Atualizações, clique em "Exportar Passo a Passo" para gerar o documento formatado para impressão ou envio por PDF aos mestres e encarregados.',
        icone: 'Printer',
        ondeEncontrar: 'Configurações > Aba Atualizações > Versão v1.8.2 > Exportar',
        dica: 'Ideal para imprimir ou enviar via WhatsApp para a equipe de campo.',
      },
    ],
  },
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

