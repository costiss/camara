import { useMemo } from "react";
import { useDeputados, usePecCounts, useProposicaoDetalhes, useProposicoes, useVotacoes, useVotacoesMensais } from "@/hooks/useCamara";
import { useSenadores } from "@/hooks/useSenado";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Donut,
  ErrorState,
  HorizontalBars,
  KpiCard,
  LoadingRows,
  TrendArea,
} from "@/components/shared";
import { distributionBy } from "@/lib/aggregate";
import { statusTone } from "@/lib/parties";import { addDays, formatMonth, isoDate, startOfDay } from "@/lib/format";

const UF_COLOR = "#60a5fa";

function statusColor(name: string): string {
  const tone = statusTone(name);
  if (tone === "success") return "var(--color-green)";
  if (tone === "danger") return "var(--color-red)";
  if (tone === "warning") return "var(--color-yellow)";
  if (tone === "info") return "var(--color-blue)";
  return "var(--color-fg-4)";
}

export function Metricas() {
  const hoje = startOfDay();
  const anoAtual = hoje.getFullYear();

  const depQ = useDeputados();
  const senQ = useSenadores();
  const pecsQ = useProposicoes({
    tipo: "PEC",
    itens: 24,
    ordem: "DESC",
    ordenarPor: "id",
  });
  const votacoesQ = useVotacoes({
    dataInicio: isoDate(addDays(hoje, -90)),
    dataFim: isoDate(hoje),
    itens: 60,
  });

  const deputados = useMemo(() => depQ.data ?? [], [depQ.data]);
  const senadores = useMemo(() => senQ.data ?? [], [senQ.data]);
  const pecs = useMemo(() => pecsQ.data?.items ?? [], [pecsQ.data]);
  const votacoes = useMemo(() => votacoesQ.data?.items ?? [], [votacoesQ.data]);

  const pecIds = pecs.filter((p) => p.casa === "camara" && !p.status).map((p) => p.id);
  const pecDetails = useProposicaoDetalhes(pecIds);
  const enrichedPecs = pecs.map((p) => {
    const idx = pecIds.indexOf(p.id);
    return { ...p, status: p.status ?? (idx >= 0 ? pecDetails[idx]?.data?.status : undefined) };
  });

  const anos = useMemo(
    () => Array.from({ length: 8 }, (_, i) => anoAtual - 7 + i),
    [anoAtual]
  );
  const pecCounts = usePecCounts(anos);

  const meses = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const start = new Date(hoje.getFullYear(), hoje.getMonth() - 7 + i, 1);
        const end = new Date(hoje.getFullYear(), hoje.getMonth() - 6 + i, 0);
        return { inicio: isoDate(start), fim: isoDate(end), label: formatMonth(start) };
      }),
    [hoje]
  );
  const votosMes = useVotacoesMensais(meses);

  const depPorPartido = useMemo(
    () => distributionBy(deputados, (d) => d.partido, 10),
    [deputados]
  );
  const senPorPartido = useMemo(
    () => distributionBy(senadores, (s) => s.partido, 10),
    [senadores]
  );
  const depPorUf = useMemo(() => distributionBy(deputados, (d) => d.uf).slice(0, 15), [deputados]);
  const pecStatus = useMemo(() => {
    const map = enrichedPecs.reduce<Record<string, number>>((acc, p) => {
      const key = p.status?.trim() || "Sem situação";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [enrichedPecs]);

  const votosResumo = useMemo(
    () => [
      { name: "Aprovadas", value: votacoes.filter((v) => v.aprovacao === 1).length },
      { name: "Rejeitadas", value: votacoes.filter((v) => v.aprovacao === 0).length },
      { name: "Sem registro", value: votacoes.filter((v) => v.aprovacao === null || v.aprovacao === undefined).length },
    ],
    [votacoes]
  );

  const partidosTotal = useMemo(
    () => new Set([...deputados, ...senadores].map((p) => p.partido)).size,
    [deputados, senadores]
  );

  const isError = depQ.isError || senQ.isError;
  const trendPec = pecCounts.data.map((d) => ({ label: String(d.ano), total: d.total }));
  const trendVotos = votosMes.data.map((d) => ({ label: d.label, total: d.total }));

  if (isError) {
    return (
      <ErrorState
        description="Não foi possível carregar os indicadores."
        onRetry={() => {
          depQ.refetch();
          senQ.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Deputados" value={deputados.length} loading={depQ.isLoading} tone="info" />
        <KpiCard label="Senadores" value={senadores.length} loading={senQ.isLoading} tone="accent" />
        <KpiCard label="Partidos" value={partidosTotal} loading={depQ.isLoading} />
        <KpiCard
          label="PECs no período"
          value={pecs.length}
          loading={pecsQ.isLoading}
          hint="amostra recente"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deputados por partido</CardTitle>
          </CardHeader>
          <CardContent>
            {depQ.isLoading ? (
              <LoadingRows rows={6} height={28} />
            ) : (
              <Donut items={depPorPartido} centerValue={deputados.length} centerLabel="deputados" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Senadores por partido</CardTitle>
          </CardHeader>
          <CardContent>
            {senQ.isLoading ? (
              <LoadingRows rows={6} height={28} />
            ) : (
              <Donut items={senPorPartido} centerValue={senadores.length} centerLabel="senadores" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Deputados por estado</CardTitle>
          </CardHeader>
          <CardContent>
            {depQ.isLoading ? (
              <LoadingRows rows={8} height={26} />
            ) : (
              <HorizontalBars items={depPorUf} color={UF_COLOR} height={420} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Situação das PECs</CardTitle>
          </CardHeader>
          <CardContent>
            {pecsQ.isLoading ? (
              <LoadingRows rows={6} height={28} />
            ) : (
              <Donut items={pecStatus} colorFor={statusColor} centerValue={pecs.length} centerLabel="PECs" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultado das votações · 90d</CardTitle>
          </CardHeader>
          <CardContent>
            {votacoesQ.isLoading ? (
              <LoadingRows rows={6} height={28} />
            ) : (
              <Donut
                items={votosResumo}
                centerValue={votacoes.length}
                centerLabel="votações"
                colorFor={(name) =>
                  name === "Aprovadas"
                    ? "var(--color-green)"
                    : name === "Rejeitadas"
                      ? "var(--color-red)"
                      : "var(--color-fg-4)"
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>PECs por ano</CardTitle>
          </CardHeader>
          <CardContent>
            {pecCounts.isLoading ? (
              <LoadingRows rows={1} height={220} />
            ) : (
              <TrendArea data={trendPec} color="#d4a853" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Votações por mês</CardTitle>
          </CardHeader>
          <CardContent>
            {votosMes.isLoading ? (
              <LoadingRows rows={1} height={220} />
            ) : (
              <TrendArea data={trendVotos} color="#60a5fa" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
