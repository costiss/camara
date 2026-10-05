import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, Radio } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { RefreshButton } from "@/components/shared";
import { SidebarContent } from "./Sidebar";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function TopBar({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const clock = useClock();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries();
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <IconButton className="lg:hidden" aria-label="Abrir menu">
              <Menu className="h-4.5 w-4.5" />
            </IconButton>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetTitle className="sr">Menu de navegação</SheetTitle>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-serif text-[17px] font-medium tracking-tight text-fg">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-[11px] text-fg-4">{subtitle}</p>
          )}
        </div>

        {children}

        <span className="hidden items-center gap-1.5 rounded-full border border-line bg-panel-2/60 px-2.5 py-1 text-[10.5px] text-fg-4 sm:inline-flex">
          <Radio className="h-3 w-3 text-green" />
          <span className="tn">
            {clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </span>

        <RefreshButton
          loading={refreshing}
          onClick={refresh}
          label="Atualizar"
          className="hidden sm:inline-flex"
        />
      </div>
    </header>
  );
}
