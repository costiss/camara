import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { LoadingRows } from "@/components/shared";
import { useEventoPauta } from "@/hooks/useCamara";
import { formatTime } from "@/lib/format";
import { statusTone } from "@/lib/parties";
import type { Evento } from "@/lib/types";
import { cn } from "@/lib/utils";

function Pauta({ eventoId }: { eventoId: string }) {
  const q = useEventoPauta(eventoId.replace(/^camara-/, ""));
  const [soVotados, setSoVotados] = useState(false);
  const pauta = q.data ?? [];
  const votados = pauta.filter((p) => p.votado).length;
  const visiveis = soVotados ? pauta.filter((p) => p.votado) : pauta;

  if (q.isLoading) return <LoadingRows rows={2} height={40} />;
  if (pauta.length === 0) return <p className="py-2 text-[12px] text-fg-4">Pauta ainda não publicada.</p>;
  return (
    <div>
      {votados > 0 && (
        <div className="tabs-mini mb-2" role="group" aria-label="Filtrar pauta">
          <button type="button" aria-pressed={!soVotados} onClick={() => setSoVotados(false)}>Toda a pauta ({pauta.length})</button>
          <button type="button" aria-pressed={soVotados} onClick={() => setSoVotados(true)}>Já votados ({votados})</button>
        </div>
      )}
      <ol className="flex flex-col">
        {visiveis.map((item, i) => (
          <li key={`${item.id}-${i}`} className={cn("flex gap-3 py-2", i > 0 && "rowline")}>
            <span className="tn w-5 shrink-0 text-right text-[12px] text-fg-5">{i + 1}</span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[13px] font-medium">{item.sigla}</span>
                {item.votado && <span className="text-[12px] text-green">votado</span>}
                {item.status && <span className={cn("text-[12px]", statusTone(item.status) === "success" ? "text-green" : "text-fg-4")}>{item.status}</span>}
              </span>
              <span className="mt-0.5 line-clamp-2 text-[12px] text-fg-3">{item.ementa}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function EventoItem({ e }: { e: Evento }) {
  const [aberto, setAberto] = useState(false);
  const cancelado = /cancel|adiad/i.test(e.situacao);
  return (
    <div className="py-3">
      <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-3">
        <span className="tn pt-0.5 text-[13px] text-fg-2">{formatTime(e.inicio)}</span>
        <div className="min-w-0">
          <p className={cn("text-[13px] font-medium leading-snug", cancelado && "text-fg-4 line-through")}>{e.titulo}</p>
          <p className="mt-0.5 text-[12px] text-fg-3">
            {[e.tipo, e.orgao, e.local].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
            <span className={cn(cancelado ? "text-red" : /encerrad|realizad/i.test(e.situacao) ? "text-fg-4" : "text-blue")}>{e.situacao}</span>
            <button type="button" className="inline-flex items-center gap-1 text-fg-3 hover:text-fg" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", aberto && "rotate-180")} />
              {aberto ? "Ocultar pauta" : "Ver pauta"}
            </button>
            {e.url && (
              <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-fg-3 hover:text-fg">
                Página oficial <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {aberto && <div className="mt-2 border-l border-line-2 pl-3"><Pauta eventoId={e.id} /></div>}
        </div>
      </div>
    </div>
  );
}
