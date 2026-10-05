import { useMemo } from "react";
import type { OrientacaoBancada, Votacao, VotoParlamentar } from "@/lib/types";
import { CADEIRAS, completarAusentes, VoteTally } from "@/lib/votos";
import { useDeputados, useProposicao, useVotacao, useVotacaoOrientacoes, useVotacaoVotos } from "./useCamara";
import { useSenadores, useSenadoVotacoes } from "./useSenado";

export interface VotacaoCompleta {
  votacao?: Votacao;
  /** One entry per seat: recorded votes plus current members marked absent. */
  assentos: VotoParlamentar[];
  tally: VoteTally;
  orientacoes: OrientacaoBancada[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/** `data` (YYYY-MM-DD) locates a Senate vote outside the default recent window. */
export function useVotacaoCompleta(id?: string, data?: string): VotacaoCompleta {
  const isCamara = !!id?.startsWith("camara-");
  const rawId = isCamara ? id?.replace(/^camara-/, "") : undefined;

  const detalheQ = useVotacao(rawId);
  const votosQ = useVotacaoVotos(rawId);
  const orientQ = useVotacaoOrientacoes(rawId);
  const propQ = useProposicao(isCamara ? detalheQ.data?.proposicaoId : undefined);
  const senadoQ = useSenadoVotacoes(data ? { ini: data, fim: data } : undefined, !isCamara && !!id);
  const deputados = useDeputados();
  const senadores = useSenadores();

  const votacao = useMemo<Votacao | undefined>(() => {
    if (!id) return undefined;
    if (!isCamara) return senadoQ.data?.find((v) => v.id === id);
    const v = detalheQ.data;
    if (!v) return undefined;
    const p = propQ.data;
    return {
      ...v,
      proposicao: v.proposicao ?? p?.sigla,
      proposicaoTipo: v.proposicaoTipo ?? p?.tipo,
      ementa: v.ementa ?? p?.ementa,
      nominal: v.nominal || (votosQ.data?.length ?? 0) > 0,
    };
  }, [id, isCamara, senadoQ.data, detalheQ.data, propQ.data, votosQ.data]);

  const assentos = useMemo(() => {
    if (!votacao) return [];
    if (isCamara) {
      const votos = votosQ.data ?? [];
      if (votos.length === 0) return [];
      return completarAusentes(votos, deputados.data ?? [], CADEIRAS.camara);
    }
    const fotos = new Map((senadores.data ?? []).map((s) => [s.id, s.foto]));
    return (votacao.votos ?? []).map((v) => ({ ...v, foto: fotos.get(v.parlamentarId) }));
  }, [votacao, isCamara, votosQ.data, deputados.data, senadores.data]);

  const tally = useMemo(
    () => new VoteTally(assentos, CADEIRAS[isCamara ? "camara" : "senado"]),
    [assentos, isCamara]
  );

  return {
    votacao,
    assentos,
    tally,
    orientacoes: orientQ.data ?? [],
    isLoading: isCamara
      ? detalheQ.isLoading || votosQ.isLoading || orientQ.isLoading || propQ.isLoading || deputados.isLoading
      : senadoQ.isLoading || senadores.isLoading,
    isError: isCamara ? detalheQ.isError || votosQ.isError : senadoQ.isError,
    refetch: () => {
      detalheQ.refetch();
      votosQ.refetch();
      senadoQ.refetch();
    },
  };
}
