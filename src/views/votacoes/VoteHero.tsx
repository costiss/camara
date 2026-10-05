import { ExternalLink } from "lucide-react";
import { formatDateTime, formatNumber } from "@/lib/format";
import { CADEIRAS, CATEGORIA_COR, quorumDe, resultadoVotacao, type VoteTally } from "@/lib/votos";
import type { StatusTone, Votacao } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE_TEXT: Record<StatusTone, string> = {
  success: "text-green",
  danger: "text-red",
  warning: "text-yellow",
  info: "text-blue",
  accent: "text-fg",
  neutral: "text-fg-2",
};

const FEMININO = new Set(["PEC", "MPV"]);
const CASA_LOCAL = { camara: "na Câmara", senado: "no Senado" } as const;

function manchete(v: Votacao) {
  const r = resultadoVotacao(v);
  const genero = FEMININO.has(v.proposicaoTipo ?? "") ? "a" : "o";
  const verbo =
    r.label === "Aprovada" ? `aprovad${genero}` : r.label === "Rejeitada" ? `rejeitad${genero}` : null;
  return { r, frase: verbo ? `${verbo} ${CASA_LOCAL[v.casa]}` : `${r.label.toLowerCase()} ${CASA_LOCAL[v.casa]}` };
}

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
      <span className="fig mt-2">
        {formatNumber(valor)}
        {pct !== null && <sup className="ml-0.5 align-super text-[13px] font-normal text-fg-3">{pct.toFixed(1).replace(".", ",")}%</sup>}
      </span>
    </div>
  );
}

function Linha({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="label">{k}</span>
      <span className="tn text-right text-[13px] text-fg-2">{v}</span>
    </div>
  );
}

export function VoteHero({ votacao, tally, onOpenRollCall }: {
  votacao: Votacao;
  tally: VoteTally;
  onOpenRollCall?: () => void;
}) {
  const { r, frase } = manchete(votacao);
  const cadeiras = CADEIRAS[votacao.casa];
  const temNominal = tally.votantes > 0 || (votacao.placar?.total ?? 0) > 0;
  const placar = tally.votantes > 0 && !votacao.secreta ? tally.placar : votacao.placar;
  const sim = placar?.sim ?? 0;
  const nao = placar?.nao ?? 0;
  const validos = sim + nao;
  const quorum = quorumDe(votacao.casa, votacao.proposicaoTipo);
  const minimo = quorum.minimoSim ?? Math.floor((tally.votantes || placar?.total || 0) / 2) + 1;
  const atingido = sim >= minimo;
  const casaLabel = votacao.casa === "camara" ? "Câmara" : "Senado";

  return (
    <section className="card enter" aria-labelledby="vote-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label">{casaLabel} · Plenário</span>
        <span className="chip">
          <span className={cn("h-1.5 w-1.5 rounded-full bg-current", TONE_TEXT[r.tone])} />
          {r.label} · {formatDateTime(votacao.dataHora ?? votacao.data).replace(", ", " às ")}
        </span>
      </div>

      <h1 id="vote-title" className="manchete mt-4">
        <span className={TONE_TEXT[r.tone]}>{votacao.proposicao ?? "Votação"}</span> {frase}
      </h1>
      {votacao.ementa && <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-fg-3">{votacao.ementa}</p>}

      {temNominal && placar && validos > 0 ? (
        <>
          <div className="mt-5 flex items-end justify-between gap-3">
            <Figura label="Sim" valor={sim} pct={(sim / validos) * 100} cor={CATEGORIA_COR.sim} alinhamento="left" />
            <Figura label="Não" valor={nao} pct={(nao / validos) * 100} cor={CATEGORIA_COR.nao} alinhamento="right" />
          </div>
          <div className="duel mt-4" role="img" aria-label={`${sim} Sim e ${nao} Não de ${cadeiras} cadeiras; mínimo ${minimo}`}>
            <span style={{ flexGrow: sim, background: CATEGORIA_COR.sim }} />
            <span style={{ flexGrow: Math.max(0, cadeiras - validos), background: "var(--color-panel-3)" }} />
            <span style={{ flexGrow: nao, background: CATEGORIA_COR.nao }} />
            <span className="duel-mark" style={{ left: `${(minimo / cadeiras) * 100}%` }} />
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <Linha k="Quórum" v={quorum.regra} />
            <Linha k={`Mínimo de votos Sim`} v={`${formatNumber(minimo)} · ${atingido ? "atingido" : "não atingido"}`} />
            {tally.counts.abstencao > 0 && <Linha k="Abstenções" v={formatNumber(tally.counts.abstencao)} />}
            {tally.counts.obstrucao > 0 && <Linha k="Obstrução" v={formatNumber(tally.counts.obstrucao)} />}
            {tally.counts.presente > 0 && <Linha k="Presentes sem voto" v={formatNumber(tally.counts.presente)} />}
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-line bg-panel-2/60 p-3">
          <p className="text-[13px] font-medium text-fg-2">
            {votacao.secreta ? "Votação secreta" : "Votação simbólica"}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-fg-3">
            {votacao.secreta
              ? "O Senado divulga quem votou, mas não o voto de cada senador."
              : "Sem registro individual: o resultado foi proclamado pela Presidência, sem uso do painel eletrônico."}
          </p>
        </div>
      )}

      {tally.votantes > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
          <div><p className="label text-[11px]">Votantes</p><p className="fig-m mt-1 text-[20px]">{formatNumber(tally.votantes)}</p></div>
          <div><p className="label text-[11px]">Presença</p><p className="fig-m mt-1 text-[20px]">{(((tally.votantes + tally.counts.presente) / cadeiras) * 100).toFixed(1).replace(".", ",")}%</p></div>
          <div><p className="label text-[11px]">Ausentes</p><p className="fig-m mt-1 text-[20px]">{formatNumber(tally.ausentes)}</p></div>
        </div>
      )}

      <p className="mt-4 text-[12px] leading-relaxed text-fg-4">{votacao.descricao}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
        {onOpenRollCall && tally.votantes > 0 && (
          <button type="button" className="link" onClick={onOpenRollCall}>
            {votacao.secreta ? "Ver presença" : "Ver votação nominal"}
          </button>
        )}
        {votacao.url && (
          <a className="link inline-flex items-center gap-1" href={votacao.url} target="_blank" rel="noopener noreferrer">
            Fonte oficial <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </section>
  );
}
