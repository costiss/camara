import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";
import { BarRowsSkeleton } from "@/components/hud/skeletons";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useAutoria, useBuscarVotacao, useSituacoes } from "@/hooks/useAutoria";
import { router, useQueryParam, votacaoHref } from "@/hooks/useUi";
import type { SituacaoProposicao } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import { tipoDaProposta, tituloPopular } from "@/lib/linguagem";
import { faseDaSituacao, FASE_LABEL, FASE_ORDEM, FASE_TOM, situacaoEmPalavras, type Fase } from "@/lib/situacao";
import type { Parlamentar, Proposicao } from "@/lib/types";
import { cn } from "@/lib/utils";

const POR_PAGINA = 20;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function nomeTipo(tipo: string): string {
  return tipoDaProposta(tipo)?.curto ?? tipo;
}

function VerVotacao({ p }: { p: Proposicao }) {
  const buscar = useBuscarVotacao();
  const [estado, setEstado] = useState<"pronto" | "buscando" | "nenhuma">("pronto");
  if (estado === "nenhuma") return <span className="text-[12px] text-fg-4">Ainda não foi votada</span>;
  return (
    <button
      type="button"
      className="btn btn-sm"
      disabled={estado === "buscando"}
      onClick={async () => {
        setEstado("buscando");
        const v = await buscar(p).catch(() => undefined);
        if (v) router.abrir(votacaoHref(v));
        else setEstado("nenhuma");
      }}
    >
      {estado === "buscando" ? "Buscando…" : "Ver votação"}
    </button>
  );
}

