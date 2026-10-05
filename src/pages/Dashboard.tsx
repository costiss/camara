import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronRight,
  FileText,
  Gavel,
  Landmark,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  useDeputados,
  useEventos,
  usePecCounts,
  useProposicoes,
  useVotacoes,
  useVotacoesMensais,
} from "@/hooks/useCamara";
import { useSenadoVotacoes, useSenadores } from "@/hooks/useSenado";
import { navigate } from "@/hooks/useUi";
import { getVotacaoVotos } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DistributionBars,
  Donut,
  EmptyState,
  EventoAgendaCard,
  Hemicycle,
  KpiCard,
  LoadingRows,
  ProposicoesList,
  SectionHeader,
  TrendArea,
  VotacaoRow,
} from "@/components/shared";
import { ProposicaoDetail } from "@/components/detail/ProposicaoDetail";
import { distributionBy } from "@/lib/aggregate";
import { partyColor } from "@/lib/parties";
import { addDays, formatMonth, isoDate, startOfDay } from "@/lib/format";
import type { Proposicao } from "@/lib/types";

export function Dashboard() {
  const hoje = startOfDay();
  const ha90 = addDays(hoje, -90);
  const em14 = addDays(hoje, 14);
  const anoAtual = hoje.getFullYear();

  const [selectedPec, setSelectedPec] = useState<Proposicao | null>(null);

  const deputadosQ = useDeputados();
  const senadoresQ = useSenadores();

  const pecsAnoQ = useProposicoes({
    tipo: "PEC",
    ano: anoAtual,
    itens: 1,
    ordem: "DESC",
    ordenarPor: "id",
  });
  const pecsRecentesQ = useProposicoes({
    tipo: "PEC",
    itens: 6,
    ordem: "DESC",
    ordenarPor: "id",
  });
  const votacoesQ = useVotacoes({
    dataInicio: isoDate(ha90),
    dataFim: isoDate(hoje),
    itens: 6,
  });
  const eventosQ = useEventos({
    dataInicio: isoDate(hoje),
    dataFim: isoDate(em14),
    itens: 40,
  });
  const senadoVotosQ = useSenadoVotacoes();

  const anos = useMemo(
    () => Array.from({ length: 7 }, (_, i) => anoAtual - 6 + i),
    [anoAtual]
  );
  const pecCounts = usePecCounts(anos);

  const meses = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const start = new Date(hoje.getFullYear(), hoje.getMonth() - 5 + i, 1);
        const end = new Date(hoje.getFullYear(), hoje.getMonth() - 4 + i, 0);
        return {
          inicio: isoDate(start),
          fim: isoDate(end),
          label: formatMonth(start),
        };
      }),
    [hoje]
  );
  const votosMes = useVotacoesMensais(meses);

  const deputados = useMemo(() => deputadosQ.data ?? [], [deputadosQ.data]);
  const senadores = useMemo(() => senadoresQ.data ?? [], [senadoresQ.data]);
  const pecsRecentes = useMemo(
    () => pecsRecentesQ.data?.items ?? [],
    [pecsRecentesQ.data]
  );
  const votacoes = useMemo(() => votacoesQ.data?.items ?? [], [votacoesQ.data]);

  // Pick the most recent plenary vote that actually has a published roll-call.
  const votosCandidatos = useQueries({
    queries: votacoes.slice(0, 3).map((v) => ({
      queryKey: ["votacao-votos", v.id.replace(/^camara-/, "")],
      queryFn: () => getVotacaoVotos(v.id.replace(/^camara-/, "")),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const hemiIndex = votosCandidatos.findIndex(
    (q) => (q.data?.length ?? 0) > 0
  );
  const hemiVotos =
    hemiIndex >= 0 ? votosCandidatos[hemiIndex].data ?? [] : [];
  const hemiVotacao = hemiIndex >= 0 ? votacoes[hemiIndex] : undefined;

  const distribuicaoDep = useMemo(
    () => distributionBy(deputados, (d) => d.partido, 8),
    [deputados]
  );

  const agenda = useMemo(() => {
    const now = Date.now();
    return (eventosQ.data ?? [])
      .filter((e) => new Date(e.inicio).getTime() >= now - 60 * 60 * 1000)
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
      .slice(0, 5);
  }, [eventosQ.data]);

  const feed = useMemo(() => {
    const senado = (senadoVotosQ.data ?? []).slice(0, 4);
    return [...votacoes, ...senado]
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 6);
  }, [votacoes, senadoVotosQ.data]);

  const pecTrend = pecCounts.data.map((d) => ({ label: String(d.ano), total: d.total }));
  const votosTrend = votosMes.data.map((d) => ({ label: d.label, total: d.total }));
  const totalPecs = pecsAnoQ.data?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard
          label={`PECs em ${anoAtual}`}
          value={totalPecs}
          icon={FileText}
          tone="accent"
          loading={pecsAnoQ.isLoading}
          hint="apresentadas"
        />
        <KpiCard
          label="Deputados"
          value={deputados.length}
          icon={Users}
          tone="info"
          loading={deputadosQ.isLoading}
          hint="em exercício"
        />
        <KpiCard
          label="Senadores"
          value={senadores.length}
          icon={Landmark}
          tone="accent"
          loading={senadoresQ.isLoading}
          hint="em exercício"
        />
        <KpiCard
          label="Votações · 90d"
          value={votacoesQ.data?.total ?? votacoes.length}
          icon={Gavel}
          tone="success"
          loading={votacoesQ.isLoading}
          hint="plenário e comissões"
        />
        <KpiCard
          label="Partidos"
          value={Object.keys(
            deputados.reduce<Record<string, number>>((acc, d) => {
              acc[d.partido] = 1;
              return acc;
            }, {})
          ).length}
          icon={TrendingUp}
          loading={deputadosQ.isLoading}
          hint="na Câmara"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Feed + Agenda */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-4 w-4 text-accent" />
                Votações recentes
              </CardTitle>
              <p className="mt-0.5 text-[11px] text-fg-4">
                Últimos 90 dias · Câmara e Senado
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {votacoesQ.isLoading ? (
              <LoadingRows rows={4} height={92} />
            ) : feed.length === 0 ? (
              <EmptyState title="Sem votações no período" icon={Gavel} />
            ) : (
              feed.map((v) => (
                <VotacaoRow
                  key={v.id}
                  v={v}
                  onOpen={() => navigate(`votacao/${v.id}`)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-blue" />
                Agenda das próximas sessões
              </CardTitle>
              <p className="mt-0.5 text-[11px] text-fg-4">
                Próximos 14 dias · Câmara dos Deputados
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {eventosQ.isLoading ? (
              <LoadingRows rows={4} height={84} />
            ) : agenda.length === 0 ? (
              <EmptyState
                title="Nenhuma sessão agendada"
                description="A Câmara ainda não publicou sessões deliberativas para os próximos dias."
                icon={CalendarClock}
              />
            ) : (
              agenda.map((e) => <EventoAgendaCard key={e.id} e={e} />)
            )}
          </CardContent>
        </Card>
      </div>

      {/* PECs + distribuição */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                PECs mais recentes
              </CardTitle>
              <p className="mt-0.5 text-[11px] text-fg-4">
                Propostas de Emenda à Constituição
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {pecsRecentesQ.isLoading ? (
              <LoadingRows rows={4} height={96} />
            ) : pecsRecentes.length === 0 ? (
              <EmptyState title="Sem PECs recentes" icon={FileText} />
            ) : (
              <ProposicoesList
                items={pecsRecentes}
                onOpen={setSelectedPec}
                className="space-y-2"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Distribuição por partido</CardTitle>
              <p className="mt-0.5 text-[11px] text-fg-4">
                {deputados.length} deputados em exercício
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {deputadosQ.isLoading ? (
              <LoadingRows rows={6} height={30} />
            ) : (
              <DistributionBars
                items={distribuicaoDep}
                total={deputados.length}
                colorFor={partyColor}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plenário — última votação */}
      {hemiVotacao && hemiVotos.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-4 w-4 text-accent" />
                Plenário — última votação
              </CardTitle>
              <p className="mt-0.5 line-clamp-1 max-w-3xl text-[11px] text-fg-4">
                {hemiVotacao.descricao}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`votacao/${hemiVotacao.id}`)}
            >
              Ver votação
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <Hemicycle votos={hemiVotos} colorBy="voto" />
          </CardContent>
        </Card>
      )}

      {/* Tendências */}
      <div>
        <SectionHeader
          title="Dados históricos"
          description="Evolução da produção legislativa ao longo do tempo"
          className="mb-3"
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>PECs por ano</CardTitle>
            </CardHeader>
            <CardContent>
              {pecCounts.isLoading ? (
                <LoadingRows rows={1} height={220} />
              ) : (
                <TrendArea data={pecTrend} color="#d4a853" />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Votações por mês</CardTitle>
            </CardHeader>
            <CardContent>
              {votosMes.isLoading ? (
                <LoadingRows rows={1} height={220} />
              ) : (
                <TrendArea data={votosTrend} color="#60a5fa" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {deputados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bancadas por partido — participação</CardTitle>
          </CardHeader>
          <CardContent>
            <Donut
              items={distribuicaoDep}
              centerLabel="deputados"
              centerValue={deputados.length}
              colorFor={partyColor}
            />
          </CardContent>
        </Card>
      )}

      <ProposicaoDetail
        proposicao={selectedPec}
        open={!!selectedPec}
        onOpenChange={(o) => !o && setSelectedPec(null)}
      />
    </div>
  );
}
