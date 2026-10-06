import { useQueryEnum } from "@/hooks/useUi";
import { formatNumber } from "@/lib/format";
import type { InspecaoVotacao, LinhaGrupo } from "@/lib/inspecao";
import { partyColor } from "@/lib/parties";
import { CATEGORIA_COR } from "@/lib/votos";

type Grupo = "partido" | "estado";
const GRUPOS: readonly Grupo[] = ["partido", "estado"];

function pct(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(0)}%`;
}

function Barra({ l }: { l: LinhaGrupo }) {
  const c = l.contagem;
  return (
    <span className="mt-1.5 flex h-[3px] w-full overflow-hidden rounded-full bg-panel-3" aria-hidden="true">
      <span style={{ flexGrow: c.sim, background: CATEGORIA_COR.sim }} />
      <span style={{ flexGrow: c.nao, background: CATEGORIA_COR.nao }} />
      <span style={{ flexGrow: l.cadeiras - c.sim - c.nao }} />
    </span>
  );
}

/** Per-party or per-state breakdown; a name jumps to that group's members in the roll-call. */
export function GruposSecao({ inspecao, onPartido, onUf }: {
  inspecao: InspecaoVotacao;
  onPartido: (partido: string) => void;
  onUf: (uf: string) => void;
}) {
  const [grupo, setGrupo] = useQueryEnum<Grupo>("grupo", GRUPOS, "partido");
  const porPartido = grupo === "partido";
  const linhas = porPartido ? inspecao.partidos() : inspecao.estados();
  const orientacao = porPartido && inspecao.temOrientacao;

  return (
    <section id="secao-grupos" className="card scroll-mt-4" aria-labelledby="grupos-title">
      <div className="card-head">
        <h2 id="grupos-title">Como votou cada {porPartido ? "partido" : "estado"}</h2>
        <div className="switch switch-sm" role="group" aria-label="Agrupar por">
          <button type="button" aria-pressed={porPartido} onClick={() => setGrupo("partido")}>Partidos</button>
          <button type="button" aria-pressed={!porPartido} onClick={() => setGrupo("estado")}>Estados</button>
        </div>
      </div>
      <p className="-mt-1 mb-2 text-[12px] text-fg-4">
        Clique num {porPartido ? "partido" : "estado"} para ver o voto de cada parlamentar.
      </p>
      <ol className="lista-partidos md:hidden">
        {linhas.map((l) => {
          const c = l.contagem;
          const outros = c.obstrucao + c.presidente + c.presente + c.secreto;
          const detalhes = [
            `${c.sim} Sim`,
            `${c.nao} Não`,
            c.abstencao ? `${c.abstencao} abst.` : null,
            outros ? `${outros} ${outros === 1 ? "outro" : "outros"}` : null,
            c.ausente ? `${c.ausente} ausentes` : null,
          ].filter(Boolean);
          return (
            <li key={l.chave} className="py-2.5">
              <div className="flex items-baseline gap-2">
                <button
                  type="button"
                  onClick={() => (porPartido ? onPartido(l.chave) : onUf(l.chave))}
                  className="min-w-0 truncate text-[14px] font-medium underline-offset-4 hover:underline"
                  style={{ color: porPartido ? partyColor(l.chave) : undefined }}
                >
                  {l.chave}
                </button>
                <span className="tn text-[12px] text-fg-4">{l.cadeiras}</span>
                <span className="tn ml-auto text-[14px] font-medium">{pct(l.pctSim)} Sim</span>
              </div>
              <Barra l={l} />
              <p className="mt-1.5 text-[12px] leading-relaxed text-fg-3">
                {detalhes.join(" · ")}
                {orientacao && l.orientacao && (
                  <>
                    {" · pediu "}
                    <span style={{ color: l.orientacao.categoria ? CATEGORIA_COR[l.orientacao.categoria] : undefined }}>{l.orientacao.orientacao}</span>
                  </>
                )}
                {orientacao && l.fidelidade !== null && ` · ${pct(l.fidelidade)} seguiram`}
              </p>
            </li>
          );
        })}
      </ol>
      <div className="quiet-scroll -mx-1 hidden overflow-x-auto px-1 md:block">
        <table className="lista-tabela w-full min-w-[640px]">
          <thead>
            <tr>
              <th scope="col">{porPartido ? "Partido" : "UF"}</th>
              <th scope="col" className="text-right">Cadeiras</th>
              <th scope="col" className="text-right">Sim</th>
              <th scope="col" className="text-right">Não</th>
              <th scope="col" className="text-right">Abst.</th>
              <th scope="col" className="text-right">Outros</th>
              <th scope="col" className="text-right">Ausentes</th>
              <th scope="col" className="text-right">% Sim</th>
              {orientacao && <th scope="col">Orientação</th>}
              {orientacao && <th scope="col" className="text-right" title="Votos de mérito alinhados à orientação do partido">Fidelidade</th>}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const c = l.contagem;
              const outros = c.obstrucao + c.presidente + c.presente + c.secreto;
              return (
                <tr key={l.chave}>
                  <td className="w-[150px]">
                    <button
                      type="button"
                      onClick={() => (porPartido ? onPartido(l.chave) : onUf(l.chave))}
                      className="font-medium underline-offset-4 hover:underline"
                      style={{ color: porPartido ? partyColor(l.chave) : undefined }}
                    >
                      {l.chave}
                    </button>
                    <Barra l={l} />
                  </td>
                  <td className="tn text-right text-fg-3">{l.cadeiras}</td>
                  <td className="tn text-right">{c.sim}</td>
                  <td className="tn text-right">{c.nao}</td>
                  <td className="tn text-right text-fg-3">{c.abstencao}</td>
                  <td className="tn text-right text-fg-3">{outros}</td>
                  <td className="tn text-right text-fg-3">{c.ausente}</td>
                  <td className="tn text-right font-medium">{pct(l.pctSim)}</td>
                  {orientacao && (
                    <td style={{ color: l.orientacao?.categoria ? CATEGORIA_COR[l.orientacao.categoria] : "var(--color-fg-4)" }}>
                      {l.orientacao?.orientacao ?? "—"}
                    </td>
                  )}
                  {orientacao && <td className="tn text-right">{pct(l.fidelidade)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-fg-4">
        Total de {formatNumber(inspecao.assentos.length)} cadeiras. % Sim considera apenas votos Sim e Não.
      </p>
    </section>
  );
}
