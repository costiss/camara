import { useMemo, useState } from "react";
import { DeliberacaoFeed } from "@/components/hud/DeliberacaoFeed";
import { HudGrid } from "@/components/hud/HudGrid";
import { VotesDock } from "@/components/hud/VotesDock";
import { Skeleton } from "@/components/ui/skeleton";
import { PainelAoVivo, PainelAoVivoSkeleton } from "@/components/hud/PainelAoVivo";
import { useEventos, useSessaoCamara } from "@/hooks/useCamara";
import { useSessaoSenado } from "@/hooks/useSenado";
import { useSessoes } from "@/hooks/useSessoes";
import { useQueryEnum } from "@/hooks/useUi";
import { useDeliberacoes } from "@/hooks/useDeliberacoes";
import { addDays, formatTime, isoDate, startOfDay } from "@/lib/format";
import type { SessaoAoVivoResult } from "@/lib/aoVivo";
import type { Evento, SessaoPauta } from "@/lib/types";
import { EventoItem } from "./EventoItem";
import { ListaDias } from "./ListaDias";
import { PautaSessao } from "./PautaSessao";

type Janela = "proximos" | "realizados";
type Tipo = "todos" | "plenario" | "comissoes";
type Aba = "eventos" | "pautas";
const JANELAS: readonly Janela[] = ["proximos", "realizados"];
const TIPOS: readonly Tipo[] = ["todos", "plenario", "comissoes"];
const ABAS: readonly Aba[] = ["eventos", "pautas"];

const ehPlenario = (e: Evento) => /^sess[ãa]o/i.test(e.tipo) || /^(PLEN|Plen[áa]rio)$/i.test(e.orgao ?? "");
const ehSessaoPlenaria = (s: SessaoPauta) =>
  s.casa === "senado" || /^sess[ãa]o/i.test(s.tipo) || /^(PLEN|Plen[áa]rio)$/i.test(s.orgao ?? "");

/** The live panel of one house, or its placeholder while the day is loading. */
function PainelSessao({ resultado, titulo }: { resultado: SessaoAoVivoResult; titulo: string }) {
  if (resultado.sessao) return <PainelAoVivo sessao={resultado.sessao} />;
  return resultado.isLoading ? <PainelAoVivoSkeleton titulo={titulo} /> : null;
}

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
      {isLoading && (
        <div className="mt-5 border-t border-line pt-4" aria-busy="true">
          <Skeleton className="h-3 w-32" />
          <div className="mt-3 flex gap-4">
            <Skeleton className="h-12 w-12" />
            <div className="flex-1">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </div>
          </div>
        </div>
      )}
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
        <div className="flex justify-between py-1"><span className="label">No Plenário</span><span className="tn">{isLoading ? "—" : futuros.filter(ehPlenario).length}</span></div>
        <div className="flex justify-between py-1"><span className="label">Em comissões e outros</span><span className="tn">{isLoading ? "—" : futuros.filter((e) => !ehPlenario(e)).length}</span></div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-fg-4">Em sessão, a pauta de cada Plenário aparece ao vivo acima; as votações de ambas as casas aparecem no feed ao lado.</p>
    </section>
  );
}

