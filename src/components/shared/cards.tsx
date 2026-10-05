import { Calendar, ChevronRight, FileText, MapPin, Gavel, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Evento, Parlamentar, Proposicao, Votacao } from "@/lib/types";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import { partyColor, withAlpha } from "@/lib/parties";
import { AprovacaoBadge, MemberAvatar, PartyTag, StatusBadge } from "./badges";
import { HouseTag } from "./primitives";
import type { Placar } from "@/lib/types";

export function ProposicaoRow({
  p,
  onOpen,
  className,
}: {
  p: Proposicao;
  onOpen?: (p: Proposicao) => void;
  className?: string;
}) {
  const interactive = !!onOpen;
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={() => onOpen?.(p)}
      onKeyDown={(e) => {
        if (interactive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen?.(p);
        }
      }}
      className={cn(
        "surface surface-hover group flex items-start gap-3.5 p-4",
        interactive && "cursor-pointer",
        className
      )}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-panel-2">
        <FileText className="h-4.5 w-4.5 text-accent" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="tn text-[13px] font-semibold text-fg">{p.sigla}</span>
          <HouseTag casa={p.casa} />
          {p.status && <StatusBadge status={p.status} maxLength={40} />}
        </div>
        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-fg-3">
          {p.ementa}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-fg-5">
          {p.apresentacao && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(p.apresentacao)}
            </span>
          )}
          {p.orgao && <span>{p.orgao}</span>}
          {p.autor && <span className="max-w-[280px] truncate">{p.autor}</span>}
        </div>
      </div>
      {interactive && (
        <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-fg-5 transition-transform group-hover:translate-x-0.5 group-hover:text-fg-3" />
      )}
    </div>
  );
}

function PlacarBar({ placar }: { placar: Placar }) {
  const total = placar.total || placar.sim + placar.nao + placar.abstencao || 1;
  const seg = (v: number) => `${(v / total) * 100}%`;
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-panel-3">
        <span style={{ width: seg(placar.sim), background: "var(--color-green)" }} />
        <span style={{ width: seg(placar.nao), background: "var(--color-red)" }} />
        <span style={{ width: seg(placar.abstencao), background: "var(--color-fg-4)" }} />
      </div>
      <div className="flex items-center gap-3 text-[10.5px]">
        <span className="tn text-green">Sim {placar.sim}</span>
        <span className="tn text-red">Não {placar.nao}</span>
        {placar.abstencao > 0 && (
          <span className="tn text-fg-4">Abst. {placar.abstencao}</span>
        )}
        <span className="tn ml-auto text-fg-5">Total {placar.total}</span>
      </div>
    </div>
  );
}

export function VotacaoRow({
  v,
  onOpen,
  className,
}: {
  v: Votacao;
  onOpen?: (v: Votacao) => void;
  className?: string;
}) {
  const interactive = !!onOpen;
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={() => onOpen?.(v)}
      onKeyDown={(e) => {
        if (interactive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen?.(v);
        }
      }}
      className={cn(
        "surface surface-hover group flex flex-col gap-2.5 p-4",
        interactive && "cursor-pointer",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">
          <Gavel className="h-3 w-3" />
          {v.orgao}
        </span>
        <HouseTag casa={v.casa} />
        {v.proposicao && (
          <span className="tn text-[11px] font-medium text-fg-2">{v.proposicao}</span>
        )}
        <AprovacaoBadge aprovacao={v.aprovacao} className="ml-auto" />
      </div>
      <p className="line-clamp-2 text-[12px] leading-relaxed text-fg-3">
        {v.descricao}
      </p>
      {v.placar && <PlacarBar placar={v.placar} />}
      <div className="flex items-center gap-2 text-[10.5px] text-fg-5">
        <Clock className="h-3 w-3" />
        {v.dataHora ? formatDateTime(v.dataHora) : formatDate(v.data)}
      </div>
    </div>
  );
}

export function EventoAgendaCard({
  e,
  onOpen,
  className,
}: {
  e: Evento;
  onOpen?: (e: Evento) => void;
  className?: string;
}) {
  const date = new Date(e.inicio);
  const interactive = !!onOpen;
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={() => onOpen?.(e)}
      onKeyDown={(ev) => {
        if (interactive && (ev.key === "Enter" || ev.key === " ")) {
          ev.preventDefault();
          onOpen?.(e);
        }
      }}
      className={cn(
        "surface surface-hover group flex items-start gap-4 p-4",
        interactive && "cursor-pointer",
        className
      )}
    >
      <div className="flex w-14 shrink-0 flex-col items-center rounded-lg border border-line bg-panel-2 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-fg-4">
          {date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
        </span>
        <span className="fig text-[22px] leading-none">{date.getDate()}</span>
        <span className="tn mt-0.5 text-[10px] text-fg-5">{formatTime(e.inicio)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">{e.tipo}</span>
          <StatusBadge status={e.situacao} maxLength={24} />
        </div>
        <p className="mt-1.5 line-clamp-2 text-[12.5px] font-medium leading-snug text-fg-2">
          {e.titulo}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-fg-5">
          {e.local && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {e.local}
            </span>
          )}
          {e.orgao && <span>{e.orgao}</span>}
          {e.pauta.length > 0 && <span>{e.pauta.length} itens na pauta</span>}
        </div>
      </div>
      {interactive && (
        <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-fg-5 transition-transform group-hover:translate-x-0.5 group-hover:text-fg-3" />
      )}
    </div>
  );
}

export function MemberCard({
  m,
  onOpen,
  className,
}: {
  m: Parlamentar;
  onOpen?: (m: Parlamentar) => void;
  className?: string;
}) {
  const interactive = !!onOpen;
  const color = partyColor(m.partido);
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={() => onOpen?.(m)}
      onKeyDown={(e) => {
        if (interactive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen?.(m);
        }
      }}
      className={cn(
        "surface surface-hover group relative flex items-center gap-3 p-3",
        interactive && "cursor-pointer",
        className
      )}
      style={{ boxShadow: `inset 3px 0 0 ${withAlpha(color, 0.7)}` }}
    >
      <MemberAvatar name={m.nome} photo={m.foto} party={m.partido} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium text-fg">{m.nome}</p>
        <div className="mt-1 flex items-center gap-2">
          <PartyTag sigla={m.partido} />
          <span className="text-[10.5px] text-fg-5">{m.uf}</span>
        </div>
      </div>
      {m.papel && (
        <span className="shrink-0 rounded-md border border-accent/25 bg-accent-dim px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-accent">
          {m.papel}
        </span>
      )}
    </div>
  );
}
