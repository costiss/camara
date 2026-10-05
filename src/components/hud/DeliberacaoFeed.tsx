import { useState } from "react";
import { routeHref } from "@/hooks/useUi";
import { resultadoVotacao } from "@/lib/votos";
import type { Deliberacao } from "@/lib/deliberacoes";
import type { StatusTone } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ErrorState, LoadingRows } from "@/components/shared";

const TONE_COR: Record<StatusTone, string> = {
  success: "var(--color-green)",
  danger: "var(--color-red)",
  warning: "var(--color-yellow)",
  info: "var(--color-blue)",
  accent: "var(--color-fg)",
  neutral: "var(--color-fg-4)",
};

function quando(dataHora: string) {
  const d = new Date(dataHora.length <= 10 ? `${dataHora}T12:00:00` : dataHora);
  const dia = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  const hora = dataHora.length > 10 ? `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}` : null;
  return { dia, hora };
}

function FeedItem({ d, current }: { d: Deliberacao; current: boolean }) {
  const v = d.principal;
  const r = resultadoVotacao(v);
  const { dia, hora } = quando(d.dataHora);
  const extra = d.votacoes.length - 1;
  return (
    <a href={routeHref("votacoes", v.id)} className="ev no-underline" aria-current={current || undefined}>
      <span className="tn pt-0.5 text-[12px] leading-tight text-fg-3">
        {dia}
        {hora && <span className="block text-fg-5">{hora}</span>}
      </span>
      <span
        className="mt-0.5 grid h-[22px] w-[22px] place-items-center rounded-full border-2"
        style={{ borderColor: TONE_COR[r.tone] }}
        aria-hidden="true"
      >
        <span className="text-[9px] font-semibold text-fg-3">{d.casa === "camara" ? "C" : "S"}</span>
      </span>
      <span className="min-w-0 text-[13px] leading-snug">
        {extra > 0 && <span className="block text-[12px] text-fg-3">+{extra} {extra === 1 ? "votação" : "votações"}</span>}
        <span className="font-medium text-fg">{d.proposicao ?? (d.casa === "camara" ? "Câmara" : "Senado")}</span>{" "}
        <span style={{ color: TONE_COR[r.tone] }}>{r.label.toLowerCase()}</span>
        {v.placar && v.placar.total > 0 && (
          <span className="tn text-fg-3"> · {v.placar.sim} a {v.placar.nao}</span>
        )}
        {v.secreta && <span className="text-fg-3"> · voto secreto</span>}
        <span className="mt-0.5 line-clamp-2 text-[12px] text-fg-3">{d.ementa ?? v.descricao}</span>
      </span>
    </a>
  );
}

export function DeliberacaoFeed({
  title = "Últimas votações",
  deliberacoes,
  currentId,
  isLoading,
  isError,
  onRetry,
  limit = 14,
  className,
}: {
  title?: string;
  deliberacoes: Deliberacao[];
  currentId?: string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  limit?: number;
  className?: string;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? deliberacoes : deliberacoes.slice(0, limit);
  return (
    <section className={cn("card", className)} aria-label={title}>
      <div className="card-head">
        <h2>{title}</h2>
        <span className="meta">Plenário · 90 dias</span>
      </div>
      {isLoading ? (
        <LoadingRows rows={5} height={56} />
      ) : isError ? (
        <ErrorState compact title="Não foi possível carregar as votações" onRetry={onRetry} />
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-fg-4">Nenhuma votação em plenário no período.</p>
      ) : (
        <div className="-mx-2 flex flex-col">
          {shown.map((d, i) => (
            <div key={d.key} className={cn(i > 0 && "rowline")}>
              <FeedItem d={d} current={d.votacoes.some((v) => v.id === currentId)} />
            </div>
          ))}
        </div>
      )}
      {!isLoading && deliberacoes.length > limit && (
        <button type="button" className="btn btn-sm btn-block mt-3" onClick={() => setAll((a) => !a)}>
          {all ? "Mostrar menos" : `Ver todas as ${deliberacoes.length} deliberações`}
        </button>
      )}
    </section>
  );
}
