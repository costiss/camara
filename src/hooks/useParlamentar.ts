import { useMemo } from "react";
import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { getVotacaoOrientacoes, getVotacaoVotos } from "@/lib/api";
import type { Deliberacao } from "@/lib/deliberacoes";
import { HistoricoParlamentar, type RegistroVoto, type ResumoHistorico } from "@/lib/historico";
import type { Casa, OrientacaoBancada, Parlamentar, Votacao, VotoParlamentar } from "@/lib/types";
import { useDeputado, useDeputados } from "./useCamara";
import { useDeliberacoes } from "./useDeliberacoes";
import { useSenador, useSenadores } from "./useSenado";

const STALE = 5 * 60 * 1000;

export function casaDoParlamentar(id: string): Casa {
  return id.startsWith("senado-") ? "senado" : "camara";
}

/** Profile from the cached member list, completed by the detail endpoint. */
export function useParlamentar(id: string) {
  const casa = casaDoParlamentar(id);
  const numerico = id.replace(/^(camara|senado)-/, "");
  const deputados = useDeputados();
  const senadores = useSenadores();
  const deputado = useDeputado(casa === "camara" ? numerico : undefined);
  const senador = useSenador(casa === "senado" ? numerico : undefined);
  const lista = casa === "camara" ? deputados : senadores;
  const detalhe = casa === "camara" ? deputado : senador;

  const parlamentar = useMemo<Parlamentar | undefined>(() => {
    const basico = lista.data?.find((p) => p.id === id);
    if (!basico && !detalhe.data) return undefined;
    return { ...(basico ?? { id, casa, nome: "", partido: "", uf: "" }), ...(detalhe.data ?? {}), id, casa };
  }, [lista.data, detalhe.data, id, casa]);

  return { parlamentar, isLoading: !parlamentar && (lista.isLoading || detalhe.isLoading), isError: !parlamentar && detalhe.isError && !lista.isLoading };
}

interface Alvo {
  votacao: Votacao;
  deliberacao: Deliberacao;
}

function juntar<T>(results: UseQueryResult<T>[]) {
  return { dados: results.map((r) => r.data), pendentes: results.filter((r) => r.isPending).length };
}

export interface HistoricoResultado {
  registros: RegistroVoto[];
  resumo: ResumoHistorico;
  /** Nominal votes in the period, and how many have been read so far. */
  total: number;
  carregadas: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/** A member's position in every nominal floor vote of the period. */
export function useHistoricoParlamentar(id: string, periodo: string, partidoAtual?: string): HistoricoResultado {
  const casa = casaDoParlamentar(id);
  const feed = useDeliberacoes(casa, periodo);
  const alvos = useMemo<Alvo[]>(
    () => feed.deliberacoes.flatMap((d) => d.votacoes.filter((v) => v.nominal).map((v) => ({ votacao: v, deliberacao: d }))),
    [feed.deliberacoes]
  );
  const ids = casa === "camara" ? alvos.map((a) => a.votacao.id.replace(/^camara-/, "")) : [];

  const votos = useQueries({
    queries: ids.map((vid) => ({ queryKey: ["votacao-votos", vid], queryFn: () => getVotacaoVotos(vid), staleTime: STALE })),
    combine: juntar<VotoParlamentar[]>,
  });
  const orientacoes = useQueries({
    queries: ids.map((vid) => ({ queryKey: ["votacao-orientacoes", vid], queryFn: () => getVotacaoOrientacoes(vid), staleTime: STALE })),
    combine: juntar<OrientacaoBancada[]>,
  });

  const registros = useMemo(() => {
    const historico = new HistoricoParlamentar(id, partidoAtual);
    const out: RegistroVoto[] = [];
    alvos.forEach((a, i) => {
      const lista = casa === "camara" ? votos.dados[i] : a.votacao.votos;
      if (!lista) return;
      out.push(historico.registro({ ...a, votos: lista, orientacoes: casa === "camara" ? (orientacoes.dados[i] ?? []) : [] }));
    });
    return out;
  }, [alvos, casa, votos.dados, orientacoes.dados, id, partidoAtual]);

  const resumo = useMemo(() => HistoricoParlamentar.resumo(registros), [registros]);

  return {
    registros,
    resumo,
    total: alvos.length,
    carregadas: alvos.length - votos.pendentes,
    isLoading: feed.isLoading,
    isError: feed.isError,
    refetch: feed.refetch,
  };
}
