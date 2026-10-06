import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useContextoProposta } from "@/hooks/useContextoProposta";
import { useQueryParam } from "@/hooks/useUi";
import { explicarQuorum, GLOSSARIO, proximosPassos, significadoDoVoto } from "@/lib/explicacao";
import { formatDate } from "@/lib/format";
import { lerVotacao } from "@/lib/linguagem";
import type { ContextoProposta, Votacao } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CATEGORIA_COR, resultadoVotacao } from "@/lib/votos";

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-fg-4">{titulo}</h3>
      <div className="mt-1.5 text-[14px] leading-relaxed text-fg-2">{children}</div>
    </div>
  );
}

function SituacaoHoje({ contexto, carregando }: { contexto?: ContextoProposta; carregando: boolean }) {
  if (carregando) {
    return (
      <div className="rounded-[10px] bg-panel-2 px-3 py-2.5" aria-busy="true">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="mt-2 h-4 w-3/4" />
      </div>
    );
  }
  if (!contexto?.situacao && !contexto?.norma) return null;
  const vetos = contexto.vetos === "parcial" ? ", com vetos parciais do Presidente" : contexto.vetos === "total" ? ", mas foi vetado pelo Presidente" : "";
  return (
    <div className="rounded-[10px] bg-panel-2 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-fg-4">
        Situação hoje{contexto.dataSituacao ? ` · atualizado em ${formatDate(contexto.dataSituacao.slice(0, 10))}` : ""}
      </p>
      <p className="mt-0.5 text-[15px] font-medium leading-snug text-fg">
        {contexto.norma ? `Virou a ${contexto.norma}${vetos}.` : contexto.situacao}
      </p>
      {contexto.norma && contexto.situacao && <p className="mt-0.5 text-[12px] text-fg-3">{contexto.situacao}</p>}
    </div>
  );
}

/** "Para leigos": what was decided, what Sim/Não meant, the threshold and what happens next. */
export function ParaLeigos({ votacao }: { votacao: Votacao }) {
  const [aberto, setAberto] = useQueryParam("leigos");
  const expandido = aberto === "1";
  const leitura = lerVotacao(votacao);
  const contexto = useContextoProposta(votacao, expandido);
  const significado = significadoDoVoto(leitura.etapa);
  const r = resultadoVotacao(votacao);
  const tipo = leitura.tipo?.codigo;
  const dados = contexto.data;

  return (
    <section className="card @container" aria-labelledby="leigos-title">
      <h2 id="leigos-title" className="m-0">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg text-left"
          aria-expanded={expandido}
          aria-controls="leigos-conteudo"
          onClick={() => setAberto(expandido ? null : "1")}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium text-fg">Para leigos: entenda esta votação</span>
            {!expandido && (
              <span className="mt-0.5 block text-[12px] font-normal text-fg-3">
                O que significava votar Sim ou Não, quantos votos eram necessários e o que acontece agora.
              </span>
            )}
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-fg-3 transition-transform", expandido && "rotate-180")} aria-hidden="true" />
        </button>
      </h2>

      {expandido && (
        <div id="leigos-conteudo" className="mt-4">
          <SituacaoHoje contexto={dados} carregando={contexto.isLoading} />

          <div className="mt-4 grid gap-x-8 gap-y-5 [&>*]:min-w-0 @xl:grid-cols-2">
            <Bloco titulo="Do que se trata">
              <p>{/[.…]$/.test(leitura.titulo) ? leitura.titulo : `${leitura.titulo}.`}</p>
              {leitura.tipo && <p className="mt-1 text-[13px] text-fg-3">É {leitura.tipo.curto.startsWith("Medida") || leitura.tipo.curto.startsWith("Lei") || leitura.tipo.curto.startsWith("Emenda") ? "uma" : "um"} {leitura.tipo.curto.charAt(0).toLowerCase() + leitura.tipo.curto.slice(1)}: {leitura.tipo.explica.charAt(0).toLowerCase() + leitura.tipo.explica.slice(1)}</p>}
              {dados && dados.temas.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Temas">
                  {dados.temas.map((t) => <li key={t} className="chip h-auto min-h-6 max-w-full whitespace-normal px-2.5 py-0.5 text-[12px] leading-snug">{t}</li>)}
                </ul>
              )}
            </Bloco>

            <Bloco titulo={`O que significava votar · ${leitura.etapa.rotulo}`}>
              <p><b className="font-medium" style={{ color: CATEGORIA_COR.sim }}>Sim</b> era {significado.sim}</p>
              <p className="mt-1"><b className="font-medium" style={{ color: CATEGORIA_COR.nao }}>Não</b> era {significado.nao}</p>
              {significado.nota && <p className="mt-1 text-[12px] text-fg-4">{significado.nota}</p>}
            </Bloco>

            <Bloco titulo="Quantos votos eram necessários">
              <p>{explicarQuorum(votacao.casa, tipo)}</p>
            </Bloco>

            <Bloco titulo="E agora?">
              <p>
                {proximosPassos({
                  casa: votacao.casa,
                  tipo,
                  etapa: leitura.etapa,
                  aprovada: r.tone === "success",
                  rejeitada: r.tone === "danger",
                  hoje: ["principal", "senado", "preliminar"].includes(leitura.etapa.tipo) ? dados : undefined,
                })}
              </p>
            </Bloco>
          </div>

          {dados && (dados.autores.length > 0 || dados.textoIntegral) && (
            <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2 border-t border-line pt-3 text-[13px]">
              {dados.autores.length > 0 && (
                <p className="text-fg-3">
                  Quem propôs: <span className="text-fg-2">{dados.autores.slice(0, 3).join(", ")}{dados.autores.length > 3 ? ` e mais ${dados.autores.length - 3}` : ""}</span>
                </p>
              )}
              {dados.textoIntegral && (
                <a className="link inline-flex items-center gap-1" href={dados.textoIntegral} target="_blank" rel="noopener noreferrer">
                  Ler o texto completo <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          <details className="group mt-4 border-t border-line pt-3">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] text-fg-3 hover:text-fg [&::-webkit-details-marker]:hidden">
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
              Glossário: termos que aparecem nesta página
            </summary>
            <dl className="mt-3 grid gap-x-8 gap-y-3 @xl:grid-cols-2">
              {GLOSSARIO.map((g) => (
                <div key={g.termo}>
                  <dt className="text-[13px] font-medium text-fg">{g.termo}</dt>
                  <dd className="mt-0.5 text-[13px] leading-relaxed text-fg-3">{g.explica}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
      )}
    </section>
  );
}
