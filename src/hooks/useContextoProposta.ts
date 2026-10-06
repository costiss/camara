import { useQuery } from "@tanstack/react-query";
import { getContextoMateria, getContextoProposicao } from "@/lib/api";
import type { Votacao } from "@/lib/types";

/** Status, themes and authors of the proposal behind a vote (Câmara proposal or Senate matter). */
export function useContextoProposta(votacao?: Votacao, ativo = true) {
  const id = votacao?.proposicaoId;
  return useQuery({
    queryKey: ["contexto-proposta", votacao?.casa, id],
    queryFn: () => (votacao?.casa === "senado" ? getContextoMateria(id as string) : getContextoProposicao(id as string)),
    enabled: !!id && ativo,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}
