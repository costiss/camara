import { Check, ChevronRight, Minus, X } from "lucide-react";
import type { Leitura, TipoProposta } from "@/lib/linguagem";
import type { StatusTone, Votacao } from "@/lib/types";
import { cn } from "@/lib/utils";
import { resultadoVotacao } from "@/lib/votos";

const TOM: Record<StatusTone, string> = {
  success: "text-green",
  danger: "text-red",
  warning: "text-yellow",
  info: "text-blue",
  accent: "text-fg",
  neutral: "text-fg-3",
};

/** The outcome as an icon plus a word, never colour alone. */
export function Veredito({ votacao, className }: { votacao: Pick<Votacao, "descricao" | "aprovacao">; className?: string }) {
  const r = resultadoVotacao(votacao);
  const Icone = r.tone === "success" ? Check : r.tone === "danger" ? X : Minus;
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", TOM[r.tone], className)}>
      <Icone className="h-[1.1em] w-[1.1em] shrink-0" strokeWidth={2.5} aria-hidden="true" />
      {r.label}
    </span>
  );
}

/** "Lei complementar · PLP 74/2026": the kind of proposal in words, the code demoted. */
export function CodigoProposta({ leitura, className }: { leitura: Leitura; className?: string }) {
  if (!leitura.codigo) return null;
  return (
    <span className={className} title={leitura.tipo?.explica}>
      {leitura.tipo && <span>{leitura.tipo.curto}</span>}
      {leitura.tipo && <span aria-hidden="true"> · </span>}
      <span className="tn">{leitura.codigo}</span>
    </span>
  );
}

function Detalhe({ resumo, children, className }: { resumo: string; children: React.ReactNode; className?: string }) {
  return (
    <details className={cn("group text-[12px]", className)}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-fg-3 hover:text-fg [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
        {resumo}
      </summary>
      <div className="mt-2 border-l border-line-2 pl-3 leading-relaxed text-fg-2">{children}</div>
    </details>
  );
}

export function ExplicaTipo({ tipo, className }: { tipo: TipoProposta; className?: string }) {
  const artigo = /^(Medida|Emenda|Mensagem|Resolução|Lei)/.test(tipo.curto) ? "uma" : "um";
  return (
    <Detalhe resumo={`O que é ${artigo} ${tipo.curto.charAt(0).toLowerCase()}${tipo.curto.slice(1)}?`} className={className}>
      <p>{tipo.explica}</p>
      <p className="mt-1 text-fg-4">{tipo.nome} ({tipo.codigo})</p>
    </Detalhe>
  );
}

export function TextoOficial({ ementa, descricao, className }: { ementa?: string; descricao?: string; className?: string }) {
  if (!ementa && !descricao) return null;
  return (
    <Detalhe resumo="Ver texto oficial" className={className}>
      {ementa && (
        <>
          <p className="text-[11px] font-medium text-fg-4">Ementa</p>
          <p className="mt-0.5">{ementa}</p>
        </>
      )}
      {descricao && (
        <>
          <p className={cn("text-[11px] font-medium text-fg-4", ementa && "mt-2")}>Descrição da votação</p>
          <p className="mt-0.5">{descricao}</p>
        </>
      )}
    </Detalhe>
  );
}
