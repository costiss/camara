import { useMemo } from "react";
import type { Casa, ItemAoVivo } from "@/lib/types";
import { useSessaoCamara } from "./useCamara";
import { useSessaoSenado } from "./useSenado";

/** A live order-paper item, tagged with the house it belongs to. */
export interface LinhaAoVivo extends ItemAoVivo {
  casa: Casa;
}

/**
 * The items still to be decided in the floor sessions in progress, shaped as
 * rows for the votes lists (Câmara first). Only these are rows: an item already
 * voted is a recorded vote that the votes APIs already return, so it belongs to
 * the list proper — mixing it in here would show the same vote twice.
 *
 * Reuses the header badge's polling, so it costs no extra requests.
 */
export function useItensAoVivo(casa: Casa | "ambas" = "ambas"): LinhaAoVivo[] {
  const camara = useSessaoCamara();
  const senado = useSessaoSenado();

  return useMemo(() => {
    const linhas: LinhaAoVivo[] = [];
    const juntar = (sessao?: { casa: Casa; itens: ItemAoVivo[] }) => {
      if (!sessao) return;
      for (const item of sessao.itens) {
        if (item.estado !== "decidida") linhas.push({ ...item, casa: sessao.casa });
      }
    };
    if (casa !== "senado") juntar(camara.sessao);
    if (casa !== "camara") juntar(senado.sessao);
    return linhas;
  }, [casa, camara.sessao, senado.sessao]);
}
