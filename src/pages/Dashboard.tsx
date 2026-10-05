import { useProposicoes } from "@/hooks/useProposicoes";
import { useDeputados } from "@/hooks/useDeputados";
import { useSenadores } from "@/hooks/useSenadores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Users,
  Landmark,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";

export function Dashboard() {
  const { data: pecsData, isLoading: pecsLoading } = useProposicoes({
    siglaTipo: "PEC",
    itens: 10,
  });
  const { data: deputadosData, isLoading: depLoading } = useDeputados({
    itens: 500,
  });
  const { data: senadoresData, isLoading: senLoading } = useSenadores();

  const pecs = (pecsData?.dados ?? []) as Array<{
    id: number;
    numero: number;
    ano: number;
    ementa: string;
    dataApresentacao: string;
    statusProposicao?: { descricaoSituacao?: string };
  }>;
  const deputados = (deputadosData?.dados ?? []) as Array<{
    siglaPartido: string;
    siglaUf: string;
  }>;
  const senadores = (senadoresData?.dados ?? []) as Array<{
    siglaPartido: string;
    siglaUf: string;
  }>;

  const partyCount = deputados.reduce(
    (acc, d) => {
      acc[d.siglaPartido] = (acc[d.siglaPartido] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const topParties = Object.entries(partyCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const ufCount = deputados.reduce(
    (acc, d) => {
      acc[d.siglaUf] = (acc[d.siglaUf] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const topUfs = Object.entries(ufCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-fg-4">
              PECs em Tramitação
            </CardTitle>
            <FileText className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            {pecsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="tn font-serif text-2xl font-semibold text-fg">
                {pecs.length}
              </div>
            )}
            <p className="text-[11px] text-fg-5">proposições recentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-fg-4">
              Deputados
            </CardTitle>
            <Users className="h-4 w-4 text-blue" />
          </CardHeader>
          <CardContent>
            {depLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="tn font-serif text-2xl font-semibold text-fg">
                {deputados.length}
              </div>
            )}
            <p className="text-[11px] text-fg-5">câmara dos deputados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-fg-4">
              Senadores
            </CardTitle>
            <Landmark className="h-4 w-4 text-purple" />
          </CardHeader>
          <CardContent>
            {senLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="tn font-serif text-2xl font-semibold text-fg">
                {senadores.length}
              </div>
            )}
            <p className="text-[11px] text-fg-5">senado federal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-fg-4">
              Partidos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green" />
          </CardHeader>
          <CardContent>
            {depLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="tn font-serif text-2xl font-semibold text-fg">
                {Object.keys(partyCount).length}
              </div>
            )}
            <p className="text-[11px] text-fg-5">com representação</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>PECs Recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pecsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))
            ) : (
              pecs.slice(0, 5).map((pec) => (
                <div
                  key={pec.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-line bg-panel-2 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="tn text-xs font-medium text-fg">
                        PEC {pec.numero}/{pec.ano}
                      </span>
                      <StatusBadge status={pec.statusProposicao?.descricaoSituacao} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-fg-4">
                      {pec.ementa}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-fg-5">
                    {new Date(pec.dataApresentacao).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Partido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {depLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))
            ) : (
              topParties.map(([party, count]) => (
                <div key={party} className="flex items-center gap-3">
                  <span className="tn w-12 text-xs font-medium text-fg-2">
                    {party}
                  </span>
                  <div className="flex-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-panel-3">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{
                          width: `${(count / deputados.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="tn w-8 text-right text-xs text-fg-4">
                    {count}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estados com Mais Representantes</CardTitle>
        </CardHeader>
        <CardContent>
          {depLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {topUfs.map(([uf, count]) => (
                <div
                  key={uf}
                  className="rounded-md border border-line bg-panel-2 p-3 text-center"
                >
                  <div className="tn font-serif text-lg font-semibold text-fg">
                    {count}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-fg-5">
                    {uf}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;

  const s = status.toLowerCase();
  let variant: "default" | "success" | "danger" | "warning" | "info" = "default";
  let icon = <Clock className="h-3 w-3" />;

  if (s.includes("aprovad") || s.includes("promulgad")) {
    variant = "success";
    icon = <CheckCircle2 className="h-3 w-3" />;
  } else if (s.includes("rejeitad") || s.includes("arquivad") || s.includes("encerrad")) {
    variant = "danger";
    icon = <XCircle className="h-3 w-3" />;
  } else if (s.includes("tramita") || s.includes("aguardando")) {
    variant = "warning";
    icon = <AlertCircle className="h-3 w-3" />;
  }

  return (
    <Badge variant={variant} className="gap-1 text-[10px]">
      {icon}
      {status.length > 20 ? status.slice(0, 20) + "…" : status}
    </Badge>
  );
}
