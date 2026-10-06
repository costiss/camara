import { useMemo } from "react";
import type { UfDatum } from "@/components/hud/BrazilMap";
import type { Seat } from "@/components/shared";
import { agruparVotos, corDaDisputa, ordenarPorEspectro, rankCategoria } from "@/lib/breakdown";
import type { VotoParlamentar } from "@/lib/types";
import { CATEGORIA_COR } from "@/lib/votos";

export type Modo = "mapa" | "plenario";
export const MODOS: readonly Modo[] = ["mapa", "plenario"];

export function useMapData(assentos: VotoParlamentar[]) {
  return useMemo(() => {
    const out: Record<string, UfDatum> = {};
    for (const g of agruparVotos(assentos, (v) => v.uf)) {
      const { sim, nao } = g.tally.counts;
      const pct = sim + nao ? Math.round((sim / (sim + nao)) * 100) : null;
      out[g.chave] = {
        fill: corDaDisputa(sim, nao),
        value: pct === null ? "—" : `${pct}%`,
        title: `${g.chave}: ${sim} Sim, ${nao} Não, ${g.tally.ausentes} ausentes de ${g.membros}`,
      };
    }
    return out;
  }, [assentos]);
}

export function useSeats(assentos: VotoParlamentar[], activeUf?: string | null): Seat[] {
  return useMemo(
    () =>
      ordenarPorEspectro(assentos, (v) => rankCategoria(v.categoria)).map((v) => ({
        id: v.parlamentarId,
        color: CATEGORIA_COR[v.categoria],
        title: `${v.nome} · ${v.partido}-${v.uf} · ${v.voto}${v.detalhe && v.categoria === "ausente" ? ` (${v.detalhe})` : ""}`,
        dim: !!activeUf && v.uf !== activeUf,
      })),
    [assentos, activeUf]
  );
}

export interface ResumoUf {
  uf: string;
  sim: number;
  nao: number;
  pct: number | null;
}

/** Sim/Não per state, alphabetical, for a readable list where the map is too small. */
export function useResumoUf(assentos: VotoParlamentar[]): ResumoUf[] {
  return useMemo(
    () =>
      agruparVotos(assentos, (v) => v.uf)
        .map((g) => {
          const { sim, nao } = g.tally.counts;
          return { uf: g.chave, sim, nao, pct: sim + nao ? Math.round((sim / (sim + nao)) * 100) : null };
        })
        .sort((a, b) => a.uf.localeCompare(b.uf)),
    [assentos]
  );
}
