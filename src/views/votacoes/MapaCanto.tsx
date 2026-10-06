import { Maximize2 } from "lucide-react";
import { BrazilMap, type UfDatum } from "@/components/hud/BrazilMap";
import { Hemicycle, type Seat } from "@/components/shared";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useQueryEnum, useQueryParam } from "@/hooks/useUi";
import { formatNumber } from "@/lib/format";
import { lerVotacao } from "@/lib/linguagem";
import type { Votacao, VotoParlamentar } from "@/lib/types";
import { CATEGORIA_COR, type VoteTally } from "@/lib/votos";
import { MODOS, type Modo, useMapData, useResumoUf, useSeats } from "./estagio";
import { VoteStage } from "./VoteStage";

function LegendaCompacta({ modo, tally }: { modo: Modo; tally: VoteTally }) {
  if (modo === "mapa") {
    return (
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-3">
        <span className="flex items-center gap-1.5"><span className="dot" style={{ background: CATEGORIA_COR.sim }} />Sim à frente</span>
        <span className="flex items-center gap-1.5"><span className="dot" style={{ background: CATEGORIA_COR.nao }} />Não à frente</span>
      </p>
    );
  }
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-3">
      <span className="flex items-center gap-1.5"><span className="dot" style={{ background: CATEGORIA_COR.sim }} />Sim {formatNumber(tally.counts.sim)}</span>
      <span className="flex items-center gap-1.5"><span className="dot" style={{ background: CATEGORIA_COR.nao }} />Não {formatNumber(tally.counts.nao)}</span>
      <span className="flex items-center gap-1.5">
        <span className="dot" style={{ background: CATEGORIA_COR.ausente, outline: "1px solid var(--color-line-3)" }} />Ausentes {formatNumber(tally.ausentes)}
      </span>
    </p>
  );
}

