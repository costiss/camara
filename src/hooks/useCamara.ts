import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import {
  countProposicoes,
  countVotacoes,
  getAutores,
  getDeputado,
  getDeputados,
  getEventoPauta,
  getEventos,
  getPartidos,
  getPecsVotadasNoAno,
  getProposicao,
  getProposicaoVotacoes,
  getProposicoes,
  getProposicoesPorAutor,
  getTramitacoes,
  getVotacao,
  turnoDe,
  getVotacaoOrientacoes,
  getVotacaoVotos,
  getVotacoes,
  type ProposicoesQuery,
} from "@/lib/api";

const STALE = 5 * 60 * 1000;

export function useDeputados() {
  return useQuery({
    queryKey: ["deputados"],
    queryFn: getDeputados,
    staleTime: 30 * 60 * 1000,
  });
}

export function useDeputado(id?: number | string) {
  return useQuery({
    queryKey: ["deputado", id],
    queryFn: () => getDeputado(id as number | string),
    enabled: id !== undefined && id !== null,
    staleTime: STALE,
  });
}

export function usePartidos() {
  return useQuery({
    queryKey: ["partidos"],
    queryFn: getPartidos,
    staleTime: 60 * 60 * 1000,
  });
}

export function useProposicoes(query: ProposicoesQuery = {}) {
  return useQuery({
    queryKey: ["proposicoes", query],
    queryFn: () => getProposicoes(query),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });
}

export function useProposicao(id?: number | string) {
  return useQuery({
    queryKey: ["proposicao", id],
    queryFn: () => getProposicao(id as number | string),
    enabled: id !== undefined && id !== null,
    staleTime: STALE,
  });
}

/** Fetch detail (and therefore current status) for a page of PECs. */
export function useProposicaoDetalhes(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["proposicao", id],
      queryFn: () => getProposicao(id),
      staleTime: STALE,
    })),
  });
}

export function useTramitacoes(id?: number | string) {
  return useQuery({
    queryKey: ["tramitacoes", id],
    queryFn: () => getTramitacoes(id as number | string),
    enabled: id !== undefined && id !== null,
    staleTime: STALE,
  });
}

export function useAutores(id?: number | string) {
  return useQuery({
    queryKey: ["autores", id],
    queryFn: () => getAutores(id as number | string),
    enabled: id !== undefined && id !== null,
    staleTime: STALE,
  });
}

export function useProposicaoVotacoes(id?: number | string) {
  return useQuery({
    queryKey: ["proposicao-votacoes", id],
    queryFn: () => getProposicaoVotacoes(id as number | string),
    enabled: id !== undefined && id !== null,
    staleTime: STALE,
  });
}

/** Which Câmara propositions had a merit vote (1st/2nd round) on the floor. */
export function useProposicoesVotadas(ids: string[], enabled = true) {
  const queries = useQueries({
    queries: (enabled ? ids : []).map((id) => ({
      queryKey: ["proposicao-votacoes", id],
      queryFn: () => getProposicaoVotacoes(id),
      staleTime: 10 * 60 * 1000,
    })),
  });
  const map = new Map<string, boolean>();
  if (enabled) {
    ids.forEach((id, i) =>
      map.set(id, (queries[i]?.data ?? []).some((v) => v.plenario && turnoDe(v.descricao) !== null))
    );
  }
  return {
    map,
    isLoading: enabled && queries.some((q) => q.isLoading),
  };
}

/** PECs whose merit was voted on the Câmara floor during `ano`. */
export function usePecsVotadasNoAno(ano: number, enabled = true) {
  return useQuery({
    queryKey: ["pecs-votadas-ano", ano],
    queryFn: () => getPecsVotadasNoAno(ano),
    enabled,
    staleTime: 30 * 60 * 1000,
  });
}

export function useProposicoesPorAutor(id?: number | string) {
  return useQuery({
    queryKey: ["proposicoes-autor", id],
    queryFn: () => getProposicoesPorAutor(id as number | string, 12),
    enabled: id !== undefined && id !== null,
    staleTime: STALE,
  });
}

export function useVotacoes(query: {
  dataInicio: string;
  dataFim: string;
  itens?: number;
  pagina?: number;
  idOrgao?: number;
}) {
  return useQuery({
    queryKey: ["votacoes", query],
    queryFn: () => getVotacoes(query),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });
}

export function useVotacaoVotos(id?: string) {
  return useQuery({
    queryKey: ["votacao-votos", id],
    queryFn: () => getVotacaoVotos(id as string),
    enabled: !!id,
    staleTime: STALE,
  });
}

export function useVotacaoOrientacoes(id?: string) {
  return useQuery({
    queryKey: ["votacao-orientacoes", id],
    queryFn: () => getVotacaoOrientacoes(id as string),
    enabled: !!id,
    staleTime: STALE,
  });
}

export function useVotacao(id?: string) {
  return useQuery({
    queryKey: ["votacao", id],
    queryFn: () => getVotacao(id as string),
    enabled: !!id,
    staleTime: STALE,
  });
}

export function useEventos(query: {
  dataInicio: string;
  dataFim: string;
  itens?: number;
  ordem?: "ASC" | "DESC";
}) {
  return useQuery({
    queryKey: ["eventos", query],
    queryFn: () => getEventos(query),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });
}

export function useEventoPauta(eventoId?: number | string) {
  return useQuery({
    queryKey: ["evento-pauta", eventoId],
    queryFn: () => getEventoPauta(eventoId as number | string),
    enabled: eventoId !== undefined && eventoId !== null,
    staleTime: STALE,
  });
}

/** Historical series: how many PECs of each year exist. */
export function usePecCounts(anos: number[]) {
  const results = useQueries({
    queries: anos.map((ano) => ({
      queryKey: ["pec-count", ano],
      queryFn: () => countProposicoes("PEC", ano),
      staleTime: 60 * 60 * 1000,
    })),
  });
  const data = anos.map((ano, i) => ({
    ano,
    total: results[i]?.data ?? 0,
  }));
  return { data, isLoading: results.some((r) => r.isLoading) };
}

/** Historical series: votes per month over a window. */
export function useVotacoesMensais(
  meses: { inicio: string; fim: string; label: string }[]
) {
  const results = useQueries({
    queries: meses.map((m) => ({
      queryKey: ["votacoes-count", m.inicio, m.fim],
      queryFn: () => countVotacoes(m.inicio, m.fim),
      staleTime: 60 * 60 * 1000,
    })),
  });
  const data = meses.map((m, i) => ({
    label: m.label,
    total: results[i]?.data ?? 0,
  }));
  return { data, isLoading: results.some((r) => r.isLoading) };
}
