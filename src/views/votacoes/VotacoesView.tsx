import { useMemo } from "react";
import { DeliberacaoFeed } from "@/components/hud/DeliberacaoFeed";
import { HudGrid } from "@/components/hud/HudGrid";
import { VotesDock } from "@/components/hud/VotesDock";
import { ErrorState } from "@/components/shared";
import { HeroSkeleton, MapaCantoSkeleton, PartyBreakdownSkeleton } from "@/components/hud/skeletons";
import { useDeliberacoes } from "@/hooks/useDeliberacoes";
import { useVotacaoCompleta } from "@/hooks/useVotacaoCompleta";
import { router, useQueryParam, useRoute } from "@/hooks/useUi";
import { DeliberacaoSteps } from "./DeliberacaoSteps";
import { ParaLeigos } from "./ParaLeigos";
import { PartyBreakdown } from "./PartyBreakdown";
import { RollCallSheet } from "./RollCallSheet";
import { VoteHero } from "./VoteHero";
import { MapaCanto } from "./MapaCanto";
import { NavegacaoVotacao } from "./NavegacaoVotacao";

export function VotacoesView({ votacaoId }: { votacaoId?: string }) {
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

  const navegaveis = useMemo(() => {
    const nominais = feed.deliberacoes.filter((d) => d.votacoes.some((v) => v.nominal));
    const filtradas = soNominais ? nominais : feed.deliberacoes;
    return filtradas.some((d) => d.votacoes.some((v) => v.id === id)) ? filtradas : feed.deliberacoes;
  }, [feed.deliberacoes, soNominais, id]);

  const erro = !carregando && (completa.isError || (!votacao && !!id));
  const vazio = !carregando && !id;

  const center = (
    <div className="flex flex-col gap-3">
      <NavegacaoVotacao deliberacoes={navegaveis} currentId={id} />
      {carregando ? (
        <>
          <HeroSkeleton />
          <PartyBreakdownSkeleton />
        </>
      ) : erro || vazio || !votacao ? (
        <div className="card">
          {vazio ? (
            <ErrorState compact title="Nenhuma votação recente" onRetry={feed.refetch} />
          ) : (
            <ErrorState compact title="Não foi possível carregar esta votação" onRetry={completa.refetch} />
          )}
        </div>
      ) : (
        <>
          <VoteHero votacao={votacao} tally={tally} onOpenRollCall={() => setRollCall(true)} />
          <ParaLeigos votacao={votacao} />
          <PartyBreakdown votacao={votacao} assentos={assentos} orientacoes={orientacoes} activeUf={activeUf} onClearUf={() => selectUf(null)} />
        </>
      )}
    </div>
  );

  const left = (
    <>
      {!carregando && !feed.isLoading && deliberacao && id && <DeliberacaoSteps deliberacao={deliberacao} currentId={id} />}
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

  const right = carregando || !votacao ? (
    <MapaCantoSkeleton />
  ) : (
    <MapaCanto votacao={votacao} assentos={assentos} tally={tally} activeUf={activeUf} onSelectUf={selectUf} />
  );

  return (
    <>
      <HudGrid
        centroPrimeiro
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
        />
      )}
    </>
  );
}
