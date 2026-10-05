import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Veredito } from "@/components/hud/proposta";
import { useQueryEnum, useQueryParam, votacaoHref } from "@/hooks/useUi";
import { formatDate, formatNumber } from "@/lib/format";
import type { RegistroVoto } from "@/lib/historico";
import { lerVotacao } from "@/lib/linguagem";
import type { Casa, VotoCategoria } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CATEGORIA_LABEL } from "@/lib/votos";
import { corDaPosicao, POSICAO_LABEL } from "./posicao";

type Filtro = "todas" | "partido" | "governo" | "ausencias";
const FILTROS: readonly Filtro[] = ["todas", "partido", "governo", "ausencias"];
const PAGINA = 30;
const AUSENCIA = new Set(["ausente", "sem-registro", "presente"]);

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function passa(r: RegistroVoto, filtro: Filtro): boolean {
  if (filtro === "partido") return r.seguiuPartido === false;
  if (filtro === "governo") return r.seguiuGoverno === false;
  if (filtro === "ausencias") return AUSENCIA.has(r.posicao);
  return true;
}

function Comparacao({ rotulo, pedido, seguiu }: { rotulo: string; pedido?: VotoCategoria; seguiu: boolean | null }) {
  if (!pedido) return null;
  return (
    <span className={cn("inline-flex items-center gap-1", seguiu === false ? "text-yellow" : "text-fg-3")}>
      {seguiu === true && <Check className="h-3 w-3 text-green" aria-label="seguiu" />}
      {seguiu === false && <X className="h-3 w-3" aria-label="contrariou" />}
      {rotulo} {CATEGORIA_LABEL[pedido]}
    </span>
  );
}

function Registro({ r }: { r: RegistroVoto }) {
  const leitura = lerVotacao({
    ...r.votacao,
    ementa: r.deliberacao.ementa ?? r.votacao.ementa,
    proposicao: r.deliberacao.proposicao ?? r.votacao.proposicao,
  });
  const placar = r.votacao.placar;
  return (
    <li className="grid gap-x-6 gap-y-2 py-3 @2xl:grid-cols-[minmax(0,1fr)_230px]">
      <div className="min-w-0">
        <p className="text-[11px] text-fg-4">
          {formatDate(r.votacao.data)}
          {leitura.tipo && ` · ${leitura.tipo.curto}`}
          {` · ${leitura.etapa.rotulo}`}
        </p>
        <a href={votacaoHref(r.votacao)} className="mt-0.5 line-clamp-2 text-[14px] font-medium leading-snug text-fg no-underline hover:underline">
          {leitura.titulo}
        </a>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px]">
          <Veredito votacao={r.votacao} />
          {placar && placar.total > 0 && <span className="tn text-fg-3">{placar.sim} a {placar.nao}</span>}
          {leitura.codigo && <span className="text-fg-5">· {leitura.codigo}</span>}
        </p>
      </div>
      <div className="flex flex-col gap-1 @2xl:items-end @2xl:text-right">
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-panel-2 px-2.5 py-1 text-[13px] font-medium @2xl:self-end">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: corDaPosicao(r.posicao), outline: AUSENCIA.has(r.posicao) ? "1px solid var(--color-line-3)" : undefined }}
          />
          {POSICAO_LABEL[r.posicao]}
        </span>
        <span className="flex flex-col gap-0.5 text-[12px] @2xl:items-end">
          <Comparacao rotulo={r.fontePartido === "maioria" ? "Maioria do partido:" : "Partido pediu"} pedido={r.pedidoPartido} seguiu={r.seguiuPartido} />
          <Comparacao rotulo="Governo pediu" pedido={r.pedidoGoverno} seguiu={r.seguiuGoverno} />
        </span>
      </div>
    </li>
  );
}

export function RegistrosCard({ registros, casa, carregando }: { registros: RegistroVoto[]; casa: Casa; carregando: boolean }) {
  const [filtro, setFiltro] = useQueryEnum<Filtro>("filtro", FILTROS, "todas");
  const [q, setQ] = useQueryParam("q");
  const [limite, setLimite] = useState(PAGINA);
  const busca = norm(q.trim());

  const contagem = useMemo(
    () => Object.fromEntries(FILTROS.map((f) => [f, registros.filter((r) => passa(r, f)).length])) as Record<Filtro, number>,
    [registros]
  );
  const visiveis = useMemo(
    () =>
      registros.filter(
        (r) => passa(r, filtro) && (!busca || norm(`${r.deliberacao.proposicao ?? ""} ${r.deliberacao.ementa ?? ""} ${r.votacao.descricao}`).includes(busca))
      ),
    [registros, filtro, busca]
  );
  const rotulos: Record<Filtro, string> = {
    todas: "Todas",
    partido: "Contra o partido",
    governo: "Contra o Governo",
    ausencias: "Ausências",
  };

  return (
    <section className="card @container" aria-labelledby="registros-title">
      <div className="card-head">
        <h2 id="registros-title">Votação por votação</h2>
        <span className="meta">mais recentes primeiro</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="tabs-mini flex-wrap" role="group" aria-label="Filtrar">
          {FILTROS.filter((f) => f !== "governo" || casa === "camara").map((f) => (
            <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
              {rotulos[f]} <span className="tn text-fg-4">{contagem[f]}</span>
            </button>
          ))}
        </div>
        <label className="relative ml-auto min-w-[200px] flex-1 sm:max-w-[280px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-5" />
          <input value={q} onChange={(e) => setQ(e.target.value || null)} placeholder="Buscar assunto" className="field pl-9" aria-label="Buscar votações" />
        </label>
      </div>

      {visiveis.length === 0 ? (
        <p className="py-10 text-center text-[12px] text-fg-4">
          {carregando ? "Lendo as votações…" : "Nenhuma votação com esses filtros."}
        </p>
      ) : (
        <ol className="lista-partidos mt-2 flex flex-col">
          {visiveis.slice(0, limite).map((r) => (
            <Registro key={r.votacao.id} r={r} />
          ))}
        </ol>
      )}
      {visiveis.length > limite && (
        <button type="button" className="btn btn-sm btn-block mt-2" onClick={() => setLimite((l) => l + PAGINA)}>
          Ver mais ({formatNumber(visiveis.length - limite)} restantes)
        </button>
      )}
    </section>
  );
}
