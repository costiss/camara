import { useMemo, useState } from "react";
import { Activity, CheckCircle2, FileText, Gavel, CalendarDays } from "lucide-react";
import {
  useEventos,
  useProposicaoDetalhes,
  useProposicoes,
  useVotacoes,
} from "@/hooks/useCamara";
import { useSenadoVotacoes } from "@/hooks/useSenado";
import { navigate } from "@/hooks/useUi";
import {
  EmptyState,
  ErrorState,
  EventoAgendaCard,
  KpiCard,
  LoadingRows,
  ProposicaoRow,
  VotacaoRow,
} from "@/components/shared";
import { ProposicaoDetail } from "@/components/detail/ProposicaoDetail";
import { addDays, isoDate, startOfDay } from "@/lib/format";
import { statusTone } from "@/lib/parties";
import { cn } from "@/lib/utils";
import type { Evento, Proposicao, Votacao } from "@/lib/types";

type Tipo = "tudo" | "votacoes" | "proposicoes" | "sessoes";

type FeedItem =
  | { kind: "votacao"; date: string; votacao: Votacao }
  | { kind: "proposicao"; date: string; proposicao: Proposicao }
  | { kind: "evento"; date: string; evento: Evento };

export function Atividades() {
  const hoje = startOfDay();
  const [tipo, setTipo] = useState<Tipo>("tudo");
  const [soVotados, setSoVotados] = useState(false);
  const [selectedPec, setSelectedPec] = useState<Proposicao | null>(null);

  const votacoesQ = useVotacoes({
    dataInicio: isoDate(addDays(hoje, -90)),
    dataFim: isoDate(hoje),
    itens: 18,
  });
  const senadoQ = useSenadoVotacoes();
  const proposicoesQ = useProposicoes({
    itens: 15,
    ordem: "DESC",
    ordenarPor: "id",
  });
  const eventosQ = useEventos({
    dataInicio: isoDate(addDays(hoje, -14)),
    dataFim: isoDate(hoje),
    itens: 30,
  });

  const votacoes = useMemo(() => votacoesQ.data?.items ?? [], [votacoesQ.data]);
  const proposicoes = useMemo(
    () => proposicoesQ.data?.items ?? [],
    [proposicoesQ.data]
  );

  const proposalIds = useMemo(
    () =>
      proposicoes
        .filter((p) => p.casa === "camara" && !p.status)
        .map((p) => p.id),
    [proposicoes]
  );
  const details = useProposicaoDetalhes(proposalIds);
  const statusById = useMemo(() => {
    const map = new Map<string, string | undefined>();
    proposalIds.forEach((id, i) => map.set(id, details[i]?.data?.status));
    return map;
  }, [proposalIds, details]);

  const feed = useMemo<FeedItem[]>(() => {
    const votosCamara: FeedItem[] = votacoes.map((v) => ({
      kind: "votacao",
      date: v.dataHora ?? v.data,
      votacao: v,
    }));
    const votosSenado: FeedItem[] = (senadoQ.data ?? [])
      .slice(0, 18)
      .map((v) => ({ kind: "votacao", date: v.data, votacao: v }));
    const props: FeedItem[] = proposicoes.map((p) => ({
      kind: "proposicao",
      date: p.apresentacao ?? p.situacaoData ?? "",
      proposicao: { ...p, status: p.status ?? statusById.get(p.id) },
    }));
    const eventos: FeedItem[] = (eventosQ.data ?? [])
      .filter((e) => new Date(e.inicio).getTime() <= Date.now())
      .map((e) => ({ kind: "evento", date: e.inicio, evento: e }));

    const filtro: FeedItem[] =
      tipo === "tudo"
        ? [...votosCamara, ...votosSenado, ...props, ...eventos]
        : tipo === "votacoes"
          ? [...votosCamara, ...votosSenado]
          : tipo === "proposicoes"
            ? props
            : eventos;

    const resultado = soVotados
      ? filtro.filter((item) => {
          if (item.kind === "votacao") return true;
          if (item.kind === "evento") return false;
          const tone = statusTone(item.proposicao.status);
          return tone === "success" || tone === "danger";
        })
      : filtro;

    return resultado.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [votacoes, senadoQ.data, proposicoes, statusById, eventosQ.data, tipo, soVotados]);

  const isLoading =
    votacoesQ.isLoading || proposicoesQ.isLoading || eventosQ.isLoading;
  const isError = votacoesQ.isError && proposicoesQ.isError;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Votações · 90d"
          value={votacoesQ.data?.total ?? votacoes.length}
          icon={Gavel}
          tone="success"
          loading={votacoesQ.isLoading}
        />
        <KpiCard
          label="Senado · votos"
          value={(senadoQ.data ?? []).length}
          icon={Gavel}
          tone="accent"
          loading={senadoQ.isLoading}
        />
        <KpiCard
          label="Proposições"
          value={proposicoesQ.data?.total ?? proposicoes.length}
          icon={FileText}
          tone="info"
          loading={proposicoesQ.isLoading}
        />
        <KpiCard
          label="Sessões · 14d"
          value={(eventosQ.data ?? []).length}
          icon={CalendarDays}
          loading={eventosQ.isLoading}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="seg">
          {(
            [
              { id: "tudo", label: "Tudo" },
              { id: "votacoes", label: "Votações" },
              { id: "proposicoes", label: "Proposições" },
              { id: "sessoes", label: "Sessões" },
            ] as { id: Tipo; label: string }[]
          ).map((opt) => (
            <button key={opt.id} data-active={tipo === opt.id} onClick={() => setTipo(opt.id)}>
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSoVotados((v) => !v)}
          aria-pressed={soVotados}
          className={cn(
            "chip transition-colors",
            soVotados && "border-green/40 bg-green/10 text-green"
          )}
        >
          <CheckCircle2 className="h-3 w-3" />
          Já votados
        </button>
      </div>

      {isError ? (
        <ErrorState
          onRetry={() => {
            votacoesQ.refetch();
            proposicoesQ.refetch();
            eventosQ.refetch();
          }}
        />
      ) : isLoading ? (
        <LoadingRows rows={8} height={96} />
      ) : feed.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nenhuma atividade no período"
          description="Não há movimentações recentes para o filtro selecionado."
        />
      ) : (
        <div className={cn("space-y-2")}>
          {feed.slice(0, 40).map((item, i) =>
            item.kind === "votacao" ? (
              <VotacaoRow
                key={`v-${item.votacao.id}-${i}`}
                v={item.votacao}
                onOpen={() => navigate(`votacao/${item.votacao.id}`)}
              />
            ) : item.kind === "proposicao" ? (
              <ProposicaoRow
                key={`p-${item.proposicao.id}-${i}`}
                p={item.proposicao}
                voted={
                  statusTone(item.proposicao.status) === "success" ||
                  statusTone(item.proposicao.status) === "danger"
                }
                onOpen={setSelectedPec}
              />
            ) : (
              <EventoAgendaCard key={`e-${item.evento.id}`} e={item.evento} />
            )
          )}
        </div>
      )}

      <ProposicaoDetail
        proposicao={selectedPec}
        open={!!selectedPec}
        onOpenChange={(o) => !o && setSelectedPec(null)}
      />
    </div>
  );
}
