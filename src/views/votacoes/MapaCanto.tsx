import { Maximize2 } from "lucide-react";
import { BrazilMap } from "@/components/hud/BrazilMap";
import { Hemicycle } from "@/components/shared";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useQueryEnum, useQueryParam } from "@/hooks/useUi";
import { formatNumber } from "@/lib/format";
import { lerVotacao } from "@/lib/linguagem";
import type { Votacao, VotoParlamentar } from "@/lib/types";
import { CATEGORIA_COR, type VoteTally } from "@/lib/votos";
import { MODOS, type Modo, useMapData, useSeats } from "./estagio";
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
          <div className="h-[min(78vh,760px)] [&>div>div:first-child]:pr-12">
            <VoteStage votacao={votacao} assentos={assentos} tally={tally} activeUf={activeUf} onSelectUf={onSelectUf} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
