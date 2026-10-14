import { useCallback } from "react";
import { router, useRoute } from "@/hooks/useUi";
import { usePreferencia } from "./usePreferencia";

/** Shared by the feed and the list, so the two toggles agree. */
export const CHAVE_NOMINAL = "congresso-aberto:nominal";

/**
 * The "Só com votação nominal" filter. The URL wins when it says so, so a
 * shared link keeps its meaning; otherwise the visitor's saved preference
 * decides. Every toggle is saved, and the URL is only written when the choice
 * differs from this screen's default.
 */
export function useNominal(padrao: boolean): [boolean, (ativo: boolean) => void] {
  const { query } = useRoute();
  const [pref, salvar] = usePreferencia(CHAVE_NOMINAL, padrao ? "1" : "0");

  const explicito = query.get("nominal");
  const ativo = explicito === null ? pref === "1" : explicito === "1";

  const definir = useCallback(
    (novo: boolean) => {
      salvar(novo ? "1" : "0");
      router.patch({ nominal: novo === padrao ? null : novo ? "1" : "0" });
    },
    [salvar, padrao]
  );

  return [ativo, definir];
}
