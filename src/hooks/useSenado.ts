import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Intervalo } from "@/lib/periodo";
import type { SessaoPlenario } from "@/lib/types";
import { isoDate } from "@/lib/format";
import {
  getSenadoVotacoes,
  getSenador,
  getSenadorVotacoes,
  getSenadores,
  getSessaoAoVivo,
} from "@/lib/api";

const STALE = 5 * 60 * 1000;

/** While a session runs, poll often enough to feel live; otherwise back off. */
const AO_VIVO_MS = 30_000;
const PARADO_MS = 90_000;

export function useSenadores() {
  return useQuery({
    queryKey: ["senadores"],
    queryFn: getSenadores,
    staleTime: 30 * 60 * 1000,
  });
}

export function useSenador(codigo?: number | string) {
  return useQuery({
    queryKey: ["senador", codigo],
    queryFn: () => getSenador(codigo as number | string),
    enabled: codigo !== undefined && codigo !== null,
    staleTime: STALE,
  });
}

export function useSenadorVotacoes(codigo?: number | string) {
  return useQuery({
    queryKey: ["senador-votacoes", codigo],
    queryFn: () => getSenadorVotacoes(codigo as number | string),
    enabled: codigo !== undefined && codigo !== null,
    staleTime: STALE,
  });
}

export function useSenadoVotacoes(intervalo?: Intervalo, enabled = true) {
  return useQuery({
    queryKey: ["senado-votacoes", intervalo?.ini, intervalo?.fim],
    queryFn: () => getSenadoVotacoes(intervalo),
    enabled,
    staleTime: STALE,
  });
}

export interface SessaoAoVivoResult {
  /** Every floor session on today's agenda. */
  sessoes: SessaoPlenario[];
  /** The one currently in progress, if any. */
  sessao?: SessaoPlenario;
  isLoading: boolean;
  /** When the data was last refreshed, for an "atualizado às" hint. */
  atualizadoEm: number;
}

/**
 * Today's Senate floor session, refreshed on a timer while it runs.
 *
 * The interval is short only during a session and pauses while the tab is in
 * the background; the proxy caches both upstream paths for 30 s, so all
 * visitors together cost one upstream call per window.
 */
export function useSessaoAoVivo(): SessaoAoVivoResult {
  const [data] = useState(() => isoDate(new Date()));
  const q = useQuery({
    queryKey: ["sessao-ao-vivo", data],
    queryFn: () => getSessaoAoVivo(data),
    staleTime: AO_VIVO_MS,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.data?.some((s) => s.emAndamento) ? AO_VIVO_MS : PARADO_MS,
  });
  const sessoes = q.data ?? [];
  return {
    sessoes,
    sessao: sessoes.find((s) => s.emAndamento),
    isLoading: q.isLoading,
    atualizadoEm: q.dataUpdatedAt,
  };
}

