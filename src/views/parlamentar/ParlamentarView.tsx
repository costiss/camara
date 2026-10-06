import { useMemo } from "react";
import { BarRowsSkeleton } from "@/components/hud/skeletons";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { casaDoParlamentar, useHistoricoParlamentar, useParlamentar } from "@/hooks/useParlamentar";
import { router, useQueryEnum, useQueryParam } from "@/hooks/useUi";
import { HistoricoParlamentar } from "@/lib/historico";
import { Periodo } from "@/lib/periodo";
import { PerfilCard, PerfilSkeleton, ProjetosCard } from "./PerfilCard";
import { PropostasAba } from "./PropostasAba";
import { RegistrosCard } from "./RegistrosCard";
import { ResumoCard } from "./ResumoCard";

function ResumoSkeleton() {
  return (
    <section className="card" aria-busy="true" aria-label="Carregando votações">
      <div className="card-head">
        <h2>Como votou</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[104px] rounded-[10px]" />)}
      </div>
      <Skeleton className="mt-4 h-2 w-full rounded-full" />
    </section>
  );
}

type Aba = "votos" | "propostas";
const ABAS: readonly Aba[] = ["votos", "propostas"];
const ABA_LABEL: Record<Aba, string> = { votos: "Como votou", propostas: "Propostas de autoria" };

/** A deputy's or senator's page: profile on the side, their record across recent floor votes as the focus. */
export function ParlamentarView({ id }: { id: string }) {
  const casa = casaDoParlamentar(id);
  const { parlamentar, isLoading, isError } = useParlamentar(id);
  const [periodo, setPeriodo] = useQueryParam("periodo", Periodo.PADRAO);
  const [merito, setMerito] = useQueryParam("merito", "1");
  const opcoes = useMemo(() => Periodo.opcoes(), []);
  const historico = useHistoricoParlamentar(id, periodo, parlamentar?.partido);
  const soMerito = merito !== "0";

  const escopo = useMemo(
    () => (soMerito ? historico.registros.filter((r) => r.merito) : historico.registros),
    [historico.registros, soMerito]
  );
  const resumo = useMemo(() => HistoricoParlamentar.resumo(escopo), [escopo]);
  const [aba, setAba] = useQueryEnum<Aba>("aba", ABAS, "votos");
  const verTodas = () => {
    router.patch({ aba: "propostas", tipo: null, ano: null, fase: null, busca: null, pagina: null });
    document.getElementById("parlamentar-abas")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isError) {
    return (
      <div className="card">
        <ErrorState compact title="Não encontramos este parlamentar" />
      </div>
    );
  }

  return (
    <div className="hud-grid hud-grid-2">
      <div className="hud-col">
        {isLoading || !parlamentar ? <PerfilSkeleton /> : <PerfilCard parlamentar={parlamentar} />}
        <ProjetosCard parlamentar={parlamentar} onVerTodas={verTodas} />
      </div>

      <div className="hud-col">
        <div id="parlamentar-abas" className="switch w-full scroll-mt-4 sm:w-auto sm:self-start [&>button]:flex-1" role="tablist" aria-label="Seções do parlamentar">
          {ABAS.map((a) => (
            <button key={a} type="button" role="tab" aria-selected={aba === a} aria-pressed={aba === a} onClick={() => setAba(a)}>
              {ABA_LABEL[a]}
            </button>
          ))}
        </div>

        {aba === "propostas" ? (
          parlamentar ? <PropostasAba parlamentar={parlamentar} /> : <ResumoSkeleton />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="tabs-mini max-w-full flex-wrap [&>button]:whitespace-nowrap" role="group" aria-label="Período">
                {opcoes.map((p) => (
                  <button key={p.valor} type="button" aria-pressed={periodo === p.valor} onClick={() => setPeriodo(p.valor)}>
                    {p.label}
                  </button>
                ))}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-fg-3">
                <input type="checkbox" className="accent-[var(--color-fg)]" checked={soMerito} onChange={(e) => setMerito(e.target.checked ? "1" : "0")} />
                Só votações de conteúdo (sem requerimentos e urgências)
              </label>
            </div>

            {historico.isError ? (
              <div className="card">
                <ErrorState compact title="Não foi possível carregar as votações" onRetry={historico.refetch} />
              </div>
            ) : historico.isLoading ? (
              <>
                <ResumoSkeleton />
                <section className="card">
                  <BarRowsSkeleton rows={6} label="Carregando votações" />
                </section>
              </>
            ) : (
              <>
                <ResumoCard resumo={resumo} casa={casa} carregadas={historico.carregadas} total={historico.total} />
                <RegistrosCard registros={escopo} casa={casa} carregando={historico.carregadas < historico.total} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
