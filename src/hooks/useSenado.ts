import { useQuery } from "@tanstack/react-query";
import type { Intervalo } from "@/lib/periodo";
import type { SessaoAoVivoResult } from "@/lib/aoVivo";
import { useSessao } from "./useSessao";
import {
  getSenadoVotacoes,
  getSenador,
  getSenadorVotacoes,
  getSenadores,
  getSessaoSenado,
} from "@/lib/api";

const STALE = 5 * 60 * 1000;

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

/**
 * The Senate floor session in progress, refreshed on a timer while it runs.
 *
 * The interval is short only during a session and pauses while the tab is in
 * the background; the proxy caches both upstream paths for 30 s, so all
 * visitors together cost one upstream call per window.
 */
export function useSessaoSenado(): SessaoAoVivoResult {
  return useSessao("senado", getSessaoSenado);
}

