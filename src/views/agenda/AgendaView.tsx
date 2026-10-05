import { useMemo, useState } from "react";
import { DeliberacaoFeed } from "@/components/hud/DeliberacaoFeed";
import { HudGrid } from "@/components/hud/HudGrid";
import { VotesDock } from "@/components/hud/VotesDock";
import { ErrorState, LoadingRows } from "@/components/shared";
import { useEventos } from "@/hooks/useCamara";
import { useDeliberacoes } from "@/hooks/useDeliberacoes";
import { addDays, formatTime, isoDate, startOfDay } from "@/lib/format";
import type { Evento } from "@/lib/types";
import { EventoItem } from "./EventoItem";

type Janela = "proximas" | "realizadas";
type Tipo = "todos" | "plenario" | "comissoes";

const diaFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

const ehPlenario = (e: Evento) => /^sess[ãa]o/i.test(e.tipo) || /^(PLEN|Plen[áa]rio)$/i.test(e.orgao ?? "");

function ProximaSessao({ eventos, isLoading, agora }: { eventos: Evento[]; isLoading: boolean; agora: number }) {
  const futuros = eventos.filter((e) => new Date(e.inicio).getTime() >= agora && !/cancel/i.test(e.situacao));
  const proxima = futuros.find(ehPlenario) ?? futuros[0];
  const d = proxima ? new Date(proxima.inicio) : null;
  return (
    <section className="card enter" aria-labelledby="agenda-title">
      <span className="label">Câmara dos Deputados · próximos 21 dias</span>
      <h1 id="agenda-title" className="manchete mt-4">
        {isLoading ? "Carregando agenda…" : <><span className="text-blue">{futuros.length} {futuros.length === 1 ? "evento" : "eventos"}</span> na agenda</>}
      </h1>
      {proxima && d && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="label">Próximo{ehPlenario(proxima) ? " no Plenário" : ""}</p>
          <div className="mt-2 flex items-start gap-4">
            <div className="text-center">
              <p className="fig">{String(d.getDate()).padStart(2, "0")}</p>
              <p className="mt-1 text-[12px] text-fg-3">{d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")} · {formatTime(d)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium leading-snug">{proxima.titulo}</p>
              <p className="mt-1 text-[12px] text-fg-3">{[proxima.tipo, proxima.local].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
        </div>
      )}
      <div className="mt-4 border-t border-line pt-3 text-[13px]">
        <div className="flex justify-between py-1"><span className="label">No Plenário</span><span className="tn">{futuros.filter(ehPlenario).length}</span></div>
        <div className="flex justify-between py-1"><span className="label">Em comissões e outros</span><span className="tn">{futuros.filter((e) => !ehPlenario(e)).length}</span></div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-fg-4">A agenda do Senado ainda não está incluída; as votações do Senado aparecem no feed ao lado.</p>
    </section>
  );
}

export function AgendaView() {
  const [agora] = useState(() => Date.now());
  const hoje = startOfDay(new Date(agora));
  const [janela, setJanela] = useState<Janela>("proximas");
  const [tipo, setTipo] = useState<Tipo>("todos");
  const proximosQ = useEventos({ dataInicio: isoDate(hoje), dataFim: isoDate(addDays(hoje, 21)), itens: 100, ordem: "ASC" });
  const realizadosQ = useEventos({ dataInicio: isoDate(addDays(hoje, -21)), dataFim: isoDate(hoje), itens: 100, ordem: "DESC" });
  const eventosQ = janela === "proximas" ? proximosQ : realizadosQ;
  const feed = useDeliberacoes();
  const todos = useMemo(() => eventosQ.data ?? [], [eventosQ.data]);
  const proximos = useMemo(() => proximosQ.data ?? [], [proximosQ.data]);

  const dias = useMemo(() => {
    const lista = todos
      .filter((e) => (janela === "proximas" ? new Date(e.inicio).getTime() >= agora - 3_600_000 : new Date(e.inicio).getTime() < agora))
      .filter((e) => tipo === "todos" || (tipo === "plenario") === ehPlenario(e))
      .sort((a, b) => (janela === "proximas" ? 1 : -1) * a.inicio.localeCompare(b.inicio));
    const map = new Map<string, Evento[]>();
    for (const e of lista) map.set(e.inicio.slice(0, 10), [...(map.get(e.inicio.slice(0, 10)) ?? []), e]);
    return [...map.entries()];
  }, [todos, janela, tipo, agora]);

  const center = (
    <section className="card flex h-full min-h-[480px] flex-col" aria-label="Eventos">
      <div className="flex flex-wrap items-center gap-2">
        <div className="switch switch-sm" role="group" aria-label="Período">
          <button type="button" aria-pressed={janela === "proximas"} onClick={() => setJanela("proximas")}>Próximos</button>
          <button type="button" aria-pressed={janela === "realizadas"} onClick={() => setJanela("realizadas")}>Já realizados</button>
        </div>
        <div className="tabs-mini" role="group" aria-label="Tipo">
          {(["todos", "plenario", "comissoes"] as const).map((t) => (
            <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)}>
              {t === "todos" ? "Todos" : t === "plenario" ? "Plenário" : "Comissões e outros"}
            </button>
          ))}
        </div>
      </div>
      <div className="quiet-scroll mt-3 min-h-0 flex-1 overflow-y-auto">
        {eventosQ.isLoading ? (
          <LoadingRows rows={6} height={56} />
        ) : eventosQ.isError ? (
          <ErrorState compact onRetry={() => eventosQ.refetch()} />
        ) : dias.length === 0 ? (
          <p className="py-12 text-center text-[12px] text-fg-4">Nenhum evento neste período.</p>
        ) : (
          dias.map(([dia, eventos]) => (
            <div key={dia} className="mb-2">
              <h2 className="sticky top-0 z-[1] bg-panel/95 py-2 text-[12px] font-medium capitalize text-fg-3 backdrop-blur">
                {diaFmt.format(new Date(`${dia}T12:00:00`))}
              </h2>
              {eventos.map((e, i) => (
                <div key={e.id} className={i > 0 ? "rowline" : undefined}>
                  <EventoItem e={e} />
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </section>
  );

  return (
    <HudGrid
      left={<ProximaSessao eventos={proximos} isLoading={proximosQ.isLoading} agora={agora} />}
      center={center}
      dock={<VotesDock deliberacoes={feed.deliberacoes} />}
      right={<DeliberacaoFeed deliberacoes={feed.deliberacoes} isLoading={feed.isLoading} />}
    />
  );
}
