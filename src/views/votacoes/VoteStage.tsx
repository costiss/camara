import { useQueryEnum } from "@/hooks/useUi";
import { BrazilMap } from "@/components/hud/BrazilMap";
import { Hemicycle } from "@/components/shared";
import { formatNumber } from "@/lib/format";
import { CATEGORIA_COR, CATEGORIA_LABEL, CATEGORIA_ORDEM, resultadoVotacao, type VoteTally } from "@/lib/votos";
import type { Votacao, VotoParlamentar } from "@/lib/types";
import { MODOS, type Modo, useMapData, useSeats } from "./estagio";

function Legenda({ tally, modo }: { tally: VoteTally; modo: Modo }) {
  if (modo === "mapa") {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fg-2">
        <span className="flex items-center gap-1.5"><span className="dot" style={{ background: CATEGORIA_COR.sim }} />Sim à frente</span>
        <span className="flex items-center gap-1.5"><span className="dot" style={{ background: CATEGORIA_COR.nao }} />Não à frente</span>
        <span className="text-fg-4">% de Sim entre Sim e Não</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fg-2">
      {CATEGORIA_ORDEM.filter((c) => tally.counts[c] > 0 || (c === "ausente" && tally.ausentes > 0)).map((c) => (
        <span key={c} className="flex items-center gap-1.5">
          <span className="dot" style={{ background: CATEGORIA_COR[c], outline: c === "ausente" ? "1px solid var(--color-line-3)" : undefined }} />
          {CATEGORIA_LABEL[c]} <span className="tn font-medium text-fg">{formatNumber(c === "ausente" ? tally.ausentes : tally.counts[c])}</span>
        </span>
      ))}
    </div>
  );
}

export function VoteStage({ votacao, assentos, tally, activeUf, onSelectUf }: {
  votacao: Votacao;
  assentos: VotoParlamentar[];
  tally: VoteTally;
  activeUf: string | null;
  onSelectUf: (uf: string | null) => void;
}) {
  const [modo, setModo] = useQueryEnum<Modo>("modo", MODOS, "mapa");
  const mapData = useMapData(votacao.secreta ? [] : assentos);
  const seats = useSeats(assentos, activeUf);
  const r = resultadoVotacao(votacao);
  const semVotos = assentos.length === 0;

  const pill = (
    <span className="surface inline-flex max-w-full items-center gap-2 rounded-full px-4 py-2 text-[13px]">
      <span className="truncate">
        <b className="font-medium">{r.label}</b>
        {votacao.placar && votacao.placar.total > 0 && ` por ${votacao.placar.sim} votos a ${votacao.placar.nao}`}
      </span>
      <span className="shrink-0 text-fg-4">{votacao.casa === "camara" ? "Câmara" : "Senado"}</span>
    </span>
  );

  return (
    <div className="relative flex h-full flex-col min-[1180px]:min-h-[420px]">
      <div className="z-10 flex flex-wrap items-center justify-between gap-3">
        <div className="switch switch-sm" role="group" aria-label="Visualização">
          <button type="button" aria-pressed={modo === "mapa"} onClick={() => setModo("mapa")}>Mapa</button>
          <button type="button" aria-pressed={modo === "plenario"} onClick={() => setModo("plenario")}>Plenário</button>
        </div>
        <div className="hidden min-w-0 justify-center xl:flex">{pill}</div>
        {!semVotos && <Legenda tally={tally} modo={modo} />}
      </div>

      <div className="relative min-h-0 flex-1 py-3">
        {semVotos ? (
          <BrazilMap
            data={{}}
            label="Mapa sem dados de votação"
            overlay={
              <div className="absolute inset-0 grid place-items-center p-6">
                <div className="surface max-w-sm p-4 text-center">
                  <p className="text-[13px] font-medium">Sem votos individuais para mapear</p>
                  <p className="mt-1 text-[12px] text-fg-3">
                    Votações simbólicas não registram o voto de cada parlamentar. Escolha uma votação nominal na lista ao lado.
                  </p>
                </div>
              </div>
            }
          />
        ) : modo === "mapa" ? (
          <BrazilMap
            data={mapData}
            activeUf={activeUf}
            onSelect={onSelectUf}
            label={`Votos Sim por estado em ${votacao.proposicao ?? "votação"}`}
          />
        ) : (
          <div className="flex h-full flex-col justify-center">
            <Hemicycle
              seats={seats}
              label={`Plenário: ${tally.counts.sim} Sim, ${tally.counts.nao} Não`}
              className="mx-auto max-w-[760px]"
              center={
                <>
                  <span className="fig">{formatNumber(tally.votantes)}</span>
                  <span className="text-[12px] text-fg-3">votantes de {assentos.length >= tally.cadeiras ? tally.cadeiras : `${tally.cadeiras} cadeiras`}</span>
                </>
              }
            />
            <p className="mt-4 text-center text-[12px] text-fg-4">Cadeiras ordenadas da esquerda à direita por espectro partidário</p>
          </div>
        )}
      </div>
    </div>
  );
}
