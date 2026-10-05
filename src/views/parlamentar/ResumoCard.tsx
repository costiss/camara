import { formatNumber } from "@/lib/format";
import type { Alinhamento, ResumoHistorico } from "@/lib/historico";
import type { Casa } from "@/lib/types";
import { corDaPosicao, POSICAO_LABEL, POSICAO_ORDEM } from "./posicao";

function pct(parte: number, todo: number): string {
  return todo ? `${Math.round((parte / todo) * 100)}%` : "—";
}

function Indicador({ titulo, valor, frase }: { titulo: string; valor: string; frase: string }) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-3 rounded-[10px] bg-panel-2 px-3 py-3 @xl:block">
      <p className="fig row-span-2 @xl:hidden">{valor}</p>
      <p className="text-[12px] font-medium text-fg-3">{titulo}</p>
      <p className="fig mt-1.5 hidden @xl:block">{valor}</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-fg-3 @xl:mt-1.5">{frase}</p>
    </div>
  );
}

function fraseAlinhamento(a: Alinhamento, quem: string): string {
  if (!a.comparaveis) return `Sem votações em que ${quem} tenha se posicionado.`;
  return `Seguiu em ${formatNumber(a.seguiu)} de ${formatNumber(a.comparaveis)} votações em que ${quem} se posicionou.`;
}

export function ResumoCard({ resumo, casa, carregadas, total }: {
  resumo: ResumoHistorico;
  casa: Casa;
  carregadas: number;
  total: number;
}) {
  const posicoes = POSICAO_ORDEM.filter((p) => (resumo.contagem[p] ?? 0) > 0);
  const lendo = carregadas < total;
  return (
    <section className="card @container" aria-labelledby="resumo-title">
      <div className="card-head">
        <h2 id="resumo-title">Como votou</h2>
        <span className="meta">{formatNumber(resumo.total)} votações nominais</span>
      </div>

      <div className="grid gap-2 @xl:grid-cols-3">
        <Indicador
          titulo="Participação"
          valor={pct(resumo.participou, resumo.total)}
          frase={`Votou em ${formatNumber(resumo.participou)} de ${formatNumber(resumo.total)} votações nominais do período.`}
        />
        <Indicador titulo="Com o partido" valor={pct(resumo.partido.seguiu, resumo.partido.comparaveis)} frase={fraseAlinhamento(resumo.partido, "o partido")} />
        {casa === "camara" ? (
          <Indicador titulo="Com o Governo" valor={pct(resumo.governo.seguiu, resumo.governo.comparaveis)} frase={fraseAlinhamento(resumo.governo, "o Governo")} />
        ) : (
          <Indicador titulo="Com o Governo" valor="—" frase="O Senado não publica a orientação do Governo nas votações." />
        )}
      </div>

      {resumo.total > 0 && (
        <>
          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-panel-3" role="img" aria-label="Distribuição das posições">
            {posicoes.map((p) => (
              <span key={p} style={{ flexGrow: resumo.contagem[p], background: corDaPosicao(p) }} />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-fg-3">
            {posicoes.map((p) => (
              <li key={p} className="flex items-center gap-1.5">
                <span className="dot" style={{ background: corDaPosicao(p), outline: p === "ausente" || p === "sem-registro" ? "1px solid var(--color-line-3)" : undefined }} />
                {POSICAO_LABEL[p]} <span className="tn font-medium text-fg">{formatNumber(resumo.contagem[p] ?? 0)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-fg-4">
        "Com o partido" usa a orientação da liderança quando existe; sem ela, compara com o voto da maioria da bancada.
        {casa === "camara" && " \"Sem registro\" pode indicar ausência ou que ainda não exercia o mandato."}
      </p>

      {lendo && (
        <div className="mt-3" role="status" aria-live="polite">
          <div className="h-1 overflow-hidden rounded-full bg-panel-3">
            <span className="block h-full bg-fg-3 transition-[width]" style={{ width: `${(carregadas / Math.max(1, total)) * 100}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-fg-4">Lendo votações: {formatNumber(carregadas)} de {formatNumber(total)}</p>
        </div>
      )}
    </section>
  );
}
