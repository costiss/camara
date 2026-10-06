import { ExternalLink } from "lucide-react";
import { CodigoProposta, TextoOficial, Veredito } from "@/components/hud/proposta";
import { inspecaoHref } from "@/hooks/useUi";
import { formatNumber, formatQuando } from "@/lib/format";
import { lerVotacao } from "@/lib/linguagem";
import type { Votacao } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CADEIRAS, CATEGORIA_COR, quorumDe, type VoteTally } from "@/lib/votos";

const CASA_NOME = { camara: "Câmara dos Deputados", senado: "Senado Federal" } as const;
const MEMBROS = { camara: "deputados", senado: "senadores" } as const;

function Figura({ label, valor, pct, cor, alinhamento }: {
  label: string;
  valor: number;
  pct: number | null;
  cor: string;
  alinhamento: "left" | "right";
}) {
  return (
    <div className={cn("flex flex-col", alinhamento === "right" && "items-end text-right")}>
      <span className="text-[14px] font-medium" style={{ color: cor }}>{label}</span>
      <span className="fig mt-1.5">
        {formatNumber(valor)}
        {pct !== null && <sup className="ml-0.5 align-super text-[13px] font-normal text-fg-3">{pct.toFixed(1).replace(".", ",")}%</sup>}
      </span>
    </div>
  );
}

function tamanhoTitulo(titulo: string): string {
  if (titulo.length > 80) return "titulo-voto titulo-voto-longo";
  if (titulo.length > 48) return "titulo-voto titulo-voto-medio";
  return "titulo-voto";
}

export function VoteHero({ votacao, tally, onOpenRollCall }: {
  votacao: Votacao;
  tally: VoteTally;
  onOpenRollCall?: () => void;
}) {
  const leitura = lerVotacao(votacao);
  const cadeiras = CADEIRAS[votacao.casa];
  const placar = tally.votantes > 0 && !votacao.secreta ? tally.placar : votacao.placar;
  const sim = placar?.sim ?? 0;
  const nao = placar?.nao ?? 0;
  const validos = sim + nao;
  const temPlacar = !!placar && validos > 0;
  const quorum = quorumDe(votacao.casa, votacao.proposicaoTipo);
  const minimo = quorum.minimoSim ?? Math.floor((tally.votantes || placar?.total || 0) / 2) + 1;
  const membros = MEMBROS[votacao.casa];

  return (
    <section className="card enter @container" aria-labelledby="vote-title">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <p className="label">{CASA_NOME[votacao.casa]}</p>
          <p className="mt-0.5 text-[12px] text-fg-4">{formatQuando(votacao.dataHora ?? votacao.data)}</p>
        </div>
        <Veredito votacao={votacao} destaque className="text-[14px]" />
      </div>

      <h1 id="vote-title" className={cn("mt-4", tamanhoTitulo(leitura.titulo))}>{leitura.titulo}</h1>
      <CodigoProposta leitura={leitura} className="mt-2.5 block text-[13px] text-fg-3" />

      <div className="mt-5 grid gap-5 @xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] @xl:gap-7">
        <div>
          {temPlacar ? (
            <>
              <div className="flex items-end justify-between gap-3">
                <Figura label="Sim" valor={sim} pct={(sim / validos) * 100} cor={CATEGORIA_COR.sim} alinhamento="left" />
                <Figura label="Não" valor={nao} pct={(nao / validos) * 100} cor={CATEGORIA_COR.nao} alinhamento="right" />
              </div>
              <div className="duel mt-3" role="img" aria-label={`${sim} Sim e ${nao} Não de ${cadeiras} cadeiras; mínimo ${minimo}`}>
                <span style={{ flexGrow: sim, background: CATEGORIA_COR.sim }} />
                <span style={{ flexGrow: Math.max(0, cadeiras - validos), background: "var(--color-panel-3)" }} />
                <span style={{ flexGrow: nao, background: CATEGORIA_COR.nao }} />
                <span className="duel-mark" style={{ left: `${(minimo / cadeiras) * 100}%` }} />
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-fg-2">
                {quorum.minimoSim !== null ? (
                  <>
                    Precisava de <b className="font-medium text-fg">{formatNumber(minimo)} votos Sim</b> ({quorum.regra.toLowerCase()}) e teve{" "}
                    <b className="font-medium text-fg">{formatNumber(sim)}</b>.
                  </>
                ) : (
                  <>Bastava ter mais votos Sim do que Não entre os presentes.</>
                )}
                {tally.counts.abstencao > 0 && ` ${formatNumber(tally.counts.abstencao)} se abstiveram.`}
              </p>
            </>
          ) : (
            <div className="rounded-[10px] border border-line px-3 py-2.5">
              <p className="text-[13px] font-medium text-fg-2">{votacao.secreta ? "Votação secreta" : "Votação simbólica"}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-fg-3">
                {votacao.secreta
                  ? "O Senado divulga quem votou, mas não o voto de cada senador."
                  : `Sem registro individual: os ${membros} se manifestaram em conjunto e a Presidência anunciou o resultado.`}
              </p>
            </div>
          )}

          {tally.votantes > 0 && (
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
              <div><dt className="label text-[11px]">Votaram</dt><dd className="fig-m mt-1 text-[20px]">{formatNumber(tally.votantes)}</dd></div>
              <div><dt className="label text-[11px]">Presença</dt><dd className="fig-m mt-1 text-[20px]">{(((tally.votantes + tally.counts.presente) / cadeiras) * 100).toFixed(0)}%</dd></div>
              <div><dt className="label text-[11px]">Ausentes</dt><dd className="fig-m mt-1 text-[20px]">{formatNumber(tally.ausentes)}</dd></div>
            </dl>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-[10px] bg-panel-2 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-fg-4">Em votação</p>
            <p className="mt-0.5 text-[14px] font-medium text-fg">{leitura.etapa.rotulo}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-fg-3">{leitura.etapa.explica}</p>
          </div>
          <TextoOficial ementa={votacao.ementa} descricao={votacao.descricao} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {onOpenRollCall && tally.votantes > 0 && (
          <button type="button" className="btn btn-sm" onClick={onOpenRollCall}>
            {votacao.secreta ? "Ver quem votou" : `Ver o voto de cada um`}
          </button>
        )}
        <a className="btn btn-sm no-underline" href={inspecaoHref(votacao)}>Todos os detalhes</a>
        {votacao.url && (
          <a className="link ml-auto inline-flex items-center gap-1 text-[12px]" href={votacao.url} target="_blank" rel="noopener noreferrer">
            Fonte oficial <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </section>
  );
}
