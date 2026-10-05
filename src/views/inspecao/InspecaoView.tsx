import { useEffect, useMemo } from "react";
import { BarRowsSkeleton, HeroSkeleton } from "@/components/hud/skeletons";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeliberacoes } from "@/hooks/useDeliberacoes";
import { router, useRoute } from "@/hooks/useUi";
import { useVotacaoCompleta } from "@/hooks/useVotacaoCompleta";
import { InspecaoVotacao } from "@/lib/inspecao";
import type { OrientacaoBancada, Parlamentar } from "@/lib/types";
import { CATEGORIA_COR } from "@/lib/votos";
import { DeliberacaoSteps } from "../votacoes/DeliberacaoSteps";
import { GruposSecao } from "./GruposSecao";
import { InspecaoResumo } from "./InspecaoResumo";
import { VotosSecao } from "./VotosSecao";

const LIDERANCA_ORDEM: Record<OrientacaoBancada["lideranca"], number> = { governo: 0, outro: 1, bloco: 2, partido: 3 };

function Orientacoes({ orientacoes }: { orientacoes: OrientacaoBancada[] }) {
  const lista = [...orientacoes].sort((a, b) => LIDERANCA_ORDEM[a.lideranca] - LIDERANCA_ORDEM[b.lideranca] || a.sigla.localeCompare(b.sigla));
  return (
    <section className="card" aria-labelledby="orient-title">
      <div className="card-head">
        <h2 id="orient-title">Orientação das lideranças</h2>
        <span className="meta">{lista.length} lideranças</span>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-x-4">
        {lista.map((o) => (
          <li key={`${o.lideranca}-${o.sigla}`} className="flex items-baseline justify-between gap-2 border-b border-line py-1.5 text-[12px]">
            <span className="truncate text-fg-2" title={o.sigla}>{o.sigla}</span>
            <span className="shrink-0 font-medium" style={{ color: o.categoria ? CATEGORIA_COR[o.categoria] : "var(--color-fg-3)" }}>{o.orientacao}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SecaoSkeleton({ titulo, linhas }: { titulo: string; linhas: number }) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>{titulo}</h2>
        <Skeleton className="h-7 w-32 rounded-full" />
      </div>
      <BarRowsSkeleton rows={linhas} label={`Carregando ${titulo.toLowerCase()}`} />
    </section>
  );
}

export function InspecaoView({ votacaoId, onSelectMember }: { votacaoId?: string; onSelectMember: (p: Parlamentar) => void }) {
  const { query } = useRoute();
  const completa = useVotacaoCompleta(votacaoId, query.get("data") ?? undefined);
  const feed = useDeliberacoes();
  const { votacao, assentos, tally, orientacoes } = completa;
  const inspecao = useMemo(() => new InspecaoVotacao(assentos, orientacoes), [assentos, orientacoes]);
  const deliberacao = useMemo(
    () => feed.deliberacoes.find((d) => d.votacoes.some((v) => v.id === votacaoId)),
    [feed.deliberacoes, votacaoId]
  );
  const pronto = !completa.isLoading && !!votacao;
  const secao = query.get("secao");
  const partido = query.get("partido");
  const uf = query.get("uf");

  useEffect(() => {
    if (!pronto || !secao) return;
    document.getElementById(`secao-${secao}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pronto, secao, partido, uf]);

  const focar = (patch: Record<string, string>) =>
    router.patch({ voto: null, nome: null, contra: null, partido: null, uf: null, ...patch, secao: "votos" });

  if (!votacaoId || completa.isError || (!completa.isLoading && !votacao)) {
    return (
      <div className="card">
        <ErrorState compact title="Não foi possível carregar esta votação" onRetry={completa.refetch} />
      </div>
    );
  }

  return (
    <div className="hud-grid hud-grid-2">
      <div className="hud-col">
        {pronto && votacao ? (
          <>
            <InspecaoResumo votacao={votacao} tally={tally} inspecao={inspecao} onVoto={(c) => router.patch({ voto: c, secao: "votos" })} />
            {deliberacao && <DeliberacaoSteps deliberacao={deliberacao} currentId={votacaoId} destino="inspecao" />}
          </>
        ) : (
          <HeroSkeleton />
        )}
      </div>
      <div className="hud-col">
        {!pronto || !votacao ? (
          <>
            <SecaoSkeleton titulo="Como votou cada partido" linhas={6} />
            <SecaoSkeleton titulo="Voto de cada parlamentar" linhas={10} />
          </>
        ) : assentos.length === 0 ? (
          <section className="card">
            <p className="text-[13px] font-medium">Sem votos individuais</p>
            <p className="mt-1 text-[12px] text-fg-3">
              {votacao.secreta
                ? "Votação secreta: o Senado divulga quem votou, mas não o voto de cada senador."
                : "Votação simbólica: o resultado foi proclamado pela Presidência, sem registro do voto de cada parlamentar."}
            </p>
          </section>
        ) : (
          <>
            {orientacoes.length > 0 && <Orientacoes orientacoes={orientacoes} />}
            <GruposSecao inspecao={inspecao} onPartido={(p) => focar({ partido: p })} onUf={(u) => focar({ uf: u })} />
            <VotosSecao votacao={votacao} inspecao={inspecao} onSelectMember={onSelectMember} />
          </>
        )}
      </div>
    </div>
  );
}
