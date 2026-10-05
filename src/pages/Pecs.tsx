import { useState } from "react";
import { useProposicoes } from "@/hooks/useProposicoes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Search,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";

export function Pecs() {
  const [ano, setAno] = useState<number>(2024);
  const [search, setSearch] = useState("");
  const [pagina, setPagina] = useState(1);

  const { data, isLoading } = useProposicoes({
    siglaTipo: "PEC",
    ano,
    itens: 20,
    pagina,
  });

  const pecs = (data?.dados ?? []) as Array<{
    id: number;
    numero: number;
    ano: number;
    ementa: string;
    dataApresentacao: string;
    statusProposicao?: { descricaoSituacao?: string; siglaOrgao?: string };
  }>;
  const links = data?.links ?? [];
  const nextLink = links.find((l: { rel: string }) => l.rel === "next");
  const prevLink = links.find((l: { rel: string }) => l.rel === "previous");

  const filtered = pecs.filter(
    (p) =>
      p.ementa.toLowerCase().includes(search.toLowerCase()) ||
      p.numero.toString().includes(search)
  );

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-medium tracking-tight text-fg">
            Propostas de Emenda à Constituição
          </h2>
          <p className="text-xs text-fg-4">
            Acompanhe o status e tramitação das PECs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-5" />
            <input
              type="text"
              placeholder="Buscar PEC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-48 rounded-md border border-line bg-panel-2 pl-8 pr-3 text-xs text-fg placeholder:text-fg-5 focus:border-accent/50 focus:outline-none"
            />
          </div>
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="h-8 rounded-md border border-line bg-panel-2 px-2 text-xs text-fg focus:border-accent/50 focus:outline-none"
          >
            {[2024, 2023, 2022, 2021, 2020].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((pec) => (
            <Card
              key={pec.id}
              className="group cursor-pointer transition-all duration-150 hover:border-line-2 hover:bg-panel-2"
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="tn text-sm font-semibold text-fg">
                      PEC {pec.numero}/{pec.ano}
                    </span>
                    <StatusBadge status={pec.statusProposicao?.descricaoSituacao} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-fg-3">
                    {pec.ementa}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-fg-5">
                    <span>
                      Apresentada em{" "}
                      {new Date(pec.dataApresentacao).toLocaleDateString("pt-BR")}
                    </span>
                    {pec.statusProposicao?.siglaOrgao && (
                      <span>Órgão: {pec.statusProposicao.siglaOrgao}</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a
                    href={`https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${pec.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md p-1.5 text-fg-5 transition-colors hover:bg-panel-3 hover:text-fg"
                    aria-label="Ver na Câmara"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <ChevronRight className="h-4 w-4 text-fg-5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={!prevLink || pagina <= 1}
          className="rounded-md border border-line bg-panel-2 px-3 py-1.5 text-xs text-fg-3 transition-colors hover:bg-panel-3 disabled:opacity-30"
        >
          Anterior
        </button>
        <span className="text-xs text-fg-5">Página {pagina}</span>
        <button
          onClick={() => setPagina((p) => p + 1)}
          disabled={!nextLink}
          className="rounded-md border border-line bg-panel-2 px-3 py-1.5 text-xs text-fg-3 transition-colors hover:bg-panel-3 disabled:opacity-30"
        >
          Próxima
        </button>
      </div>
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
