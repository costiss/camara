import { useQuery } from "@tanstack/react-query";
import {
  getSenadoProcessos,
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

export function useSenadoVotacoes() {
  return useQuery({
    queryKey: ["senado-votacoes"],
    queryFn: getSenadoVotacoes,
    staleTime: STALE,
  });
}

export function useSenadoProcessos(params: { sigla: string; ano: number }) {
  return useQuery({
    queryKey: ["senado-processos", params],
    queryFn: () => getSenadoProcessos(params),
    staleTime: 30 * 60 * 1000,
  });
}
