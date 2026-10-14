import { Check, ExternalLink, Minus, X } from "lucide-react";
import { LoadingRows } from "@/components/shared";
import { useSessaoAoVivo } from "@/hooks/useSenado";
import type { ItemPauta, StatusTone } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOM: Record<StatusTone, string> = {
  success: "text-green",
  danger: "text-red",
  warning: "text-yellow",
  info: "text-blue",
  accent: "text-accent",
  neutral: "text-fg-3",
};

type Estado = "decidida" | "atual" | "pendente";

const ESTILO: Record<Estado, { titulo: string; ementa: string; rotulo: string; linha: string }> = {
  decidida: { titulo: "text-fg-2", ementa: "text-fg-3", rotulo: "text-fg-3", linha: "border-transparent" },
  atual: { titulo: "text-fg", ementa: "text-fg-3", rotulo: "text-accent", linha: "border-accent bg-accent-dim/25" },
  pendente: { titulo: "text-fg-3", ementa: "text-fg-4", rotulo: "text-fg-4", linha: "border-transparent" },
};

/** The Senate announces the outcome in prose; read the verdict out of the matéria clause. */
function clausulaMateria(texto: string): string {
  const m = /resultado da mat[ée]ria:\s*([^\n]*)/i.exec(texto);
  const linha = (m?.[1] ?? texto).split("\n").find((l) => l.trim()) ?? "";
  return linha.trim();
}

function vereditoDe(texto: string): { label: string; tone: StatusTone } {
  const t = clausulaMateria(texto).toLowerCase();
  if (/aprovad/.test(t)) return { label: "Aprovado", tone: "success" };
  if (/rejeitad/.test(t)) return { label: "Rejeitado", tone: "danger" };
  if (/prejudicad/.test(t)) return { label: "Prejudicado", tone: "neutral" };
  if (/retirad/.test(t)) return { label: "Retirado", tone: "neutral" };
  if (/encerrad/.test(t)) return { label: "Discussão encerrada", tone: "info" };
  return { label: "Apreciado", tone: "neutral" };
}

/** The announced result, trimmed to one readable line. */
function resumoDe(texto: string): string {
  const linha = clausulaMateria(texto);
  return linha.length > 160 ? `${linha.slice(0, 159).trimEnd()}…` : linha;
}

function rotuloPendente(item: ItemPauta): string {
  return /não concluída/i.test(item.deliberacao ?? "") ? "Discussão em andamento" : "Ainda não votado";
}

function Marcador({ estado, tone }: { estado: Estado; tone?: StatusTone }) {
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

function ItemLinha({ item, estado }: { item: ItemPauta; estado: Estado }) {
  const estilo = ESTILO[estado];
  const veredito = estado === "decidida" ? vereditoDe(item.resultado ?? "") : null;
  const rotulo = veredito?.label ?? (estado === "atual" ? "Em apreciação" : rotuloPendente(item));
  const resumo = veredito && item.resultado ? resumoDe(item.resultado) : null;

  const classes = cn(
    "flex items-start gap-3 border-l-2 py-3 pl-3 pr-1 transition-colors",
    estilo.linha,
    item.url && "hover:bg-fg/5"
  );

  const conteudo = (
    <>
      <span className="grid w-4 shrink-0 place-items-center pt-1">
        <Marcador estado={estado} tone={veredito?.tone} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn("text-[13px] font-medium", estilo.titulo)}>{item.sigla ?? item.identificacao}</span>
          {item.cabecalho && <span className="text-[12px] text-fg-4">{item.cabecalho}</span>}
          <span className={cn("ml-auto text-[12px] font-medium", veredito ? TOM[veredito.tone] : estilo.rotulo)}>
            {rotulo}
          </span>
        </span>
        {item.ementa && (
          <span className={cn("mt-0.5 block line-clamp-2 text-[12px] leading-snug", estilo.ementa)}>{item.ementa}</span>
        )}
        {resumo && <span className="mt-1 block text-[12px] text-fg-3">{resumo}</span>}
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
      title={`${item.sigla ?? item.identificacao} — matéria no Senado`}
    >
      {conteudo}
    </a>
  ) : (
    <div className={classes}>{conteudo}</div>
  );
}

/**
 * The Senate floor session happening right now: its order paper, with the item
 * the floor is on marked and decided items showing their verdict. Refreshed
 * while the session runs; renders nothing when the floor is not in session.
 */
export function SessaoAoVivo() {
  const { sessao, isLoading } = useSessaoAoVivo();
  if (!sessao) {
    return isLoading ? (
      <div className="card" aria-busy="true" aria-label="Carregando o Plenário do Senado">
        <LoadingRows rows={2} height={40} />
      </div>
    ) : null;
  }

  const votados = sessao.itens.filter((it) => it.apreciado).length;
  const atual = sessao.itens.findIndex((it) => !it.apreciado);
  const estado = (item: ItemPauta, i: number): Estado =>
    item.apreciado ? "decidida" : i === atual ? "atual" : "pendente";

  const meta = [sessao.numero && `${sessao.numero}ª sessão`, sessao.tipo?.toLowerCase(), sessao.hora]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="card enter" aria-labelledby="ao-vivo-title">
      <div className="card-head">
        <h2 id="ao-vivo-title" className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-red live-dot" aria-hidden="true" />
          Plenário do Senado
        </h2>
        {sessao.itens.length > 0 && (
          <span className="meta tn">{votados} de {sessao.itens.length} votados</span>
        )}
      </div>
      <p className="text-[12px] text-fg-3">{meta}</p>

      {sessao.itens.length === 0 ? (
        <p className="mt-3 text-[12px] text-fg-4">Pauta ainda não publicada.</p>
      ) : (
        <ol className="mt-2 flex flex-col">
          {sessao.itens.map((item, i) => (
            <li key={item.codigo || i} className={cn(i > 0 && "rowline")}>
              <ItemLinha item={item} estado={estado(item, i)} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
