import { useCallback, useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import {
  usePecsVotadasNoAno,
  useProposicoes,
  useProposicoesVotadas,
} from "@/hooks/useCamara";
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
type VotacaoFilter = "todas" | "votadas" | "nao_votadas";
type Modo = "apresentadas" | "votadas";

export function Pecs() {
  const anoAtual = new Date().getFullYear();
  const [modo, setModo] = useState<Modo>("apresentadas");
  const [casa, setCasa] = useState<CasaFilter>("todas");
  const [ano, setAno] = useState(anoAtual);
  const [pagina, setPagina] = useState(1);
  const [search, setSearch] = useState("");
  const [votacao, setVotacao] = useState<VotacaoFilter>("todas");
  const [selected, setSelected] = useState<Proposicao | null>(null);
  const debounced = useDebouncedValue(search, 250);

  /* ------------------- modo "apresentadas" (por ano da PEC) ------------------ */
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

  const camaraIds = useMemo(() => camaraItems.map((p) => p.id), [camaraItems]);
  const votadasQ = useProposicoesVotadas(camaraIds);

  const isVotada = useCallback(
    (p: Proposicao) => {
      if (p.votado !== undefined) return p.votado;
      if (p.casa === "camara") return votadasQ.map.get(p.id) ?? false;
      return /aprovad|rejeitad|promulgad/i.test(p.status ?? "");
    },
    [votadasQ.map]
  );

  const votedIdsApresentadas = useMemo(
    () => new Set(items.filter(isVotada).map((p) => p.id)),
    [items, isVotada]
  );

  const filteredApresentadas = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    let list = items;
    if (q) {
      list = list.filter(
        (p) =>
          p.ementa.toLowerCase().includes(q) ||
          p.sigla.toLowerCase().includes(q) ||
          (p.autor ?? "").toLowerCase().includes(q)
      );
    }
    if (votacao === "votadas") list = list.filter(isVotada);
    else if (votacao === "nao_votadas") list = list.filter((p) => !isVotada(p));
    return list;
  }, [items, debounced, votacao, isVotada]);

  /* -------------------- modo "votadas" (por ano da votação) ----------------- */
  const votadasAnoQ = usePecsVotadasNoAno(ano, modo === "votadas");
  const votadasAno = useMemo(() => votadasAnoQ.data ?? [], [votadasAnoQ.data]);
  const votedIdsAno = useMemo(
    () => new Set(votadasAno.map((p) => p.id)),
    [votadasAno]
  );
  const filteredVotadas = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return votadasAno;
    return votadasAno.filter(
      (p) =>
        p.ementa.toLowerCase().includes(q) ||
        p.sigla.toLowerCase().includes(q) ||
        (p.autor ?? "").toLowerCase().includes(q)
    );
  }, [votadasAno, debounced]);

  const anos = Array.from({ length: 10 }, (_, i) => anoAtual - i);
  const isLoadingApresentadas = camaraQ.isLoading || senadoQ.isLoading;
  const votacaoLoading = votacao !== "todas" && votadasQ.isLoading;
  const isErrorApresentadas = camaraQ.isError && senadoQ.isError;
  const totalCamara = camaraQ.data?.total ?? camaraItems.length;

  const aprovadasAno = votadasAno.filter((p) => /aprovad/i.test(p.status ?? "")).length;
  const rejeitadasAno = votadasAno.filter((p) => /rejeitad/i.test(p.status ?? "")).length;

  return (
    <div className="space-y-5">
      {modo === "apresentadas" ? (
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
            value={filteredApresentadas.length}
            tone="neutral"
            hint="após filtros"
          />
          <KpiCard
            label={`Já votadas · apresentadas em ${ano}`}
            value={votedIdsApresentadas.size}
            tone="success"
            hint="nesta página"
            loading={votadasQ.isLoading}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label={`PECs votadas em ${ano}`}
            value={votadasAno.length}
            icon={FileText}
            tone="accent"
            loading={votadasAnoQ.isLoading}
          />
          <KpiCard
            label="Aprovadas"
            value={aprovadasAno}
            tone="success"
            loading={votadasAnoQ.isLoading}
          />
          <KpiCard
            label="Rejeitadas"
            value={rejeitadasAno}
            tone="danger"
            loading={votadasAnoQ.isLoading}
          />
          <KpiCard
            label="Resultados"
            value={filteredVotadas.length}
            tone="neutral"
            hint="após busca"
          />
        </div>
      )}

      <div className="surface flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="seg shrink-0">
          <button
            data-active={modo === "apresentadas"}
            onClick={() => setModo("apresentadas")}
          >
            Apresentadas
          </button>
          <button
            data-active={modo === "votadas"}
            onClick={() => setModo("votadas")}
          >
            Votadas em {ano}
          </button>
        </div>

        {modo === "apresentadas" && (
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
        )}

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

        {modo === "apresentadas" && (
          <Select
            value={votacao}
            onValueChange={(v) => setVotacao(v as VotacaoFilter)}
          >
            <SelectTrigger className="w-[200px] shrink-0">
              <SelectValue placeholder="Votação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as PECs</SelectItem>
              <SelectItem value="votadas">Já votadas</SelectItem>
              <SelectItem value="nao_votadas">Ainda não votadas</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {modo === "votadas" && (
        <p className="-mt-2 text-[11px] text-fg-4">
          PECs cujo mérito foi votado no Plenário da Câmara em {ano}, mesmo que
          tenham sido apresentadas em outro ano. Ano selecionado = ano da votação.
        </p>
      )}

      {modo === "apresentadas" ? (
        isErrorApresentadas ? (
          <ErrorState
            description="Não foi possível consultar as APIs da Câmara e do Senado."
            onRetry={() => {
              camaraQ.refetch();
              senadoQ.refetch();
            }}
          />
        ) : isLoadingApresentadas || votacaoLoading ? (
          <LoadingRows rows={6} height={100} />
        ) : filteredApresentadas.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhuma PEC encontrada"
            description="Tente outro ano, outra casa ou ajuste a busca e o filtro de votação."
          />
        ) : (
          <>
            <ProposicoesList
              items={filteredApresentadas}
              onOpen={setSelected}
              votedIds={votedIdsApresentadas}
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
        )
      ) : votadasAnoQ.isError ? (
        <ErrorState
          description="Não foi possível apurar as PECs votadas neste ano."
          onRetry={() => votadasAnoQ.refetch()}
        />
      ) : votadasAnoQ.isLoading ? (
        <div className="space-y-3">
          <p className="text-[11px] text-fg-4">
            Varrendo as votações do Plenário em {ano}…
          </p>
          <LoadingRows rows={4} height={100} />
        </div>
      ) : filteredVotadas.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={`Nenhuma PEC votada em ${ano}`}
          description="Nenhuma proposta de emenda à Constituição teve o mérito votado no Plenário da Câmara neste ano."
        />
      ) : (
        <ProposicoesList
          items={filteredVotadas}
          onOpen={setSelected}
          votedIds={votedIdsAno}
          className="space-y-2"
        />
      )}

      <ProposicaoDetail
        proposicao={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}
