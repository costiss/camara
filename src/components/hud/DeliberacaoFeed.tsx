import { routeHref, votacaoHref, type Query } from "@/hooks/useUi";
import { Veredito } from "@/components/hud/proposta";
import { IconeExterno, SeloAoVivo, SituacaoAoVivo } from "@/components/hud/AoVivo";
import type { LinhaAoVivo } from "@/hooks/useAoVivo";
import { NOME_CASA } from "@/lib/casa";
import { lerVotacao } from "@/lib/linguagem";
import type { Deliberacao } from "@/lib/deliberacoes";
import type { Casa } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ErrorState, LoadingRows } from "@/components/shared";

function quando(dataHora: string) {
  const d = new Date(dataHora.length <= 10 ? `${dataHora}T12:00:00` : dataHora);
  const dia = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  const hora = dataHora.length > 10 ? `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}` : null;
  return { dia, hora };
}

function FeedItem({ d, current, hrefQuery }: { d: Deliberacao; current: boolean; hrefQuery?: Query }) {
  const v = d.principal;
  const leitura = lerVotacao({ ...v, ementa: d.ementa ?? v.ementa, proposicao: d.proposicao ?? v.proposicao });
  const { dia, hora } = quando(d.dataHora);
  const extra = d.votacoes.length - 1;
  return (
    <a href={votacaoHref(v, hrefQuery)} className="ev no-underline" aria-current={current || undefined}>
      <span className="tn pt-px text-[12px] leading-tight text-fg-3">
        {dia}
        {hora && <span className="block text-fg-5">{hora}</span>}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] text-fg-4">
          {d.casa === "camara" ? "Câmara" : "Senado"}
          {leitura.tipo && ` · ${leitura.tipo.curto}`}
          {extra > 0 && ` · ${extra + 1} etapas`}
        </span>
        <span className="mt-0.5 line-clamp-2 text-[13px] font-medium leading-snug text-fg">{leitura.titulo}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px]">
          <Veredito votacao={v} />
          {v.placar && v.placar.total > 0 && <span className="tn text-fg-3">{v.placar.sim} a {v.placar.nao}</span>}
          {v.secreta && <span className="text-fg-3">· secreta</span>}
        </span>
      </span>
    </a>
  );
}

/** An item on the floor right now, folded into the feed as a marked row. */
function FeedItemAoVivo({ item }: { item: LinhaAoVivo }) {
  const corpo = (
    <>
      <span className="pt-px text-[12px] leading-tight text-red">hoje</span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-fg-4">
          <SeloAoVivo />
          {NOME_CASA[item.casa]}
          <span className="tn">· {item.sigla}</span>
          {item.url && <IconeExterno className="self-center" />}
        </span>
        <span className="mt-0.5 line-clamp-2 text-[13px] font-medium leading-snug text-fg">{item.ementa || item.sigla}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px]">
          <SituacaoAoVivo item={item} />
        </span>
      </span>
    </>
  );
  if (!item.url) return <div className="ev ao-vivo-linha">{corpo}</div>;
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="ev ao-vivo-linha no-underline"
      title={`${item.sigla} — página oficial`}
    >
      {corpo}
    </a>
  );
}

/** The rows the feed shows once loaded: the live items, then the recorded votes. */
function FeedBody({
  aoVivo,
  delibs,
  currentId,
  soNominais,
  hrefQuery,
}: {
  aoVivo: LinhaAoVivo[];
  delibs: Deliberacao[];
  currentId?: string;
  soNominais?: boolean;
  hrefQuery?: Query;
}) {
  if (delibs.length === 0 && aoVivo.length === 0) {
    return (
      <p className="py-6 text-center text-[12px] text-fg-4">
        Nenhuma votação {soNominais ? "nominal " : ""}em plenário no período.
      </p>
    );
  }
  return (
    <div className="-mx-2 flex flex-col">
      {aoVivo.map((item, i) => (
        <FeedItemAoVivo key={`ao-vivo-${item.casa}-${item.id}-${i}`} item={item} />
      ))}
      {delibs.map((d, i) => (
        <div key={d.key} className={cn((i > 0 || aoVivo.length > 0) && "rowline")}>
          <FeedItem d={d} current={d.votacoes.some((v) => v.id === currentId)} hrefQuery={hrefQuery} />
        </div>
      ))}
    </div>
  );
}

export function DeliberacaoFeed({
  title = "Últimas votações",
  deliberacoes,
  aoVivo = [],
  currentId,
  isLoading,
  isError,
  onRetry,
  casa,
  soNominais,
  onSoNominais,
  hrefQuery,
  limit = 14,
  className,
}: {
  title?: string;
  deliberacoes: Deliberacao[];
  /** Order-paper items of the live sessions, shown above the recorded votes. */
  aoVivo?: LinhaAoVivo[];
  currentId?: string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  casa?: Casa;
  /** When set, shows a toggle that keeps only deliberations with a roll-call vote. */
  soNominais?: boolean;
  onSoNominais?: (ativo: boolean) => void;
  /** Query carried on each item's link, so a filter survives the click. */
  hrefQuery?: Query;
  limit?: number;
  className?: string;
}) {
  const filtradas = soNominais ? deliberacoes.filter((d) => d.votacoes.some((v) => v.nominal)) : deliberacoes;
  const shown = filtradas.slice(0, limit);
  return (
    <section className={cn("card", className)} aria-label={title}>
      <div className="card-head">
        <h2>{title}</h2>
        <span className="meta">Plenário · 90 dias</span>
      </div>
      {onSoNominais && (
        <label className="-mt-1 mb-2 inline-flex cursor-pointer items-center gap-2 text-[12px] text-fg-3">
          <input
            type="checkbox"
            className="accent-[var(--color-fg)]"
            checked={!!soNominais}
            onChange={(e) => onSoNominais(e.target.checked)}
          />
          Só com votação nominal
        </label>
      )}
      {isLoading ? (
        <LoadingRows rows={5} height={56} />
      ) : isError ? (
        <ErrorState compact title="Não foi possível carregar as votações" onRetry={onRetry} />
      ) : (
        <FeedBody aoVivo={aoVivo} delibs={shown} currentId={currentId} soNominais={soNominais} hrefQuery={hrefQuery} />
      )}
      {!isLoading && filtradas.length > limit && (
        <a href={routeHref("lista", undefined, { casa, nominal: soNominais ? "1" : "0" })} className="btn btn-sm btn-block mt-3 no-underline">
          Ver todas as {filtradas.length} na lista
        </a>
      )}
    </section>
  );
}
