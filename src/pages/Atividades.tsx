import { useProposicoes } from "@/hooks/useProposicoes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ScrollText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  Calendar,
} from "lucide-react";

export function Atividades() {
  const { data, isLoading } = useProposicoes({
    siglaTipo: "PEC",
    itens: 30,
  });

  const pecs = (data?.dados ?? []) as Array<{
    id: number;
    numero: number;
    ano: number;
    ementa: string;
    statusProposicao?: {
      descricaoSituacao: string;
      siglaOrgao: string;
      dataHora: string;
      despacho: string;
      descricaoTramitacao: string;
    };
  }>;

  const atividades = pecs
    .filter((p) => p.statusProposicao)
    .map((p) => ({
      id: p.id,
      tipo: "PEC",
      numero: p.numero,
      ano: p.ano,
      ementa: p.ementa,
      status: p.statusProposicao!.descricaoSituacao,
      orgao: p.statusProposicao!.siglaOrgao,
      data: p.statusProposicao!.dataHora,
      despacho: p.statusProposicao!.despacho,
      tramitacao: p.statusProposicao!.descricaoTramitacao,
    }))
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="font-serif text-xl font-medium tracking-tight text-fg">
          Atividades Legislativas
        </h2>
        <p className="text-xs text-fg-4">
          Últimas movimentações e tramitações das PECs
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {atividades.map((atv) => (
            <Card key={`${atv.id}-${atv.data}`} className="transition-all hover:border-line-2">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-panel-3">
                    <FileText className="h-5 w-5 text-fg-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tn text-sm font-semibold text-fg">
                        PEC {atv.numero}/{atv.ano}
                      </span>
                      <StatusBadge status={atv.status} />
                      <Badge variant="default" className="text-[10px]">
                        {atv.orgao}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-fg-3">
                      {atv.ementa}
                    </p>
                    {atv.despacho && (
                      <p className="mt-2 line-clamp-2 text-[11px] italic text-fg-5">
                        "{atv.despacho}"
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-fg-5">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(atv.data).toLocaleDateString("pt-BR")} às{" "}
                        {new Date(atv.data).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <ScrollText className="h-3 w-3" />
                        {atv.tramitacao}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {atividades.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ScrollText className="mb-3 h-8 w-8 text-fg-5" />
          <p className="text-sm text-fg-4">Nenhuma atividade encontrada</p>
        </div>
      )}
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
      {status.length > 25 ? status.slice(0, 25) + "…" : status}
    </Badge>
  );
}
