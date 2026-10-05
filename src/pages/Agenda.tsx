import { useMemo, useState } from "react";
import { CalendarClock, ChevronDown, Gavel, Landmark } from "lucide-react";
import {
  useEventoPauta,
  useEventos,
  useVotacoes,
} from "@/hooks/useCamara";
import { useSenadoVotacoes } from "@/hooks/useSenado";
import {
  EmptyState,
  ErrorState,
  EventoAgendaCard,
  KpiCard,
  LoadingRows,
  StatusBadge,
  VotacaoRow,
} from "@/components/shared";
import { VotacaoDetail } from "@/components/detail/VotacaoDetail";
import { addDays, isoDate, startOfDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Evento, Votacao } from "@/lib/types";

type Aba = "agenda" | "votacoes" | "senado";

export function Agenda() {
  const hoje = startOfDay();
  const [aba, setAba] = useState<Aba>("agenda");
  const [selected, setSelected] = useState<Votacao | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const eventosQ = useEventos({
    dataInicio: isoDate(hoje),
    dataFim: isoDate(addDays(hoje, 21)),
    itens: 60,
  });
  const votacoesQ = useVotacoes({
    dataInicio: isoDate(addDays(hoje, -90)),
    dataFim: isoDate(hoje),
    itens: 30,
  });
  const senadoQ = useSenadoVotacoes();

  const eventos = useMemo(() => {
    return (eventosQ.data ?? [])
      .filter((e) => new Date(e.inicio).getTime() >= Date.now() - 60 * 60 * 1000)
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  }, [eventosQ.data]);

  const deliberativos = eventos.filter(
    (e) => /deliberativa|sess[ãa]o/i.test(e.tipo)
  );
  const votacoes = votacoesQ.data?.items ?? [];
  const senadoVotos = (senadoQ.data ?? []).slice(0, 40);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Sessões · 21 dias"
          value={eventos.length}
          icon={CalendarClock}
          tone="info"
          loading={eventosQ.isLoading}
        />
        <KpiCard
          label="Deliberativas"
          value={deliberativos.length}
          icon={Gavel}
          tone="accent"
          loading={eventosQ.isLoading}
          hint="com pauta de votação"
        />
        <KpiCard
          label="Votações · 90d"
          value={votacoesQ.data?.total ?? votacoes.length}
          icon={Gavel}
          tone="success"
          loading={votacoesQ.isLoading}
          hint="Câmara"
        />
        <KpiCard
          label="Votações no Senado"
          value={senadoVotos.length}
          icon={Landmark}
          tone="accent"
          loading={senadoQ.isLoading}
          hint="registros recentes"
        />
      </div>

      <div className="seg">
        {(
          [
            { id: "agenda", label: "Próximas sessões" },
            { id: "votacoes", label: "Votações · Câmara" },
            { id: "senado", label: "Votações · Senado" },
          ] as { id: Aba; label: string }[]
        ).map((opt) => (
          <button
            key={opt.id}
            data-active={aba === opt.id}
            onClick={() => setAba(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {aba === "agenda" && (
        <div className="space-y-2">
          {eventosQ.isError ? (
            <ErrorState onRetry={() => eventosQ.refetch()} />
          ) : eventosQ.isLoading ? (
            <LoadingRows rows={5} height={96} />
          ) : eventos.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nenhuma sessão agendada"
              description="A Câmara ainda não publicou eventos para os próximos 21 dias. As sessões costumam ser divulgadas alguns dias antes."
            />
          ) : (
            eventos.map((e) => (
              <AgendaEvento
                key={e.id}
                evento={e}
                expanded={expanded === e.id}
                onToggle={() => setExpanded((cur) => (cur === e.id ? null : e.id))}
              />
            ))
          )}
        </div>
      )}

      {aba === "votacoes" && (
        <div className="space-y-2">
          {votacoesQ.isError ? (
            <ErrorState onRetry={() => votacoesQ.refetch()} />
          ) : votacoesQ.isLoading ? (
            <LoadingRows rows={6} height={110} />
          ) : votacoes.length === 0 ? (
            <EmptyState icon={Gavel} title="Sem votações nos últimos 30 dias" />
          ) : (
            votacoes.map((v) => (
              <VotacaoRow key={v.id} v={v} onOpen={setSelected} />
            ))
          )}
        </div>
      )}

      {aba === "senado" && (
        <div className="space-y-2">
          {senadoQ.isError ? (
            <ErrorState onRetry={() => senadoQ.refetch()} />
          ) : senadoQ.isLoading ? (
            <LoadingRows rows={6} height={110} />
          ) : senadoVotos.length === 0 ? (
            <EmptyState icon={Landmark} title="Sem votações recentes no Senado" />
          ) : (
            senadoVotos.map((v) => (
              <VotacaoRow key={v.id} v={v} onOpen={setSelected} />
            ))
          )}
        </div>
      )}

      <VotacaoDetail
        votacao={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}

function AgendaEvento({
  evento,
  expanded,
  onToggle,
}: {
  evento: Evento;
  expanded: boolean;
  onToggle: () => void;
}) {
  const pautaQ = useEventoPauta(expanded ? evento.id.replace(/^camara-/, "") : undefined);
  const pauta = pautaQ.data ?? [];

  return (
    <div>
      <EventoAgendaCard e={evento} onOpen={onToggle} />
      <button
        onClick={onToggle}
        className="mt-1 ml-4 inline-flex items-center gap-1 text-[10.5px] font-medium text-fg-4 hover:text-fg-2"
      >
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
        />
        {expanded ? "Ocultar pauta" : "Ver pauta da sessão"}
      </button>

      {expanded && (
        <div className="mt-2 ml-4 space-y-1.5 border-l border-line-2 pl-4">
          {pautaQ.isLoading ? (
            <LoadingRows rows={2} height={48} />
          ) : pauta.length === 0 ? (
            <p className="py-2 text-[11px] text-fg-5">
              Pauta ainda não publicada para esta sessão.
            </p>
          ) : (
            pauta.map((item, i) => (
              <div
                key={`${item.id}-${i}`}
                className="surface flex items-start gap-3 p-3"
              >
                <span className="tn mt-0.5 w-5 shrink-0 text-right text-[11px] text-fg-5">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12px] font-medium text-fg-2">
                      {item.sigla}
                    </span>
                    <StatusBadge status={item.status} maxLength={40} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-fg-4">
                    {item.ementa}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
