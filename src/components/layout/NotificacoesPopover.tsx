import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  ExternalLink,
  Settings,
  X,
  Calendar,
  AlertCircle,
  ChevronRight,
  User,
  Users,
  Sun,
  ShieldAlert,
} from 'lucide-react';
import { useErp, useData } from '@/data/store';
import { useAuth } from '@/data/auth';
import { useHoje } from '@/hooks';
import { ATUALIZACOES_SISTEMA, type ReleaseVersao } from '@/data/atualizacoes';
import { isTarefaRelevanteParaUsuario } from '@/lib/notifications';
import { toast } from '@/components/ui/Toast';
import { Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Tarefa } from '@/domain/types';

const STORAGE_KEY = 'construtec:notificacoes:lidas:v1';

function getStorageKey(usuarioId?: string) {
  return usuarioId ? `construtec:notificacoes:lidas:${usuarioId}:v1` : STORAGE_KEY;
}

function getNotificacoesLidas(usuarioId?: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const key = getStorageKey(usuarioId);
    let raw = localStorage.getItem(key);
    if (!raw && usuarioId) {
      raw = localStorage.getItem(STORAGE_KEY);
    }
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveNotificacoesLidas(set: Set<string>, usuarioId?: string) {
  if (typeof window === 'undefined') return;
  try {
    const list = Array.from(set);
    const json = JSON.stringify(list);
    if (usuarioId) {
      localStorage.setItem(getStorageKey(usuarioId), json);
    }
    localStorage.setItem(STORAGE_KEY, json);
  } catch {}
}

export function NotificacoesPopover() {
  const [aberto, setAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'tarefas' | 'sistema'>('tarefas');

  const data = useData();
  const mutate = useErp((s) => s.mutate);
  const usuarioAtual = useAuth((s) => s.usuarioAtual);
  const usuarioId = usuarioAtual?.id;

  const [notificacoesLidas, setNotificacoesLidas] = useState<Set<string>>(() =>
    getNotificacoesLidas(usuarioId),
  );

  const hoje = useHoje();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const containerRef = useRef<HTMLDivElement>(null);

  // Recarrega lista de lidas se o usuário conectado mudar
  useEffect(() => {
    setNotificacoesLidas(getNotificacoesLidas(usuarioId));
  }, [usuarioId]);

  // Fecha o popover automaticamente se houver navegação de rota
  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  // Fecha ao clicar fora ou pressionar ESC
  useEffect(() => {
    if (!aberto) return;
    const handleClickFora = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };

    document.addEventListener('pointerdown', handleClickFora);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handleClickFora);
      document.removeEventListener('keydown', handleKey);
    };
  }, [aberto]);

  // Tarefas relevantes para hoje ou atrasadas
  const tarefasPendentes = useMemo(() => {
    const lista = data?.tarefas || [];
    return lista.filter((t) => {
      if (t.concluida) return false;
      // Notificar tarefas de hoje ou pendentes que venceram antes
      if (t.data > hoje) return false;
      return isTarefaRelevanteParaUsuario(t, usuarioAtual);
    });
  }, [data?.tarefas, hoje, usuarioAtual]);

  const versaoRecente: ReleaseVersao | undefined = ATUALIZACOES_SISTEMA[0];

  // Identificadores não lidos
  const tarefasNaoLidas = useMemo(() => {
    return tarefasPendentes.filter((t) => !notificacoesLidas.has(`tarefa-${t.id}`));
  }, [tarefasPendentes, notificacoesLidas]);

  const versaoNaoLida = useMemo(() => {
    if (!versaoRecente) return false;
    return !notificacoesLidas.has(`versao-${versaoRecente.versao}`);
  }, [versaoRecente, notificacoesLidas]);

  const totalNaoLidas = tarefasNaoLidas.length + (versaoNaoLida ? 1 : 0);

  const marcarTodasComoLidas = () => {
    const novasLidas = new Set(notificacoesLidas);
    tarefasPendentes.forEach((t) => novasLidas.add(`tarefa-${t.id}`));
    if (versaoRecente) {
      novasLidas.add(`versao-${versaoRecente.versao}`);
    }
    setNotificacoesLidas(novasLidas);
    saveNotificacoesLidas(novasLidas, usuarioId);
    toast('Todas as notificações foram marcadas como lidas!', 'success');
  };

  const concluirTarefa = (t: Tarefa, e: React.MouseEvent) => {
    e.stopPropagation();
    mutate(
      (d) => {
        d.tarefas ??= [];
        const idx = d.tarefas.findIndex((tar) => tar.id === t.id);
        if (idx !== -1) {
          d.tarefas[idx] = {
            ...d.tarefas[idx],
            concluida: true,
            concluidaEm: new Date().toISOString(),
          };
        }
      },
      { acao: 'Tarefas', descricao: `Concluiu tarefa "${t.titulo}" via Notificações In-App` },
    );

    const novasLidas = new Set(notificacoesLidas);
    novasLidas.add(`tarefa-${t.id}`);
    setNotificacoesLidas(novasLidas);
    saveNotificacoesLidas(novasLidas, usuarioId);
    toast(`Tarefa "${t.titulo}" marcada como concluída!`, 'success');
  };

  const irParaTarefas = (t?: Tarefa) => {
    if (t) {
      const novasLidas = new Set(notificacoesLidas);
      novasLidas.add(`tarefa-${t.id}`);
      setNotificacoesLidas(novasLidas);
      saveNotificacoesLidas(novasLidas, usuarioId);
    }
    setAberto(false);
    navigate('/tarefas');
  };

  const irParaAtualizacoes = () => {
    if (versaoRecente) {
      const novasLidas = new Set(notificacoesLidas);
      novasLidas.add(`versao-${versaoRecente.versao}`);
      setNotificacoesLidas(novasLidas);
      saveNotificacoesLidas(novasLidas, usuarioId);
    }
    setAberto(false);
    navigate('/configuracoes', { state: { tab: 'atualizacoes' } });
  };

  const irParaConfigNotificacoes = () => {
    setAberto(false);
    navigate('/configuracoes', { state: { tab: 'notificacoes' } });
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Botão de Sino no Topbar */}
      <button
        type="button"
        onClick={() => setAberto((prev) => !prev)}
        aria-label="Central de Notificações"
        title={
          totalNaoLidas > 0
            ? `Central de Notificações: ${totalNaoLidas} aviso(s) não lido(s)`
            : 'Central de Notificações (em dia)'
        }
        className={cn(
          'relative inline-flex size-8 sm:size-9 items-center justify-center rounded-xl border border-line transition-all cursor-pointer shrink-0 select-none',
          aberto
            ? 'bg-brand/10 text-brand border-brand/40 shadow-xs ring-2 ring-brand/20'
            : 'bg-surface-2/70 text-fg hover:bg-surface-2 hover:border-brand/30 active:scale-95 shadow-xs',
        )}
      >
        <Bell className="size-4 sm:size-4.5" />

        {/* Badge vermelho de contagem */}
        {totalNaoLidas > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-75">
            {totalNaoLidas > 9 ? '9+' : totalNaoLidas}
          </span>
        )}
      </button>

      {/* Painel Popover Elegante */}
      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[390px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-line bg-surface/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Cabeçalho do Popover */}
          <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-surface-2/40">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Bell className="size-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-fg leading-tight">Notificações In-App</h3>
                <p className="text-[10px] text-muted">Lembretes e novidades da plataforma</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {totalNaoLidas > 0 && (
                <button
                  type="button"
                  onClick={marcarTodasComoLidas}
                  title="Marcar todas como lidas"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-brand hover:bg-brand/10 transition-colors cursor-pointer"
                >
                  <CheckCheck className="size-3.5" />
                  <span className="hidden sm:inline">Marcar lidas</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="rounded-lg p-1 text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                aria-label="Fechar painel"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Abas do Popover */}
          <div className="flex border-b border-line bg-surface px-3 pt-2 gap-1.5">
            <button
              type="button"
              onClick={() => setAbaAtiva('tarefas')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2 text-xs font-semibold transition-colors cursor-pointer',
                abaAtiva === 'tarefas'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted hover:text-fg',
              )}
            >
              <span>Lembretes & Tarefas</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px]',
                  abaAtiva === 'tarefas'
                    ? 'bg-brand/15 text-brand font-bold'
                    : 'bg-surface-2 text-muted',
                )}
              >
                {tarefasPendentes.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva('sistema')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2 text-xs font-semibold transition-colors cursor-pointer',
                abaAtiva === 'sistema'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted hover:text-fg',
              )}
            >
              <span>Atualizações</span>
              {versaoNaoLida && (
                <span className="size-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          </div>

          {/* Conteúdo das Abas */}
          <div className="max-h-[340px] overflow-y-auto p-3 space-y-2.5">
            {abaAtiva === 'tarefas' && (
              <>
                {tarefasPendentes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                    <CheckCircle2 className="size-10 text-emerald-500/40 mb-2" />
                    <p className="text-xs font-semibold text-fg">Tudo em dia!</p>
                    <p className="text-[11px] text-muted max-w-[220px] mt-0.5">
                      Você não possui tarefas pendentes ou lembretes agendados para hoje.
                    </p>
                  </div>
                ) : (
                  tarefasPendentes.map((t) => {
                    const atrasada = t.data < hoje;
                    const lida = notificacoesLidas.has(`tarefa-${t.id}`);

                    return (
                      <div
                        key={t.id}
                        onClick={() => irParaTarefas(t)}
                        className={cn(
                          'group relative flex items-start gap-2.5 rounded-xl border p-2.5 transition-all cursor-pointer hover:border-brand/40',
                          lida ? 'border-line bg-surface/60 opacity-80' : 'border-line/80 bg-surface shadow-xs',
                        )}
                      >
                        {/* Botão de Concluir Tarefa Rápido */}
                        <button
                          type="button"
                          onClick={(e) => concluirTarefa(t, e)}
                          title="Marcar como concluída"
                          className="mt-0.5 text-muted hover:text-emerald-500 transition-colors shrink-0 cursor-pointer"
                        >
                          <Circle className="size-4.5 text-muted group-hover:text-emerald-500 transition-colors" />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-fg truncate">
                              {t.titulo}
                            </span>
                            {atrasada && (
                              <Badge tone="red" className="text-[9px] py-0 px-1.5">
                                Atrasada
                              </Badge>
                            )}
                            {t.prioridade === 'alta' && (
                              <Badge tone="red" className="text-[9px] py-0 px-1.5">
                                Urgente
                              </Badge>
                            )}
                          </div>

                          {t.observacoes && (
                            <p className="text-[11px] text-muted line-clamp-1 mt-0.5">
                              {t.observacoes}
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-[10px] text-muted mt-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 font-medium">
                              {t.diaInteiro ? (
                                <>
                                  <Sun className="size-3 text-amber-500" />
                                  <span>08:00 (Dia todo)</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="size-3 text-brand" />
                                  <span>{t.horario || '08:00'}</span>
                                </>
                              )}
                            </span>

                            {t.destinatarioTipo === 'todos' ? (
                              <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                                <Users className="size-3" />
                                <span>Para todos</span>
                              </span>
                            ) : t.destinatarioNome || t.destinatarioTipo === 'eu' ? (
                              <span className="inline-flex items-center gap-1 text-fg truncate max-w-[120px]">
                                <User className="size-3 text-brand" />
                                <span className="truncate">{t.destinatarioNome || 'Apenas para mim'}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <ChevronRight className="size-4 text-muted/60 group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                      </div>
                    );
                  })
                )}
              </>
            )}

            {abaAtiva === 'sistema' && versaoRecente && (
              <div className="rounded-xl border border-line bg-surface p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-fg">
                    <Sparkles className="size-3.5 text-brand" />
                    <span>Versão {versaoRecente.versao}</span>
                  </span>
                  <Badge tone="green" className="text-[10px]">
                    Mais Recente
                  </Badge>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-fg leading-tight">
                    {versaoRecente.titulo}
                  </h4>
                  <p className="text-[10px] text-muted mt-0.5">
                    Publicada em {versaoRecente.dataPublicacao}
                  </p>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-line/60">
                  {versaoRecente.mudancas.slice(0, 3).map((m, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px] text-muted">
                      <span className="text-brand shrink-0 font-bold">•</span>
                      <span className="line-clamp-2 leading-relaxed">{m.texto}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={irParaAtualizacoes}
                  className="w-full mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand/10 hover:bg-brand/15 text-brand px-3 py-2 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>Ver Guia Completo & Passo a Passo</span>
                  <ExternalLink className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Rodapé do Popover com atalhos */}
          <div className="flex items-center justify-between border-t border-line bg-surface-2/50 px-3 py-2 text-[11px]">
            <button
              type="button"
              onClick={irParaConfigNotificacoes}
              className="inline-flex items-center gap-1 text-muted hover:text-fg transition-colors cursor-pointer"
            >
              <Settings className="size-3.5" />
              <span>Configurações</span>
            </button>

            <button
              type="button"
              onClick={() => irParaTarefas()}
              className="inline-flex items-center gap-1 font-semibold text-brand hover:underline cursor-pointer"
            >
              <span>Ver todas as tarefas</span>
              <ChevronRight className="size-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
