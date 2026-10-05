import { CodigoProposta, Veredito } from "@/components/hud/proposta";
import { votacaoHref } from "@/hooks/useUi";
import { lerVotacao, type Leitura } from "@/lib/linguagem";
import type { Deliberacao } from "@/lib/deliberacoes";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const CASA: Record<string, string> = { camara: "Câmara", senado: "Senado" };

function Placar({ d }: { d: Deliberacao }) {
  const p = d.principal.placar;
  if (d.principal.secreta) return <span className="text-fg-4">secreta</span>;
  if (!p || p.total === 0) return <span className="text-fg-5">simbólica</span>;
  return <span className="tn">{p.sim} a {p.nao}</span>;
}

function leituraDe(d: Deliberacao) {
  return lerVotacao({ ...d.principal, ementa: d.ementa ?? d.principal.ementa, proposicao: d.proposicao ?? d.principal.proposicao });
}

function Meta({ leitura, className }: { leitura: Leitura; className?: string }) {
  return (
    <span className={className}>
      <CodigoProposta leitura={leitura} />
      {leitura.codigo && " · "}
      {leitura.etapa.rotulo}
    </span>
  );
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
            <th scope="col">Assunto</th>
            <th scope="col" className="w-[124px]">Resultado</th>
            <th scope="col" className="w-[84px] text-right">Placar</th>
            <th scope="col" className="w-[72px] text-right">Votações</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((d) => {
            const leitura = leituraDe(d);
            return (
              <tr key={d.key}>
                <td className="tn text-fg-2">
                  {formatDate(d.data)}
                  <span className="block text-[11px] text-fg-5">{hora(d)}</span>
                </td>
                <td className="text-fg-3">{CASA[d.casa]}</td>
                <td>
                  <a href={votacaoHref(d.principal, { de: "lista" })} className="lista-link line-clamp-2 font-medium leading-snug text-fg no-underline">
                    {leitura.titulo}
                  </a>
                  <Meta leitura={leitura} className="mt-1 block text-[12px] text-fg-4" />
                </td>
                <td><Veredito votacao={d.principal} /></td>
                <td className="text-right"><Placar d={d} /></td>
                <td className="tn text-right text-fg-3">{d.votacoes.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ol className="flex flex-col md:hidden">
        {itens.map((d, i) => {
          const leitura = leituraDe(d);
          return (
            <li key={d.key} className={cn(i > 0 && "rowline")}>
              <a href={votacaoHref(d.principal, { de: "lista" })} className="block rounded-md px-1 py-3 no-underline hover:bg-fg/5">
                <span className="flex items-baseline gap-2 text-[12px]">
                  <span className="tn text-fg-2">{formatDate(d.data)}</span>
                  <span className="text-fg-4">{CASA[d.casa]}</span>
                  <span className="ml-auto"><Veredito votacao={d.principal} /></span>
                </span>
                <span className="mt-1 line-clamp-3 text-[14px] font-medium leading-snug text-fg">{leitura.titulo}</span>
                <span className="mt-1 flex items-baseline gap-2 text-[12px] text-fg-4">
                  <Meta leitura={leitura} className="min-w-0 truncate" />
                  <span className="ml-auto shrink-0 text-fg-3"><Placar d={d} /></span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </>
  );
}
