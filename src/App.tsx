import { useCallback, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ParlamentarDetail } from "@/components/detail/ParlamentarDetail";
import { HudHeader } from "@/components/hud/HudHeader";
import { SearchDialog } from "@/components/hud/SearchDialog";
import { useSearchHotkey } from "@/hooks/useSearchHotkey";
import { useRoute } from "@/hooks/useUi";
import type { Parlamentar } from "@/lib/types";
import { AgendaView } from "@/views/agenda/AgendaView";
import { CasaView } from "@/views/casa/CasaView";
import { InspecaoView } from "@/views/inspecao/InspecaoView";
import { ListaView } from "@/views/lista/ListaView";
import { VotacoesView } from "@/views/votacoes/VotacoesView";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000) + Math.floor(Math.random() * 600),
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
});

function Hud() {
  const route = useRoute();
  const [busca, setBusca] = useState(false);
  const [membro, setMembro] = useState<Parlamentar | null>(null);
  const abrirBusca = useCallback(() => setBusca(true), []);
  useSearchHotkey(abrirBusca);

  return (
    <div className="hud">
      <HudHeader view={route.view} onSearch={abrirBusca} />
      {route.view === "votacoes" && <VotacoesView votacaoId={route.param} onSelectMember={setMembro} />}
      {route.view === "inspecionar" && <InspecaoView votacaoId={route.param} onSelectMember={setMembro} />}
      {route.view === "lista" && <ListaView />}
      {route.view === "camara" && <CasaView key="camara" casa="camara" onSelectMember={setMembro} />}
      {route.view === "senado" && <CasaView key="senado" casa="senado" onSelectMember={setMembro} />}
      {route.view === "agenda" && <AgendaView />}
      <SearchDialog open={busca} onOpenChange={setBusca} onSelectMember={setMembro} />
      <ParlamentarDetail parlamentar={membro} open={!!membro} onOpenChange={(o) => !o && setMembro(null)} />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <Hud />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
