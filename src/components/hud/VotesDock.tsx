import { useMemo, useState } from "react";
import { router, votacaoHref } from "@/hooks/useUi";
import { addDays, isoDate } from "@/lib/format";
import type { Deliberacao } from "@/lib/deliberacoes";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const DIAS = 90;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

interface Dia {
  iso: string;
  camara: number;
  senado: number;
  primeira?: Deliberacao;
}

/** Bottom dock: one tick per day of the last 90, sized by floor votes. */
export function VotesDock({
  deliberacoes,
  currentDate,
  isLoading,
}: {
  deliberacoes: Deliberacao[];
  currentDate?: string;
  isLoading?: boolean;
}) {
  const [hoje] = useState(() => new Date());
  const dias = useMemo(() => {
    const map = new Map<string, Dia>();
    for (let i = DIAS - 1; i >= 0; i -= 1) {
      const iso = isoDate(addDays(hoje, -i));
      map.set(iso, { iso, camara: 0, senado: 0 });
    }
    for (const d of deliberacoes) {
      const dia = map.get(d.data);
      if (!dia) continue;
      dia[d.casa] += d.votacoes.length;
      if (!dia.primeira || (!dia.primeira.principal.nominal && d.principal.nominal)) dia.primeira = d;
    }
    return [...map.values()];
  }, [deliberacoes, hoje]);

  const max = Math.max(1, ...dias.map((d) => d.camara + d.senado));
  const sessoes = dias.filter((d) => d.camara + d.senado > 0).length;
  const total = dias.reduce((a, d) => a + d.camara + d.senado, 0);

  return (
    <div className="card flex items-center gap-4 py-3">
      <div className="hidden shrink-0 sm:block">
        {isLoading ? (
          <>
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="mt-1.5 h-2.5 w-24" />
          </>
        ) : (
          <>
            <p className="tn text-[13px] font-medium text-fg">{total} votações</p>
            <p className="text-[11px] text-fg-4">{sessoes} dias com sessão</p>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("flex h-9 items-end gap-[2px]", isLoading && "animate-pulse")} aria-busy={isLoading || undefined} role="list" aria-label="Votações por dia, últimos 90 dias">
          {dias.map((d) => {
            const n = d.camara + d.senado;
            const ativo = d.iso === currentDate;
            const [, m, dd] = d.iso.split("-");
            return (
              <button
                key={d.iso}
                type="button"
                role="listitem"
                disabled={!d.primeira}
                onClick={() => d.primeira && router.abrir(votacaoHref(d.primeira.principal))}
                title={`${dd}/${m}: ${d.camara} na Câmara, ${d.senado} no Senado`}
                aria-label={`${dd}/${m}: ${n} votações`}
                className={cn(
                  "group relative flex h-full min-w-0 flex-1 flex-col justify-end rounded-[2px] disabled:cursor-default",
                  ativo && "bg-fg/10"
                )}
              >
                <span
                  className={cn("w-full rounded-[2px] transition-colors", n ? "bg-fg-3 group-hover:bg-fg" : "bg-line-2", ativo && "bg-fg")}
                  style={{ height: n ? `${18 + (82 * n) / max}%` : "2px" }}
                />
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-fg-5">
          {dias
            .filter((d) => d.iso.endsWith("-01") || d.iso.endsWith("-15"))
            .map((d) => {
              const [, m, dd] = d.iso.split("-");
              return <span key={d.iso}>{Number(dd)} {MESES[Number(m) - 1]}</span>;
            })}
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-2 text-[12px] text-fg-2 md:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-fg" />
        Plenário
      </div>
    </div>
  );
}
