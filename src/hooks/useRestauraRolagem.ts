import { useEffect, useLayoutEffect } from "react";

const TENTATIVAS = 60;

function rolagemSalva(): number | null {
  const y = (window.history.state as { rolagem?: unknown } | null)?.rolagem;
  return typeof y === "number" ? y : null;
}

/**
 * Hash navigation keeps the page's scroll offset, so a new screen would open
 * wherever the previous one was. Each history entry remembers its own offset:
 * a new screen starts at the top, Back/Forward return to where you were, and
 * query-only changes (filters) do not move the page.
 */
export function useRestauraRolagem(chave: string) {
  useEffect(() => {
    window.history.scrollRestoration = "manual";
    let quadro = 0;
    const salvar = () => {
      if (quadro) return;
      quadro = requestAnimationFrame(() => {
        quadro = 0;
        window.history.replaceState({ ...(window.history.state ?? {}), rolagem: window.scrollY }, "");
      });
    };
    // A pending save would otherwise write the old offset into the entry we just moved to.
    const cancelar = () => {
      cancelAnimationFrame(quadro);
      quadro = 0;
    };
    window.addEventListener("scroll", salvar, { passive: true });
    window.addEventListener("hashchange", cancelar);
    return () => {
      cancelar();
      window.removeEventListener("scroll", salvar);
      window.removeEventListener("hashchange", cancelar);
    };
  }, []);

  useLayoutEffect(() => {
    const alvo = rolagemSalva();
    if (alvo === null) {
      window.scrollTo(0, 0);
      return;
    }
    // Content may still be rendering from cache; retry until the page is tall enough.
    let tentativas = 0;
    let quadro = 0;
    const restaurar = () => {
      window.scrollTo(0, alvo);
      if (Math.abs(window.scrollY - alvo) > 2 && ++tentativas < TENTATIVAS) quadro = requestAnimationFrame(restaurar);
    };
    restaurar();
    return () => cancelAnimationFrame(quadro);
  }, [chave]);
}
