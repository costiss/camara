import { useCallback, useMemo } from "react";
import { router, useRoute, type Query } from "@/hooks/useUi";
import { FiltroVotacoes } from "@/lib/filtroVotacoes";

export type DefinirFiltro = (patch: Query, manterPagina?: boolean) => void;

const PADROES: Record<string, string> = {
  casa: "ambas",
  periodo: "90d",
  resultado: "todos",
  ordem: "recentes",
  pagina: "1",
};

/** Typed view of the list filters in the URL; any change but paging returns to page 1. */
export function useFiltroVotacoes(): { filtro: FiltroVotacoes; definir: DefinirFiltro } {
  const { query } = useRoute();
  const filtro = useMemo(() => new FiltroVotacoes(query), [query]);
  const definir = useCallback<DefinirFiltro>((patch, manterPagina = false) => {
    const limpo: Query = manterPagina ? {} : { pagina: null };
    for (const [k, v] of Object.entries(patch)) limpo[k] = v && v !== PADROES[k] ? v : null;
    router.patch(limpo);
  }, []);
  return { filtro, definir };
}
