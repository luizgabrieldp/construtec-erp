import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Repeat, AlertCircle, Building2, User, Users } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select, Badge } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import { useAuth, USUARIOS_PADRAO } from '@/data/auth';
import type { Tarefa, RecorrenciaTarefa, PrioridadeTarefa } from '@/domain/types';
import { LABEL_RECORRENCIA_TAREFA, LABEL_PRIORIDADE_TAREFA } from '@/domain/labels';
import { today } from '@/lib/dates';
import { uid } from '@/lib/utils';

interface TarefaFormDialogProps {
  open: boolean;
  onClose: () => void;
  tarefaParaEditar?: Tarefa | null;
  dataPadrao?: string;
}

export function TarefaFormDialog({
  open,
  onClose,
  tarefaParaEditar,
  dataPadrao,
}: TarefaFormDialogProps) {
  const data = useData();
  const mutate = useErp((s) => s.mutate);

  const usuarioAtual = useAuth((s) => s.usuarioAtual);
  const usuarios = useAuth((s) => s.usuarios);

  const usuariosDisponiveis = useMemo(() => {
    const list = usuarios && usuarios.length > 0 ? usuarios : USUARIOS_PADRAO;
    const ativos = list.filter((u) => u.ativo);
    if (
      tarefaParaEditar?.destinatarioId &&
      !ativos.some((u) => u.id === tarefaParaEditar.destinatarioId)
    ) {
      const uInativo = list.find((u) => u.id === tarefaParaEditar.destinatarioId);
      if (uInativo) {
        ativos.push(uInativo);
      }
    }
    return ativos;
  }, [usuarios, tarefaParaEditar?.destinatarioId]);

  const [titulo, setTitulo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [dataTarefa, setDataTarefa] = useState(dataPadrao || today());
  const [diaInteiro, setDiaInteiro] = useState(true);
  const [horario, setHorario] = useState('08:00');
  const [recorrencia, setRecorrencia] = useState<RecorrenciaTarefa>('nenhuma');
  const [prioridade, setPrioridade] = useState<PrioridadeTarefa>('media');
  const [obraId, setObraId] = useState('');
  const [destinatarioTipo, setDestinatarioTipo] = useState<'eu' | 'todos' | 'usuario'>('eu');
  const [destinatarioId, setDestinatarioId] = useState('');

  useEffect(() => {
    if (tarefaParaEditar) {
      setTitulo(tarefaParaEditar.titulo);
      setObservacoes(tarefaParaEditar.observacoes || '');
      setDataTarefa(tarefaParaEditar.data);
      setDiaInteiro(tarefaParaEditar.diaInteiro);
      setHorario(tarefaParaEditar.horario || '08:00');
      setRecorrencia(tarefaParaEditar.recorrencia || 'nenhuma');
      setPrioridade(tarefaParaEditar.prioridade || 'media');
      setObraId(tarefaParaEditar.obraId || '');
      setDestinatarioTipo(tarefaParaEditar.destinatarioTipo || 'eu');
      setDestinatarioId(tarefaParaEditar.destinatarioId || '');
    } else {
      setTitulo('');
      setObservacoes('');
      setDataTarefa(dataPadrao || today());
      setDiaInteiro(true);
      setHorario('08:00');
      setRecorrencia('nenhuma');
      setPrioridade('media');
      setObraId('');
      setDestinatarioTipo('eu');
      setDestinatarioId(usuarioAtual?.id || '');
    }
  }, [tarefaParaEditar, open, dataPadrao, usuarioAtual?.id]);

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast('Informe um título para a tarefa.', 'error');
      return;
    }

    if (destinatarioTipo === 'usuario' && !destinatarioId) {
      toast('Selecione o usuário destinatário da tarefa.', 'error');
      return;
    }

    const agora = new Date().toISOString();

    let finalDestinatarioId: string | undefined = undefined;
    let finalDestinatarioNome: string | undefined = undefined;

    if (destinatarioTipo === 'eu') {
      finalDestinatarioId = usuarioAtual?.id || 'usr-admin';
      finalDestinatarioNome = usuarioAtual?.nome || 'Eu mesmo';
    } else if (destinatarioTipo === 'todos') {
      finalDestinatarioId = undefined;
      finalDestinatarioNome = 'Todos os usuários';
    } else if (destinatarioTipo === 'usuario') {
      finalDestinatarioId = destinatarioId;
      const uSel = usuariosDisponiveis.find((u) => u.id === destinatarioId);
      finalDestinatarioNome = uSel ? uSel.nome : 'Usuário específico';
    }

    if (tarefaParaEditar) {
      mutate(
        (d) => {
          d.tarefas ??= [];
          const idx = d.tarefas.findIndex((t) => t.id === tarefaParaEditar.id);
          if (idx !== -1) {
            d.tarefas[idx] = {
              ...d.tarefas[idx],
              titulo: titulo.trim(),
              observacoes: observacoes.trim() || undefined,
              data: dataTarefa,
              diaInteiro,
              horario: diaInteiro ? '08:00' : horario,
              recorrencia,
              prioridade,
              obraId: obraId || undefined,
              destinatarioTipo,
              destinatarioId: finalDestinatarioId,
              destinatarioNome: finalDestinatarioNome,
              criadoPorId: d.tarefas[idx].criadoPorId || usuarioAtual?.id || 'usr-admin',
              criadoPorNome: d.tarefas[idx].criadoPorNome || usuarioAtual?.nome || 'Administrador Construtec',
            };
          }
        },
        { acao: 'Tarefas', descricao: `Atualizou tarefa "${titulo.trim()}"` },
      );
      toast('Tarefa atualizada com sucesso!');
    } else {
      const nova: Tarefa = {
        id: uid('tar'),
        titulo: titulo.trim(),
        observacoes: observacoes.trim() || undefined,
        data: dataTarefa,
        diaInteiro,
        horario: diaInteiro ? '08:00' : horario,
        recorrencia,
        prioridade,
        obraId: obraId || undefined,
        concluida: false,
        criadoEm: agora,
        destinatarioTipo,
        destinatarioId: finalDestinatarioId,
        destinatarioNome: finalDestinatarioNome,
        criadoPorId: usuarioAtual?.id || 'usr-admin',
        criadoPorNome: usuarioAtual?.nome || 'Administrador Construtec',
      };

      mutate(
        (d) => {
          d.tarefas ??= [];
          d.tarefas.push(nova);
        },
        { acao: 'Tarefas', descricao: `Criou tarefa "${titulo.trim()}"` },
      );
      toast('Lembrete / Tarefa adicionado!');
    }

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={tarefaParaEditar ? 'Editar Tarefa' : 'Nova Tarefa / Lembrete'}
      subtitle="Defina horário, aviso programado ou dia inteiro (com notificação às 08:00), e regras de recorrência"
    >
      <form onSubmit={salvar} className="space-y-4">
        <Field label="Título da Tarefa">
          <Input
            required
            autoFocus
            placeholder="Ex.: Receber concreto usinado, comprar cimento, ligar fornecedor..."
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </Field>

        <Field label="Observações / Detalhes (Opcional)">
          <textarea
            rows={2}
            placeholder="Anotações adicionais, itens a conferir, números de contato..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-fg placeholder:text-muted focus:border-brand focus:outline-none"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <Field label="Data da Atividade">
            <Input
              type="date"
              required
              value={dataTarefa}
              onChange={(e) => setDataTarefa(e.target.value)}
            />
          </Field>

          <Field label="Horário do aviso">
            <div className="flex flex-wrap items-center gap-2.5 min-h-10">
              <label className="flex items-center gap-2 text-xs font-medium text-fg cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={diaInteiro}
                  onChange={(e) => setDiaInteiro(e.target.checked)}
                  className="size-4 accent-brand rounded cursor-pointer"
                />
                <span>Dia inteiro</span>
              </label>

              {diaInteiro ? (
                <span className="text-xs text-muted">(aviso às 08:00)</span>
              ) : (
                <Input
                  type="time"
                  required
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className="w-28 sm:w-32 h-10 text-xs"
                />
              )}
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Recorrência">
            <Select
              value={recorrencia}
              onChange={(e) => setRecorrencia(e.target.value as RecorrenciaTarefa)}
            >
              <option value="nenhuma">Não se repete</option>
              <option value="diaria">Todos os dias</option>
              <option value="dias_uteis">Segunda a Sexta</option>
              <option value="semanal">Toda semana</option>
              <option value="quinzenal">A cada 15 dias</option>
              <option value="mensal">Todo mês</option>
            </Select>
          </Field>

          <Field label="Prioridade">
            <Select
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as PrioridadeTarefa)}
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta (Urgente)</option>
            </Select>
          </Field>
        </div>

        <div className="space-y-3 rounded-xl border border-line bg-surface-2/30 p-3.5">
          <Field label="Destinatário do Lembrete">
            <Select
              value={destinatarioTipo}
              onChange={(e) => {
                const tipo = e.target.value as 'eu' | 'todos' | 'usuario';
                setDestinatarioTipo(tipo);
                if (tipo === 'usuario' && !destinatarioId && usuariosDisponiveis.length > 0) {
                  setDestinatarioId(usuariosDisponiveis[0].id);
                }
              }}
            >
              <option value="eu">
                Apenas para mim {usuarioAtual ? `(${usuarioAtual.nome})` : ''}
              </option>
              <option value="todos">
                Todos os usuários com conta (Administradores e Mestres/Encarregados)
              </option>
              <option value="usuario">Usuário específico...</option>
            </Select>
          </Field>

          {destinatarioTipo === 'usuario' && (
            <Field label="Selecione o Usuário Responsável">
              <Select
                value={destinatarioId}
                onChange={(e) => setDestinatarioId(e.target.value)}
                required
              >
                <option value="">Selecione um usuário cadastrado...</option>
                {usuariosDisponiveis.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({u.perfil === 'admin' ? 'Administrador' : 'Encarregado'})
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        <Field label="Vincular à Obra (Opcional)">
          <Select value={obraId} onChange={(e) => setObraId(e.target.value)}>
            <option value="">Geral / Sem obra específica (Escritório ou Geral)</option>
            {data.obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome} ({o.cliente || 'Obra'})
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex gap-2 pt-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar Tarefa</Button>
        </div>
      </form>
    </Dialog>
  );
}
