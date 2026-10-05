import { useMemo, useState } from "react";
import { BrazilMap, type UfDatum } from "@/components/hud/BrazilMap";
import { DeliberacaoFeed } from "@/components/hud/DeliberacaoFeed";
import { HudGrid } from "@/components/hud/HudGrid";
import { VotesDock } from "@/components/hud/VotesDock";
import { ErrorState, LoadingRows } from "@/components/shared";
import { useDeputados } from "@/hooks/useCamara";
import { useDeliberacoes } from "@/hooks/useDeliberacoes";
import { useSenadores } from "@/hooks/useSenado";
import { bancadas, partidoLiderPorUf } from "@/lib/breakdown";
import { partyColor, siglaCurta } from "@/lib/parties";
import type { Casa, Parlamentar } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CompositionCard } from "./CompositionCard";
import { MembersCard } from "./MembersCard";

function BancadasCard({ membros, partido, onPartido }: {
  membros: Parlamentar[];
  partido: string | null;
  onPartido: (p: string | null) => void;
}) {
  const lista = bancadas(membros);
  const max = lista[0]?.total ?? 1;
  return (
    <section className="card" aria-label="Bancadas por partido">
      <div className="card-head">
        <h2>Bancadas</h2>
        <span className="meta">{lista.length} partidos</span>
      </div>
      <ul className="flex flex-col">
        {lista.map((b, i) => (
          <li key={b.partido} className={cn(i > 0 && "rowline")}>
            <button
              type="button"
              aria-pressed={partido === b.partido}
              onClick={() => onPartido(partido === b.partido ? null : b.partido)}
              className="w-full rounded-md px-1 py-2 text-left transition-colors hover:bg-fg/5 aria-pressed:bg-fg/8"
            >
              <span className="flex items-baseline gap-2">
                <span className="text-[13px] font-medium" style={{ color: b.cor }}>{b.partido}</span>
                <span className="tn ml-auto text-[13px] font-medium">{b.total}</span>
                <span className="tn w-[46px] text-right text-[12px] text-fg-4">
                  {((b.total / membros.length) * 100).toFixed(1).replace(".", ",")}%
                </span>
              </span>
              <span className="mt-1.5 block h-[3px] rounded-full bg-panel-3">
                <span className="block h-full rounded-full" style={{ width: `${(b.total / max) * 100}%`, background: b.cor }} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function useMembros(casa: Casa) {
  const dep = useDeputados();
  const sen = useSenadores();
  return casa === "camara" ? dep : sen;
}

export function CasaView({ casa, onSelectMember }: { casa: Casa; onSelectMember: (p: Parlamentar) => void }) {
  const q = useMembros(casa);
  const feed = useDeliberacoes(casa);
  const membros = useMemo(() => q.data ?? [], [q.data]);
  const [uf, setUf] = useState<string | null>(null);
  const [partido, setPartido] = useState<string | null>(null);

  const mapData = useMemo(() => {
    const out: Record<string, UfDatum> = {};
    const fonte = partido ? membros.filter((m) => m.partido === partido) : membros;
    for (const [sigla, l] of Object.entries(partidoLiderPorUf(fonte))) {
      out[sigla] = {
        fill: l.fill,
        value: partido ? String(l.n) : siglaCurta(l.partido),
        title: `${sigla}: ${l.partido} lidera com ${l.n} de ${l.total}`,
      };
    }
    return out;
  }, [membros, partido]);

  const lideres = useMemo(() => {
    const count = new Map<string, number>();
    for (const d of Object.values(partidoLiderPorUf(membros))) count.set(d.partido, (count.get(d.partido) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [membros]);

  if (q.isError) {
    return <div className="card"><ErrorState title="Não foi possível carregar a composição" onRetry={() => q.refetch()} /></div>;
  }

  const left = q.isLoading ? (
    <div className="card"><LoadingRows rows={6} height={40} /></div>
  ) : (
    <>
      <CompositionCard casa={casa} membros={membros} partido={partido} uf={uf} onPartido={setPartido} />
      <MembersCard
        casa={casa}
        membros={membros}
        uf={uf}
        partido={partido}
        onClear={() => {
          setUf(null);
          setPartido(null);
        }}
        onSelect={onSelectMember}
      />
    </>
  );

  const center = (
    <div className="flex h-full flex-col min-[1180px]:min-h-[420px]">
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[12px] text-fg-2">
        {partido ? (
          <span>Cadeiras do <b className="font-medium" style={{ color: partyColor(partido) }}>{partido}</b> por estado</span>
        ) : (
          <>
            {lideres.map(([p, n]) => (
              <span key={p} className="flex items-center gap-1.5">
                <span className="dot" style={{ background: partyColor(p) }} />
                {p} <span className="tn font-medium text-fg">{n}</span>
              </span>
            ))}
            <span className="text-fg-4">estados liderados</span>
          </>
        )}
      </div>
      <div className="min-h-0 flex-1 py-3">
        <BrazilMap data={mapData} activeUf={uf} onSelect={setUf} label={`Partido com mais cadeiras por estado, ${casa === "camara" ? "Câmara" : "Senado"}`} />
      </div>
    </div>
  );

  return (
    <HudGrid
      left={left}
      center={center}
      dock={<VotesDock deliberacoes={feed.deliberacoes} />}
      right={
        <>
          {!q.isLoading && <BancadasCard membros={membros} partido={partido} onPartido={setPartido} />}
          <DeliberacaoFeed deliberacoes={feed.deliberacoes} isLoading={feed.isLoading} limit={8} />
        </>
      }
    />
  );
}
