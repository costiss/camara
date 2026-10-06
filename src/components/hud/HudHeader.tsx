import { useEffect, useState } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Maximize, Minimize, RefreshCw, Search } from "lucide-react";
import { routeHref, type View } from "@/hooks/useUi";
import { cn } from "@/lib/utils";

const VIEWS: { id: View; label: string }[] = [
  { id: "votacoes", label: "Votações" },
  { id: "lista", label: "Lista" },
  { id: "camara", label: "Câmara" },
  { id: "senado", label: "Senado" },
  { id: "agenda", label: "Agenda" },
];

function Brand() {
  return (
    <a href={routeHref("votacoes")} className="flex items-baseline gap-2 no-underline">
      <span className="font-serif text-[22px] leading-none tracking-[-0.01em] text-fg">
        Congresso Aberto
      </span>
      <span className="text-[11px] text-fg-4">Câmara · Senado</span>
    </a>
  );
}

function ViewSwitch({ view, className }: { view: View; className?: string }) {
  return (
    <nav aria-label="Seções" className={cn("switch quiet-scroll overflow-x-auto", className)}>
      {VIEWS.map((v) => (
        <a key={v.id} href={routeHref(v.id)} aria-current={v.id === view ? "page" : undefined}>
          {v.label}
        </a>
      ))}
    </nav>
  );
}

function useUltimaAtualizacao(): { hora: string; atualizando: boolean } {
  const qc = useQueryClient();
  const fetching = useIsFetching();
  const latest = Math.max(0, ...qc.getQueryCache().getAll().map((q) => q.state.dataUpdatedAt));
  const d = latest ? new Date(latest) : null;
  const hora = d ? `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}` : "—";
  return { hora, atualizando: fetching > 0 };
}

function StatusLine() {
  const qc = useQueryClient();
  const { hora, atualizando } = useUltimaAtualizacao();
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-2 text-[12px] text-fg-2" role="status" aria-live="polite">
        <span className={cn("h-1.5 w-1.5 rounded-full bg-fg", atualizando && "live-dot")} />
        {atualizando ? "Atualizando…" : `Atualizado às ${hora}`}
        <span className="hidden text-fg-4 xl:inline">· dados abertos oficiais</span>
      </span>
      <button
        type="button"
        className="icon-btn"
        aria-label="Atualizar dados"
        disabled={atualizando}
        onClick={() => qc.invalidateQueries()}
      >
        <RefreshCw className={cn("h-4 w-4", atualizando && "animate-spin")} />
      </button>
    </div>
  );
}

function FullscreenButton() {
  const [full, setFull] = useState(false);
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  if (!document.fullscreenEnabled) return null;
  const toggle = () =>
    full ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  return (
    <button type="button" className="btn hidden lg:inline-flex" onClick={toggle}>
      {full ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      {full ? "Sair da tela cheia" : "Tela cheia"}
    </button>
  );
}

export function HudHeader({ view, onSearch }: { view: View; onSearch: () => void }) {
  return (
    <header className="flex flex-col gap-3 lg:h-11 lg:flex-row lg:items-center lg:gap-6">
      <div className="flex items-center justify-between gap-3">
        <Brand />
        <button type="button" className="icon-btn lg:hidden" aria-label="Buscar" onClick={onSearch}>
          <Search className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center justify-between lg:hidden">
        <StatusLine />
      </div>
      <ViewSwitch view={view} className="w-full lg:w-auto [&>a]:flex-1 [&>a]:px-1.5 max-[380px]:[&>a]:px-1 max-[380px]:[&>a]:text-[12px] sm:[&>a]:px-2.5 lg:[&>a]:flex-none lg:[&>a]:px-3.5" />
      <button
        type="button"
        onClick={onSearch}
        className="hidden h-9 items-center gap-2 rounded-full border border-line px-3 text-fg-3 transition-colors hover:border-line-2 hover:text-fg lg:inline-flex"
      >
        <Search className="h-4 w-4" />
        <span className="font-medium">Buscar</span>
        <span className="kbd">Ctrl K</span>
      </button>
      <div className="ml-auto hidden items-center gap-3 lg:flex">
        <StatusLine />
        <FullscreenButton />
      </div>
    </header>
  );
}
