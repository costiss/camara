import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSessoesCamara, getSessoesSenado } from "@/lib/api";
import type { SessaoPauta } from "@/lib/types";

const STALE = 5 * 60 * 1000;

export interface SessoesResult {
  sessoes: SessaoPauta[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/** Every session with an order paper in the window, both houses, newest first. */
export function useSessoes(intervalo: { ini: string; fim: string }): SessoesResult {
  const camara = useQuery({
    queryKey: ["sessoes-camara", intervalo.ini, intervalo.fim],
    queryFn: () => getSessoesCamara({ dataInicio: intervalo.ini, dataFim: intervalo.fim, ordem: "DESC" }),
    staleTime: STALE,
  });
  const senado = useQuery({
    queryKey: ["sessoes-senado", intervalo.ini, intervalo.fim],
    queryFn: () => getSessoesSenado(intervalo),
    staleTime: STALE,
  });

  const sessoes = useMemo(
    () =>
      [...(camara.data ?? []), ...(senado.data ?? [])].sort(
        (a, b) => b.data.localeCompare(a.data) || (b.hora ?? "").localeCompare(a.hora ?? "")
      ),
    [camara.data, senado.data]
  );

  return {
    sessoes,
    isLoading: camara.isLoading || senado.isLoading,
    isError: camara.isError && senado.isError,
    refetch: () => {
      camara.refetch();
      senado.refetch();
    },
  };
}
