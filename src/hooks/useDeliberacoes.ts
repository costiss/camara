import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProposicoesPorIds } from "@/lib/api";
import { addDays, isoDate } from "@/lib/format";
import { DeliberacaoBuilder, type Deliberacao } from "@/lib/deliberacoes";
import type { Casa, Proposicao, Votacao } from "@/lib/types";
import { useVotacoesPlenario } from "./useCamara";
import { useSenadoVotacoes } from "./useSenado";

const JANELA_DIAS = 89;
const MAX_ROTULOS = 400;

/** Resolves Câmara proposition ids (vote prefixes) to their sigla/ementa in one request. */
export function useProposicoesPorId(ids: string[]) {
  const q = useQuery({
    queryKey: ["proposicoes-ids", ids],
    queryFn: () => getProposicoesPorIds(ids),
    enabled: ids.length > 0,
    staleTime: 60 * 60 * 1000,
  });
  return useMemo(() => new Map((q.data ?? []).map((p) => [p.id, p])), [q.data]);
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

/** Floor votes of both houses over the last ~90 days, grouped by deliberation. */
export function useDeliberacoes(casa: Casa | "ambas" = "ambas"): DeliberacoesResult {
  const [hoje] = useState(() => new Date());
  const camaraQ = useVotacoesPlenario(isoDate(addDays(hoje, -JANELA_DIAS)), isoDate(hoje));
  const senadoQ = useSenadoVotacoes();

  const camara = useMemo(() => (casa === "senado" ? [] : (camaraQ.data ?? [])), [casa, camaraQ.data]);
  const senado = useMemo(() => (casa === "camara" ? [] : (senadoQ.data ?? [])), [casa, senadoQ.data]);

  const ids = useMemo(
    () => [...new Set(camara.map((v) => v.proposicaoId).filter(Boolean) as string[])].sort().slice(0, MAX_ROTULOS),
    [camara]
  );
  const props = useProposicoesPorId(ids);

  const deliberacoes = useMemo(
    () => DeliberacaoBuilder.agrupar([...camara.map((v) => rotular(v, props)), ...senado]),
    [camara, senado, props]
  );

  const camaraOn = casa !== "senado";
  const senadoOn = casa !== "camara";
  return {
    deliberacoes,
    isLoading: (camaraOn && camaraQ.isLoading) || (senadoOn && senadoQ.isLoading),
    isError: (!camaraOn || camaraQ.isError) && (!senadoOn || senadoQ.isError),
    refetch: () => {
      camaraQ.refetch();
      senadoQ.refetch();
    },
  };
}
