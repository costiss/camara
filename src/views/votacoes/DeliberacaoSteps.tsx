import { inspecaoHref, votacaoHref } from "@/hooks/useUi";
import { formatTime } from "@/lib/format";
import { Veredito } from "@/components/hud/proposta";
import { etapaDaVotacao } from "@/lib/linguagem";
import type { Deliberacao } from "@/lib/deliberacoes";
import { cn } from "@/lib/utils";

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
        <h2>Etapas</h2>
        <span className="meta">{passos.length} votações no mesmo dia</span>
      </div>
      <ol className="timeline">
        {passos.map((v) => {
          const etapa = etapaDaVotacao(v.descricao);
          const atual = v.id === currentId;
          return (
            <li key={v.id} className="timeline-item" data-current={atual}>
              <a
                href={destino === "inspecao" ? inspecaoHref(v) : votacaoHref(v)}
                className={cn("block rounded-md no-underline", atual ? "text-fg" : "text-fg-2 hover:text-fg")}
                aria-current={atual || undefined}
                title={v.descricao}
              >
                <span className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium">{etapa.rotulo}</span>
                  {v.dataHora && v.dataHora.length > 10 && <span className="tn ml-auto text-[11px] text-fg-4">{formatTime(v.dataHora)}</span>}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px]">
                  <Veredito votacao={v} />
                  {v.placar && v.placar.total > 0 ? (
                    <span className="tn text-fg-3">{v.placar.sim} a {v.placar.nao}</span>
                  ) : (
                    <span className="text-fg-4">· votação simbólica</span>
                  )}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
