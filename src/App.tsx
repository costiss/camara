import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import { useRoute } from "@/hooks/useUi";
import { Dashboard } from "@/pages/Dashboard";
import { Pecs } from "@/pages/Pecs";
import { Agenda } from "@/pages/Agenda";
import { Deputados } from "@/pages/Deputados";
import { Senadores } from "@/pages/Senadores";
import { Atividades } from "@/pages/Atividades";
import { Metricas } from "@/pages/Metricas";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
});

interface PageMeta {
  title: string;
  subtitle: string;
  render: () => React.ReactNode;
}

const PAGES: Record<string, PageMeta> = {
  dashboard: {
    title: "Visão geral",
    subtitle: "O Congresso Nacional em números, agora",
    render: () => <Dashboard />,
  },
  pecs: {
    title: "PECs",
    subtitle: "Propostas de Emenda à Constituição — Câmara e Senado",
    render: () => <Pecs />,
  },
  agenda: {
    title: "Agenda & votações",
    subtitle: "Próximas sessões, pautas e votações recentes",
    render: () => <Agenda />,
  },
  deputados: {
    title: "Deputados",
    subtitle: "Câmara dos Deputados — bancada em exercício",
    render: () => <Deputados />,
  },
  senadores: {
    title: "Senadores",
    subtitle: "Senado Federal — bancada em exercício",
    render: () => <Senadores />,
  },
  atividades: {
    title: "Atividades",
    subtitle: "Movimentações legislativas recentes das duas casas",
    render: () => <Atividades />,
  },
  metricas: {
    title: "Métricas",
    subtitle: "Distribuições, composição e séries históricas",
    render: () => <Metricas />,
  },
};

function App() {
  const route = useRoute();
  const page = PAGES[route] ?? PAGES.dashboard;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <AppShell title={page.title} subtitle={page.subtitle}>
          {page.render()}
        </AppShell>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
