import { routeHref } from "@/hooks/useUi";
import { formatDate } from "@/lib/format";
import { statusTone } from "@/lib/parties";
import type { Proposicao, StatusTone } from "@/lib/types";

const TONE: Record<StatusTone, string> = {
  success: "text-green",
  danger: "text-red",
  warning: "text-yellow",
  info: "text-blue",
  accent: "text-fg",
  neutral: "text-fg-3",
};

function fraseado(status: string): string {
  return status === status.toUpperCase() ? status.charAt(0) + status.slice(1).toLowerCase() : status;
}

function resumirAutores(autor?: string): string | undefined {
  if (!autor) return undefined;
  const nomes = autor.split(/,\s*(?=Senador|Deputad|Senadora)/);
  return nomes.length > 2 ? `${nomes[0]} e mais ${nomes.length - 1}` : autor;
}

export function PecRow({ p, votada, onOpen }: { p: Proposicao; votada?: boolean; onOpen: (p: Proposicao) => void }) {
  return (
    <div className="flex items-start gap-3 rounded-[10px] px-2 py-3 transition-colors hover:bg-fg/5">
      <button type="button" onClick={() => onOpen(p)} className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="tn text-[14px] font-medium text-fg">{p.sigla}</span>
          <span className="text-[12px] text-fg-4">{p.casa === "camara" ? "Câmara" : "Senado"}</span>
          {p.status && <span className={`text-[12px] ${TONE[statusTone(p.status)]}`}>{fraseado(p.status)}</span>}
        </span>
        <span className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-fg-3">{p.ementa}</span>
        <span className="mt-1 line-clamp-1 text-[11px] text-fg-5">
          {p.apresentacao && `Apresentada em ${formatDate(p.apresentacao)}`}
          {p.autor && ` · ${resumirAutores(p.autor)}`}
        </span>
      </button>
      {p.votacaoId ? (
        <a href={routeHref("votacoes", p.votacaoId)} className="link shrink-0 text-[12px]">
          Ver votação
        </a>
      ) : votada ? (
        <span className="shrink-0 text-[12px] text-green">Votada no Plenário</span>
      ) : null}
    </div>
  );
}
