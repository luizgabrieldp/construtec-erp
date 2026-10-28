import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Users,
  KeyRound,
  Copy,
  Check,
  Bell,
  Smartphone,
  Globe,
  LogOut,
  CheckCircle2,
  ShieldCheck,
  HardHat,
  Sparkles,
} from 'lucide-react';
import { Badge, Button, Card, CardHeader, Field, Input, Select, PageHeader } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { ThemeSwitcher } from '@/components/layout/Switchers';
import { useAuth } from '@/data/auth';
import { useIsAdmin } from '@/hooks';
import { fmtDate } from '@/lib/format';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendNotification,
  testarNotificacaoSegundoPlano,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';
import type { Perfil } from '@/domain/types';

import { AtualizacoesTab } from '@/features/atualizacoes/AtualizacoesTab';

type TabConfig = 'atualizacoes' | 'perfil' | 'usuarios' | 'notificacoes';

export function ConfiguracoesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuarioAtual, usuarios, convites, atualizarPerfil, criarConvite, alternarStatusUsuario, logout } = useAuth();
  const isAdmin = useIsAdmin();

  const [abaAtiva, setAbaAtiva] = useState<TabConfig>('atualizacoes');

  // Suporte a redirecionamento direto para abas (ex: via popover de notificações)
  useEffect(() => {
    const stateTab = (location.state as { tab?: TabConfig })?.tab;
    if (stateTab) {
      setAbaAtiva(stateTab);
    }
  }, [location.state]);

  // Garante que o encarregado nunca caia na aba de usuários
  useEffect(() => {
    if (!isAdmin && abaAtiva === 'usuarios') {
      setAbaAtiva('atualizacoes');
    }
  }, [isAdmin, abaAtiva]);

  // Estados Meu Perfil
  const [nomePerfil, setNomePerfil] = useState(usuarioAtual?.nome || '');
  const [loginPerfil, setLoginPerfil] = useState(usuarioAtual?.emailOuLogin || '');
  const [novaSenha, setNovaSenha] = useState('');

  // Estados Gerador de Convite
  const [perfilConvite, setPerfilConvite] = useState<Perfil>('encarregado');
  const [ultimoConviteGerado, setUltimoConviteGerado] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);

  // Estados Notificações
  const [notifPermissao, setNotifPermissao] = useState(getNotificationPermission());

  const handleSalvarPerfil = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomePerfil.trim() || !loginPerfil.trim()) {
      toast('Nome e Login são obrigatórios.', 'error');
      return;
    }
    atualizarPerfil({
      nome: nomePerfil,
      emailOuLogin: loginPerfil,
      senha: novaSenha.trim() || undefined,
    });
    setNovaSenha('');
    toast('Perfil atualizado com sucesso!', 'success');
  };

  const handleLogout = () => {
    logout();
    toast('Sessão encerrada.');
    navigate('/login');
  };

  const handleGerarConvite = () => {
    const convite = criarConvite(perfilConvite);
    const linkCompleto = `${window.location.origin}/cadastro?convite=${convite.codigo}`;
    setUltimoConviteGerado(linkCompleto);
    setLinkCopiado(false);
    toast(`Convite para ${perfilConvite === 'admin' ? 'Administrador' : 'Encarregado'} gerado!`, 'success');
  };

  const handleCopiarLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setLinkCopiado(true);
    toast('Link copiado para a área de transferência!', 'success');
    setTimeout(() => setLinkCopiado(false), 2500);
  };

  const handlePedirNotificacao = async () => {
    const p = await requestNotificationPermission();
    setNotifPermissao(p);
    if (p === 'granted') {
      toast('Permissão de notificações concedida!', 'success');
    } else {
      toast('Permissão de notificações recusada ou bloqueada no navegador.', 'error');
    }
  };

  const handleTestarNotificacao = () => {
    sendNotification('CONSTRUTEC ERP - Notificação de Teste', {
      body: 'O serviço de alertas e lembretes de canteiro está operando normalmente!',
    });
    toast('Notificação de teste disparada!', 'success');
  };

  const handleTestarSegundoPlano = async () => {
    let p = notifPermissao;
    if (p !== 'granted') {
      p = await requestNotificationPermission();
      setNotifPermissao(p);
      if (p !== 'granted') {
        toast('Permissão de notificações necessária para testar o recebimento.', 'error');
        return;
      }
    }
    await testarNotificacaoSegundoPlano(3000);
  };

  return (
    <>
      <PageHeader
        title="Configurações do Sistema"
        subtitle="Meu perfil, credenciais de acesso e notificações do canteiro"
        actions={
          <Button variant="ghost" className="text-red-500 hover:bg-red-500/10" icon={<LogOut className="size-4" />} onClick={handleLogout}>
            Sair da Conta
          </Button>
        }
      />

      {/* Navegação entre Abas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3 mb-6">
        <button
          type="button"
          onClick={() => setAbaAtiva('atualizacoes')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer',
            abaAtiva === 'atualizacoes'
              ? 'bg-brand text-white shadow-sm shadow-brand/20'
              : 'bg-surface-2 text-muted hover:text-fg'
          )}
        >
          <Sparkles className="size-4" />
          <span>Atualizações</span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('perfil')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer',
            abaAtiva === 'perfil'
              ? 'bg-brand text-white shadow-sm shadow-brand/20'
              : 'bg-surface-2 text-muted hover:text-fg'
          )}
        >
          <User className="size-4" />
          <span>Meu Perfil</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setAbaAtiva('usuarios')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer',
              abaAtiva === 'usuarios'
                ? 'bg-brand text-white shadow-sm shadow-brand/20'
                : 'bg-surface-2 text-muted hover:text-fg'
            )}
          >
            <Users className="size-4" />
            <span>Gestão de Usuários & Convites</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setAbaAtiva('notificacoes')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer',
            abaAtiva === 'notificacoes'
              ? 'bg-brand text-white shadow-sm shadow-brand/20'
              : 'bg-surface-2 text-muted hover:text-fg'
          )}
        >
          <Bell className="size-4" />
          <span>Notificações & PWA</span>
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}

      {/* ABA 0: ATUALIZAÇÕES DO SISTEMA */}
      {abaAtiva === 'atualizacoes' && <AtualizacoesTab />}

      {/* ABA 1: MEU PERFIL */}
      {abaAtiva === 'perfil' && (
        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader
              title="Informações da Minha Conta"
              subtitle="Gerencie seus dados de acesso e credenciais"
              action={
                <Badge tone={isAdmin ? 'orange' : 'amber'}>
                  {isAdmin ? 'Administrador' : 'Encarregado da Obra'}
                </Badge>
              }
            />

            <form onSubmit={handleSalvarPerfil} className="p-5 space-y-4">
              <div className="rounded-xl border border-line bg-surface-2 p-3.5 text-xs text-muted space-y-1">
                <div className="font-semibold text-fg flex items-center gap-1.5">
                  {isAdmin ? <ShieldCheck className="size-4 text-brand" /> : <HardHat className="size-4 text-amber-500" />}
                  <span>Nível de Acesso: {isAdmin ? 'Administrador' : 'Encarregado da Obra'}</span>
                </div>
                <p className="leading-relaxed">
                  {isAdmin
                    ? 'Você possui permissões administrativas completas, podendo gerenciar usuários, emitir convites e acompanhar a folha de pagamento.'
                    : 'Sua conta possui acesso operacional ao canteiro de obras (apontamento de presenças, tarefas e obras). A gestão de usuários e acesso financeiro são restritos ao Administrador.'}
                </p>
              </div>

              <Field label="Nome Completo">
                <Input
                  required
                  value={nomePerfil}
                  onChange={(e) => setNomePerfil(e.target.value)}
                  placeholder="Seu nome"
                />
              </Field>

              <Field label="Login ou E-mail">
                <Input
                  required
                  value={loginPerfil}
                  onChange={(e) => setLoginPerfil(e.target.value)}
                  placeholder="login ou email"
                />
              </Field>

              <Field label="Nova Senha (deixe em branco para manter a atual)">
                <Input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Nova senha (opcional)"
                />
              </Field>

              <div className="pt-2 flex items-center justify-between">
                <Button variant="danger" icon={<LogOut className="size-4" />} onClick={handleLogout}>
                  Sair do Sistema
                </Button>
                <Button type="submit">Salvar Alterações</Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader title="Aparência do Painel" subtitle="Defina o tema da interface para este dispositivo" />
            <div className="flex items-center justify-between p-5">
              <span className="text-sm font-medium text-fg">Modo de Exibição</span>
              <ThemeSwitcher />
            </div>
          </Card>
        </div>
      )}

      {/* ABA 2: GESTÃO DE USUÁRIOS & CONVITES (ADMIN EXCLUSIVO) */}
      {isAdmin && abaAtiva === 'usuarios' && (
        <div className="space-y-6">
          {/* Gerador de Convite */}
          <Card>
            <CardHeader
              title="Gerador de Links de Convite"
              subtitle="Gere links com papéis pré-definidos para convidar encarregados ou outros administradores"
              action={<KeyRound className="size-5 text-brand" />}
            />
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-2">
                  <Field label="Perfil do Convidado">
                    <Select
                      value={perfilConvite}
                      onChange={(e) => setPerfilConvite(e.target.value as Perfil)}
                    >
                      <option value="encarregado">Encarregado da Obra (Acesso operacional)</option>
                      <option value="admin">Administrador (Acesso total)</option>
                    </Select>
                  </Field>
                </div>
                <Button icon={<KeyRound className="size-4" />} onClick={handleGerarConvite}>
                  Gerar Link de Convite
                </Button>
              </div>

              {ultimoConviteGerado && (
                <div className="rounded-2xl border border-brand/30 bg-brand/5 p-4 space-y-2 animate-in fade-in">
                  <span className="text-xs font-semibold text-brand">Link de Convite Gerado:</span>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={ultimoConviteGerado} className="text-xs font-mono bg-surface" />
                    <Button
                      variant={linkCopiado ? 'primary' : 'secondary'}
                      icon={linkCopiado ? <Check className="size-4" /> : <Copy className="size-4" />}
                      onClick={() => handleCopiarLink(ultimoConviteGerado)}
                    >
                      {linkCopiado ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted">
                    Envie este link via WhatsApp para o novo colaborador se cadastrar. O papel já estará fixado.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Listagem de Convites */}
          <Card>
            <CardHeader
              title="Histórico de Convites de Acesso"
              subtitle="Convites disponíveis e utilizados"
              action={
                <span className="text-xs text-muted font-medium">
                  {convites.filter((c) => !c.usado).length} disponíveis / {convites.length} total
                </span>
              }
            />
            <div className="divide-y divide-line max-h-72 overflow-y-auto">
              {convites.map((c) => {
                const link = `${window.location.origin}/cadastro?convite=${c.codigo}`;
                return (
                  <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-fg bg-surface-2 px-2.5 py-1 rounded-lg border border-line">
                        {c.codigo}
                      </span>
                      <Badge tone={c.perfil === 'admin' ? 'orange' : 'amber'}>
                        {c.perfil === 'admin' ? 'Administrador' : 'Encarregado'}
                      </Badge>
                      <span className="text-muted text-[11px]">
                        Criado em {fmtDate(c.criadoEm.slice(0, 10))}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.usado ? (
                        <Badge tone="neutral" className="gap-1">
                          <CheckCircle2 className="size-3 text-emerald-500" />
                          <span>Utilizado por {c.usadoPor || 'Usuário'}</span>
                        </Badge>
                      ) : (
                        <>
                          <Badge tone="green">Disponível</Badge>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Copy className="size-3" />}
                            onClick={() => handleCopiarLink(link)}
                          >
                            Copiar Link
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {!convites.length && (
                <div className="p-8 text-center text-xs text-muted">Nenhum convite gerado até o momento.</div>
              )}
            </div>
          </Card>

          {/* Listagem de Usuários */}
          <Card>
            <CardHeader
              title="Usuários Cadastrados"
              subtitle="Colaboradores com acesso ativo ao sistema"
              action={<Badge tone="blue">{usuarios.length} usuários</Badge>}
            />
            <div className="divide-y divide-line max-h-80 overflow-y-auto">
              {usuarios.map((u) => {
                const isProprio = u.id === usuarioAtual?.id;
                return (
                  <div key={u.id} className="flex items-center justify-between p-4 gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-fg truncate">{u.nome}</span>
                        {isProprio && (
                          <span className="rounded-md bg-brand/10 text-brand px-1.5 py-0.5 text-[10px] font-bold">
                            Você
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted mt-0.5">
                        Login: <span className="font-mono text-fg">{u.emailOuLogin}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge tone={u.perfil === 'admin' ? 'orange' : 'amber'}>
                        {u.perfil === 'admin' ? 'Administrador' : 'Encarregado'}
                      </Badge>

                      <Badge tone={u.ativo ? 'green' : 'red'}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>

                      {!isProprio && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            alternarStatusUsuario(u.id);
                            toast(`Status de ${u.nome} alterado.`);
                          }}
                        >
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ABA 3: NOTIFICAÇÕES & PWA */}
      {abaAtiva === 'notificacoes' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status e Controles de Notificação */}
          <Card>
            <CardHeader
              title="Permissões de Notificações"
              subtitle="Permita que o navegador envie avisos de tarefas e lembretes da obra"
              action={<Bell className="size-5 text-brand" />}
            />
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 p-3.5">
                <div>
                  <div className="text-xs font-semibold text-fg">Status no Navegador:</div>
                  <div className="text-[11px] text-muted">
                    {notifPermissao === 'granted'
                      ? 'Notificações habilitadas e ativas'
                      : notifPermissao === 'denied'
                      ? 'Notificações bloqueadas pelo navegador'
                      : notifPermissao === 'unsupported'
                      ? 'Navegador não possui suporte nativo'
                      : 'Permissão pendente de autorização'}
                  </div>
                </div>

                <Badge
                  tone={
                    notifPermissao === 'granted'
                      ? 'green'
                      : notifPermissao === 'denied'
                      ? 'red'
                      : 'amber'
                  }
                >
                  {notifPermissao === 'granted'
                    ? 'Concedida'
                    : notifPermissao === 'denied'
                    ? 'Bloqueada'
                    : notifPermissao === 'unsupported'
                    ? 'Indisponível'
                    : 'Pendente'}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {notifPermissao !== 'granted' && (
                  <Button icon={<Bell className="size-4" />} onClick={handlePedirNotificacao}>
                    Solicitar Permissão
                  </Button>
                )}
                <Button variant="secondary" icon={<CheckCircle2 className="size-4" />} onClick={handleTestarNotificacao}>
                  Disparar Notificação de Teste
                </Button>
              </div>

              <div className="rounded-xl border border-line bg-surface-2/40 p-3 text-xs text-muted">
                <p className="font-medium text-fg">Como o CONSTRUTEC entrega seus alertas:</p>
                <p className="mt-1">
                  O verificador de tarefas roda em segundo plano emitindo alertas sonoros e notificações de tarefas agendadas e lembretes no horário programado.
                </p>
              </div>
            </div>
          </Card>

          {/* Card Explicativo: Notificações no Celular e Segundo Plano (iOS & Android) */}
          <Card className="lg:col-span-2 border-brand/30 bg-surface">
            <CardHeader
              title="Notificações no Celular e Segundo Plano (iOS & Android)"
              subtitle="Instruções para receber alertas nativos e lembretes com a tela bloqueada ou app em segundo plano"
              action={<Bell className="size-5 text-brand" />}
            />
            <div className="p-5 space-y-4 text-xs">
              <div className="grid gap-4 md:grid-cols-2">
                {/* iPhone / iOS */}
                <div className="rounded-xl border border-line bg-surface-2/60 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-fg">
                      <Smartphone className="size-4 text-brand" />
                      <span>No iPhone e iPad (Apple iOS)</span>
                    </div>
                    <Badge tone="amber" className="text-[10px]">Requisito Apple</Badge>
                  </div>
                  <p className="text-muted leading-relaxed">
                    A Apple exige que o aplicativo seja <strong>adicionado à Tela de Início (PWA)</strong> para receber notificações com a tela bloqueada ou app em segundo plano.
                  </p>
                  <div className="rounded-lg bg-surface border border-line p-2.5 text-[11px] text-muted space-y-1">
                    <p className="font-semibold text-fg">Como habilitar no iOS:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Abra o CONSTRUTEC no <strong>Safari</strong> (requer iOS 16.4 ou superior).</li>
                      <li>Toque no botão <strong>Compartilhar</strong> (quadrado com seta para cima).</li>
                      <li>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
                      <li>Abra o aplicativo pelo ícone criado na tela inicial e autorize as notificações.</li>
                    </ol>
                  </div>
                </div>

                {/* Android / Chrome */}
                <div className="rounded-xl border border-line bg-surface-2/60 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-fg">
                      <Smartphone className="size-4 text-emerald-500" />
                      <span>No Android (Google Chrome & Edge)</span>
                    </div>
                    <Badge tone="green" className="text-[10px]">Suporte Nativo</Badge>
                  </div>
                  <p className="text-muted leading-relaxed">
                    No Android, o sistema entrega notificações em segundo plano através do Service Worker, tanto no navegador quanto no aplicativo instalado.
                  </p>
                  <div className="rounded-lg bg-surface border border-line p-2.5 text-[11px] text-muted space-y-1">
                    <p className="font-semibold text-fg">Como habilitar no Android:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Clique em <strong>"Solicitar Permissão"</strong> acima e autorize os avisos.</li>
                      <li>Para melhor estabilidade, toque nos 3 pontos e escolha <strong>"Instalar aplicativo"</strong>.</li>
                      <li>Garanta que as notificações do navegador não estejam em modo de economia restrita de bateria.</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Botão Testar Notificação Agora */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand/5 p-4">
                <div className="space-y-0.5">
                  <div className="font-semibold text-fg flex items-center gap-1.5">
                    <Sparkles className="size-4 text-brand" />
                    <span>Testar Notificação em Segundo Plano</span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Clique no botão para agendar um alerta em 3 segundos. Em seguida, bloqueie a tela do celular ou alterne para outro aplicativo para ver o alerta chegar.
                  </p>
                </div>

                <Button
                  onClick={handleTestarSegundoPlano}
                  icon={<Bell className="size-4" />}
                  className="w-full sm:w-auto shrink-0"
                >
                  Testar Notificação Agora
                </Button>
              </div>
            </div>
          </Card>

          {/* Guia de Instalação PWA */}
          <Card className="lg:col-span-2">
            <CardHeader
              title="Instalação como Aplicativo (PWA)"
              subtitle="Instale o CONSTRUTEC direto na tela inicial do celular ou no desktop sem precisar de loja"
              action={<Smartphone className="size-5 text-sky-500" />}
            />
            <div className="p-5 space-y-4 text-xs">
              <div className="rounded-xl border border-line p-3.5 space-y-1.5">
                <div className="font-semibold text-fg flex items-center gap-1.5">
                  <Smartphone className="size-4 text-brand" />
                  <span>No Celular (Android / Chrome):</span>
                </div>
                <ol className="list-decimal list-inside text-muted space-y-1">
                  <li>Abra o link do sistema no Google Chrome.</li>
                  <li>Toque no menu de 3 pontos no canto superior direito.</li>
                  <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                </ol>
              </div>

              <div className="rounded-xl border border-line p-3.5 space-y-1.5">
                <div className="font-semibold text-fg flex items-center gap-1.5">
                  <Smartphone className="size-4 text-brand" />
                  <span>No iPhone / iPad (iOS Safari):</span>
                </div>
                <ol className="list-decimal list-inside text-muted space-y-1">
                  <li>Abra o link do sistema no Safari.</li>
                  <li>Toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima).</li>
                  <li>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
                </ol>
              </div>

              <div className="rounded-xl border border-line p-3.5 space-y-1.5">
                <div className="font-semibold text-fg flex items-center gap-1.5">
                  <Globe className="size-4 text-brand" />
                  <span>No Computador (Chrome / Edge / Mac / Windows):</span>
                </div>
                <ol className="list-decimal list-inside text-muted space-y-1">
                  <li>Clique no ícone de monitor/instalar na barra de endereço do navegador.</li>
                  <li>Clique em <strong>"Instalar"</strong> para abrir como janela independente.</li>
                </ol>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
