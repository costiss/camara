import { ArrowLeft, ExternalLink } from "lucide-react";
import { votacaoHref } from "@/hooks/useUi";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { InspecaoVotacao } from "@/lib/inspecao";
import type { Votacao } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CADEIRAS, CATEGORIA_COR, CATEGORIA_LABEL, CATEGORIA_ORDEM, quorumDe, resultadoVotacao, type VoteTally } from "@/lib/votos";

const TONE_TEXT: Record<string, string> = {
  success: "text-green",
  danger: "text-red",
  warning: "text-yellow",
  info: "text-blue",
  accent: "text-fg",
  neutral: "text-fg-3",
};

function proposicaoUrl(v: Votacao): string | undefined {
  if (!v.proposicaoId) return undefined;
  return v.casa === "camara"
    ? `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${v.proposicaoId}`
    : `https://www25.senado.leg.br/web/atividade/materias/-/materia/${v.proposicaoId}`;
}

export function InspecaoResumo({ votacao, tally, inspecao, onVoto }: {
  votacao: Votacao;
  tally: VoteTally;
  inspecao: InspecaoVotacao;
  onVoto: (c: string) => void;
}) {
  const r = resultadoVotacao(votacao);
  const contagem = inspecao.contagem;
  const total = inspecao.assentos.length;
  const quorum = quorumDe(votacao.casa, votacao.proposicaoTipo);
  const casa = votacao.casa === "camara" ? "Câmara" : "Senado";
  const urlProposicao = proposicaoUrl(votacao);

  return (
    <section className="card enter" aria-labelledby="inspecao-title">
      <a href={votacaoHref(votacao)} className="inline-flex items-center gap-1 text-[12px] text-fg-3 no-underline hover:text-fg">
        <ArrowLeft className="h-3.5 w-3.5" /> Painel da votação
      </a>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="label">{casa} · Plenário · inspeção</span>
        <span className="chip">
          <span className={cn("h-1.5 w-1.5 rounded-full bg-current", TONE_TEXT[r.tone])} />
          {r.label}
        </span>
      </div>
      <h1 id="inspecao-title" className="manchete mt-4">
        <span className={TONE_TEXT[r.tone]}>{votacao.proposicao ?? "Votação"}</span>
      </h1>
      <p className="mt-1 text-[12px] text-fg-3">{formatDateTime(votacao.dataHora ?? votacao.data).replace(", ", " às ")}</p>
      {votacao.ementa && <p className="mt-3 text-[12px] leading-relaxed text-fg-2">{votacao.ementa}</p>}

      <div className="mt-4 border-t border-line pt-3">
        <p className="label text-[11px]">O que foi votado</p>
        <p className="mt-1 text-[12px] leading-relaxed text-fg-3">{votacao.descricao}</p>
      </div>

      {total > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <div className="flex h-2 overflow-hidden rounded-full" role="img" aria-label="Distribuição dos votos por cadeira">
            {CATEGORIA_ORDEM.filter((c) => contagem[c] > 0).map((c) => (
              <span key={c} style={{ flexGrow: contagem[c], background: CATEGORIA_COR[c] }} />
            ))}
          </div>
          <ul className="mt-3 flex flex-col">
            {CATEGORIA_ORDEM.filter((c) => contagem[c] > 0).map((c) => (
              <li key={c}>
                <button type="button" onClick={() => onVoto(c)} className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-[13px] hover:bg-fg/5">
                  <span className="h-2 w-2 rounded-full" style={{ background: CATEGORIA_COR[c], outline: c === "ausente" ? "1px solid var(--color-line-2)" : undefined }} />
                  <span className="text-fg-2">{CATEGORIA_LABEL[c]}</span>
                  <span className="tn ml-auto font-medium">{formatNumber(contagem[c])}</span>
                  <span className="tn w-12 text-right text-[12px] text-fg-4">{((contagem[c] / total) * 100).toFixed(1).replace(".", ",")}%</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 border-t border-line pt-3 text-[13px]">
        <div className="flex justify-between py-1"><span className="label">Quórum</span><span className="text-right">{quorum.regra}</span></div>
        {quorum.minimoSim !== null && (
          <div className="flex justify-between py-1">
            <span className="label">Mínimo de votos Sim</span>
            <span className="tn">{formatNumber(quorum.minimoSim)} · {contagem.sim >= quorum.minimoSim ? "atingido" : "não atingido"}</span>
          </div>
        )}
        <div className="flex justify-between py-1"><span className="label">Cadeiras</span><span className="tn">{CADEIRAS[votacao.casa]}</span></div>
        <div className="flex justify-between py-1"><span className="label">Votantes</span><span className="tn">{formatNumber(tally.votantes)}</span></div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
        {votacao.url && (
          <a className="link inline-flex items-center gap-1" href={votacao.url} target="_blank" rel="noopener noreferrer">
            Fonte oficial <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {urlProposicao && (
          <a className="link inline-flex items-center gap-1" href={urlProposicao} target="_blank" rel="noopener noreferrer">
            Tramitação <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </section>
  );
}
