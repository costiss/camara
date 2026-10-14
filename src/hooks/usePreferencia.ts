import { useCallback, useState } from "react";
import { preferencias } from "@/lib/preferencias";

/** A string preference kept in localStorage; read once, written on every change. */
export function usePreferencia(chave: string, padrao: string): [string, (valor: string) => void] {
  const [valor, setValor] = useState(() => preferencias.ler(chave, padrao));
  const definir = useCallback(
    (novo: string) => {
      preferencias.gravar(chave, novo);
      setValor(novo);
    },
    [chave]
  );
  return [valor, definir];
}
