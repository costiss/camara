import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ErrorState, LoadingRows } from "@/components/shared";
import { useDeliberacoes } from "@/hooks/useDeliberacoes";
import { POR_PAGINA } from "@/lib/filtroVotacoes";
import { formatNumber } from "@/lib/format";
import { Periodo } from "@/lib/periodo";
import { ListaFacetas } from "./ListaFacetas";
import { ListaTabela } from "./ListaTabela";
import { useFiltroVotacoes } from "./useFiltroVotacoes";

const CASA_LABEL = { ambas: "Ambas", camara: "Câmara", senado: "Senado" } as const;

export function ListaView() {
  const { filtro, definir } = useFiltroVotacoes();
  const feed = useDeliberacoes(filtro.casa, filtro.periodo);
  const opcoes = useMemo(() => Periodo.opcoes(), []);

  const filtradas = useMemo(() => filtro.filtrar(feed.deliberacoes), [filtro, feed.deliberacoes]);
  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const pagina = Math.min(filtro.pagina, paginas);
  const inicio = (pagina - 1) * POR_PAGINA;
  const visiveis = filtradas.slice(inicio, inicio + POR_PAGINA);

  return (
    <div className="hud-grid hud-grid-lista">
      <div className="hud-col">
        <ListaFacetas
          filtro={filtro}
          deliberacoes={feed.deliberacoes}
          total={filtradas.length}
          periodo={feed.periodo}
          isLoading={feed.isLoading}
          definir={definir}
        />
      </div>

      <section className="card flex min-h-0 flex-col" aria-label="Lista de votações">
        <div className="flex flex-wrap items-center gap-2">
          <div className="switch switch-sm" role="group" aria-label="Casa">
            {(Object.keys(CASA_LABEL) as (keyof typeof CASA_LABEL)[]).map((c) => (
              <button key={c} type="button" aria-pressed={filtro.casa === c} onClick={() => definir({ casa: c })}>
                {CASA_LABEL[c]}
              </button>
            ))}
          </div>
          <div className="tabs-mini quiet-scroll max-w-full overflow-x-auto [&>button]:shrink-0 [&>button]:whitespace-nowrap" role="group" aria-label="Período">
            {opcoes.map((p) => (
              <button key={p.valor} type="button" aria-pressed={feed.periodo.valor === p.valor} onClick={() => definir({ periodo: p.valor })}>
                {p.label}
              </button>
            ))}
          </div>
          <label className="relative ml-auto min-w-[200px] flex-1 sm:max-w-[300px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-5" />
            <input
              value={filtro.busca}
              onChange={(e) => definir({ q: e.target.value })}
              placeholder="Proposição, tema ou texto"
              className="field pl-9"
              aria-label="Buscar votações"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-fg-3">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="accent-[var(--color-fg)]" checked={filtro.nominal} onChange={(e) => definir({ nominal: e.target.checked ? "1" : null })} />
            Só com votação nominal
          </label>
          <div className="tabs-mini" role="group" aria-label="Ordem">
            <button type="button" aria-pressed={filtro.ordem === "recentes"} onClick={() => definir({ ordem: "recentes" })}>Mais recentes</button>
            <button type="button" aria-pressed={filtro.ordem === "antigas"} onClick={() => definir({ ordem: "antigas" })}>Mais antigas</button>
          </div>
          {filtro.ativos > 0 && (
            <button
              type="button"
              className="link ml-auto"
              onClick={() => definir({ tipo: null, resultado: null, nominal: null, q: null })}
            >
              Limpar {filtro.ativos} {filtro.ativos === 1 ? "filtro" : "filtros"}
            </button>
          )}
        </div>

        <div className="quiet-scroll -mx-1 mt-3 min-h-0 flex-1 overflow-y-auto px-1">
          {feed.isLoading ? (
            <LoadingRows rows={8} height={52} />
          ) : feed.isError ? (
            <ErrorState compact title="Não foi possível carregar as votações" onRetry={feed.refetch} />
          ) : visiveis.length === 0 ? (
            <p className="py-12 text-center text-[12px] text-fg-4">Nenhuma votação com esses filtros.</p>
          ) : (
            <ListaTabela itens={visiveis} />
          )}
        </div>

        {!feed.isLoading && filtradas.length > POR_PAGINA && (
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[12px] text-fg-3">
            <span className="tn">
              {formatNumber(inicio + 1)}–{formatNumber(inicio + visiveis.length)} de {formatNumber(filtradas.length)}
            </span>
            <div className="flex items-center gap-2">
              <span className="tn">Página {pagina} de {paginas}</span>
              <button type="button" className="icon-btn h-8 w-8" aria-label="Página anterior" disabled={pagina === 1} onClick={() => definir({ pagina: String(pagina - 1) }, true)}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" className="icon-btn h-8 w-8" aria-label="Próxima página" disabled={pagina === paginas} onClick={() => definir({ pagina: String(pagina + 1) }, true)}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