/** Phone version of the expanded view: the map is too small for labels, so states are listed. */
function MapaMovel({ modo, setModo, mapData, seats, assentos, tally, activeUf, onSelectUf }: {
  modo: Modo;
  setModo: (m: Modo) => void;
  mapData: Record<string, UfDatum>;
  seats: Seat[];
  assentos: VotoParlamentar[];
  tally: VoteTally;
  activeUf: string | null;
  onSelectUf: (uf: string | null) => void;
}) {
  const estados = useResumoUf(assentos);
  return (
    <div className="quiet-scroll max-h-[80vh] overflow-y-auto sm:hidden">
      <div className="switch switch-sm mr-12 [&>button]:flex-1" role="group" aria-label="Visualização">
        <button type="button" aria-pressed={modo === "mapa"} onClick={() => setModo("mapa")}>Mapa</button>
        <button type="button" aria-pressed={modo === "plenario"} onClick={() => setModo("plenario")}>Plenário</button>
      </div>
      {modo === "mapa" ? (
        <>
          <BrazilMap compacto data={mapData} activeUf={activeUf} onSelect={onSelectUf} label="Votos Sim por estado" className="mt-4" />
          <div className="mt-3"><LegendaCompacta modo={modo} tally={tally} /></div>
          <ul className="mt-4 grid grid-cols-2 gap-1.5" aria-label="Votos por estado">
            {estados.map((e) => (
              <li key={e.uf}>
                <button
                  type="button"
                  aria-pressed={activeUf === e.uf}
                  onClick={() => onSelectUf(activeUf === e.uf ? null : e.uf)}
                  className="flex w-full items-center gap-2 rounded-lg bg-panel-2 px-2.5 py-2 text-left aria-pressed:outline aria-pressed:outline-1 aria-pressed:outline-fg"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: mapData[e.uf]?.fill }} />
                  <span className="text-[13px] font-medium">{e.uf}</span>
                  <span className="tn ml-auto text-right text-[12px] leading-tight">
                    <span className="block font-medium text-fg">{e.pct === null ? "—" : `${e.pct}%`}</span>
                    <span className="block text-fg-4">{e.sim} × {e.nao}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-4">
          <Hemicycle
            seats={seats}
            label={`Plenário: ${tally.counts.sim} Sim, ${tally.counts.nao} Não`}
            center={
              <>
                <span className="fig-m">{formatNumber(tally.votantes)}</span>
                <span className="text-[11px] text-fg-3">votantes</span>
              </>
            }
          />
          <div className="mt-3"><LegendaCompacta modo={modo} tally={tally} /></div>
        </div>
      )}
    </div>
  );
}

/** Small map/hemicycle preview kept out of the way; expands into a dialog (?mapa=1). */
export function MapaCanto({ votacao, assentos, tally, activeUf, onSelectUf }: {
  votacao: Votacao;
  assentos: VotoParlamentar[];
  tally: VoteTally;
  activeUf: string | null;
  onSelectUf: (uf: string | null) => void;
}) {
  const [modo, setModo] = useQueryEnum<Modo>("modo", MODOS, "mapa");
  const [aberto, setAberto] = useQueryParam("mapa");
  const mapData = useMapData(votacao.secreta ? [] : assentos);
  const seats = useSeats(assentos, activeUf);
  const semVotos = assentos.length === 0;
  const ampliar = () => setAberto("1");

  return (
    <>
      <section className="card" aria-labelledby="mapa-title">
        <div className="card-head">
          <h2 id="mapa-title">{modo === "mapa" ? "Por estado" : "No plenário"}</h2>
          {!semVotos && (
            <button type="button" className="icon-btn h-8 w-8" aria-label="Ampliar mapa" title="Ampliar" onClick={ampliar}>
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>
        {semVotos ? (
          <p className="text-[12px] leading-relaxed text-fg-3">
            Votação sem registro individual, por isso não há mapa por estado nem por cadeira.
          </p>
        ) : (
          <>
            <div className="switch switch-sm mb-3 w-full [&>button]:flex-1" role="group" aria-label="Visualização">
              <button type="button" aria-pressed={modo === "mapa"} onClick={() => setModo("mapa")}>Mapa</button>
              <button type="button" aria-pressed={modo === "plenario"} onClick={() => setModo("plenario")}>Plenário</button>
            </div>
            {modo === "mapa" ? (
              <BrazilMap
                compacto
                data={mapData}
                activeUf={activeUf}
                onSelect={onSelectUf}
                label={`Votos Sim por estado. Clique num estado para filtrar os partidos.`}
                className="mx-auto max-w-[220px]"
              />
            ) : (
              <button type="button" onClick={ampliar} className="block w-full rounded-lg" aria-label="Ampliar plenário">
                <Hemicycle seats={seats} label={`Plenário: ${tally.counts.sim} Sim, ${tally.counts.nao} Não`} />
              </button>
            )}
            <div className="mt-3 flex items-center justify-between gap-2">
              <LegendaCompacta modo={modo} tally={tally} />
              {activeUf && (
                <button type="button" className="link shrink-0 text-[11px]" onClick={() => onSelectUf(null)}>
                  {activeUf} · ver Brasil
                </button>
              )}
            </div>
          </>
        )}
      </section>

      <Dialog open={aberto === "1"} onOpenChange={(o) => !o && setAberto(null)}>
        <DialogContent className="w-[min(1120px,calc(100vw-2rem))] max-h-[92vh] p-5">
          <DialogTitle className="sr">{lerVotacao(votacao).titulo}</DialogTitle>
          <DialogDescription className="sr">Mapa dos votos por estado e cadeiras do plenário.</DialogDescription>
          <div className="hidden h-[min(78vh,760px)] sm:block [&>div>div:first-child]:pr-12">
            <VoteStage votacao={votacao} assentos={assentos} tally={tally} activeUf={activeUf} onSelectUf={onSelectUf} />
          </div>
          <MapaMovel modo={modo} setModo={setModo} mapData={mapData} seats={seats} assentos={assentos} tally={tally} activeUf={activeUf} onSelectUf={onSelectUf} />
        </DialogContent>
      </Dialog>
    </>
  );
}
