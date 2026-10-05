import { useMemo } from "react";
import { ArrowLeft, List } from "lucide-react";
import { DeliberacaoFeed } from "@/components/hud/DeliberacaoFeed";
import { HudGrid } from "@/components/hud/HudGrid";
import { VotesDock } from "@/components/hud/VotesDock";
import { ErrorState } from "@/components/shared";
import { HeroSkeleton, PartyBreakdownSkeleton, StageSkeleton } from "@/components/hud/skeletons";
import { useDeliberacoes } from "@/hooks/useDeliberacoes";
import { useVotacaoCompleta } from "@/hooks/useVotacaoCompleta";
import { routeHref, router, useQueryParam, useRoute } from "@/hooks/useUi";
import type { Parlamentar } from "@/lib/types";
import { DeliberacaoSteps } from "./DeliberacaoSteps";
import { PartyBreakdown } from "./PartyBreakdown";
import { RollCallSheet } from "./RollCallSheet";
import { VoteHero } from "./VoteHero";
import { VoteStage } from "./VoteStage";

function VoltarLista({ veioDaLista }: { veioDaLista: boolean }) {
  if (veioDaLista) {
    return (
      <button type="button" className="inline-flex items-center gap-1 self-start text-[12px] text-fg-3 hover:text-fg" onClick={() => window.history.back()}>
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar à lista
      </button>
    );
  }
  return (
    <a href={routeHref("lista")} className="inline-flex items-center gap-1 self-start text-[12px] text-fg-3 no-underline hover:text-fg">
      <List className="h-3.5 w-3.5" /> Escolher outra votação
    </a>
  );
}

export function VotacoesView({ votacaoId, onSelectMember }: {
  votacaoId?: string;
  onSelectMember: (p: Parlamentar) => void;
}) {
  const feed = useDeliberacoes();
  const padrao = useMemo(
    () => (feed.deliberacoes.find((d) => d.principal.nominal) ?? feed.deliberacoes[0])?.principal.id,
    [feed.deliberacoes]
  );
  const id = votacaoId ?? padrao;
  const { query } = useRoute();
  const completa = useVotacaoCompleta(id, query.get("data") ?? undefined);
  const deliberacao = useMemo(
    () => feed.deliberacoes.find((d) => d.votacoes.some((v) => v.id === id)),
    [feed.deliberacoes, id]
  );

  const [uf, selectUf] = useQueryParam("uf");
  const [nominal, setNominal] = useQueryParam("nominal", "1");
  const soNominais = nominal !== "0";
  const activeUf = uf || null;
  const rollCall = query.get("chamada") === "1";
  const setRollCall = (aberta: boolean) =>
    router.patch(aberta ? { chamada: "1" } : { chamada: null, voto: null, nome: null });

  const { votacao, assentos, tally, orientacoes } = completa;
  const carregando = (!id && feed.isLoading) || (!!id && completa.isLoading);

  const voltar = <VoltarLista veioDaLista={query.get("de") === "lista"} />;
  const left = carregando ? (
    <>
      {voltar}
      <HeroSkeleton />
    </>
  ) : completa.isError || (!votacao && id) ? (
    <div className="card">
      <ErrorState compact title="Não foi possível carregar esta votação" onRetry={completa.refetch} />
    </div>
  ) : votacao ? (
    <>
      {voltar}
      <VoteHero votacao={votacao} tally={tally} onOpenRollCall={() => setRollCall(true)} />
      {!feed.isLoading && deliberacao && id && <DeliberacaoSteps deliberacao={deliberacao} currentId={id} />}
    </>
  ) : (
    <div className="card">
      <ErrorState compact title="Nenhuma votação recente" onRetry={feed.refetch} />
    </div>
  );

  const center = carregando || !votacao ? (
    <StageSkeleton />
  ) : (
    <VoteStage votacao={votacao} assentos={assentos} tally={tally} activeUf={activeUf} onSelectUf={selectUf} />
  );

  const right = (
    <>
      {carregando ? (
        <PartyBreakdownSkeleton />
      ) : (
        votacao && (
          <PartyBreakdown votacao={votacao} assentos={assentos} orientacoes={orientacoes} activeUf={activeUf} onClearUf={() => selectUf(null)} />
        )
      )}
      <DeliberacaoFeed
        deliberacoes={feed.deliberacoes}
        currentId={id}
        isLoading={feed.isLoading}
        isError={feed.isError}
        onRetry={feed.refetch}
        soNominais={soNominais}
        onSoNominais={(ativo) => setNominal(ativo ? "1" : "0")}
      />
    </>
  );

  return (
    <>
      <HudGrid
        left={left}
        center={center}
        right={right}
        dock={<VotesDock deliberacoes={feed.deliberacoes} isLoading={feed.isLoading} currentDate={votacao?.data.slice(0, 10)} />}
      />
      {votacao && (
        <RollCallSheet
          open={rollCall}
          onOpenChange={setRollCall}
          votacao={votacao}
          assentos={assentos}
          onSelect={(p) => {
            setRollCall(false);
            onSelectMember(p);
          }}
        />
      )}
    </>
  );
}
