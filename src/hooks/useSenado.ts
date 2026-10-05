import { useQuery } from "@tanstack/react-query";
import type { Intervalo } from "@/lib/periodo";
import {
  getSenadoVotacoes,
  getSenador,
  getSenadorVotacoes,
  getSenadores,
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

