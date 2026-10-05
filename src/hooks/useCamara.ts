import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import type { Periodo } from "@/lib/periodo";
import {
  countVotacoes,
  getAutores,
  getDeputado,
  getDeputados,
  getEventoPauta,
  getEventos,
  getPartidos,
  getProposicao,
  getProposicaoVotacoes,
  getProposicoesPorAutor,
  getTramitacoes,
  getVotacao,
  getVotacoesPlenario,
  getVotacaoOrientacoes,
  getVotacaoVotos,
  getVotacoes,
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

export function useProposicao(id?: number | string) {
  return useQuery({
    queryKey: ["proposicao", id],
    queryFn: () => getProposicao(id as number | string),
    enabled: id !== undefined && id !== null,
    staleTime: STALE,
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

export function useVotacoesPlenario(periodo: Periodo, enabled = true) {
  return useQuery({
    queryKey: ["votacoes-plenario", periodo.ini, periodo.fim],
    queryFn: async () => {
      const partes = await Promise.all(periodo.janelasTrimestrais().map((j) => getVotacoesPlenario(j.ini, j.fim)));
      return partes.flat();
    },
    enabled,
    staleTime: STALE,
  });
}

export function useEventos(query: {
  dataInicio: string;
  dataFim: string;
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
