import type { Apontamento, Funcionario, ISODate } from '@/domain/types';
import { getLabelFuncao } from '@/domain/labels';
import { chaveApontamento } from '@/domain/engine';
import { addDays } from '@/lib/dates';
import { normalizarTexto } from '@/lib/utils';

export interface FiltroGradeOptions {
  busca: string;
  filtroFuncao: string;
  filtroObra: string;
  filtroEmpreiteiro: string;
  isAdmin: boolean;
  apontamentos?: Record<string, Apontamento>;
  diasSemana?: ISODate[];
}

export function filtrarColaboradoresGrade(
  funcionarios: Funcionario[],
  opts: FiltroGradeOptions,
): Funcionario[] {
  const { busca, filtroFuncao, filtroObra, filtroEmpreiteiro, isAdmin, apontamentos, diasSemana } = opts;

  return funcionarios
    .filter((f) => f.ativo)
    .filter((f) => {
      if (filtroFuncao !== 'todos' && f.funcao !== filtroFuncao) return false;

      if (filtroEmpreiteiro !== 'todos') {
        if (f.id !== filtroEmpreiteiro && f.empreiteiroId !== filtroEmpreiteiro) {
          return false;
        }
      }

      if (filtroObra !== 'todas') {
        const temObraPadrao = f.obraPadraoId === filtroObra;
        const tevePresencaNaObra =
          apontamentos && diasSemana
            ? diasSemana.some((dia) => {
                const k = chaveApontamento(f.id, dia);
                const ap = apontamentos[k];
                if (!ap || ap.status === 'falta') return false;
                if (ap.centroIds && ap.centroIds.length > 0) {
                  return ap.centroIds.includes(filtroObra);
                }
                return ap.centroId === filtroObra;
              })
            : false;
        if (!temObraPadrao && !tevePresencaNaObra) return false;
      }

      if (busca.trim()) {
        const qTrim = busca.trim();
        const qNorm = normalizarTexto(qTrim);
        const qDigits = qTrim.replace(/\D/g, '');
        const matchNome = normalizarTexto(f.nome).includes(qNorm);
        const matchApelido = f.apelido?.trim() ? normalizarTexto(f.apelido).includes(qNorm) : false;
        const matchFuncao =
          normalizarTexto(f.funcao).includes(qNorm) ||
          normalizarTexto(getLabelFuncao(f.funcao)).includes(qNorm);

        if (!isAdmin) {
          return matchNome || matchApelido || matchFuncao;
        }

        const matchTelefone =
          f.telefone.includes(qTrim) ||
          (qDigits.length > 0 && f.telefone.replace(/\D/g, '').includes(qDigits));
        const matchCpf = f.cpf
          ? f.cpf.includes(qTrim) || (qDigits.length > 0 && f.cpf.replace(/\D/g, '').includes(qDigits))
          : false;

        return matchNome || matchApelido || matchFuncao || matchTelefone || matchCpf;
      }

      return true;
    })
    .sort((a, b) => {
      const nomeA = (a.apelido?.trim() || a.nome).trim();
      const nomeB = (b.apelido?.trim() || b.nome).trim();
      return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
    });
}

export function encontrarUltimoDiaComApontamentos(
  apontamentos: Record<string, Apontamento>,
  diaAlvo: ISODate,
  maxDiasBusca = 30,
): ISODate | null {
  const entries = Object.values(apontamentos);
  if (entries.length === 0) return null;

  for (let i = 1; i <= maxDiasBusca; i++) {
    const candidato = addDays(diaAlvo, -i);
    if (entries.some((a) => a.data === candidato)) {
      return candidato;
    }
  }
  return null;
}

export interface ItemCopiaApontamento {
  funcionarioId: string;
  origem: Apontamento;
}

export function planejarCopiaUltimoDia(
  funcionarios: Funcionario[],
  apontamentos: Record<string, Apontamento>,
  diaOrigem: ISODate,
  diaDestino: ISODate,
): ItemCopiaApontamento[] {
  const itens: ItemCopiaApontamento[] = [];

  for (const f of funcionarios) {
    if (!f.ativo) continue;
    const keyDestino = chaveApontamento(f.id, diaDestino);
    // Só preenche colaboradores que ainda estão no estado Pendente (sem lançamento)
    if (apontamentos[keyDestino]) continue;

    const keyOrigem = chaveApontamento(f.id, diaOrigem);
    const apOrigem = apontamentos[keyOrigem];
    if (!apOrigem) continue;

    itens.push({ funcionarioId: f.id, origem: apOrigem });
  }

  return itens;
}
