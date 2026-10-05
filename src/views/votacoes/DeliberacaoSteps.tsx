import { inspecaoHref, votacaoHref } from "@/hooks/useUi";
import { formatTime } from "@/lib/format";
import { resultadoVotacao } from "@/lib/votos";
import type { Deliberacao } from "@/lib/deliberacoes";
import type { StatusTone } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE: Record<StatusTone, string> = {
  success: "text-green",
  danger: "text-red",
  warning: "text-yellow",
  info: "text-blue",
  accent: "text-fg",
  neutral: "text-fg-3",
};

/** Every vote of the same proposition in the same session, oldest first. */
export function DeliberacaoSteps({ deliberacao, currentId, destino = "painel" }: {
  deliberacao: Deliberacao;
  currentId: string;
  destino?: "painel" | "inspecao";
}) {
  if (deliberacao.votacoes.length < 2) return null;
  const passos = [...deliberacao.votacoes].reverse();
  return (
    <section className="card" aria-label="Votações desta deliberação">
      <div className="card-head">
        <h2>Nesta sessão</h2>
        <span className="meta">{passos.length} votações</span>
      </div>
      <ol className="timeline">
        {passos.map((v) => {
          const r = resultadoVotacao(v);
          const atual = v.id === currentId;
          return (
            <li key={v.id} className="timeline-item" data-current={atual}>
              <a href={destino === "inspecao" ? inspecaoHref(v) : votacaoHref(v)} className={cn("block no-underline", atual ? "text-fg" : "text-fg-2 hover:text-fg")} aria-current={atual || undefined}>
                <span className="flex items-baseline gap-2 text-[12px]">
                  {v.dataHora && v.dataHora.length > 10 && <span className="tn text-fg-4">{formatTime(v.dataHora)}</span>}
                  <span className={cn("font-medium", TONE[r.tone])}>{r.label}</span>
                  {v.placar && v.placar.total > 0 && <span className="tn text-fg-3">{v.placar.sim} a {v.placar.nao}</span>}
                  {!v.nominal && <span className="text-fg-5">simbólica</span>}
                </span>
                <span className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-fg-3">{v.descricao}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
