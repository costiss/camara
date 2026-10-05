import { useQuery } from "@tanstack/react-query";
import {
  getProposicoes,
  getProposicao,
  getProposicaoTramitacoes,
  getProposicaoAutores,
} from "@/lib/api";

export function useProposicoes(
  params: {
    siglaTipo?: string;
    ano?: number;
    itens?: number;
    pagina?: number;
  } = {}
) {
  return useQuery({
    queryKey: ["proposicoes", params],
    queryFn: () => getProposicoes(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProposicao(id: number) {
  return useQuery({
    queryKey: ["proposicao", id],
    queryFn: () => getProposicao(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProposicaoTramitacoes(id: number) {
  return useQuery({
    queryKey: ["tramitacoes", id],
    queryFn: () => getProposicaoTramitacoes(id, { itens: 50 }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProposicaoAutores(id: number) {
  return useQuery({
    queryKey: ["autores", id],
    queryFn: () => getProposicaoAutores(id),
    staleTime: 5 * 60 * 1000,
  });
}
