import { useCallback, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HudHeader } from "@/components/hud/HudHeader";
import { SearchDialog } from "@/components/hud/SearchDialog";
import { useRestauraRolagem } from "@/hooks/useRestauraRolagem";
import { useSearchHotkey } from "@/hooks/useSearchHotkey";
import { useRoute, type View } from "@/hooks/useUi";
import { AgendaView } from "@/views/agenda/AgendaView";
import { CasaView } from "@/views/casa/CasaView";
import { InspecaoView } from "@/views/inspecao/InspecaoView";
import { ListaView } from "@/views/lista/ListaView";
import { ParlamentarView } from "@/views/parlamentar/ParlamentarView";
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

/** Which header tab a route belongs to. */
function secaoDaRota(view: View, param?: string): View {
  if (view === "inspecionar") return "votacoes";
  if (view === "parlamentar") return param?.startsWith("senado-") ? "senado" : "camara";
  return view;
}

function Hud() {
  const route = useRoute();
  const [busca, setBusca] = useState(false);
  const abrirBusca = useCallback(() => setBusca(true), []);
  useSearchHotkey(abrirBusca);
  useRestauraRolagem(`${route.view}/${route.param ?? ""}`);

  return (
    <div className="hud">
      <HudHeader view={secaoDaRota(route.view, route.param)} onSearch={abrirBusca} />
      {route.view === "votacoes" && <VotacoesView key={route.param ?? "recente"} votacaoId={route.param} />}
      {route.view === "inspecionar" && <InspecaoView key={route.param} votacaoId={route.param} />}
      {route.view === "parlamentar" && route.param && <ParlamentarView key={route.param} id={route.param} />}
      {route.view === "lista" && <ListaView />}
      {route.view === "camara" && <CasaView key="camara" casa="camara" />}
      {route.view === "senado" && <CasaView key="senado" casa="senado" />}
      {route.view === "agenda" && <AgendaView />}
      <SearchDialog open={busca} onOpenChange={setBusca} />
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
