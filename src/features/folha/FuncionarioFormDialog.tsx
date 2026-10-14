import { useState, useEffect } from 'react';
import { Plus, Check, ShieldAlert, Sparkles, Building2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select, Badge } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import { useIsAdmin } from '@/hooks';
import type { Funcionario, Funcao, Regime, TipoPix } from '@/domain/types';
import { LABEL_FUNCAO, LABEL_REGIME, getLabelFuncao } from '@/domain/labels';
import { today } from '@/lib/dates';
import { fmtBRL, round2 } from '@/lib/format';
import { cn, uid } from '@/lib/utils';

interface FuncionarioFormDialogProps {
  open: boolean;
  onClose: () => void;
  funcionarioParaEditar?: Funcionario | null;
}

export function FuncionarioFormDialog({ open, onClose, funcionarioParaEditar }: FuncionarioFormDialogProps) {
  const data = useData();
  const isAdmin = useIsAdmin();
  const mutate = useErp((s) => s.mutate);

  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [funcao, setFuncao] = useState<string>('pedreiro');
  const [regime, setRegime] = useState<Regime>('diarista');
  const [salario, setSalario] = useState('');
  const [diaria, setDiaria] = useState('200');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [tipoPix, setTipoPix] = useState<TipoPix>('outro');
  const [empreiteiroId, setEmpreiteiroId] = useState('');
  const [admissao, setAdmissao] = useState(today());
  const [obraPadraoId, setObraPadraoId] = useState('');

  // Estado para adicionar nova função dinamicamente
  const [criandoNovaFuncao, setCriandoNovaFuncao] = useState(false);
  const [nomeNovaFuncao, setNomeNovaFuncao] = useState('');

  // Permissões do encarregado ao editar:
  // Encarregado NÃO pode editar diária/salário, função e regime. Pode editar nome, apelido, telefone, CPF, Pix e obra padrão.
  const isEdicao = !!funcionarioParaEditar;
  const podeEditarRemuneracao = isAdmin || !isEdicao;
  const podeEditarFuncaoRegime = isAdmin || !isEdicao;

  // Lista de funções disponíveis (padrão + customizadas)
  const funcoesDisponiveis = [
    ...Object.keys(LABEL_FUNCAO),
    ...(data.funcoesCustomizadas || []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  // Lista de colaboradores empreiteiros para vínculo
  const empreiteiros = data.funcionarios.filter(
    (f) =>
      f.ativo &&
      (f.funcao === 'empreiteiro' || f.funcao.toLowerCase().includes('empreiteir')) &&
      f.id !== funcionarioParaEditar?.id,
  );

  useEffect(() => {
    if (funcionarioParaEditar) {
      setNome(funcionarioParaEditar.nome);
      setApelido(funcionarioParaEditar.apelido || '');
      setFuncao(funcionarioParaEditar.funcao);
      setRegime(funcionarioParaEditar.regime || 'diarista');
      setSalario(String(funcionarioParaEditar.salario || '3500'));
      setDiaria(String(funcionarioParaEditar.diaria || '200'));
      setTelefone(funcionarioParaEditar.telefone || '');
      setCpf(funcionarioParaEditar.cpf || '');
      setChavePix(funcionarioParaEditar.chavePix || '');
      setTipoPix(funcionarioParaEditar.tipoPix || 'outro');
      setEmpreiteiroId(funcionarioParaEditar.empreiteiroId || '');
      setAdmissao(funcionarioParaEditar.admissao);
      setObraPadraoId(funcionarioParaEditar.obraPadraoId || '');
    } else {
      setNome('');
      setApelido('');
      setFuncao('pedreiro');
      setRegime('diarista');
      setSalario('3500');
      setDiaria('200');
      setTelefone('');
      setCpf('');
      setChavePix('');
      setTipoPix('outro');
      setEmpreiteiroId('');
      setAdmissao(today());
      setObraPadraoId(data.obras[0]?.id || '');
    }
    setCriandoNovaFuncao(false);
    setNomeNovaFuncao('');
  }, [funcionarioParaEditar, open, data.obras]);

  // Atalhos para chave Pix
  const aplicarTelefoneComoPix = () => {
    if (!telefone.trim()) {
      toast('Preencha o número de telefone/WhatsApp primeiro.', 'error');
      return;
    }
    setChavePix(telefone.trim());
    setTipoPix('telefone');
    toast('Chave Pix configurada com o Telefone.');
  };

  const aplicarCpfComoPix = () => {
    if (!cpf.trim()) {
      toast('Preencha o CPF primeiro.', 'error');
      return;
    }
    setChavePix(cpf.trim());
    setTipoPix('cpf');
    toast('Chave Pix configurada com o CPF.');
  };

  // Adicionar nova função dinamicamente
  const handleAdicionarNovaFuncao = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nomeLimpo = nomeNovaFuncao.trim();
    if (!nomeLimpo) return;

    // Converte para id minúsculo sem acentos
    const idChave = nomeLimpo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');

    mutate((d) => {
      d.funcoesCustomizadas ??= [];
      if (!d.funcoesCustomizadas.includes(nomeLimpo)) {
        d.funcoesCustomizadas.push(nomeLimpo);
      }
    });

    setFuncao(nomeLimpo);
    setCriandoNovaFuncao(false);
    setNomeNovaFuncao('');
    toast(`Nova função "${nomeLimpo}" cadastrada e selecionada!`);
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    const salNum = round2(Number(salario.replace(',', '.')) || 0);
    const diaNum = round2(Number(diaria.replace(',', '.')) || 0);

    const dadosFuncionario = {
      nome: nome.trim(),
      apelido: apelido.trim() || undefined,
      funcao,
      regime,
      salario: regime === 'mensalista' ? salNum : 0,
      diaria: regime !== 'mensalista' ? diaNum : 0,
      telefone: telefone.trim(),
      cpf: cpf.trim() || undefined,
      chavePix: chavePix.trim() || undefined,
      tipoPix: chavePix.trim() ? tipoPix : undefined,
      empreiteiroId: funcao !== 'empreiteiro' && empreiteiroId ? empreiteiroId : undefined,
      admissao,
      obraPadraoId: obraPadraoId || undefined,
    };

    if (funcionarioParaEditar) {
      mutate(
        (d) => {
          const idx = d.funcionarios.findIndex((f) => f.id === funcionarioParaEditar.id);
          if (idx !== -1) {
            // Se for encarregado, mantém os campos bloqueados intactos
            if (!isAdmin) {
              d.funcionarios[idx] = {
                ...d.funcionarios[idx],
                nome: dadosFuncionario.nome,
                apelido: dadosFuncionario.apelido,
                telefone: dadosFuncionario.telefone,
                cpf: dadosFuncionario.cpf,
                chavePix: dadosFuncionario.chavePix,
                tipoPix: dadosFuncionario.tipoPix,
                obraPadraoId: dadosFuncionario.obraPadraoId,
                empreiteiroId: dadosFuncionario.empreiteiroId,
              };
            } else {
              d.funcionarios[idx] = {
                ...d.funcionarios[idx],
                ...dadosFuncionario,
              };
            }
          }
        },
        { acao: 'Equipe', descricao: `Atualizou colaborador "${nome.trim()}"` },
      );
      toast(`Dados de ${nome.trim()} atualizados`);
    } else {
      const novo: Funcionario = {
        id: uid('fn'),
        ...dadosFuncionario,
        ativo: true,
      };
      mutate(
        (d) => {
          d.funcionarios.push(novo);
        },
        {
          acao: 'Equipe',
          descricao: `Cadastrou ${getLabelFuncao(funcao)} "${nome.trim()}" (${
            regime === 'mensalista' ? `Salário: ${fmtBRL(salNum)}` : `Diária: ${fmtBRL(diaNum)}`
          })`,
        },
      );
      toast(`Colaborador ${nome.trim()} cadastrado com sucesso`);
    }

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={funcionarioParaEditar ? 'Editar Colaborador' : 'Novo Colaborador'}
      subtitle={
        funcionarioParaEditar
          ? !isAdmin
            ? 'Encarregado: você pode editar Nome, Apelido, Telefone, CPF, Chave Pix e Obra Padrão.'
            : 'Edição completa de cadastro, remuneração e alocação do colaborador.'
          : 'Cadastre operários de campo, encarregados ou empreiteiros, com diária semanal, quinzenal ou salário fixo'
      }
      wide
    >
      <form onSubmit={salvar} className="space-y-4">
        {/* Aviso para encarregado na edição */}
        {isEdicao && !isAdmin && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
            <ShieldAlert className="size-4 shrink-0" />
            <span>
              <strong>Permissão de Encarregado:</strong> Alterações de remuneração (diária/salário), função e regime de pagamento são restritas ao Administrador.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome Completo">
            <Input
              required
              placeholder="Ex.: José Carlos da Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
            />
          </Field>

          <Field label="Apelido (como é conhecido no canteiro)">
            <Input
              placeholder="Ex.: Zé, Baiano, Alemão..."
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
            />
          </Field>
        </div>

        {/* Função com adição dinâmica */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-fg">Função / Cargo</label>
              {podeEditarFuncaoRegime && !criandoNovaFuncao && (
                <button
                  type="button"
                  onClick={() => setCriandoNovaFuncao(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline cursor-pointer"
                >
                  <Plus className="size-3" />
                  + Nova Função
                </button>
              )}
            </div>

            {criandoNovaFuncao ? (
              <div className="flex items-center gap-1.5">
                <Input
                  autoFocus
                  placeholder="Nome do novo cargo..."
                  value={nomeNovaFuncao}
                  onChange={(e) => setNomeNovaFuncao(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAdicionarNovaFuncao();
                    }
                  }}
                  className="h-10 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => handleAdicionarNovaFuncao()}
                  disabled={!nomeNovaFuncao.trim()}
                >
                  OK
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCriandoNovaFuncao(false);
                    setNomeNovaFuncao('');
                  }}
                >
                  ✕
                </Button>
              </div>
            ) : (
              <Select
                value={funcao}
                onChange={(e) => setFuncao(e.target.value)}
                disabled={!podeEditarFuncaoRegime}
                className={!podeEditarFuncaoRegime ? 'opacity-70 cursor-not-allowed bg-surface-2' : ''}
              >
                {funcoesDisponiveis.map((f) => (
                  <option key={f} value={f}>
                    {getLabelFuncao(f)}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <Field label="Regime de Pagamento">
            <Select
              value={regime}
              onChange={(e) => setRegime(e.target.value as Regime)}
              disabled={!podeEditarFuncaoRegime}
              className={!podeEditarFuncaoRegime ? 'opacity-70 cursor-not-allowed bg-surface-2' : ''}
            >
              <option value="diarista">Diarista Semanal</option>
              <option value="diarista_quinzenal">Diarista Quinzenal</option>
              <option value="mensalista">Mensalista (Fixo)</option>
            </Select>
          </Field>
        </div>

        {/* Remuneração */}
        {regime === 'mensalista' ? (
          <Field label="Salário Fixo Mensal (R$)">
            <Input
              required={podeEditarRemuneracao}
              inputMode="decimal"
              placeholder={podeEditarRemuneracao ? 'Ex.: 4500,00' : 'Valor Confidencial (Apenas Administrador)'}
              value={podeEditarRemuneracao ? salario : '••••••••'}
              onChange={(e) => setSalario(e.target.value.replace(/[^\d,.]/g, ''))}
              disabled={!podeEditarRemuneracao}
              className={!podeEditarRemuneracao ? 'opacity-70 cursor-not-allowed bg-surface-2' : ''}
            />
          </Field>
        ) : (
          <Field
            label={`Valor da Diária (${regime === 'diarista_quinzenal' ? 'Pagamento Quinzenal' : 'Pagamento Semanal'}) (R$)`}
          >
            <Input
              required={podeEditarRemuneracao}
              inputMode="decimal"
              placeholder={podeEditarRemuneracao ? 'Ex.: 220,00' : 'Valor Confidencial (Apenas Administrador)'}
              value={podeEditarRemuneracao ? diaria : '••••••••'}
              onChange={(e) => setDiaria(e.target.value.replace(/[^\d,.]/g, ''))}
              disabled={!podeEditarRemuneracao}
              className={!podeEditarRemuneracao ? 'opacity-70 cursor-not-allowed bg-surface-2' : ''}
            />
          </Field>
        )}

        {/* Contato, Documento & Chave Pix com Atalhos Rápidos */}
        <div className="space-y-2 rounded-xl border border-line bg-surface-2/40 p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="CPF do Colaborador (Opcional)">
              <Input
                placeholder="Ex.: 000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
              />
            </Field>

            <Field label="Telefone / WhatsApp">
              <Input
                placeholder="(84) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </Field>

            <Field label="Data de Admissão">
              <Input
                type="date"
                required
                value={admissao}
                onChange={(e) => setAdmissao(e.target.value)}
              />
            </Field>
          </div>

          {/* Seção Pix */}
          <div className="pt-2 border-t border-line/60 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-fg">Chave Pix para Pagamento</label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={aplicarTelefoneComoPix}
                  className={cn(
                    'rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer border',
                    tipoPix === 'telefone' && chavePix === telefone && telefone.trim()
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : 'border-line bg-surface text-muted hover:text-fg hover:bg-surface-2',
                  )}
                  title="Copiar o número do WhatsApp como Chave Pix"
                >
                  Telefone é o Pix
                </button>
                <button
                  type="button"
                  onClick={aplicarCpfComoPix}
                  className={cn(
                    'rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer border',
                    tipoPix === 'cpf' && chavePix === cpf && cpf.trim()
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : 'border-line bg-surface text-muted hover:text-fg hover:bg-surface-2',
                  )}
                  title="Copiar o CPF como Chave Pix"
                >
                  CPF é o Pix
                </button>
              </div>
            </div>

            <Input
              placeholder="Digite a Chave Pix ou clique nos atalhos acima..."
              value={chavePix}
              onChange={(e) => {
                setChavePix(e.target.value);
                setTipoPix('outro');
              }}
            />
          </div>
        </div>

        {/* Empreiteiro Responsável e Obra Padrão */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Obra Padrão / Principal (Opcional)">
            <Select value={obraPadraoId} onChange={(e) => setObraPadraoId(e.target.value)}>
              <option value="">Sem obra fixa (Atua em várias)</option>
              {data.obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Select>
          </Field>

          {funcao !== 'empreiteiro' && (
            <Field label="Empreiteiro Responsável (Opcional)">
              <Select value={empreiteiroId} onChange={(e) => setEmpreiteiroId(e.target.value)}>
                <option value="">Nenhum (Diretor da Construtora / Próprio)</option>
                {empreiteiros.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nome} ({getLabelFuncao(emp.funcao)})
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        <div className="flex gap-2 pt-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar Colaborador</Button>
        </div>
      </form>
    </Dialog>
  );
}
