import { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, RotateCcw, Check, Sparkles } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Input } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp } from '@/data/store';
import type { Obra, FaseCustomizada } from '@/domain/types';
import { FASES_OBRA_LISTA } from '@/domain/labels';
import { uid } from '@/lib/utils';

interface FasesObraConfigDialogProps {
  open: boolean;
  onClose: () => void;
  obra: Obra | null;
}

const CORES_FASE = ['#8B5CF6', '#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];

export function FasesObraConfigDialog({ open, onClose, obra }: FasesObraConfigDialogProps) {
  const mutate = useErp((s) => s.mutate);
  const [fases, setFases] = useState<FaseCustomizada[]>([]);
  const [novaFaseNome, setNovaFaseNome] = useState('');

  useEffect(() => {
    if (obra) {
      if (obra.fasesCustomizadas && obra.fasesCustomizadas.length > 0) {
        setFases(obra.fasesCustomizadas.map((f) => ({ ...f })));
      } else {
        setFases(
          FASES_OBRA_LISTA.map((f) => ({
            id: f.id,
            label: f.label,
            cor: f.cor,
          })),
        );
      }
      setNovaFaseNome('');
    }
  }, [obra, open]);

  if (!obra) return null;

  const handleAlterarNome = (id: string, novoNome: string) => {
    setFases((prev) =>
      prev.map((f) => (f.id === id ? { ...f, label: novoNome } : f)),
    );
  };

  const handleMoverCima = (idx: number) => {
    if (idx <= 0) return;
    setFases((prev) => {
      const arr = [...prev];
      const temp = arr[idx - 1];
      arr[idx - 1] = arr[idx];
      arr[idx] = temp;
      return arr;
    });
  };

  const handleMoverBaixo = (idx: number) => {
    if (idx >= fases.length - 1) return;
    setFases((prev) => {
      const arr = [...prev];
      const temp = arr[idx + 1];
      arr[idx + 1] = arr[idx];
      arr[idx] = temp;
      return arr;
    });
  };

  const handleRemover = (id: string) => {
    if (fases.length <= 1) {
      toast('A obra deve possuir pelo menos uma fase.', 'error');
      return;
    }
    setFases((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAdicionar = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nomeLimpo = novaFaseNome.trim();
    if (!nomeLimpo) return;

    const nova: FaseCustomizada = {
      id: uid('fase'),
      label: nomeLimpo,
      cor: CORES_FASE[fases.length % CORES_FASE.length],
    };

    setFases((prev) => [...prev, nova]);
    setNovaFaseNome('');
  };

  const handleRestaurarPadrao = () => {
    setFases(
      FASES_OBRA_LISTA.map((f) => ({
        id: f.id,
        label: f.label,
        cor: f.cor,
      })),
    );
    toast('Restaurado para o modelo padrão com as 5 fases.');
  };

  const handleSalvar = () => {
    const fasesValidas = fases
      .map((f) => ({ ...f, label: f.label.trim() }))
      .filter((f) => f.label.length > 0);

    if (fasesValidas.length === 0) {
      toast('Adicione pelo menos uma fase válida.', 'error');
      return;
    }

    mutate(
      (d) => {
        const ob = d.obras.find((o) => o.id === obra.id);
        if (ob) {
          ob.fasesCustomizadas = fasesValidas;
          // Se a fase atual não existir mais na lista nova, atualiza para a primeira
          const idsValidos = new Set(fasesValidas.map((f) => f.id));
          if (!ob.fase || !idsValidos.has(ob.fase)) {
            ob.fase = fasesValidas[0].id;
          }
        }
      },
      {
        acao: 'Obras',
        descricao: `Personalizou as etapas de execução da obra "${obra.nome}"`,
      },
    );

    toast('Etapas da obra atualizadas com sucesso.');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Personalizar Etapas da Obra"
      subtitle={`Configure as fases exclusivas para "${obra.nome}"`}
    >
      <div className="space-y-4">
        <p className="text-xs text-muted">
          As alterações feitas aqui serão aplicadas <strong>exclusivamente a esta obra</strong>.
          Você pode renomear etapas existentes, adicionar novas fases (ex: Terraplenagem, Pintura, Vistoria) ou reordená-las.
        </p>

        {/* Lista de Fases */}
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {fases.map((f, idx) => (
            <div
              key={f.id}
              className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/60 p-2 text-xs transition-colors hover:border-brand/40"
            >
              <div
                className="size-3 rounded-full shrink-0"
                style={{ backgroundColor: f.cor || '#8B5CF6' }}
              />
              <span className="font-bold text-muted w-5 shrink-0 text-center">
                {idx + 1}º
              </span>
              <input
                type="text"
                value={f.label}
                onChange={(e) => handleAlterarNome(f.id, e.target.value)}
                placeholder="Nome da etapa..."
                className="flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-fg focus:border-brand focus:outline-none"
              />

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMoverCima(idx)}
                  className="rounded p-1 text-muted hover:bg-surface hover:text-fg disabled:opacity-30 disabled:pointer-events-none"
                  title="Mover para cima"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === fases.length - 1}
                  onClick={() => handleMoverBaixo(idx)}
                  className="rounded p-1 text-muted hover:bg-surface hover:text-fg disabled:opacity-30 disabled:pointer-events-none"
                  title="Mover para baixo"
                >
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={fases.length <= 1}
                  onClick={() => handleRemover(f.id)}
                  className="rounded p-1 text-red-500 hover:bg-red-500/10 disabled:opacity-30 disabled:pointer-events-none"
                  title="Remover etapa"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Adicionar Nova Fase */}
        <form onSubmit={handleAdicionar} className="flex gap-2 pt-2 border-t border-line/60">
          <Input
            value={novaFaseNome}
            onChange={(e) => setNovaFaseNome(e.target.value)}
            placeholder="Nova etapa (ex: Vistoria Final, Pintura...)"
            className="flex-1 text-xs"
          />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            icon={<Plus className="size-3.5" />}
            disabled={!novaFaseNome.trim()}
          >
            Adicionar
          </Button>
        </form>

        {/* Rodapé com Ações */}
        <div className="flex items-center justify-between pt-3 border-t border-line">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<RotateCcw className="size-3.5" />}
            onClick={handleRestaurarPadrao}
            title="Restaurar as 5 etapas padrão"
          >
            Restaurar Padrão
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              icon={<Check className="size-3.5" />}
              onClick={handleSalvar}
            >
              Salvar Etapas
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
