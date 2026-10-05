import { useMemo, useState } from "react";
import { inspecaoHref } from "@/hooks/useUi";
import { agruparVotos } from "@/lib/breakdown";
import { OrientacoesPorPartido } from "@/lib/inspecao";
import { partyColor } from "@/lib/parties";
import { CATEGORIA_COR } from "@/lib/votos";
import type { OrientacaoBancada, Votacao, VotoParlamentar } from "@/lib/types";
import { cn } from "@/lib/utils";

const LIMITE = 9;


export function PartyBreakdown({ votacao, assentos, orientacoes, activeUf, onClearUf }: {
  votacao: Votacao;
  assentos: VotoParlamentar[];
  orientacoes: OrientacaoBancada[];
  activeUf: string | null;
  onClearUf: () => void;
}) {
  const [todos, setTodos] = useState(false);
  const grupos = useMemo(
    () => agruparVotos(activeUf ? assentos.filter((a) => a.uf === activeUf) : assentos, (v) => v.partido),
    [assentos, activeUf]
  );
  const governo = orientacoes.find((o) => o.lideranca === "governo");
  const porPartido = useMemo(() => new OrientacoesPorPartido(orientacoes), [orientacoes]);
  const shown = todos ? grupos : grupos.slice(0, LIMITE);

  if (assentos.length === 0) return null;

  return (
    <section className="card" aria-label="Como votou cada partido">
      <div className="card-head">
        <h2>Por partido{activeUf ? ` · ${activeUf}` : ""}</h2>
        {activeUf ? (
          <button type="button" className="meta link" onClick={onClearUf}>Ver Brasil</button>
        ) : (
          <span className="meta">% Sim · orientação</span>
        )}
      </div>
      {governo && (
        <p className="-mt-1 mb-2 text-[12px] text-fg-3">
          Governo orientou <b className="font-medium" style={{ color: governo.categoria ? CATEGORIA_COR[governo.categoria] : undefined }}>{governo.orientacao}</b>
        </p>
      )}
      <ul className="flex flex-col">
        {shown.map((g, i) => {
          const { sim, nao } = g.tally.counts;
          const validos = sim + nao;
          const pct = validos ? (sim / validos) * 100 : null;
          const o = porPartido.de(g.chave);
          return (
            <li key={g.chave} className={cn("py-2", i > 0 && "rowline")}>
              <div className="flex items-baseline gap-2">
                <a
                  href={inspecaoHref(votacao, { partido: g.chave, uf: activeUf, secao: "votos" })}
                  className="max-w-[96px] truncate text-[13px] font-medium no-underline underline-offset-4 hover:underline"
                  style={{ color: partyColor(g.chave) }}
                  title={`Ver o voto de cada parlamentar do ${g.chave}`}
                >
                  {g.chave}
                </a>
                <span className="tn text-[12px] text-fg-4">{g.membros}</span>
                {o && (
                  <span className="ml-auto whitespace-nowrap text-[11px] text-fg-4" title={`Liderança orientou ${o.orientacao}`}>
                    orient. <span style={{ color: o.categoria ? CATEGORIA_COR[o.categoria] : "var(--color-fg-2)" }}>{o.orientacao}</span>
                  </span>
                )}
                <span className={cn("tn w-[42px] shrink-0 text-right text-[13px] font-medium", !o && "ml-auto")}>
                  {pct === null ? "—" : `${pct.toFixed(0)}%`}
                </span>
              </div>
              <div className="mt-1.5 flex h-[3px] gap-[2px] overflow-hidden rounded-full bg-panel-3" aria-hidden="true">
                <span style={{ flexGrow: sim, background: CATEGORIA_COR.sim }} />
                <span style={{ flexGrow: nao, background: CATEGORIA_COR.nao }} />
                <span style={{ flexGrow: g.membros - validos }} />
              </div>
              <p className="sr">{`${g.chave}: ${sim} Sim, ${nao} Não, ${g.membros - validos} outros`}</p>
            </li>
          );
        })}
      </ul>
      {grupos.length > LIMITE && (
        <button type="button" className="btn btn-sm btn-block mt-2" onClick={() => setTodos((t) => !t)}>
          {todos ? "Mostrar menos" : `Todos os ${grupos.length} partidos`}
        </button>
      )}
    </section>
  );
}