export function AgendaView() {
  const [agora] = useState(() => Date.now());
  const hoje = startOfDay(new Date(agora));
  const [janela, setJanela] = useQueryEnum<Janela>("periodo", JANELAS, "proximos");
  const [tipo, setTipo] = useQueryEnum<Tipo>("tipo", TIPOS, "todos");
  const [aba, setAba] = useQueryEnum<Aba>("aba", ABAS, "eventos");
  const proximosQ = useEventos({ dataInicio: isoDate(hoje), dataFim: isoDate(addDays(hoje, 21)), ordem: "ASC" });
  const realizadosQ = useEventos({ dataInicio: isoDate(addDays(hoje, -21)), dataFim: isoDate(hoje), ordem: "DESC" });
  const eventosQ = janela === "proximos" ? proximosQ : realizadosQ;
  const sessoesQ = useSessoes(
    janela === "proximos"
      ? { ini: isoDate(hoje), fim: isoDate(addDays(hoje, 21)) }
      : { ini: isoDate(addDays(hoje, -21)), fim: isoDate(hoje) }
  );
  const feed = useDeliberacoes();
  const camara = useSessaoCamara();
  const senado = useSessaoSenado();
  const todos = useMemo(() => eventosQ.data ?? [], [eventosQ.data]);
  const proximos = useMemo(() => proximosQ.data ?? [], [proximosQ.data]);

  const dias = useMemo(() => {
    const lista = todos
      .filter((e) => (janela === "proximos" ? new Date(e.inicio).getTime() >= agora - 3_600_000 : new Date(e.inicio).getTime() < agora))
      .filter((e) => tipo === "todos" || (tipo === "plenario") === ehPlenario(e))
      .sort((a, b) => (janela === "proximos" ? 1 : -1) * a.inicio.localeCompare(b.inicio));
    const map = new Map<string, Evento[]>();
    for (const e of lista) map.set(e.inicio.slice(0, 10), [...(map.get(e.inicio.slice(0, 10)) ?? []), e]);
    return [...map.entries()];
  }, [todos, janela, tipo, agora]);

  const diasPauta = useMemo(() => {
    const lista = sessoesQ.sessoes
      .filter((s) => tipo === "todos" || (tipo === "plenario") === ehSessaoPlenaria(s))
      .sort((a, b) => (janela === "proximos" ? 1 : -1) * a.data.localeCompare(b.data));
    const map = new Map<string, SessaoPauta[]>();
    for (const s of lista) map.set(s.data, [...(map.get(s.data) ?? []), s]);
    return [...map.entries()];
  }, [sessoesQ.sessoes, tipo, janela]);

  const center = (
    <section className="card flex h-full min-h-[480px] flex-col" aria-label={aba === "pautas" ? "Pautas das sessões" : "Eventos"}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="switch switch-sm" role="group" aria-label="Visão">
          <button type="button" aria-pressed={aba === "eventos"} onClick={() => setAba("eventos")}>Eventos</button>
          <button type="button" aria-pressed={aba === "pautas"} onClick={() => setAba("pautas")}>Pautas</button>
        </div>
        <div className="switch switch-sm" role="group" aria-label="Período">
          <button type="button" aria-pressed={janela === "proximos"} onClick={() => setJanela("proximos")}>Próximos</button>
          <button type="button" aria-pressed={janela === "realizados"} onClick={() => setJanela("realizados")}>Já realizados</button>
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
        {aba === "pautas" ? (
          <ListaDias
            grupos={diasPauta}
            chave={(s) => s.id}
            isLoading={sessoesQ.isLoading}
            isError={sessoesQ.isError}
            onRetry={sessoesQ.refetch}
            vazio="Nenhuma pauta neste período."
          >
            {(s) => <PautaSessao s={s} />}
          </ListaDias>
        ) : (
          <ListaDias
            grupos={dias}
            chave={(e) => e.id}
            isLoading={eventosQ.isLoading}
            isError={eventosQ.isError}
            onRetry={eventosQ.refetch}
            vazio="Nenhum evento neste período."
          >
            {(e) => <EventoItem e={e} />}
          </ListaDias>
        )}
      </div>
    </section>
  );

  return (
    <HudGrid
      centroAntes
      left={
        <>
          <PainelSessao resultado={camara} titulo="o Plenário da Câmara" />
          <PainelSessao resultado={senado} titulo="o Plenário do Senado" />
          <ProximaSessao eventos={proximos} isLoading={proximosQ.isLoading} agora={agora} />
        </>
      }
      center={center}
      dock={<VotesDock deliberacoes={feed.deliberacoes} isLoading={feed.isLoading} />}
      right={<DeliberacaoFeed deliberacoes={feed.deliberacoes} isLoading={feed.isLoading} isError={feed.isError} onRetry={feed.refetch} />}
    />
  );
}
