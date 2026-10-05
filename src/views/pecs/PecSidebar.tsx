import { usePecCounts } from "@/hooks/useCamara";
import { routeHref } from "@/hooks/useUi";
import { formatDate, formatNumber } from "@/lib/format";
import type { Proposicao } from "@/lib/types";
import { LoadingRows } from "@/components/shared";
import { cn } from "@/lib/utils";

export function PecHero({ ano, anos, onAno, totalCamara, totalSenado, votadas, loadingVotadas }: {
  ano: number;
  anos: number[];
  onAno: (a: number) => void;
  totalCamara: number | null;
  totalSenado: number | null;
  votadas: Proposicao[];
  loadingVotadas: boolean;
}) {
  const segundo = votadas.filter((p) => /aprovada em 2º/i.test(p.status ?? "")).length;
  const primeiro = votadas.filter((p) => /aprovada em 1º/i.test(p.status ?? "")).length;
  const rejeitadas = votadas.filter((p) => /rejeitada/i.test(p.status ?? "")).length;
  return (
    <section className="card enter" aria-labelledby="pec-title">
      <span className="label">Propostas de Emenda à Constituição</span>
      <div className="mt-3">
        <div className="tabs-mini" role="group" aria-label="Ano">
          {anos.map((a) => (
            <button key={a} type="button" aria-pressed={a === ano} onClick={() => onAno(a)}>{a}</button>
          ))}
        </div>
      </div>
      <h1 id="pec-title" className="manchete mt-4">
        {loadingVotadas ? "Apurando votações…" : (
          <><span className="text-green">{votadas.length} {votadas.length === 1 ? "PEC votada" : "PECs votadas"}</span> no Plenário da Câmara em {ano}</>
        )}
      </h1>
      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-[14px] font-medium text-fg-2">Câmara</p>
          <p className="fig mt-2">{formatNumber(totalCamara)}</p>
          <p className="micro mt-1">apresentadas</p>
        </div>
        <div className="text-right">
          <p className="text-[14px] font-medium text-fg-2">Senado</p>
          <p className="fig mt-2">{formatNumber(totalSenado)}</p>
          <p className="micro mt-1">apresentadas</p>
        </div>
      </div>
      <div className="mt-4 border-t border-line pt-3 text-[13px]">
        <div className="flex justify-between py-1"><span className="label">Aprovadas em 2º turno</span><span className="tn">{segundo}</span></div>
        <div className="flex justify-between py-1"><span className="label">Aprovadas só em 1º turno</span><span className="tn">{primeiro}</span></div>
        <div className="flex justify-between py-1"><span className="label">Rejeitadas</span><span className="tn">{rejeitadas}</span></div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-fg-4">
        Conta só votações de mérito (1º e 2º turno). Requerimentos e quebras de interstício ficam de fora.
      </p>
    </section>
  );
}

export function PecsPorAno({ anos }: { anos: number[] }) {
  const { data, isLoading } = usePecCounts(anos);
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <section className="card" aria-label="PECs apresentadas por ano na Câmara">
      <div className="card-head">
        <h2>Apresentadas por ano</h2>
        <span className="meta">Câmara</span>
      </div>
      {isLoading ? <LoadingRows rows={1} height={120} /> : (
        <div className="flex h-[120px] items-end gap-1.5">
          {[...data].reverse().map((d) => (
            <div key={d.ano} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.ano}: ${d.total}`}>
              <span className="tn text-[11px] text-fg-3">{d.total}</span>
              <span className="w-full rounded-t-[3px] bg-fg-3" style={{ height: `${(d.total / max) * 80}%` }} />
              <span className="tn text-[11px] text-fg-4">{String(d.ano).slice(2)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function PecsVotadasCard({ ano, votadas, isLoading }: { ano: number; votadas: Proposicao[]; isLoading: boolean }) {
  return (
    <section className="card" aria-label={`PECs votadas em ${ano}`}>
      <div className="card-head">
        <h2>Votadas em {ano}</h2>
        <span className="meta">Plenário da Câmara</span>
      </div>
      {isLoading ? <LoadingRows rows={4} height={44} /> : votadas.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-fg-4">Nenhuma PEC teve votação de mérito em {ano}.</p>
      ) : (
        <ol className="flex flex-col">
          {votadas.map((p, i) => (
            <li key={p.id} className={cn(i > 0 && "rowline")}>
              <a href={p.votacaoId ? routeHref("votacoes", p.votacaoId) : p.url} className="block rounded-md px-1 py-2 no-underline hover:bg-fg/5">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-medium">{p.sigla}</span>
                  <span className="tn text-[12px] text-fg-4">{formatDate(p.votacaoData)}</span>
                </span>
                <span className={cn("block text-[12px]", /rejeit/i.test(p.status ?? "") ? "text-red" : "text-green")}>{p.status}</span>
                <span className="mt-0.5 line-clamp-2 text-[12px] text-fg-3">{p.ementa}</span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
