import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Dashboard } from "@/pages/Dashboard";
import { Pecs } from "@/pages/Pecs";
import { Deputados } from "@/pages/Deputados";
import { Senadores } from "@/pages/Senadores";
import { Metricas } from "@/pages/Metricas";
import { Atividades } from "@/pages/Atividades";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const pageConfig: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Visão Geral",
    subtitle: "Resumo do Congresso Nacional",
  },
  pecs: {
    title: "PECs",
    subtitle: "Propostas de Emenda à Constitución",
  },
  deputados: {
    title: "Deputados",
    subtitle: "Câmara dos Deputados",
  },
  senadores: {
    title: "Senadores",
    subtitle: "Senado Federal",
  },
  metricas: {
    title: "Métricas",
    subtitle: "Análise distributiva e indicadores",
  },
  atividades: {
    title: "Atividades",
    subtitle: "Movimentações legislativas",
  },
};

function App() {
  const [page, setPage] = useState("dashboard");
  const config = pageConfig[page] || pageConfig.dashboard;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen overflow-hidden bg-bg">
        <Sidebar active={page} onNavigate={setPage} />
        <main className="ml-56 flex-1 overflow-y-auto">
          <Header title={config.title} subtitle={config.subtitle} />
          {page === "dashboard" && <Dashboard />}
          {page === "pecs" && <Pecs />}
          {page === "deputados" && <Deputados />}
          {page === "senadores" && <Senadores />}
          {page === "metricas" && <Metricas />}
          {page === "atividades" && <Atividades />}
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
