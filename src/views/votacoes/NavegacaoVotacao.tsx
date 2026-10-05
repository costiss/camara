import type { MouseEvent } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, List } from "lucide-react";
import { routeHref, router, useRoute, votacaoHref } from "@/hooks/useUi";
import type { Deliberacao } from "@/lib/deliberacoes";
import { lerVotacao } from "@/lib/linguagem";

/** Page toolbar: back to the list, and step to the next newer/older vote without piling up history. */
export function NavegacaoVotacao({ deliberacoes, currentId }: { deliberacoes: Deliberacao[]; currentId?: string }) {
  const { query } = useRoute();
  const veioDaLista = query.get("de") === "lista";
  const i = deliberacoes.findIndex((d) => d.votacoes.some((v) => v.id === currentId));
  const recente = i > 0 ? deliberacoes[i - 1] : undefined;
  const antiga = i >= 0 && i < deliberacoes.length - 1 ? deliberacoes[i + 1] : undefined;
  const manter = { de: query.get("de"), nominal: query.get("nominal") };
  const href = (d: Deliberacao) => votacaoHref(d.principal, manter);
  const ir = (e: MouseEvent<HTMLAnchorElement>, d: Deliberacao) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    router.substituir(href(d));
  };
  const titulo = (d: Deliberacao) => lerVotacao({ ...d.principal, ementa: d.ementa ?? d.principal.ementa }).titulo;

  return (
    <nav aria-label="Navegar entre votações" className="flex flex-wrap items-center gap-2">
      {veioDaLista ? (
        <button type="button" className="btn btn-sm" onClick={() => window.history.back()}>
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar à lista
        </button>
      ) : (
        <a href={routeHref("lista")} className="btn btn-sm no-underline">
          <List className="h-3.5 w-3.5" /> Todas as votações
        </a>
      )}
      {i >= 0 && (
        <div className="ml-auto flex items-center gap-2">
          <span className="tn hidden text-[12px] text-fg-4 sm:inline">{i + 1} de {deliberacoes.length} recentes</span>
          {recente ? (
            <a href={href(recente)} onClick={(e) => ir(e, recente)} className="btn btn-sm no-underline" title={titulo(recente)} aria-label="Votação mais recente">
              <ChevronLeft className="h-3.5 w-3.5" /><span className="max-sm:sr-only">Mais recente</span>
            </a>
          ) : (
            <span className="btn btn-sm pointer-events-none opacity-40" aria-disabled="true"><ChevronLeft className="h-3.5 w-3.5" /><span className="max-sm:sr-only">Mais recente</span></span>
          )}
          {antiga ? (
            <a href={href(antiga)} onClick={(e) => ir(e, antiga)} className="btn btn-sm no-underline" title={titulo(antiga)} aria-label="Votação mais antiga">
              <span className="max-sm:sr-only">Mais antiga</span> <ChevronRight className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="btn btn-sm pointer-events-none opacity-40" aria-disabled="true"><span className="max-sm:sr-only">Mais antiga</span> <ChevronRight className="h-3.5 w-3.5" /></span>
          )}
        </div>
      )}
    </nav>
  );
}
