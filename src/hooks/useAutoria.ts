import { useCallback } from "react";
import { useQueries, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { getAutoriaDeputado, getAutoriaSenador, getProposicaoVotacoes, getSenadoVotacoesDaMateria, getSituacaoProposicao, type SituacaoProposicao } from "@/lib/api";
import { DeliberacaoBuilder } from "@/lib/deliberacoes";
import type { Parlamentar, Proposicao, Votacao } from "@/lib/types";

const HORA = 60 * 60 * 1000;

/** Every bill the member authored or co-authored. */
export function useAutoria(parlamentar?: Parlamentar) {
  const numerico = parlamentar?.id.replace(/^(camara|senado)-/, "");
  return useQuery({
    queryKey: ["autoria", parlamentar?.id],
    queryFn: () =>
      parlamentar?.casa === "senado"
        ? getAutoriaSenador(numerico as string, parlamentar.nome)
        : getAutoriaDeputado(numerico as string),
    enabled: !!numerico,
    staleTime: HORA,
  });
}

function juntarSituacoes(results: UseQueryResult<SituacaoProposicao>[]) {
  return results.map((r) => ({ situacao: r.data, carregando: r.isPending }));
}

/** Câmara lists carry no status, so it is read per visible proposal; Senate lists already have it. */
export function useSituacoes(propostas: Proposicao[]) {
  const camara = propostas.filter((p) => p.casa === "camara");
  const resultados = useQueries({
    queries: camara.map((p) => ({ queryKey: ["proposicao-situacao", p.id], queryFn: () => getSituacaoProposicao(p.id), staleTime: HORA })),
    combine: juntarSituacoes,
  });
  const porId = new Map(camara.map((p, i) => [p.id, resultados[i]]));
  return (p: Proposicao) =>
    p.casa === "camara"
      ? porId.get(p.id) ?? { situacao: undefined, carregando: false }
      : { situacao: { situacao: p.status, dataSituacao: p.situacaoData } as SituacaoProposicao, carregando: false };
}

export function chaveVotacoesProposta(p: Pick<Proposicao, "casa" | "id">) {
  return ["votacoes-proposta", p.casa, p.id] as const;
}

export function buscarVotacoesProposta(p: Pick<Proposicao, "casa" | "id">): Promise<Votacao[]> {
  return p.casa === "senado" ? getSenadoVotacoesDaMateria(p.id) : getProposicaoVotacoes(p.id);
}

/** The main vote of the latest session that voted the bill, preferring the floor over committees. */
export function votacaoDeReferencia(votacoes?: Votacao[]): Votacao | undefined {
  if (!votacoes?.length) return undefined;
  const plenario = votacoes.filter((v) => v.plenario || v.casa === "senado");
  return DeliberacaoBuilder.agrupar(plenario.length ? plenario : votacoes)[0]?.principal;
}

/** Resolves a proposal's reference vote on demand (cached), for "Ver votação" buttons. */
export function useBuscarVotacao() {
  const qc = useQueryClient();
  return useCallback(
    async (p: Proposicao) =>
      votacaoDeReferencia(await qc.fetchQuery({ queryKey: chaveVotacoesProposta(p), queryFn: () => buscarVotacoesProposta(p), staleTime: HORA })),
    [qc]
  );
}
