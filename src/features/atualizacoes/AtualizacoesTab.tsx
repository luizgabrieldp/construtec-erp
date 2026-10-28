import { useState } from 'react';
import {
  Sparkles,
  Printer,
  Eye,
  CheckCircle2,
  Rocket,
  ShieldCheck,
  ChevronRight,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui';
import { ATUALIZACOES_SISTEMA, type ReleaseVersao } from '@/data/atualizacoes';
import { PassoAPassoDialog } from './PassoAPassoDialog';

export function AtualizacoesTab() {
  const [versaoSelecionada, setVersaoSelecionada] = useState<ReleaseVersao | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);

  const abrirPassoAPasso = (versao: ReleaseVersao, imprimir = false) => {
    setVersaoSelecionada(versao);
    setAutoPrint(imprimir);
    setModalAberto(true);
  };

  const ultimaVersao = ATUALIZACOES_SISTEMA[0];

  return (
    <div className="space-y-6">
      {/* Banner Principal com a Versão Atual */}
      <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 via-surface to-surface p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand text-white shadow-xs">
                <Rocket className="size-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                Central de Atualizações Versionadas
              </span>
              <Badge tone="orange">{ultimaVersao.versao} • Versão Atual</Badge>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-fg tracking-tight">
              {ultimaVersao.titulo}
            </h2>
            <p className="text-xs sm:text-sm text-muted max-w-2xl leading-relaxed">
              Mantenha-se informado sobre as novas funcionalidades operacionais de canteiro, melhorias de desempenho e correções aplicadas ao sistema.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              icon={<BookOpen className="size-4" />}
              onClick={() => abrirPassoAPasso(ultimaVersao, false)}
            >
              Ver Passo a Passo Visual
            </Button>
            <Button
              variant="secondary"
              icon={<Printer className="size-4" />}
              onClick={() => abrirPassoAPasso(ultimaVersao, true)}
              title="Exportar guia ilustrado para impressão ou envio por PDF"
            >
              Exportar Passo a Passo
            </Button>
          </div>
        </div>
      </div>

      {/* Feed de Releases (Estilo Changelog App Store / Google Play) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
            <Sparkles className="size-3.5 text-brand" />
            <span>Histórico de Lançamentos & Atualizações</span>
          </h3>
          <span className="text-xs text-muted">
            {ATUALIZACOES_SISTEMA.length} versões registradas
          </span>
        </div>

        <div className="grid gap-4">
          {ATUALIZACOES_SISTEMA.map((rel, idx) => (
            <Card
              key={rel.versao}
              className={`p-5 sm:p-6 transition-all hover:border-brand/40 ${
                idx === 0 ? 'border-brand/30 shadow-xs' : ''
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={idx === 0 ? 'orange' : 'neutral'} className="font-mono text-xs font-bold">
                      {rel.versao}
                    </Badge>
                    {idx === 0 && (
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                        Última Versão
                      </span>
                    )}
                    {rel.tags.map((t) => (
                      <Badge
                        key={t}
                        tone={t === 'Novo' ? 'green' : t === 'Melhoria' ? 'blue' : 'amber'}
                      >
                        {t}
                      </Badge>
                    ))}
                    <span className="text-xs text-muted flex items-center gap-1 ml-auto sm:ml-0">
                      <Calendar className="size-3" />
                      {rel.dataPublicacao}
                    </span>
                  </div>

                  <h4 className="mt-2 text-base font-bold text-fg">{rel.titulo}</h4>
                  <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed">
                    {rel.descricao}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Eye className="size-3.5" />}
                    onClick={() => abrirPassoAPasso(rel, false)}
                  >
                    Ver Passo a Passo
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Printer className="size-3.5" />}
                    onClick={() => abrirPassoAPasso(rel, true)}
                    title="Exportar versão em PDF"
                  >
                    Exportar PDF
                  </Button>
                </div>
              </div>

              {/* Destaques / Mudanças */}
              <div className="mt-4 border-t border-line/60 pt-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2">
                  Destaques desta versão
                </div>
                <ul className="space-y-1.5 text-xs text-fg">
                  {rel.mudancas.map((m, mIdx) => (
                    <li key={mIdx} className="flex items-start gap-2">
                      <span
                        className={`size-1.5 rounded-full shrink-0 mt-1.5 ${
                          m.tag === 'Novo'
                            ? 'bg-emerald-500'
                            : m.tag === 'Melhoria'
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      <div>
                        <strong className="text-fg">{m.texto}</strong>
                        {m.detalhe && (
                          <span className="text-muted block sm:inline sm:ml-1">
                            — {m.detalhe}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Informação sobre os passos disponíveis */}
              <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-2 p-2.5 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-brand" />
                  <span>{rel.passosVisuais.length} passos visuais ilustrados e documentados</span>
                </span>
                <button
                  type="button"
                  onClick={() => abrirPassoAPasso(rel, false)}
                  className="font-semibold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Abrir guia</span>
                  <ChevronRight className="size-3" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal Passo a Passo */}
      <PassoAPassoDialog
        versao={versaoSelecionada}
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        autoPrint={autoPrint}
      />
    </div>
  );
}
