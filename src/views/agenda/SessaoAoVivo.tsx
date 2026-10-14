import { ExternalLink } from "lucide-react";
import { useSessaoAoVivo } from "@/hooks/useSenado";
import { formatTime } from "@/lib/format";
import { statusTone } from "@/lib/parties";
import type { StatusTone } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOM: Record<StatusTone, string> = {
  success: "text-green",
  danger: "text-red",
  warning: "text-yellow",
  info: "text-blue",
  accent: "text-fg",
  neutral: "text-fg-3",
};

/**
 * The Senate floor session happening right now: its order paper with each
 * item's outcome, refreshed while it runs. Renders nothing when the floor is
 * not in session.
 */
export function SessaoAoVivo() {
  const { sessao, atualizadoEm } = useSessaoAoVivo();
  if (!sessao) return null;

  const meta = [
    sessao.numero && `${sessao.numero}ª sessão`,
    sessao.tipo?.toLowerCase(),
    sessao.hora,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="card enter" aria-labelledby="ao-vivo-title">
      <div className="card-head">
        <h2 id="ao-vivo-title" className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-red live-dot" aria-hidden="true" />
          Plenário do Senado
        </h2>
        <span className="meta" role="status" aria-live="polite">
          ao vivo · {formatTime(new Date(atualizadoEm))}
        </span>
      </div>
      <p className="text-[12px] text-fg-3">{meta}</p>

      {sessao.itens.length === 0 ? (
        <p className="mt-3 text-[12px] text-fg-4">Pauta ainda não publicada.</p>
      ) : (
        <ol className="mt-2 flex flex-col">
          {sessao.itens.map((item, i) => (
            <li key={item.codigo || i} className={cn("py-2.5", i > 0 && "rowline")}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="tn text-[12px] text-fg-5">{i + 1}</span>
                <span className="text-[13px] font-medium">{item.sigla ?? item.identificacao}</span>
                {item.cabecalho && <span className="text-[12px] text-fg-4">{item.cabecalho}</span>}
                {item.deliberacao && (
                  <span className={cn("ml-auto text-[12px] font-medium", TOM[statusTone(item.deliberacao)])}>
                    {item.deliberacao}
                  </span>
                )}
              </div>
              {item.ementa && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-fg-3">{item.ementa}</p>}
              {item.resultado && <p className="mt-1 text-[12px] text-fg-2">{item.resultado}</p>}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[12px] text-fg-3 hover:text-fg"
                >
                  Matéria <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
