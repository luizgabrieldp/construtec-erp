import { useState } from 'react';
import { HardHat, Plus, Search, UserCheck, Users, UserX, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Input, PageHeader, Select } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toast';
import { StatCard } from '@/components/ui/StatCard';
import { WhatsAppBadge } from '@/components/brand/WhatsAppIcon';
import { useData, useErp } from '@/data/store';
import { useHoje, useIsAdmin } from '@/hooks';
import type { Funcionario } from '@/domain/types';
import { LABEL_FUNCAO, getLabelFuncao } from '@/domain/labels';
import { chaveApontamento } from '@/domain/engine';
import { fmtBRL } from '@/lib/format';
import { normalizarTexto } from '@/lib/utils';
import { ApontamentoGrade } from '@/features/folha/ApontamentoGrade';
import { FuncionarioFormDialog } from '@/features/folha/FuncionarioFormDialog';

export function EquipePage() {
  const data = useData();
  const hoje = useHoje();
  const isAdmin = useIsAdmin();
  const mutate = useErp((s) => s.mutate);

  const [busca, setBusca] = useState('');
  const [filtroFuncao, setFiltroFuncao] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('ativos');
  const [dialogNovoOpen, setDialogNovoOpen] = useState(false);
  const [funcionarioEditar, setFuncionarioEditar] = useState<Funcionario | null>(null);
  const [colaboradorParaExcluir, setColaboradorParaExcluir] = useState<Funcionario | null>(null);
  const [bloqueioExclusao, setBloqueioExclusao] = useState<{ funcionario: Funcionario; motivo: string } | null>(null);

  // Funções disponíveis
  const todasFuncoes = [
    ...Object.keys(LABEL_FUNCAO),
    ...(data.funcoesCustomizadas || []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  // Estatísticas da equipe
  const ativos = data.funcionarios.filter((f) => f.ativo);
  const totalMensalistas = ativos.filter((f) => f.regime === 'mensalista').length;
  const totalDiaristasSemanais = ativos.filter((f) => f.regime === 'diarista').length;
  const totalDiaristasQuinzenais = ativos.filter((f) => f.regime === 'diarista_quinzenal').length;
  const totalDiaristas = totalDiaristasSemanais + totalDiaristasQuinzenais;

  // Presença hoje
  let presentesHoje = 0;
  let faltasHoje = 0;
  ativos.forEach((f) => {
    const k = chaveApontamento(f.id, hoje);
    const ap = data.apontamentos[k];
    if (ap) {
      if (ap.status === 'inteiro') presentesHoje += 1;
      else if (ap.status === 'meio') presentesHoje += 0.5;
      else if (ap.status === 'falta') faltasHoje += 1;
    }
  });

  const funcionariosFiltrados = data.funcionarios.filter((f) => {
    if (filtroStatus === 'ativos' && !f.ativo) return false;
    if (filtroStatus === 'inativos' && f.ativo) return false;
    if (filtroFuncao !== 'todos' && f.funcao !== filtroFuncao) return false;
    if (busca.trim()) {
      const qNorm = normalizarTexto(busca);
      const qDigits = busca.replace(/\D/g, '');
      const matchNome = normalizarTexto(f.nome).includes(qNorm);
      const matchApelido = f.apelido?.trim() ? normalizarTexto(f.apelido).includes(qNorm) : false;
      const matchTelefone =
        f.telefone.includes(busca.trim()) ||
        (qDigits.length > 0 && f.telefone.replace(/\D/g, '').includes(qDigits));
      const matchCpf = f.cpf
        ? f.cpf.includes(busca.trim()) || (qDigits.length > 0 && f.cpf.replace(/\D/g, '').includes(qDigits))
        : false;
      const matchPix = f.chavePix ? normalizarTexto(f.chavePix).includes(qNorm) : false;

      return matchNome || matchApelido || matchTelefone || matchCpf || matchPix;
    }
    return true;
  });

  const alternarStatusFuncionario = (f: Funcionario) => {
    mutate((d) => {
      const item = d.funcionarios.find((x) => x.id === f.id);
      if (item) item.ativo = !item.ativo;
    });
  };

  const tentarExcluirFuncionario = (f: Funcionario) => {
    const temFechamento = (data.fechamentos || []).some((fech) => fech.funcionarioId === f.id);
    const temContaPagar = (data.contasPagar || []).some((cp) => cp.funcionarioId === f.id);

    if (temFechamento || temContaPagar) {
      const motivo =
        temFechamento && temContaPagar
          ? 'Este colaborador possui fechamentos de folha e lançamentos de contas a pagar registrados no histórico financeiro.'
          : temFechamento
          ? 'Este colaborador possui fechamentos de folha registrados no histórico financeiro.'
          : 'Este colaborador possui lançamentos de contas a pagar no sistema financeiro.';
      setBloqueioExclusao({ funcionario: f, motivo });
    } else {
      setColaboradorParaExcluir(f);
    }
  };

  const confirmarExclusao = () => {
    if (!colaboradorParaExcluir) return;
    const fId = colaboradorParaExcluir.id;
    const fNome = colaboradorParaExcluir.nome;

    mutate(
      (d) => {
        d.funcionarios = d.funcionarios.filter((x) => x.id !== fId);
        Object.keys(d.apontamentos).forEach((k) => {
          if (d.apontamentos[k]?.funcionarioId === fId || k.startsWith(`${fId}|`)) {
            delete d.apontamentos[k];
          }
        });
        d.funcionarios.forEach((x) => {
          if (x.empreiteiroId === fId) {
            x.empreiteiroId = undefined;
          }
        });
      },
      {
        acao: 'Equipe',
        descricao: `Excluiu colaborador de teste "${fNome}"`,
      },
    );

    toast(`Colaborador "${fNome}" excluído permanentemente.`);
    setColaboradorParaExcluir(null);
  };

  return (
    <>
      <PageHeader
        title="Equipe & Apontamento"
        subtitle="Controle de frequência semanal, alocação de canteiro e cadastro de profissionais"
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setDialogNovoOpen(true)}>
            Novo Colaborador
          </Button>
        }
      />

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Equipe Ativa"
          value={ativos.length}
          icon={<Users className="size-4 sm:size-5" />}
          hint={`${totalMensalistas} mens. · ${totalDiaristas} diar.`}
        />
        <StatCard
          label="Em Campo"
          value={presentesHoje}
          icon={<UserCheck className="size-4 sm:size-5 text-emerald-500" />}
          tone="green"
          hint="Presentes hoje"
        />
        <StatCard
          label="Faltas Hoje"
          value={faltasHoje}
          icon={<UserX className="size-4 sm:size-5 text-red-500" />}
          tone={faltasHoje > 0 ? 'red' : undefined}
          hint="Ausências no dia"
        />
        <StatCard
          label="Regime"
          value={totalDiaristas >= totalMensalistas ? 'Diária' : 'Mensal'}
          icon={<HardHat className="size-4 sm:size-5 text-amber-500" />}
          tone="amber"
          hint={`${totalDiaristasSemanais} sem. · ${totalDiaristasQuinzenais} quinz.`}
        />
      </div>

      {/* Grade de Apontamento Semanal */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-fg">Grade de Apontamento Semanal</h2>
            <p className="text-xs text-muted">
              Clique nos dias para alternar status (Inteiro / Meio / Falta) e altere a obra alocada em tempo real.
            </p>
          </div>
        </div>
        <ApontamentoGrade />
      </div>

      {/* Cadastro e Gestão de Colaboradores */}
      <Card className="mt-8">
        <CardHeader
          title="Cadastro de Colaboradores"
          subtitle={`${funcionariosFiltrados.length} colaboradores encontrados`}
        />
        <div className="p-5">
          {/* Filtros */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
              <Input
                placeholder="Buscar por nome, apelido ou telefone..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filtroFuncao} onChange={(e) => setFiltroFuncao(e.target.value)}>
                <option value="todos">Todas as Funções</option>
                {todasFuncoes.map((fn) => (
                  <option key={fn} value={fn}>
                    {getLabelFuncao(fn)}
                  </option>
                ))}
              </Select>
              <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                <option value="todos">Todos os Status</option>
                <option value="ativos">Apenas Ativos</option>
                <option value="inativos">Apenas Inativos</option>
              </Select>
            </div>
          </div>

          {/* Tabela de Colaboradores */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                  <th className="pb-3">Colaborador</th>
                  <th className="pb-3">Função</th>
                  <th className="pb-3">Regime & Remuneração</th>
                  <th className="pb-3">Obra Padrão</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {funcionariosFiltrados.map((f) => {
                  const obraPadrao = data.obras.find((o) => o.id === f.obraPadraoId);
                  const empreiteiroResp = f.empreiteiroId ? data.funcionarios.find((x) => x.id === f.empreiteiroId) : null;
                  return (
                    <tr key={f.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-3.5 pr-4">
                        {f.apelido?.trim() ? (
                          <>
                            <div className="flex flex-wrap items-center gap-2" title={`${f.apelido.trim()} (${f.nome})`}>
                              <span className="font-semibold text-fg">{f.apelido.trim()}</span>
                              <WhatsAppBadge telefone={f.telefone} />
                            </div>
                            <div className="text-xs text-muted font-normal mt-0.5" title={f.nome}>{f.nome}</div>
                          </>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2" title={f.nome}>
                            <span className="font-semibold text-fg">{f.nome}</span>
                            <WhatsAppBadge telefone={f.telefone} />
                          </div>
                        )}
                        {f.cpf && (
                          <div className="text-[11px] text-muted font-normal mt-0.5">CPF: {f.cpf}</div>
                        )}
                        {f.chavePix && (
                          <div className="text-[10px] text-muted truncate max-w-[200px]" title={`Pix: ${f.chavePix}`}>
                            Pix: <span className="font-mono text-fg">{f.chavePix}</span>
                          </div>
                        )}
                        {empreiteiroResp && (
                          <div className="text-[10px] text-brand font-medium mt-0.5">
                            Empreiteiro: {empreiteiroResp.apelido?.trim() ? `${empreiteiroResp.apelido.trim()} (${empreiteiroResp.nome})` : empreiteiroResp.nome}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        <Badge tone="blue">{getLabelFuncao(f.funcao)}</Badge>
                      </td>
                      <td className="py-3.5 pr-4">
                        {isAdmin ? (
                          f.regime === 'mensalista' ? (
                            <div>
                              <span className="font-semibold text-fg">{fmtBRL(f.salario)}</span>
                              <span className="text-xs text-muted"> /mês</span>
                              <div className="text-[11px] text-muted uppercase font-medium">Mensalista</div>
                            </div>
                          ) : f.regime === 'diarista_quinzenal' ? (
                            <div>
                              <span className="font-semibold text-fg">{fmtBRL(f.diaria)}</span>
                              <span className="text-xs text-muted"> /dia</span>
                              <div className="text-[11px] text-muted uppercase font-medium">Diarista Quinzenal</div>
                            </div>
                          ) : (
                            <div>
                              <span className="font-semibold text-fg">{fmtBRL(f.diaria)}</span>
                              <span className="text-xs text-muted"> /dia</span>
                              <div className="text-[11px] text-muted uppercase font-medium">Diarista Semanal</div>
                            </div>
                          )
                        ) : (
                          <div>
                            <span className="font-semibold text-fg">
                              {f.regime === 'mensalista'
                                ? 'Mensalista'
                                : f.regime === 'diarista_quinzenal'
                                ? 'Diarista Quinzenal'
                                : 'Diarista Semanal'}
                            </span>
                            <div className="text-[11px] text-muted">Remuneração restrita</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        {obraPadrao ? (
                          <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full" style={{ background: obraPadrao.cor }} />
                            <span className="text-xs font-medium text-fg">{obraPadrao.nome}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted">Sem obra fixa</span>
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        <Badge tone={f.ativo ? 'green' : 'neutral'}>
                          {f.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Edit className="size-3.5" />}
                            onClick={() => setFuncionarioEditar(f)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={f.ativo ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10' : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10'}
                            onClick={() => alternarStatusFuncionario(f)}
                          >
                            {f.ativo ? 'Desativar' : 'Reativar'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            icon={<Trash2 className="size-3.5" />}
                            onClick={() => tentarExcluirFuncionario(f)}
                            title="Excluir Colaborador"
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {funcionariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted">
                      Nenhum colaborador encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Diálogos */}
      <FuncionarioFormDialog
        open={dialogNovoOpen}
        onClose={() => setDialogNovoOpen(false)}
      />

      <FuncionarioFormDialog
        open={!!funcionarioEditar}
        onClose={() => setFuncionarioEditar(null)}
        funcionarioParaEditar={funcionarioEditar}
      />

      {/* Modal de Confirmação de Exclusão Definitiva */}
      <Dialog
        open={!!colaboradorParaExcluir}
        onClose={() => setColaboradorParaExcluir(null)}
        title="Excluir Colaborador Permanentemente"
        subtitle="Confirmação de exclusão para colaboradores de teste"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-500 flex items-start gap-2.5">
            <AlertTriangle className="size-5 shrink-0 mt-0.5" />
            <div>
              <strong>Atenção:</strong> Tem certeza que deseja apagar permanentemente o colaborador{' '}
              <strong>{colaboradorParaExcluir?.nome}</strong>? Esta ação é irreversível e removerá o cadastro e todos os apontamentos de presença de teste associados.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setColaboradorParaExcluir(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700 text-white border-red-600"
              onClick={confirmarExclusao}
            >
              Sim, Excluir Definitivamente
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal de Bloqueio de Exclusão (Histórico Financeiro Protegido) */}
      <Dialog
        open={!!bloqueioExclusao}
        onClose={() => setBloqueioExclusao(null)}
        title="Exclusão Não Permitida"
        subtitle="Proteção de integridade contábil e histórico financeiro"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-500 flex items-start gap-2.5">
            <AlertTriangle className="size-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong>Histórico Financeiro Vinculado:</strong>
              <p>{bloqueioExclusao?.motivo}</p>
              <p className="mt-1 text-fg/80">
                Para manter a integridade dos relatórios contábeis da empresa, o colaborador{' '}
                <strong>{bloqueioExclusao?.funcionario.nome}</strong> deve ser mantido como <strong>Inativo</strong> em vez de excluído.
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            {bloqueioExclusao?.funcionario.ativo && (
              <Button
                variant="secondary"
                className="text-amber-500 border-amber-500/40 hover:bg-amber-500/10"
                onClick={() => {
                  if (bloqueioExclusao) {
                    alternarStatusFuncionario(bloqueioExclusao.funcionario);
                    toast(`Colaborador "${bloqueioExclusao.funcionario.nome}" desativado.`);
                    setBloqueioExclusao(null);
                  }
                }}
              >
                Desativar Agora
              </Button>
            )}
            <Button variant="secondary" onClick={() => setBloqueioExclusao(null)} className="ml-auto">
              Entendi, Fechar
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
