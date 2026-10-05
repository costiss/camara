import { useMemo } from "react";
import { useDeputados } from "@/hooks/useDeputados";
import { useSenadores } from "@/hooks/useSenadores";
import { useProposicoes } from "@/hooks/useProposicoes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "#D4A853",
  "#60A5FA",
  "#4ADE80",
  "#F87171",
  "#C084FC",
  "#FB923C",
  "#2DD4BF",
  "#F472B6",
  "#FBBF24",
  "#A3E635",
];

export function Metricas() {
  const { data: depData, isLoading: depLoading } = useDeputados({ itens: 500 });
  const { data: senData, isLoading: senLoading } = useSenadores();
  const { data: pecsData, isLoading: pecsLoading } = useProposicoes({
    siglaTipo: "PEC",
    itens: 50,
  });

  const deputados = (depData?.dados ?? []) as Array<{
    siglaPartido: string;
    siglaUf: string;
  }>;
  const senadores = (senData?.dados ?? []) as Array<{
    siglaPartido: string;
    siglaUf: string;
  }>;
  const pecs = pecsData?.dados ?? [];

  const partyData = useMemo(() => {
    const count = deputados.reduce(
      (acc, d) => {
        acc[d.siglaPartido] = (acc[d.siglaPartido] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return Object.entries(count)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [deputados]);

  const ufData = useMemo(() => {
    const count = deputados.reduce(
      (acc, d) => {
        acc[d.siglaUf] = (acc[d.siglaUf] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return Object.entries(count)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [deputados]);

  const senPartyData = useMemo(() => {
    const count = senadores.reduce(
      (acc, s) => {
        acc[s.siglaPartido] = (acc[s.siglaPartido] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return Object.entries(count)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [senadores]);

  const pecStatusData = useMemo(() => {
    const count = (pecs as Array<{ statusProposicao?: { descricaoSituacao?: string } }>).reduce(
      (acc, p) => {
        const status = p.statusProposicao?.descricaoSituacao || "Sem status";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return Object.entries(count)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [pecs]);

  if (depLoading || senLoading || pecsLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="font-serif text-xl font-medium tracking-tight text-fg">
          Métricas do Congresso
        </h2>
        <p className="text-xs text-fg-4">
          Análise distributiva e indicadores legislativos
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deputados por Partido</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={partyData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={50}
                  tick={{ fill: "#A6A39C", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1B1A17",
                    border: "1px solid rgba(250,250,249,0.1)",
                    borderRadius: "6px",
                    color: "#FAFAF9",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" fill="#D4A853" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Senadores por Partido</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={senPartyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {senPartyData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1B1A17",
                    border: "1px solid rgba(250,250,249,0.1)",
                    borderRadius: "6px",
                    color: "#FAFAF9",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", color: "#A6A39C" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deputados por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ufData}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#A6A39C", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "#1B1A17",
                    border: "1px solid rgba(250,250,249,0.1)",
                    borderRadius: "6px",
                    color: "#FAFAF9",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" fill="#60A5FA" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status das PECs</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pecStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                  }
                  labelLine={false}
                >
                  {pecStatusData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1B1A17",
                    border: "1px solid rgba(250,250,249,0.1)",
                    borderRadius: "6px",
                    color: "#FAFAF9",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
