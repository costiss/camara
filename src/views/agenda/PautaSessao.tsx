import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ListaPauta } from "@/components/hud/PainelAoVivo";
import { HouseTag, LoadingRows } from "@/components/shared";
import { getPautaEvento } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { statusTone } from "@/lib/parties";
import type { SessaoPauta } from "@/lib/types";
import { cn } from "@/lib/utils";

const STALE = 5 * 60 * 1000;

/** A Câmara order paper is only fetched when its session is opened. */
function PautaCamara({ eventoId }: { eventoId: string }) {
  const q = useQuery({
    queryKey: ["pauta-evento", eventoId],
    queryFn: () => getPautaEvento(eventoId),
    staleTime: STALE,
  });
  if (q.isLoading) return <LoadingRows rows={3} height={40} />;
  if (!q.data || q.data.length === 0) return <p className="py-2 text-[12px] text-fg-4">Pauta ainda não publicada.</p>;
  return <ListaPauta itens={q.data} />;
}

/** One session of the pauta inspector: its head, and its full order paper on open. */
export function PautaSessao({ s }: { s: SessaoPauta }) {
  const [aberto, setAberto] = useState(false);
  const cancelada = /cancel/i.test(s.situacao ?? "");
  const tom = statusTone(s.situacao);

  return (
    <div className="py-3">
      <button
        type="button"
        className="flex w-full items-start gap-3 text-left"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
      >
        <span className="tn w-[46px] shrink-0 pt-0.5 text-[12px] text-fg-3">{s.hora ? formatTime(`${s.data}T${s.hora}`) : "—"}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <HouseTag casa={s.casa} />
            <span className={cn("text-[13px] font-medium leading-snug", cancelada && "text-fg-4 line-through")}>{s.tipo}</span>
            {s.casa === "camara" && s.orgao && <span className="text-[12px] text-fg-4">{s.orgao}</span>}
            {s.aoVivo && (
              <span className="inline-flex items-center gap-1 text-[12px] text-red">
                <span className="h-1.5 w-1.5 rounded-full bg-red live-dot" aria-hidden="true" />
                ao vivo
              </span>
            )}
            {s.situacao && <span className={cn("text-[12px]", tom === "danger" ? "text-red" : "text-fg-4")}>{s.situacao}</span>}
            <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[12px] text-fg-3">
              {s.itens.length > 0 ? `${s.itens.length} itens` : "Ver pauta"}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", aberto && "rotate-180")} aria-hidden="true" />
            </span>
          </span>
        </span>
      </button>
      {aberto && (
        <div className="mt-2 border-l border-line-2 pl-3">
          {s.casa === "camara" && s.itens.length === 0 ? <PautaCamara eventoId={s.id} /> : <ListaPauta itens={s.itens} />}
        </div>
      )}
    </div>
  );
}
