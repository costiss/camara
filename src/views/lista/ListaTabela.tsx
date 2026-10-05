import { votacaoHref } from "@/hooks/useUi";
import type { Deliberacao } from "@/lib/deliberacoes";
import { formatDate, formatTime } from "@/lib/format";
import type { StatusTone } from "@/lib/types";
import { cn } from "@/lib/utils";
import { resultadoVotacao } from "@/lib/votos";

const TONE: Record<StatusTone, string> = {
  success: "text-green",
  danger: "text-red",
  warning: "text-yellow",
  info: "text-blue",
  accent: "text-fg",
  neutral: "text-fg-3",
};
const CASA: Record<string, string> = { camara: "Câmara", senado: "Senado" };

function Placar({ d }: { d: Deliberacao }) {
  const p = d.principal.placar;
  if (d.principal.secreta) return <span className="text-fg-4">secreta</span>;
  if (!p || p.total === 0) return <span className="text-fg-5">simbólica</span>;
  return <span className="tn">{p.sim} a {p.nao}</span>;
}

function Resultado({ d }: { d: Deliberacao }) {
  const r = resultadoVotacao(d.principal);
  return <span className={TONE[r.tone]}>{r.label}</span>;
}

function hora(d: Deliberacao): string {
  return d.dataHora.length > 10 ? formatTime(d.dataHora) : "";
}

export function ListaTabela({ itens }: { itens: Deliberacao[] }) {
  return (
    <>
      <table className="lista-tabela hidden w-full md:table">
        <thead>
          <tr>
            <th scope="col" className="w-[92px]">Data</th>
            <th scope="col" className="w-[72px]">Casa</th>
            <th scope="col">Proposição</th>
            <th scope="col" className="w-[120px]">Resultado</th>
            <th scope="col" className="w-[84px] text-right">Placar</th>
            <th scope="col" className="w-[72px] text-right">Votações</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((d) => (
            <tr key={d.key}>
              <td className="tn text-fg-2">
                {formatDate(d.data)}
                <span className="block text-[11px] text-fg-5">{hora(d)}</span>
              </td>
              <td className="text-fg-3">{CASA[d.casa]}</td>
              <td>
                <a href={votacaoHref(d.principal, { de: "lista" })} className="lista-link font-medium text-fg no-underline">
                  {d.proposicao ?? "Votação em plenário"}
                </a>
                <span className="mt-0.5 line-clamp-2 text-[12px] text-fg-3">{d.ementa ?? d.principal.descricao}</span>
              </td>
              <td><Resultado d={d} /></td>
              <td className="text-right"><Placar d={d} /></td>
              <td className="tn text-right text-fg-3">{d.votacoes.length}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ol className="flex flex-col md:hidden">
        {itens.map((d, i) => (
          <li key={d.key} className={cn(i > 0 && "rowline")}>
            <a href={votacaoHref(d.principal, { de: "lista" })} className="block rounded-md px-1 py-3 no-underline hover:bg-fg/5">
              <span className="flex items-baseline gap-2 text-[12px]">
                <span className="tn text-fg-2">{formatDate(d.data)}</span>
                <span className="text-fg-4">{CASA[d.casa]}</span>
                <span className="ml-auto"><Resultado d={d} /></span>
              </span>
              <span className="mt-1 flex items-baseline gap-2">
                <span className="text-[14px] font-medium text-fg">{d.proposicao ?? "Votação em plenário"}</span>
                <span className="ml-auto text-[12px] text-fg-3"><Placar d={d} /></span>
              </span>
              <span className="mt-0.5 line-clamp-2 text-[12px] text-fg-3">{d.ementa ?? d.principal.descricao}</span>
            </a>
          </li>
        ))}
      </ol>
    </>
  );
}
