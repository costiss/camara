import { ArrowLeft, ExternalLink } from "lucide-react";
import { CodigoProposta, ExplicaTipo, TextoOficial, Veredito } from "@/components/hud/proposta";
import { votacaoHref } from "@/hooks/useUi";
import { formatNumber, formatQuando } from "@/lib/format";
import { lerVotacao } from "@/lib/linguagem";
import type { InspecaoVotacao } from "@/lib/inspecao";
import type { Votacao } from "@/lib/types";
import { CADEIRAS, CATEGORIA_COR, CATEGORIA_LABEL, CATEGORIA_ORDEM, quorumDe, type VoteTally } from "@/lib/votos";

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
  const leitura = lerVotacao(votacao);
  const contagem = inspecao.contagem;
  const total = inspecao.assentos.length;
  const quorum = quorumDe(votacao.casa, votacao.proposicaoTipo);
  const casa = votacao.casa === "camara" ? "Câmara dos Deputados" : "Senado Federal";
  const urlProposicao = proposicaoUrl(votacao);

  return (
    <section className="card enter" aria-labelledby="inspecao-title">
      <a href={votacaoHref(votacao)} className="inline-flex items-center gap-1 text-[12px] text-fg-3 no-underline hover:text-fg">
        <ArrowLeft className="h-3.5 w-3.5" /> Painel da votação
      </a>
      <p className="label mt-3">{casa} · {formatQuando(votacao.dataHora ?? votacao.data)}</p>
      <Veredito votacao={votacao} className="mt-4 text-[14px]" />
      <h1 id="inspecao-title" className="titulo-voto titulo-voto-medio mt-1.5">{leitura.titulo}</h1>
      <CodigoProposta leitura={leitura} className="mt-2 block text-[13px] text-fg-3" />
      {leitura.tipo && <ExplicaTipo tipo={leitura.tipo} className="mt-1.5" />}

      <div className="mt-4 rounded-[10px] bg-panel-2 px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-fg-4">Em votação</p>
        <p className="mt-0.5 text-[14px] font-medium text-fg">{leitura.etapa.rotulo}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-fg-3">{leitura.etapa.explica}</p>
      </div>
      <TextoOficial ementa={votacao.ementa} descricao={votacao.descricao} className="mt-3" />

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
