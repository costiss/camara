import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ProposicaoDetail } from "@/components/detail/ProposicaoDetail";
import { DeliberacaoFeed } from "@/components/hud/DeliberacaoFeed";
import { HudGrid } from "@/components/hud/HudGrid";
import { ErrorState, LoadingRows } from "@/components/shared";
import { usePecsVotadasNoAno, useProposicaoDetalhes, useProposicoes, useProposicoesVotadas } from "@/hooks/useCamara";
import { useDeliberacoes } from "@/hooks/useDeliberacoes";
import { useSenadoProcessos } from "@/hooks/useSenado";
import { useDebouncedValue } from "@/hooks/useUi";
import type { Proposicao } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PecRow } from "./PecRow";
import { PecHero, PecsPorAno, PecsVotadasCard } from "./PecSidebar";

type CasaFiltro = "todas" | "camara" | "senado";
type Situacao = "todas" | "votadas" | "pendentes";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function PecsView() {
  const [anoAtual] = useState(() => new Date().getFullYear());
  const anos = Array.from({ length: 4 }, (_, i) => anoAtual - i);
  const [ano, setAno] = useState(anoAtual);
  const [casa, setCasa] = useState<CasaFiltro>("todas");
  const [situacao, setSituacao] = useState<Situacao>("todas");
  const [pagina, setPagina] = useState(1);
  const [q, setQ] = useState("");
  const [aberta, setAberta] = useState<Proposicao | null>(null);
  const query = norm(useDebouncedValue(q, 200).trim());

  const camaraQ = useProposicoes({ tipo: "PEC", ano, itens: 20, pagina, ordem: "DESC", ordenarPor: "id" });
  const senadoQ = useSenadoProcessos({ sigla: "PEC", ano });
  const votadasQ = usePecsVotadasNoAno(ano);
  const feed = useDeliberacoes();

  const camaraIds = useMemo(() => (camaraQ.data?.items ?? []).map((p) => p.id), [camaraQ.data]);
  const detalhes = useProposicaoDetalhes(camaraIds);
  const votadasMap = useProposicoesVotadas(camaraIds).map;
  const votadasAno = useMemo(() => votadasQ.data ?? [], [votadasQ.data]);

  const itens = useMemo(() => {
    const status = new Map(detalhes.map((d) => [d.data?.id, d.data?.status]));
    const camara = (camaraQ.data?.items ?? []).map((p) => ({ ...p, status: status.get(p.id) ?? p.status }));
    const senado = pagina === 1 || casa === "senado" ? (senadoQ.data ?? []) : [];
    const base = casa === "camara" ? camara : casa === "senado" ? senado : [...camara, ...senado];
    const votada = (p: Proposicao) =>
      p.casa === "camara" ? (votadasMap.get(p.id) ?? false) : /aprovad|promulgad/i.test(p.status ?? "");
    return base
      .filter((p) => !query || norm(`${p.sigla} ${p.ementa} ${p.autor ?? ""}`).includes(query))
      .filter((p) => situacao === "todas" || (situacao === "votadas") === votada(p))
      .map((p) => ({ p, votada: votada(p) }))
      .sort((a, b) => b.p.numero - a.p.numero);
  }, [camaraQ.data, senadoQ.data, detalhes, casa, situacao, query, pagina, votadasMap]);

  const mudarAno = (a: number) => {
    setAno(a);
    setPagina(1);
  };

  const center = (
    <section className="card flex h-full min-h-[480px] flex-col" aria-label="Lista de PECs">
      <div className="flex flex-wrap items-center gap-2">
        <div className="switch switch-sm" role="group" aria-label="Casa">
          {(["todas", "camara", "senado"] as const).map((c) => (
            <button key={c} type="button" aria-pressed={casa === c} onClick={() => { setCasa(c); setPagina(1); }}>
              {c === "todas" ? "Ambas" : c === "camara" ? "Câmara" : "Senado"}
            </button>
          ))}
        </div>
        <div className="tabs-mini" role="group" aria-label="Situação">
          {(["todas", "votadas", "pendentes"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={situacao === s} onClick={() => setSituacao(s)}>
              {s === "todas" ? "Todas" : s === "votadas" ? "Já votadas" : "Não votadas"}
            </button>
          ))}
        </div>
        <label className="relative ml-auto min-w-[200px] flex-1 sm:max-w-[280px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-5" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Número, tema ou autor" className="field pl-9" aria-label="Buscar PECs" />
        </label>
      </div>
      <p className="mt-3 text-[12px] text-fg-4">
        Apresentadas em {ano} · “já votada” = votação de mérito no Plenário
      </p>
      <div className="quiet-scroll -mx-2 mt-2 min-h-0 flex-1 overflow-y-auto">
        {camaraQ.isLoading && senadoQ.isLoading ? (
          <div className="px-2"><LoadingRows rows={6} height={64} /></div>
        ) : camaraQ.isError && senadoQ.isError ? (
          <ErrorState compact onRetry={() => { camaraQ.refetch(); senadoQ.refetch(); }} />
        ) : itens.length === 0 ? (
          <p className="py-12 text-center text-[12px] text-fg-4">Nenhuma PEC com esses filtros.</p>
        ) : (
          itens.map(({ p, votada }, i) => (
            <div key={`${p.casa}-${p.id}`} className={cn(i > 0 && "rowline")}>
              <PecRow p={p} votada={votada} onOpen={setAberta} />
            </div>
          ))
        )}
      </div>
      {casa !== "senado" && (camaraQ.data?.hasNext || pagina > 1) && (
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[12px] text-fg-3">
          <span>Câmara · página {pagina}{camaraQ.data?.total ? ` de ${Math.ceil(camaraQ.data.total / 20)}` : ""}</span>
          <div className="flex gap-2">
            <button type="button" className="icon-btn h-8 w-8" aria-label="Página anterior" disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" className="icon-btn h-8 w-8" aria-label="Próxima página" disabled={!camaraQ.data?.hasNext} onClick={() => setPagina((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );

  return (
    <>
      <HudGrid
        left={
          <>
            <PecHero
              ano={ano}
              anos={anos}
              onAno={mudarAno}
              totalCamara={camaraQ.data?.total ?? null}
              totalSenado={senadoQ.data?.length ?? null}
              votadas={votadasAno}
              loadingVotadas={votadasQ.isLoading}
              erroVotadas={votadasQ.isError}
            />
            <PecsPorAno anos={Array.from({ length: 8 }, (_, i) => anoAtual - i)} />
          </>
        }
        center={center}
        right={
          <>
            <PecsVotadasCard ano={ano} votadas={votadasAno} isLoading={votadasQ.isLoading} isError={votadasQ.isError} onRetry={() => votadasQ.refetch()} />
            <DeliberacaoFeed deliberacoes={feed.deliberacoes} isLoading={feed.isLoading} isError={feed.isError} onRetry={feed.refetch} limit={6} />
          </>
        }
      />
      <ProposicaoDetail proposicao={aberta} open={!!aberta} onOpenChange={(o) => !o && setAberta(null)} />
    </>
  );
}
