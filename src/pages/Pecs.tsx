import { useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import { useProposicoes } from "@/hooks/useCamara";
import { useSenadoProcessos } from "@/hooks/useSenado";
import { useDebouncedValue } from "@/hooks/useUi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EmptyState,
  ErrorState,
  KpiCard,
  LoadingRows,
  ProposicoesList,
} from "@/components/shared";
import { ProposicaoDetail } from "@/components/detail/ProposicaoDetail";
import type { Proposicao } from "@/lib/types";

type CasaFilter = "todas" | "camara" | "senado";

export function Pecs() {
  const anoAtual = new Date().getFullYear();
  const [casa, setCasa] = useState<CasaFilter>("todas");
  const [ano, setAno] = useState(anoAtual);
  const [pagina, setPagina] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Proposicao | null>(null);
  const debounced = useDebouncedValue(search, 250);

  const camaraQ = useProposicoes({
    tipo: "PEC",
    ano,
    itens: 15,
    pagina,
    ordem: "DESC",
    ordenarPor: "id",
  });
  const senadoQ = useSenadoProcessos({ sigla: "PEC", ano });

  const camaraItems = useMemo(() => camaraQ.data?.items ?? [], [camaraQ.data]);
  const senadoItems = useMemo(() => senadoQ.data ?? [], [senadoQ.data]);

  const items = useMemo(() => {
    const merged =
      casa === "senado"
        ? senadoItems
        : casa === "camara"
          ? camaraItems
          : [...camaraItems, ...senadoItems];
    return [...merged].sort((a, b) => {
      if (b.ano !== a.ano) return b.ano - a.ano;
      return b.numero - a.numero;
    });
  }, [casa, camaraItems, senadoItems]);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.ementa.toLowerCase().includes(q) ||
        p.sigla.toLowerCase().includes(q) ||
        (p.autor ?? "").toLowerCase().includes(q)
    );
  }, [items, debounced]);

  const anos = Array.from({ length: 10 }, (_, i) => anoAtual - i);
  const isLoading = camaraQ.isLoading || senadoQ.isLoading;
  const isError = camaraQ.isError && senadoQ.isError;
  const totalCamara = camaraQ.data?.total ?? camaraItems.length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={`PECs na Câmara · ${ano}`}
          value={totalCamara}
          icon={FileText}
          tone="accent"
          loading={camaraQ.isLoading}
        />
        <KpiCard
          label={`PECs no Senado · ${ano}`}
          value={senadoItems.length}
          icon={FileText}
          tone="info"
          loading={senadoQ.isLoading}
        />
        <KpiCard
          label="Resultados"
          value={filtered.length}
          tone="neutral"
          hint="após filtros"
        />
        <KpiCard
          label="Período"
          value={ano}
          tone="neutral"
          hint="ano de apresentação"
        />
      </div>

      <div className="surface flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="seg shrink-0">
          {(
            [
              { id: "todas", label: "Todas" },
              { id: "camara", label: "Câmara" },
              { id: "senado", label: "Senado" },
            ] as { id: CasaFilter; label: string }[]
          ).map((opt) => (
            <button
              key={opt.id}
              data-active={casa === opt.id}
              onClick={() => {
                setCasa(opt.id);
                setPagina(1);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ementa, número ou autoria..."
            className="field pl-9"
          />
        </div>

        <Select
          value={String(ano)}
          onValueChange={(v) => {
            setAno(Number(v));
            setPagina(1);
          }}
        >
          <SelectTrigger className="w-[130px] shrink-0">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {anos.map((a) => (
              <SelectItem key={a} value={String(a)}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <ErrorState
          description="Não foi possível consultar as APIs da Câmara e do Senado."
          onRetry={() => {
            camaraQ.refetch();
            senadoQ.refetch();
          }}
        />
      ) : isLoading ? (
        <LoadingRows rows={6} height={100} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma PEC encontrada"
          description="Tente outro ano, outra casa ou ajuste a busca."
        />
      ) : (
        <>
          <ProposicoesList
            items={filtered}
            onOpen={setSelected}
            className="space-y-2"
          />

          {casa !== "senado" && (
            <div className="flex items-center justify-between pt-1">
              <button
                className="btn btn-sm"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1}
              >
                Anterior
              </button>
              <span className="text-[11px] text-fg-5">Página {pagina}</span>
              <button
                className="btn btn-sm"
                onClick={() => setPagina((p) => p + 1)}
                disabled={!camaraQ.data?.hasNext}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      <ProposicaoDetail
        proposicao={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}
