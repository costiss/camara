import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProposicoesPorIds } from "@/lib/api";
import { Periodo } from "@/lib/periodo";
import { DeliberacaoBuilder, type Deliberacao } from "@/lib/deliberacoes";
import type { Casa, Proposicao, Votacao } from "@/lib/types";
import { useVotacoesPlenario } from "./useCamara";
import { useSenadoVotacoes } from "./useSenado";

const MAX_ROTULOS = 1200;

/** Resolves Câmara proposition ids (vote prefixes) to their sigla/ementa in one request. */
export function useProposicoesPorId(ids: string[]) {
  const q = useQuery({
    queryKey: ["proposicoes-ids", ids],
    queryFn: () => getProposicoesPorIds(ids),
    enabled: ids.length > 0,
    staleTime: 60 * 60 * 1000,
  });
  const map = useMemo(() => new Map((q.data ?? []).map((p) => [p.id, p])), [q.data]);
  return { map, isLoading: q.isLoading };
}

function rotular(v: Votacao, props: Map<string, Proposicao>): Votacao {
  if (v.casa !== "camara" || v.proposicao || !v.proposicaoId) return v;
  const p = props.get(v.proposicaoId);
  return p ? { ...v, proposicao: p.sigla, proposicaoTipo: p.tipo, ementa: p.ementa } : v;
}

export interface DeliberacoesResult {
  deliberacoes: Deliberacao[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/** Floor votes of both houses in a period (default: last 90 days), grouped by deliberation. */
export function useDeliberacoes(casa: Casa | "ambas" = "ambas", periodoValor = Periodo.PADRAO): DeliberacoesResult & { periodo: Periodo } {
  const [hoje] = useState(() => new Date());
  const periodo = useMemo(() => Periodo.de(periodoValor, hoje), [periodoValor, hoje]);
  const camaraOn = casa !== "senado";
  const senadoOn = casa !== "camara";
  const camaraQ = useVotacoesPlenario(periodo, camaraOn);
  const senadoQ = useSenadoVotacoes({ ini: periodo.ini, fim: periodo.fim }, senadoOn);

  const camara = useMemo(() => (casa === "senado" ? [] : (camaraQ.data ?? [])), [casa, camaraQ.data]);
  const senado = useMemo(() => (casa === "camara" ? [] : (senadoQ.data ?? [])), [casa, senadoQ.data]);

  const ids = useMemo(
    () => [...new Set(camara.map((v) => v.proposicaoId).filter(Boolean) as string[])].sort().slice(0, MAX_ROTULOS),
    [camara]
  );
  const rotulos = useProposicoesPorId(ids);
  const props = rotulos.map;

  const deliberacoes = useMemo(
    () => DeliberacaoBuilder.agrupar([...camara.map((v) => rotular(v, props)), ...senado]),
    [camara, senado, props]
  );

  return {
    periodo,
    deliberacoes,
    isLoading: (camaraOn && (camaraQ.isLoading || rotulos.isLoading)) || (senadoOn && senadoQ.isLoading),
    isError: (!camaraOn || camaraQ.isError) && (!senadoOn || senadoQ.isError),
    refetch: () => {
      camaraQ.refetch();
      senadoQ.refetch();
    },
  };
}
