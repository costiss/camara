import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AO_VIVO_MS, PARADO_MS, type SessaoAoVivoResult } from "@/lib/aoVivo";
import { isoDate } from "@/lib/format";
import type { SessaoAoVivo } from "@/lib/types";

type Buscar = (data: string) => Promise<SessaoAoVivo | undefined>;

/**
 * Shared polling for a house's live floor session: short interval while a
 * session runs, longer otherwise, and paused while the tab is in the
 * background. The proxy caches the upstream paths, so all visitors together
 * cost one call per window.
 */
export function useSessao(casa: "camara" | "senado", buscar: Buscar): SessaoAoVivoResult {
  const [data] = useState(() => isoDate(new Date()));
  const q = useQuery({
    queryKey: [`sessao-${casa}`, data],
    queryFn: () => buscar(data),
    staleTime: AO_VIVO_MS,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => (query.state.data ? AO_VIVO_MS : PARADO_MS),
  });
  return { sessao: q.data, isLoading: q.isLoading };
}