function Linha({ p, situacao, carregando }: { p: Proposicao; situacao?: SituacaoProposicao; carregando: boolean }) {
  const fase: Fase | undefined = situacao?.norma ? "lei" : faseDaSituacao(situacao?.situacao, p.tramitando);
  return (
    <li className="grid gap-x-6 gap-y-2 py-3 @2xl:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <p className="text-[11px] text-fg-4">
          {[p.apresentacao ? formatDate(p.apresentacao) : String(p.ano), nomeTipo(p.tipo), p.sigla, p.coautoria ? "coautoria" : null].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-0.5 text-[14px] font-medium leading-snug text-fg">{tituloPopular(p.ementa) || p.sigla}</p>
        <p className="mt-1 text-[12px]">
          {carregando ? (
            <span className="inline-block h-3 w-28 animate-pulse rounded-md bg-panel-3/70 align-middle" aria-hidden="true" />
          ) : fase ? (
            <>
              <span className={cn("font-medium", FASE_TOM[fase])}>{situacao?.norma ? `Virou a ${situacao.norma}` : FASE_LABEL[fase]}</span>
              {situacao?.situacao && fase === "tramitando" && <span className="text-fg-3" title={situacao.situacao}> · {situacaoEmPalavras(situacao.situacao)}</span>}
            </>
          ) : (
            <span className="text-fg-4">Situação não informada</span>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 @2xl:flex-col @2xl:items-end">
        <VerVotacao p={p} />
        {p.url && (
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-fg-3 hover:text-fg">
            Texto oficial <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </li>
  );
}

function PorAno({ contagem, ativo, onAno }: { contagem: [number, number][]; ativo: string; onAno: (ano: string | null) => void }) {
  const max = Math.max(1, ...contagem.map(([, n]) => n));
  return (
    <div className="mt-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-fg-4">Por ano de apresentação</p>
      <div className="mt-2 flex h-28 items-end gap-1.5" role="group" aria-label="Filtrar por ano">
        {contagem.map(([ano, n]) => {
          const sel = ativo === String(ano);
          return (
            <button
              key={ano}
              type="button"
              aria-pressed={sel}
              aria-label={`${ano}: ${n} propostas`}
              onClick={() => onAno(sel ? null : String(ano))}
              className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="tn text-[11px] text-fg-3">{n}</span>
              <span
                className={cn("w-full max-w-10 rounded-t-[3px] transition-colors", sel ? "bg-fg" : ativo ? "bg-fg-5 group-hover:bg-fg-3" : "bg-fg-3 group-hover:bg-fg")}
                style={{ height: `${Math.max(4, (n / max) * 70)}%` }}
              />
              <span className={cn("tn text-[11px]", sel ? "text-fg" : "text-fg-4")}>{String(ano).slice(2)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The member's full authorship history: by year, type and (Senate) status, with every bill listed. */
export function PropostasAba({ parlamentar }: { parlamentar: Parlamentar }) {
  const q = useAutoria(parlamentar);
  const [tipo, setTipo] = useQueryParam("tipo");
  const [ano, setAno] = useQueryParam("ano");
  const [fase, setFase] = useQueryParam("fase");
  const [busca, setBusca] = useQueryParam("busca");
  const [paginaParam, setPagina] = useQueryParam("pagina", "1");
  const todas = useMemo(() => q.data ?? [], [q.data]);
  const senado = parlamentar.casa === "senado";

  const porAno = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of todas) m.set(p.ano, (m.get(p.ano) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [todas]);
  const porTipo = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of todas) m.set(p.tipo, (m.get(p.tipo) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [todas]);
  const porFase = useMemo(() => {
    const m = new Map<Fase, number>();
    if (!senado) return m;
    for (const p of todas) {
      const f = faseDaSituacao(p.status, p.tramitando);
      if (f) m.set(f, (m.get(f) ?? 0) + 1);
    }
    return m;
  }, [todas, senado]);

  const filtradas = useMemo(() => {
    const t = norm(busca.trim());
    return todas.filter(
      (p) =>
        (!tipo || p.tipo === tipo) &&
        (!ano || String(p.ano) === ano) &&
        (!fase || faseDaSituacao(p.status, p.tramitando) === fase) &&
        (!t || norm(`${p.sigla} ${p.ementa}`).includes(t))
    );
  }, [todas, tipo, ano, fase, busca]);

  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, Number(paginaParam) || 1), paginas);
  const visiveis = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const situacaoDe = useSituacoes(visiveis);
  const filtrar = (definir: (v: string | null) => void, v: string | null) => {
    definir(v);
    setPagina(null);
  };

  if (q.isError) {
    return (
      <div className="card">
        <ErrorState compact title="Não foi possível carregar as propostas" onRetry={() => q.refetch()} />
      </div>
    );
  }
  if (q.isLoading) {
    return (
      <section className="card" aria-busy="true" aria-label="Carregando propostas">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-4 h-28 w-full" />
        <BarRowsSkeleton rows={6} label="Carregando propostas" />
      </section>
    );
  }

  const desde = porAno[0]?.[0];
  return (
    <>
      <section className="card @container" aria-labelledby="historico-title">
        <div className="card-head">
          <h2 id="historico-title">Histórico de propostas</h2>
          <span className="meta">como autor ou coautor</span>
        </div>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="fig">{formatNumber(todas.length)}</span>
          <span className="text-[13px] text-fg-3">
            {todas.length === 1 ? "proposta" : "propostas"} de lei e emendas{desde ? ` desde ${desde}` : ""}
          </span>
        </p>
        {porAno.length > 1 && <PorAno contagem={porAno} ativo={ano} onAno={(v) => filtrar(setAno, v)} />}

        <div className="tabs-mini mt-4 flex-wrap" role="group" aria-label="Tipo de proposta">
          <button type="button" aria-pressed={!tipo} onClick={() => filtrar(setTipo, null)}>
            Todos os tipos <span className="tn text-fg-4">{todas.length}</span>
          </button>
          {porTipo.map(([t, n]) => (
            <button key={t} type="button" aria-pressed={tipo === t} onClick={() => filtrar(setTipo, tipo === t ? null : t)}>
              {nomeTipo(t)} <span className="tn text-fg-4">{n}</span>
            </button>
          ))}
        </div>
        {senado && porFase.size > 0 && (
          <div className="tabs-mini mt-2 flex-wrap" role="group" aria-label="Situação">
            <button type="button" aria-pressed={!fase} onClick={() => filtrar(setFase, null)}>Qualquer situação</button>
            {FASE_ORDEM.filter((f) => porFase.has(f)).map((f) => (
              <button key={f} type="button" aria-pressed={fase === f} onClick={() => filtrar(setFase, fase === f ? null : f)}>
                {FASE_LABEL[f]} <span className="tn text-fg-4">{porFase.get(f)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card @container" aria-labelledby="propostas-lista-title">
        <div className="card-head">
          <h2 id="propostas-lista-title">
            {formatNumber(filtradas.length)} {filtradas.length === 1 ? "proposta" : "propostas"}
            {ano && ` em ${ano}`}
          </h2>
          <span className="meta">mais recentes primeiro</span>
        </div>
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-5" />
          <input value={busca} onChange={(e) => filtrar(setBusca, e.target.value || null)} placeholder="Buscar por tema ou número" className="field pl-9" aria-label="Buscar propostas" />
        </label>
        {!senado && <p className="mt-2 text-[11px] text-fg-4">A situação de cada proposta é consultada na Câmara conforme a página é exibida.</p>}

        {visiveis.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-fg-4">Nenhuma proposta com esses filtros.</p>
        ) : (
          <ol className="lista-partidos mt-2">
            {visiveis.map((p) => {
              const s = situacaoDe(p);
              return <Linha key={`${p.casa}-${p.id}`} p={p} situacao={s.situacao} carregando={s.carregando} />;
            })}
          </ol>
        )}

        {paginas > 1 && (
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[12px] text-fg-3">
            <span className="tn">Página {pagina} de {paginas}</span>
            <div className="flex gap-2">
              <button type="button" className="icon-btn h-9 w-9" aria-label="Página anterior" disabled={pagina === 1} onClick={() => setPagina(String(pagina - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" className="icon-btn h-9 w-9" aria-label="Próxima página" disabled={pagina === paginas} onClick={() => setPagina(String(pagina + 1))}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
