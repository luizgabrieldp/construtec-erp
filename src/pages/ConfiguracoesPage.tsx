import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Database,
  History,
  RotateCcw,
  Trash2,
  Wallet,
  FileText,
  ExternalLink,
  User,
  ShieldCheck,
  HardHat,
  Users,
  KeyRound,
  Copy,
  Check,
  Bell,
  Smartphone,
  Globe,
  LogOut,
  Terminal,
  Cloud,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Badge, Button, Card, CardHeader, Field, Input, Select, PageHeader } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toast';
import { ThemeSwitcher } from '@/components/layout/Switchers';
import { useErp, useData } from '@/data/store';
import { useAuth } from '@/data/auth';
import { useUi } from '@/data/ui';
import { fmtBRL, fmtDate } from '@/lib/format';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendNotification,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';
import type { Perfil } from '@/domain/types';

function usoStorage() {
  let bytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    bytes += (k.length + (localStorage.getItem(k)?.length ?? 0)) * 2;
  }
  return bytes;
}

type TabConfig = 'perfil' | 'usuarios' | 'notificacoes' | 'deploy' | 'sistema';

export function ConfiguracoesPage() {
  const navigate = useNavigate();
  const data = useData();
  const { restaurarDemo, zerarSistema, atualizarConfig } = useErp();
  const { usuarioAtual, usuarios, convites, atualizarPerfil, criarConvite, alternarStatusUsuario, logout } = useAuth();
  const perfilUi = useUi((s) => s.perfil);

  const [abaAtiva, setAbaAtiva] = useState<TabConfig>('perfil');

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

  // Estados Caixa e Limpeza
  const [confirmar, setConfirmar] = useState<null | 'demo' | 'zerar'>(null);
  const [saldo, setSaldo] = useState(String(data.config.saldoInicial));
  const [dataSaldo, setDataSaldo] = useState(data.config.dataSaldoInicial);
  const kb = usoStorage() / 1024;

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

  const executarAcaoSistema = () => {
    if (confirmar === 'demo') {
      restaurarDemo();
      toast('Dados de demonstração restaurados', 'success');
    } else if (confirmar === 'zerar') {
      zerarSistema();
      toast('Sistema zerado', 'success');
    }
    setConfirmar(null);
  };

  return (
    <>
      <PageHeader
        title="Configurações do Sistema"
        subtitle="Meu perfil, gestão de acessos, notificações do canteiro e publicação"
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

        {usuarioAtual?.perfil === 'admin' && (
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

        <button
          type="button"
          onClick={() => setAbaAtiva('deploy')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer',
            abaAtiva === 'deploy'
              ? 'bg-brand text-white shadow-sm shadow-brand/20'
              : 'bg-surface-2 text-muted hover:text-fg'
          )}
        >
          <Globe className="size-4" />
          <span>Deploy Vercel & Firebase</span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('sistema')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer',
            abaAtiva === 'sistema'
              ? 'bg-brand text-white shadow-sm shadow-brand/20'
              : 'bg-surface-2 text-muted hover:text-fg'
          )}
        >
          <Database className="size-4" />
          <span>Caixa & Manutenção</span>
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}

      {/* ABA 1: MEU PERFIL */}
      {abaAtiva === 'perfil' && (
        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader
              title="Informações da Minha Conta"
              subtitle="Gerencie seus dados de acesso e credenciais"
              action={
                <Badge tone={usuarioAtual?.perfil === 'admin' ? 'orange' : 'amber'}>
                  {usuarioAtual?.perfil === 'admin' ? 'Administrador' : 'Encarregado'}
                </Badge>
              }
            />

            <form onSubmit={handleSalvarPerfil} className="p-5 space-y-4">
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
            <CardHeader title="Aparência do Painel" subtitle="Defina o tema da interface para este navegador" />
            <div className="flex items-center justify-between p-5">
              <span className="text-sm font-medium text-fg">Modo de Exibição</span>
              <ThemeSwitcher />
            </div>
          </Card>
        </div>
      )}

      {/* ABA 2: GESTÃO DE USUÁRIOS & CONVITES (ADMIN EXCLUSIVO) */}
      {abaAtiva === 'usuarios' && (
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
                          <span className="rounded-md bg-brand/10 text-brand px-1.5 py-0.2 text-[10px] font-bold">
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
                O verificador de tarefas roda a cada 60 segundos em background avisando sobre tarefas agendadas para o dia e horários de lembrete.
              </div>
            </div>
          </Card>

          {/* Guia de Instalação PWA */}
          <Card>
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

      {/* ABA 4: DEPLOY VERCEL & FIREBASE */}
      {abaAtiva === 'deploy' && (
        <div className="space-y-6">
          {/* Card Principal de Upload Automático via GitHub */}
          <Card className="border-brand/40 bg-brand/5">
            <CardHeader
              title="Upload Automático Contínuo via GitHub (CI/CD)"
              subtitle="Sempre que você atualizar o projeto, basta 1 comando para enviar as modificações para o ar na Vercel e Firebase"
              action={<Globe className="size-5 text-brand" />}
            />
            <div className="p-5 space-y-4 text-xs">
              <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-fg">
                  <Terminal className="size-4 text-brand" />
                  <span>Comando único de upload rápido:</span>
                </div>
                <pre className="rounded-xl bg-surface-2 p-3 font-mono text-xs text-brand font-bold overflow-x-auto border border-line">
npm run upload
                </pre>
                <p className="text-muted leading-relaxed">
                  Esse comando adiciona todos os arquivos alterados, cria o commit automaticamente com data/hora e envia direto para o GitHub (<code className="font-mono text-fg">git push</code>).
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
                  <h4 className="font-semibold text-fg flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span>Como conectar ao seu GitHub (apenas na 1ª vez):</span>
                  </h4>
                  <ol className="list-decimal list-inside text-muted space-y-1.5">
                    <li>Crie um repositório vazio no GitHub (<a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-brand underline font-semibold">github.com/new</a>).</li>
                    <li>No terminal do projeto, vincule o repositório:
                      <pre className="mt-1 rounded bg-surface-2 p-2 font-mono text-[11px] text-fg overflow-x-auto">
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
npm run upload
                      </pre>
                    </li>
                  </ol>
                </div>

                <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
                  <h4 className="font-semibold text-fg flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span>Como o deploy acontece automaticamente:</span>
                  </h4>
                  <ul className="list-disc list-inside text-muted space-y-1.5">
                    <li><strong>Na Vercel:</strong> Importe o repositório do GitHub em <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-brand underline font-semibold">vercel.com/new</a>. Cada <code className="font-mono text-fg">npm run upload</code> atualizará o site online em menos de 1 minuto!</li>
                    <li><strong>No Firebase:</strong> O workflow do GitHub Actions em <code className="font-mono text-fg">.github/workflows/deploy.yml</code> já está pronto e compila o projeto em cada push.</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Vercel */}
            <Card>
              <CardHeader
                title="Publicação no Vercel (Manual via CLI)"
                subtitle="Hospedagem rápida e contínua com SSL automático"
                action={<Terminal className="size-5 text-fg" />}
              />
            <div className="p-5 space-y-4 text-xs">
              <p className="text-muted">
                O arquivo <code className="bg-surface-2 px-1.5 py-0.5 rounded text-fg font-mono">vercel.json</code> já está criado na raiz do projeto com as regras de SPA rewrite prontas.
              </p>

              <div className="space-y-2">
                <span className="font-semibold text-fg">Comandos para Deploy via Terminal:</span>
                <pre className="rounded-xl bg-surface-2 p-3 font-mono text-[11px] text-fg overflow-x-auto border border-line">
{`# 1. Instalar o CLI da Vercel (se ainda não tiver)
npm i -g vercel

# 2. Gerar o build de produção
npm run build

# 3. Publicar em produção
vercel --prod`}
                </pre>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                <strong>Dica:</strong> Se o seu código estiver no GitHub, basta conectar o repositório no dashboard da <a href="https://vercel.com" target="_blank" rel="noreferrer" className="underline font-semibold">vercel.com</a> para deploy automático a cada commit.
              </div>
            </div>
          </Card>

          {/* Firebase Hosting */}
          <Card>
            <CardHeader
              title="Publicação no Firebase Hosting"
              subtitle="Infraestrutura global do Google com CDN de alta velocidade"
              action={<Cloud className="size-5 text-amber-500" />}
            />
            <div className="p-5 space-y-4 text-xs">
              <p className="text-muted">
                Os arquivos <code className="bg-surface-2 px-1.5 py-0.5 rounded text-fg font-mono">firebase.json</code> e <code className="bg-surface-2 px-1.5 py-0.5 rounded text-fg font-mono">.firebaserc</code> já estão configurados apontando para a pasta <code className="bg-surface-2 px-1.5 py-0.5 rounded text-fg font-mono">dist</code>.
              </p>

              <div className="space-y-2">
                <span className="font-semibold text-fg">Comandos para Deploy via Terminal:</span>
                <pre className="rounded-xl bg-surface-2 p-3 font-mono text-[11px] text-fg overflow-x-auto border border-line">
{`# 1. Instalar o Firebase Tools
npm i -g firebase-tools

# 2. Realizar login na sua conta Google
firebase login

# 3. Gerar o build de produção
npm run build

# 4. Publicar no Hosting
firebase deploy --only hosting`}
                </pre>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
                <strong>Dica:</strong> No painel do Firebase Console, você pode conectar seu próprio domínio (.com.br) gratuitamente com certificado SSL emitido pelo Google.
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ABA 5: CAIXA & MANUTENÇÃO */}
      {abaAtiva === 'sistema' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Caixa Geral" subtitle="Saldo de partida da conta única da empresa" action={<Wallet className="size-5 text-brand" />} />
            <form
              className="grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                atualizarConfig({ saldoInicial: Number(saldo.replace(',', '.')) || 0, dataSaldoInicial: dataSaldo });
                toast('Saldo inicial atualizado', 'success');
              }}
            >
              <Field label="Saldo inicial (R$)">
                <Input inputMode="decimal" value={saldo} onChange={(e) => setSaldo(e.target.value)} />
              </Field>
              <Field label="Data do saldo">
                <Input type="date" value={dataSaldo} onChange={(e) => setDataSaldo(e.target.value)} />
              </Field>
              <Button type="submit">Salvar</Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Dados do sistema" subtitle="Armazenados neste navegador (localStorage)" action={<Database className="size-5 text-muted" />} />
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                {[
                  ['Obras', data.obras.length],
                  ['Compras', data.compras.length],
                  ['Contas', data.contasPagar.length + data.contasReceber.length],
                  ['Funcionários', data.funcionarios.length],
                  ['Locações', data.locacoes.length],
                  ['Tarefas', data.tarefas.length],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-surface-2 p-3">
                    <div className="text-lg font-bold text-fg">{v}</div>
                    <div className="text-muted">{l}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted">
                Espaço usado: <span className="font-semibold text-fg">{kb.toFixed(0)} KB</span> de ~5.000 KB
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" icon={<RotateCcw className="size-4" />} onClick={() => setConfirmar('demo')}>
                  Restaurar demonstração
                </Button>
                <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirmar('zerar')}>
                  Zerar sistema
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Auditoria" subtitle="Últimas ações registradas" action={<History className="size-5 text-muted" />} />
            <ul className="max-h-80 divide-y divide-line overflow-y-auto px-5 pb-3">
              {data.audit.slice(0, 50).map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-3 text-sm">
                  <Badge tone={a.perfil === 'admin' ? 'orange' : 'amber'}>{a.perfil === 'admin' ? 'Admin' : 'Encarregado'}</Badge>
                  <div className="min-w-0 flex-1">
                    <div className="text-fg">{a.descricao}</div>
                    <div className="text-xs text-muted">
                      {a.acao} · {fmtDate(a.ts.slice(0, 10))} {a.ts.slice(11, 16)}
                    </div>
                  </div>
                </li>
              ))}
              {!data.audit.length && <li className="py-6 text-center text-sm text-muted">Nenhuma ação registrada.</li>}
            </ul>
          </Card>

          {/* Dossiê Técnico para Desenvolvedores */}
          <Card>
            <CardHeader
              title="Dossiê Técnico & Especificação"
              subtitle="Documento completo de engenharia e funcionalidades"
              action={<FileText className="size-5 text-brand" />}
            />
            <div className="p-5 flex flex-col justify-between gap-4">
              <p className="text-xs text-muted">
                Contém a descrição técnica dos módulos, regras de negócio e guia de backend formatado para impressão ou exportação em PDF.
              </p>
              <Link to="/relatorio-tecnico" target="_blank" rel="noreferrer">
                <Button variant="secondary" icon={<ExternalLink className="size-4 text-brand" />} className="w-full">
                  Abrir Dossiê / Salvar PDF
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      )}

      <Dialog
        open={confirmar !== null}
        onClose={() => setConfirmar(null)}
        title={confirmar === 'zerar' ? 'Zerar todo o sistema?' : 'Restaurar dados de demonstração?'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmar(null)}>
              Cancelar
            </Button>
            <Button variant={confirmar === 'zerar' ? 'danger' : 'primary'} onClick={executarAcaoSistema}>
              {confirmar === 'zerar' ? 'Sim, zerar tudo' : 'Sim, restaurar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {confirmar === 'zerar'
            ? 'Todas as obras, compras, contas, funcionários e lançamentos serão apagados permanentemente deste navegador. Esta ação não pode ser desfeita.'
            : `Todos os dados atuais serão substituídos pelo cenário de demonstração da CONSTRUTEC (3 obras, ~3 meses de histórico). Saldo inicial padrão: ${fmtBRL(85000)}.`}
        </p>
      </Dialog>
    </>
  );
}
