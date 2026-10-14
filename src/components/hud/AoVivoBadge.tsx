import { useSessaoCamara } from "@/hooks/useCamara";
import { useSessaoSenado } from "@/hooks/useSenado";
import { routeHref } from "@/hooks/useUi";
import { cn } from "@/lib/utils";

/**
 * Header marker shown while either floor is in session. It refreshes on a timer
 * (see the `useSessao*` hooks) and links to the agenda, where the live order
 * papers are shown. Renders nothing when no floor is in session.
 */
export function AoVivoBadge({ className }: { className?: string }) {
  const camara = useSessaoCamara();
  const senado = useSessaoSenado();
  const casas = [camara.sessao && "Câmara", senado.sessao && "Senado"].filter(Boolean) as string[];
  if (casas.length === 0) return null;

  return (
    <a
      href={routeHref("agenda")}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-red/30 bg-red/10 px-2.5 py-1 text-[12px] font-medium text-red no-underline transition-colors hover:border-red/50",
        className
      )}
      title="Plenário em sessão — ver a pauta ao vivo"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-red live-dot" aria-hidden="true" />
      <span>Ao vivo</span>
      <span className="hidden text-red/80 sm:inline">· {casas.join(" · ")}</span>
    </a>
  );
}
