import { Check, ExternalLink, Minus, X } from "lucide-react";
import { LoadingRows } from "@/components/shared";
import { truncar } from "@/lib/aoVivo";
import type { EstadoItem, ItemAoVivo, SessaoAoVivo, StatusTone } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOM: Record<StatusTone, string> = {
  success: "text-green",
  danger: "text-red",
  warning: "text-yellow",
  info: "text-blue",
  accent: "text-accent",
  neutral: "text-fg-3",
};

const ESTILO: Record<EstadoItem, { titulo: string; ementa: string; rotulo: string; linha: string }> = {
  decidida: { titulo: "text-fg-2", ementa: "text-fg-3", rotulo: "text-fg-3", linha: "border-transparent" },
  atual: { titulo: "text-fg", ementa: "text-fg-3", rotulo: "text-accent", linha: "border-accent bg-accent-dim/25" },
  pendente: { titulo: "text-fg-3", ementa: "text-fg-4", rotulo: "text-fg-4", linha: "border-transparent" },
};

function Marcador({ estado, tone }: { estado: EstadoItem; tone?: StatusTone }) {
  if (estado === "decidida") {
    const Icone = tone === "success" ? Check : tone === "danger" ? X : Minus;
    return <Icone className={cn("h-3.5 w-3.5", TOM[tone ?? "neutral"])} strokeWidth={2.5} aria-hidden="true" />;
  }
  return (
    <span
      className={cn("h-2 w-2 rounded-full", estado === "atual" ? "bg-accent" : "border border-fg-5")}
      aria-hidden="true"
    />
  );
}

function LinhaItem({ item }: { item: ItemAoVivo }) {
  const estilo = ESTILO[item.estado];
  const classes = cn(
    "flex items-start gap-3 border-l-2 py-3 pl-3 pr-1 transition-colors",
    estilo.linha,
    item.url && "hover:bg-fg/5"
  );

  const conteudo = (
    <>
      <span className="grid w-4 shrink-0 place-items-center pt-1">
        <Marcador estado={item.estado} tone={item.tone} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn("text-[13px] font-medium", estilo.titulo)}>{item.sigla}</span>
          {item.qualificador && <span className="text-[12px] text-fg-4">{item.qualificador}</span>}
          <span className={cn("ml-auto text-[12px] font-medium", item.tone ? TOM[item.tone] : estilo.rotulo)}>
            {item.rotulo}
          </span>
        </span>
        {item.ementa && (
          <span className={cn("mt-0.5 block line-clamp-2 text-[12px] leading-snug", estilo.ementa)}>{item.ementa}</span>
        )}
        {item.detalhe && <span className="mt-1 block text-[12px] text-fg-3">{truncar(item.detalhe)}</span>}
      </span>
      {item.url && <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-fg-5" aria-hidden="true" />}
    </>
  );

  return item.url ? (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(classes, "no-underline")}
      title={`${item.sigla} — página oficial`}
    >
      {conteudo}
    </a>
  ) : (
    <div className={classes}>{conteudo}</div>
  );
}

const MAX_PENDENTES = 3;

/**
 * Keeps the panel short, especially on mobile: every decided item, the one on
 * the floor, and only the first few still waiting.
 */
function recortar(itens: ItemAoVivo[]): { visiveis: ItemAoVivo[]; restantes: number } {
  let pendentes = 0;
  let i = 0;
  for (; i < itens.length; i += 1) {
    if (itens[i].estado === "pendente" && ++pendentes > MAX_PENDENTES) break;
  }
  return { visiveis: itens.slice(0, i), restantes: itens.length - i };
}

/** A full order paper, every item — the pauta inspector's body. */
export function ListaPauta({ itens, className }: { itens: ItemAoVivo[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {itens.map((item, i) => (
        <li key={item.id || i} className={cn(i > 0 && "rowline")}>
          <LinhaItem item={item} />
        </li>
      ))}
    </ol>
  );
}

/** The live order paper of one house: what is being decided, right now. */
export function PainelAoVivo({ sessao, className }: { sessao: SessaoAoVivo; className?: string }) {
  const votados = sessao.itens.filter((it) => it.estado === "decidida").length;
  const { visiveis, restantes } = recortar(sessao.itens);
  const id = `ao-vivo-${sessao.casa}`;
  return (
    <section className={cn("card enter", className)} aria-labelledby={id}>
      <div className="card-head">
        <h2 id={id} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-red live-dot" aria-hidden="true" />
          {sessao.titulo}
        </h2>
        {sessao.itens.length > 0 && (
          <span className="meta tn">{votados} de {sessao.itens.length} votados</span>
        )}
      </div>
      {sessao.meta && <p className="text-[12px] text-fg-3">{sessao.meta}</p>}

      {sessao.itens.length === 0 ? (
        <p className="mt-3 text-[12px] text-fg-4">Pauta ainda não publicada.</p>
      ) : (
        <>
          <ListaPauta itens={visiveis} className="mt-2" />
          {restantes > 0 && (
            <p className="mt-2 text-[12px] text-fg-4">
              mais {restantes} {restantes === 1 ? "item" : "itens"} na pauta
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** Placeholder while the day's session is being fetched. */
export function PainelAoVivoSkeleton({ titulo }: { titulo: string }) {
  return (
    <div className="card" aria-busy="true" aria-label={`Carregando ${titulo}`}>
      <LoadingRows rows={2} height={40} />
    </div>
  );
}
