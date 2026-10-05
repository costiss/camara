import { BarRowsSkeleton } from "@/components/hud/skeletons";
import type { Deliberacao } from "@/lib/deliberacoes";
import { FiltroVotacoes, type ResultadoFiltro } from "@/lib/filtroVotacoes";
import { formatNumber } from "@/lib/format";
import type { Periodo } from "@/lib/periodo";
import { cn } from "@/lib/utils";
import type { DefinirFiltro } from "./useFiltroVotacoes";

const RESULTADO_LABEL: Record<Exclude<ResultadoFiltro, "todos">, string> = {
  aprovada: "Aprovadas",
  rejeitada: "Rejeitadas",
  outros: "Destaques e outros",
};
const RESULTADO_COR: Record<Exclude<ResultadoFiltro, "todos">, string> = {
  aprovada: "var(--color-green)",
  rejeitada: "var(--color-red)",
  outros: "var(--color-fg-4)",
};

function Faceta({ label, n, max, cor, ativo, onClick }: {
  label: string;
  n: number;
  max: number;
  cor: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className="w-full rounded-md px-1 py-2 text-left transition-colors hover:bg-fg/5 aria-pressed:bg-fg/8"
    >
      <span className="flex items-baseline gap-2">
        <span className={cn("text-[13px]", ativo ? "font-medium text-fg" : "text-fg-2")}>{label}</span>
        <span className="tn ml-auto text-[13px] font-medium">{formatNumber(n)}</span>
      </span>
      <span className="mt-1.5 block h-[3px] rounded-full bg-panel-3">
        <span className="block h-full rounded-full" style={{ width: `${max ? (n / max) * 100 : 0}%`, background: cor }} />
      </span>
    </button>
  );
}

export function ListaFacetas({ filtro, deliberacoes, total, periodo, isLoading, definir }: {
  filtro: FiltroVotacoes;
  deliberacoes: Deliberacao[];
  total: number;
  periodo: Periodo;
  isLoading: boolean;
  definir: DefinirFiltro;
}) {
  const votacoes = deliberacoes.reduce((a, d) => a + d.votacoes.length, 0);
  const porResultado = filtro.contar(deliberacoes, "resultado");
  const porTipo = [...filtro.contar(deliberacoes, "tipo").entries()].sort((a, b) => b[1] - a[1]);
  const maxResultado = Math.max(0, ...porResultado.values());
  const maxTipo = porTipo[0]?.[1] ?? 0;

  return (
    <>
      <section className="card enter" aria-labelledby="lista-title">
        <span className="label">Plenário · {periodo.label}</span>
        <h1 id="lista-title" className="manchete mt-4">
          {isLoading ? "Carregando votações…" : (
            <><span className="text-blue">{formatNumber(total)} {total === 1 ? "deliberação" : "deliberações"}</span> encontradas</>
          )}
        </h1>
        {!isLoading && (
          <p className="mt-3 text-[12px] leading-relaxed text-fg-3">
            {formatNumber(votacoes)} votações agrupadas por proposição e dia de sessão. Clique numa linha para abrir o painel da votação.
          </p>
        )}
      </section>

      <section className="card" aria-label="Filtrar por resultado">
        <div className="card-head">
          <h2>Resultado</h2>
          {filtro.resultado !== "todos" && (
            <button type="button" className="meta link" onClick={() => definir({ resultado: null })}>Limpar</button>
          )}
        </div>
        {isLoading && <BarRowsSkeleton rows={3} label="Carregando resultados" />}
        {!isLoading && (Object.keys(RESULTADO_LABEL) as (keyof typeof RESULTADO_LABEL)[]).map((r, i) => (
          <div key={r} className={cn(i > 0 && "rowline")}>
            <Faceta
              label={RESULTADO_LABEL[r]}
              n={porResultado.get(r) ?? 0}
              max={maxResultado}
              cor={RESULTADO_COR[r]}
              ativo={filtro.resultado === r}
              onClick={() => definir({ resultado: filtro.resultado === r ? null : r })}
            />
          </div>
        ))}
      </section>

      <section className="card" aria-label="Filtrar por tipo de proposição">
        <div className="card-head">
          <h2>Tipo</h2>
          {filtro.tipo ? (
            <button type="button" className="meta link" onClick={() => definir({ tipo: null })}>Limpar</button>
          ) : (
            <span className="meta">{isLoading ? "" : `${porTipo.length} tipos`}</span>
          )}
        </div>
        {isLoading && <BarRowsSkeleton rows={6} label="Carregando tipos" />}
        {porTipo.length === 0 && !isLoading && <p className="py-3 text-[12px] text-fg-4">Nada neste período.</p>}
        {!isLoading && porTipo.map(([tipo, n], i) => (
          <div key={tipo} className={cn(i > 0 && "rowline")}>
            <Faceta
              label={tipo}
              n={n}
              max={maxTipo}
              cor="var(--color-fg-3)"
              ativo={filtro.tipo === tipo}
              onClick={() => definir({ tipo: filtro.tipo === tipo ? null : tipo })}
            />
          </div>
        ))}
      </section>
    </>
  );
}
