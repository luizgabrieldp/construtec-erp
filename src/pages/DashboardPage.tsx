import { Link } from 'react-router-dom';
import {
  Building2,
  HardHat,
  UserX,
  Calendar,
  ArrowRight,
  ClipboardCheck,
} from 'lucide-react';
import { Badge, Card, CardHeader, PageHeader, Progress, Button } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';
import { useData } from '@/data/store';
import { useHoje, useResumo } from '@/hooks';
import { LABEL_OBRA_STATUS } from '@/domain/labels';
import { chaveApontamento } from '@/domain/engine';
import { diffDays } from '@/lib/dates';
import { fmtDate, fmtPct } from '@/lib/format';
import { FaseObraStepper } from '@/features/obras/FaseObraStepper';
import { TarefasWidget } from '@/features/dashboard/TarefasWidget';
import { EquipeEmCampoWidget } from '@/features/dashboard/EquipeEmCampoWidget';

export function DashboardPage() {
  const data = useData();
  const hoje = useHoje();
  const r = useResumo();

  const obrasAtivas = data.obras.filter((o) => o.status === 'andamento');
  const obrasPlanejamento = data.obras.filter((o) => o.status === 'planejamento').length;
  const obrasConcluidas = data.obras.filter((o) => o.status === 'concluida').length;
  const colaboradoresAtivos = data.funcionarios.filter((f) => f.ativo);

  // Contagem de presença e faltas hoje
  let presentesHoje = 0;
  let faltasHoje = 0;
  colaboradoresAtivos.forEach((f) => {
    const k = chaveApontamento(f.id, hoje);
    const ap = data.apontamentos[k];
    if (ap) {
      if (ap.status === 'inteiro') presentesHoje += 1;
      else if (ap.status === 'meio') presentesHoje += 0.5;
      else if (ap.status === 'falta') faltasHoje += 1;
    }
  });

  // Média de prazo decorrido das obras ativas
  const mediaPrazoDecorrido = obrasAtivas.length > 0
    ? obrasAtivas.reduce((acc, o) => {
        const prazo = Math.max(1, diffDays(o.dataInicio, o.previsaoEntrega));
        const dec = Math.max(0, Math.min(1, diffDays(o.dataInicio, hoje) / prazo));
        return acc + dec;
      }, 0) / obrasAtivas.length
    : 0;

  return (
    <>
      <PageHeader
        title="Dashboard Operacional"
        subtitle="Acompanhamento em tempo real de obras, fases de execução, cronogramas e presença da equipe"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/equipe">
              <Button variant="secondary" icon={<ClipboardCheck className="size-4 text-brand" />}>
                Grade de Presença
              </Button>
            </Link>
            <Link to="/obras">
              <Button icon={<Building2 className="size-4" />}>
                Gerenciar Obras
              </Button>
            </Link>
          </div>
        }
      />

      {/* Cards de Métricas Operacionais */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Obras Ativas"
          value={obrasAtivas.length}
          icon={<Building2 className="size-4 sm:size-5" />}
          tone="blue"
          hint={`${obrasPlanejamento} planej. · ${obrasConcluidas} concl.`}
          to="/obras"
          title="Ver obras ativas"
        />

        <StatCard
          label="Em Campo"
          value={presentesHoje}
          icon={<HardHat className="size-4 sm:size-5 text-emerald-500" />}
          tone="green"
          hint={`de ${colaboradoresAtivos.length} ativos`}
          to="/equipe"
          title="Ver equipe em campo"
        />

        <StatCard
          label="Faltas Hoje"
          value={faltasHoje}
          icon={<UserX className="size-4 sm:size-5 text-red-500" />}
          tone={faltasHoje > 0 ? 'red' : undefined}
          hint={faltasHoje === 0 ? '100% presente' : 'Ausências hoje'}
          to="/equipe"
          title="Ver presenças e faltas da equipe"
        />

        <StatCard
          label="Prazo Médio"
          value={fmtPct(mediaPrazoDecorrido)}
          icon={<Calendar className="size-4 sm:size-5 text-amber-500" />}
          tone="amber"
          hint="Tempo decorrido"
          to="/obras"
          title="Ver cronogramas e prazos das obras"
        />
      </div>

      {/* Tarefas Operacionais da Equipe e Alocação por Obra */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TarefasWidget />
        </div>
        <div className="lg:col-span-1">
          <EquipeEmCampoWidget />
        </div>
      </div>

      {/* Seção de Acompanhamento das Obras com Fases Clicáveis */}
      <div className="mt-6">
        <Card>
          <CardHeader
            title="Acompanhamento das Obras & Fases de Execução"
            subtitle="Clique nas etapas da obra para avançar ou alternar a fase atual diretamente pelo painel"
            action={
              <Link to="/obras" className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                <span>Ver todas as obras</span>
                <ArrowRight className="size-3.5" />
              </Link>
            }
          />

          <ul className="divide-y divide-line px-5 pb-3">
            {data.obras.map((obra) => {
              const ro = r.porObra[obra.id];
              const prazo = Math.max(1, diffDays(obra.dataInicio, obra.previsaoEntrega));
              const decorrido = Math.max(0, Math.min(1, diffDays(obra.dataInicio, hoje) / prazo));

              return (
                <li key={obra.id} className="py-5 space-y-4">
                  {/* Cabeçalho da Obra */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="size-3 rounded-full" style={{ background: obra.cor }} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-fg text-base">{obra.nome}</span>
                          <Badge tone={obra.status === 'andamento' ? 'green' : obra.status === 'pausada' ? 'amber' : 'neutral'}>
                            {LABEL_OBRA_STATUS[obra.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {obra.cliente || 'Sem cliente informado'}
                          {obra.responsavel && ` • Resp: ${obra.responsavel}`}
                          {obra.arquiteto && ` • Arq: ${obra.arquiteto}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-muted">
                      <div className="font-semibold text-fg">
                        Entrega: {fmtDate(obra.previsaoEntrega)}
                      </div>
                      <div className="text-[11px] text-muted">
                        {ro?.equipeHoje || 0} operários em campo hoje
                      </div>
                    </div>
                  </div>

                  {/* Fases da Obra Clicável com 1 Clique */}
                  <div className="rounded-xl border border-line bg-surface-2/40 p-3">
                    <FaseObraStepper
                      obraId={obra.id}
                      obraNome={obra.nome}
                      faseAtual={obra.fase || 'fundacao'}
                    />
                  </div>

                  {/* Cronograma / Prazo Decorrido */}
                  <div>
                    <div className="flex justify-between text-xs text-muted mb-1.5">
                      <span>Cronograma Decorrido</span>
                      <span className="font-semibold text-fg">{fmtPct(decorrido)}</span>
                    </div>
                    <Progress value={decorrido} />
                    <div className="mt-1 flex justify-between text-[11px] text-muted">
                      <span>Início: {fmtDate(obra.dataInicio)}</span>
                      <span>Previsão: {fmtDate(obra.previsaoEntrega)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
