import { useMemo } from "react";
import { Download, Search } from "lucide-react";
import { MemberAvatar } from "@/components/shared";
import { parlamentarHref, router, useDebouncedValue, useRoute } from "@/hooks/useUi";
import { formatNumber } from "@/lib/format";
import { FiltroVotos, votosCsv, type InspecaoVotacao, type OrdemVotos } from "@/lib/inspecao";
import { partyColor } from "@/lib/parties";
import type { Votacao, VotoParlamentar } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CATEGORIA_COR, CATEGORIA_LABEL, CATEGORIA_ORDEM } from "@/lib/votos";

const ORDEM_LABEL: Record<OrdemVotos, string> = { nome: "Nome", partido: "Partido", uf: "UF", voto: "Voto" };

function definir(patch: Record<string, string | null>) {
  router.patch(patch);
}

function baixarCsv(votacao: Votacao, votos: VotoParlamentar[], inspecao: InspecaoVotacao) {
  const blob = new Blob([votosCsv(votos, inspecao)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `votacao-${votacao.id}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function VotosSecao({ votacao, inspecao }: { votacao: Votacao; inspecao: InspecaoVotacao }) {
  const { query } = useRoute();
  const debounced = useDebouncedValue(query.toString(), 120);
  const filtro = useMemo(() => new FiltroVotos(new URLSearchParams(debounced)), [debounced]);
  const atual = useMemo(() => new FiltroVotos(query), [query]);
  const base = useMemo(() => filtro.semVoto(inspecao), [filtro, inspecao]);
  const votos = useMemo(() => filtro.aplicar(inspecao), [filtro, inspecao]);
  const partidos = useMemo(() => inspecao.partidos().map((p) => p.chave).sort(), [inspecao]);
  const ufs = useMemo(() => inspecao.estados().map((e) => e.chave), [inspecao]);
  const porCategoria = CATEGORIA_ORDEM.map((c) => [c, base.filter((v) => v.categoria === c).length] as const).filter(([, n]) => n > 0);

  return (
    <section id="secao-votos" className="card scroll-mt-4" aria-labelledby="votos-title">
      <div className="card-head">
        <h2 id="votos-title">Voto de cada parlamentar</h2>
        <button type="button" className="btn btn-sm" onClick={() => baixarCsv(votacao, votos, inspecao)} disabled={votos.length === 0}>
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-5" />
          <input value={atual.nome} onChange={(e) => definir({ nome: e.target.value || null })} placeholder="Nome do parlamentar" className="field pl-9" aria-label="Buscar parlamentar" />
        </label>
        <select className="field" aria-label="Partido" value={atual.partido} onChange={(e) => definir({ partido: e.target.value || null })}>
          <option value="">Todos os partidos</option>
          {partidos.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="field" aria-label="Estado" value={atual.uf} onChange={(e) => definir({ uf: e.target.value || null })}>
          <option value="">Todos os estados</option>
          {ufs.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select className="field" aria-label="Ordenar por" value={atual.ordem} onChange={(e) => definir({ ordem: e.target.value === "nome" ? null : e.target.value })}>
          {(Object.keys(ORDEM_LABEL) as OrdemVotos[]).map((o) => <option key={o} value={o}>Ordenar por {ORDEM_LABEL[o].toLowerCase()}</option>)}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="tabs-mini flex-wrap" role="group" aria-label="Filtrar por voto">
          <button type="button" aria-pressed={atual.voto === "todos"} onClick={() => definir({ voto: null })}>
            Todos <span className="tn text-fg-4">{base.length}</span>
          </button>
          {porCategoria.map(([c, n]) => (
            <button key={c} type="button" aria-pressed={atual.voto === c} onClick={() => definir({ voto: c })}>
              {CATEGORIA_LABEL[c]} <span className="tn text-fg-4">{n}</span>
            </button>
          ))}
        </div>
        {inspecao.temOrientacao && (
          <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-fg-3">
            <input type="checkbox" className="accent-[var(--color-fg)]" checked={atual.contra} onChange={(e) => definir({ contra: e.target.checked ? "1" : null })} />
            Só quem contrariou o partido
          </label>
        )}
        {atual.ativos > 0 && (
          <button type="button" className="link ml-auto text-[12px]" onClick={() => definir({ voto: null, partido: null, uf: null, nome: null, contra: null })}>
            Limpar filtros
          </button>
        )}
      </div>

      <p className="mt-3 text-[12px] text-fg-4" aria-live="polite">
        {formatNumber(votos.length)} de {formatNumber(inspecao.assentos.length)} parlamentares
      </p>

      {votos.length === 0 ? (
        <p className="py-10 text-center text-[12px] text-fg-4">Ninguém com esses filtros.</p>
      ) : (
        <>
          <ol className="flex flex-col md:hidden">
            {votos.map((v, i) => {
              const contra = inspecao.contrariou(v);
              return (
                <li key={v.parlamentarId} className={cn("flex items-center gap-2.5 py-2.5", i > 0 && "rowline")}>
                  <a href={parlamentarHref(v.parlamentarId)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left no-underline">
                    <MemberAvatar name={v.nome} photo={v.foto} party={v.partido} size={32} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-fg">{v.nome}</span>
                      <span className="block text-[12px]">
                        <span style={{ color: partyColor(v.partido) }}>{v.partido}</span>
                        <span className="text-fg-4"> · {v.uf}</span>
                      </span>
                    </span>
                  </a>
                  <span className="shrink-0 text-right text-[13px]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: CATEGORIA_COR[v.categoria], outline: v.categoria === "ausente" ? "1px solid var(--color-line-2)" : undefined }} />
                      {v.voto || CATEGORIA_LABEL[v.categoria]}
                    </span>
                    {contra && <span className="block text-[11px] text-yellow">contrariou o partido</span>}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="quiet-scroll -mx-1 mt-1 hidden overflow-x-auto px-1 md:block">
            <table className="lista-tabela meio w-full min-w-[560px]">
              <thead>
                <tr>
                  <th scope="col">Parlamentar</th>
                  <th scope="col" className="w-[110px]">Partido</th>
                  <th scope="col" className="w-[56px]">UF</th>
                  <th scope="col" className="w-[170px]">Voto</th>
                  {inspecao.temOrientacao && <th scope="col" className="w-[150px]">Orientação</th>}
                </tr>
              </thead>
              <tbody>
                {votos.map((v) => {
                  const o = inspecao.orientacaoDe(v.partido);
                  const contra = inspecao.contrariou(v);
                  return (
                    <tr key={v.parlamentarId}>
                      <td className="py-2">
                        <a href={parlamentarHref(v.parlamentarId)} className="flex items-center gap-2.5 text-left no-underline hover:underline">
                          <MemberAvatar name={v.nome} photo={v.foto} party={v.partido} size={28} />
                          <span>{v.nome}</span>
                        </a>
                      </td>
                      <td className="py-2">
                        <button type="button" className="hover:underline" style={{ color: partyColor(v.partido) }} onClick={() => definir({ partido: v.partido })}>
                          {v.partido}
                        </button>
                      </td>
                      <td className="py-2">
                        <button type="button" className="text-fg-3 hover:text-fg hover:underline" onClick={() => definir({ uf: v.uf })}>{v.uf}</button>
                      </td>
                      <td className="py-2">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: CATEGORIA_COR[v.categoria], outline: v.categoria === "ausente" ? "1px solid var(--color-line-2)" : undefined }} />
                          {v.voto || CATEGORIA_LABEL[v.categoria]}
                        </span>
                        {v.detalhe && v.categoria === "ausente" && <span className="block text-[11px] text-fg-5">{v.detalhe}</span>}
                      </td>
                      {inspecao.temOrientacao && (
                        <td className={cn("py-2", contra ? "text-yellow" : "text-fg-4")}>
                          {o?.orientacao ?? "—"}
                          {contra && <span className="block text-[11px]">contrariou</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
