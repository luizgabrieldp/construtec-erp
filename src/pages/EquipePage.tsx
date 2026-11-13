import { useState } from 'react';
import { HardHat, Plus, Search, UserCheck, Users, UserX, Edit } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Input, PageHeader, Select } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';
import { WhatsAppBadge } from '@/components/brand/WhatsAppIcon';
import { TableWatermark } from '@/components/brand/TableWatermark';
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

  const [colunaOrdenacao, setColunaOrdenacao] = useState<'colaborador' | 'funcao' | 'remuneracao' | 'obra' | 'status'>('colaborador');
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<'asc' | 'desc'>('asc');

  const alternarOrdenacao = (coluna: 'colaborador' | 'funcao' | 'remuneracao' | 'obra' | 'status') => {
    if (colunaOrdenacao === coluna) {
      setDirecaoOrdenacao((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setColunaOrdenacao(coluna);
      // Remuneração inicia com maior valor no topo (desc); as demais A-Z / ativos primeiro (asc)
      if (coluna === 'remuneracao') {
        setDirecaoOrdenacao('desc');
      } else {
        setDirecaoOrdenacao('asc');
      }
    }
  };

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
      const matchCpf = isAdmin && f.cpf
        ? f.cpf.includes(busca.trim()) || (qDigits.length > 0 && f.cpf.replace(/\D/g, '').includes(qDigits))
        : false;
      const matchPix = isAdmin && f.chavePix ? normalizarTexto(f.chavePix).includes(qNorm) : false;

      return matchNome || matchApelido || matchTelefone || matchCpf || matchPix;
    }
    return true;
  });

  const funcionariosOrdenados = [...funcionariosFiltrados].sort((a, b) => {
    let diff = 0;
    if (colunaOrdenacao === 'colaborador') {
      const nomeA = (a.apelido?.trim() || a.nome).trim();
      const nomeB = (b.apelido?.trim() || b.nome).trim();
      diff = nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
      return direcaoOrdenacao === 'asc' ? diff : -diff;
    }

    if (colunaOrdenacao === 'funcao') {
      const funcA = getLabelFuncao(a.funcao);
      const funcB = getLabelFuncao(b.funcao);
      diff = funcA.localeCompare(funcB, 'pt-BR', { sensitivity: 'base' });
      if (diff === 0) {
        const nomeA = (a.apelido?.trim() || a.nome).trim();
        const nomeB = (b.apelido?.trim() || b.nome).trim();
        diff = nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
      }
      return direcaoOrdenacao === 'asc' ? diff : -diff;
    }

    if (colunaOrdenacao === 'remuneracao') {
      if (!isAdmin) {
        diff = a.regime.localeCompare(b.regime, 'pt-BR', { sensitivity: 'base' });
        return direcaoOrdenacao === 'asc' ? diff : -diff;
      }
      const valA = a.regime === 'mensalista' ? (a.salario || 0) : (a.diaria || 0);
      const valB = b.regime === 'mensalista' ? (b.salario || 0) : (b.diaria || 0);
      diff = valA - valB;
      if (diff === 0) {
        const nomeA = (a.apelido?.trim() || a.nome).trim();
        const nomeB = (b.apelido?.trim() || b.nome).trim();
        return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
      }
      return direcaoOrdenacao === 'desc' ? -diff : diff;
    }

    if (colunaOrdenacao === 'obra') {
      const obraA = data.obras.find((o) => o.id === a.obraPadraoId)?.nome || '';
      const obraB = data.obras.find((o) => o.id === b.obraPadraoId)?.nome || '';
      diff = obraA.localeCompare(obraB, 'pt-BR', { sensitivity: 'base' });
      if (diff === 0) {
        const nomeA = (a.apelido?.trim() || a.nome).trim();
        const nomeB = (b.apelido?.trim() || b.nome).trim();
        diff = nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
      }
      return direcaoOrdenacao === 'asc' ? diff : -diff;
    }

    if (colunaOrdenacao === 'status') {
      const scoreA = a.ativo ? 1 : 0;
      const scoreB = b.ativo ? 1 : 0;
      diff = scoreA - scoreB;
      if (diff === 0) {
        const nomeA = (a.apelido?.trim() || a.nome).trim();
        const nomeB = (b.apelido?.trim() || b.nome).trim();
        diff = nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
      }
      return direcaoOrdenacao === 'asc' ? -diff : diff;
    }

    return 0;
  });

  const alternarStatusFuncionario = (f: Funcionario) => {
    if (!isAdmin) return;
    mutate((d) => {
      const item = d.funcionarios.find((x) => x.id === f.id);
      if (item) item.ativo = !item.ativo;
    });
  };

  return (
    <>
      <PageHeader
        title="Equipe & Apontamento"
        subtitle="Controle de frequência semanal, alocação de canteiro e cadastro de profissionais"
        actions={
          isAdmin ? (
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setDialogNovoOpen(true)}>
              Novo Colaborador
            </Button>
          ) : undefined
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
      <Card className="mt-8 relative overflow-hidden">
        {/* Marca d'água oficial CONSTRUTEC com posicionamento inteligente Sticky Viewport */}
        <TableWatermark size="lg" />

        <div className="relative z-1">
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
                  <th className="pb-3 select-none">
                    <button
                      type="button"
                      onClick={() => alternarOrdenacao('colaborador')}
                      className={`group inline-flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                        colunaOrdenacao === 'colaborador' ? 'text-brand font-bold' : 'text-muted hover:text-fg'
                      }`}
                      title={
                        colunaOrdenacao === 'colaborador'
                          ? direcaoOrdenacao === 'asc'
                            ? 'Colaborador: A-Z (clique para Z-A)'
                            : 'Colaborador: Z-A (clique para A-Z)'
                          : 'Ordenar por Colaborador (A-Z)'
                      }
                    >
                      <span>Colaborador</span>
                      <span className="inline-flex items-center text-[10px] leading-none">
                        {colunaOrdenacao === 'colaborador' ? (
                          <span className="font-bold text-brand">{direcaoOrdenacao === 'asc' ? '▼' : '▲'}</span>
                        ) : (
                          <span className="opacity-0 group-hover:opacity-40 transition-opacity">↕</span>
                        )}
                      </span>
                    </button>
                  </th>

                  <th className="pb-3 select-none">
                    <button
                      type="button"
                      onClick={() => alternarOrdenacao('funcao')}
                      className={`group inline-flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                        colunaOrdenacao === 'funcao' ? 'text-brand font-bold' : 'text-muted hover:text-fg'
                      }`}
                      title={
                        colunaOrdenacao === 'funcao'
                          ? direcaoOrdenacao === 'asc'
                            ? 'Função: A-Z (clique para Z-A)'
                            : 'Função: Z-A (clique para A-Z)'
                          : 'Ordenar por Função (A-Z)'
                      }
                    >
                      <span>Função</span>
                      <span className="inline-flex items-center text-[10px] leading-none">
                        {colunaOrdenacao === 'funcao' ? (
                          <span className="font-bold text-brand">{direcaoOrdenacao === 'asc' ? '▼' : '▲'}</span>
                        ) : (
                          <span className="opacity-0 group-hover:opacity-40 transition-opacity">↕</span>
                        )}
                      </span>
                    </button>
                  </th>

                  <th className="pb-3 select-none">
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => alternarOrdenacao('remuneracao')}
                        className={`group inline-flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                          colunaOrdenacao === 'remuneracao' ? 'text-brand font-bold' : 'text-muted hover:text-fg'
                        }`}
                        title={
                          colunaOrdenacao === 'remuneracao'
                            ? direcaoOrdenacao === 'desc'
                              ? 'Remuneração: Maior para menor valor (clique para menor para maior)'
                              : 'Remuneração: Menor para maior valor (clique para maior para menor)'
                            : 'Ordenar por Remuneração (Maior valor primeiro)'
                        }
                      >
                        <span>Regime & Remuneração</span>
                        <span className="inline-flex items-center text-[10px] leading-none">
                          {colunaOrdenacao === 'remuneracao' ? (
                            <span className="font-bold text-brand">{direcaoOrdenacao === 'desc' ? '▼' : '▲'}</span>
                          ) : (
                            <span className="opacity-0 group-hover:opacity-40 transition-opacity">↕</span>
                          )}
                        </span>
                      </button>
                    ) : (
                      <span className="font-semibold text-xs uppercase tracking-wider text-muted">Regime</span>
                    )}
                  </th>

                  <th className="pb-3 select-none">
                    <button
                      type="button"
                      onClick={() => alternarOrdenacao('obra')}
                      className={`group inline-flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                        colunaOrdenacao === 'obra' ? 'text-brand font-bold' : 'text-muted hover:text-fg'
                      }`}
                      title={
                        colunaOrdenacao === 'obra'
                          ? direcaoOrdenacao === 'asc'
                            ? 'Obra Padrão: A-Z (clique para Z-A)'
                            : 'Obra Padrão: Z-A (clique para A-Z)'
                          : 'Ordenar por Obra Padrão (A-Z)'
                      }
                    >
                      <span>Obra Padrão</span>
                      <span className="inline-flex items-center text-[10px] leading-none">
                        {colunaOrdenacao === 'obra' ? (
                          <span className="font-bold text-brand">{direcaoOrdenacao === 'asc' ? '▼' : '▲'}</span>
                        ) : (
                          <span className="opacity-0 group-hover:opacity-40 transition-opacity">↕</span>
                        )}
                      </span>
                    </button>
                  </th>

                  <th className="pb-3 select-none">
                    <button
                      type="button"
                      onClick={() => alternarOrdenacao('status')}
                      className={`group inline-flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                        colunaOrdenacao === 'status' ? 'text-brand font-bold' : 'text-muted hover:text-fg'
                      }`}
                      title={
                        colunaOrdenacao === 'status'
                          ? direcaoOrdenacao === 'asc'
                            ? 'Status: Ativos primeiro (clique para inativos primeiro)'
                            : 'Status: Inativos primeiro (clique para ativos primeiro)'
                          : 'Ordenar por Status (Ativos primeiro)'
                      }
                    >
                      <span>Status</span>
                      <span className="inline-flex items-center text-[10px] leading-none">
                        {colunaOrdenacao === 'status' ? (
                          <span className="font-bold text-brand">{direcaoOrdenacao === 'asc' ? '▼' : '▲'}</span>
                        ) : (
                          <span className="opacity-0 group-hover:opacity-40 transition-opacity">↕</span>
                        )}
                      </span>
                    </button>
                  </th>

                  {isAdmin && <th className="pb-3 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {funcionariosOrdenados.map((f) => {
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
                        {isAdmin && f.cpf && (
                          <div className="text-[11px] text-muted font-normal mt-0.5">CPF: {f.cpf}</div>
                        )}
                        {isAdmin && f.chavePix && (
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
                      {isAdmin && (
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
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {funcionariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-muted">
                      Nenhum colaborador encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
    </>
  );
}
