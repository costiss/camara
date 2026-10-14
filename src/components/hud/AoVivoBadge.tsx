import { useSessaoAoVivo } from "@/hooks/useSenado";
import { routeHref } from "@/hooks/useUi";
import { cn } from "@/lib/utils";

/**
 * Header marker shown while the Senate floor is in session. It refreshes on a
 * timer (see `useSessaoAoVivo`) and links to the agenda, where the live order
 * paper is shown. Renders nothing when no session is running.
 */
export function AoVivoBadge({ className }: { className?: string }) {
  const { sessao } = useSessaoAoVivo();
  if (!sessao) return null;
  const rotulo = sessao.numero ? `${sessao.numero}ª sessão` : "em sessão";
  return (
    <a
      href={routeHref("agenda")}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-red/30 bg-red/10 px-2.5 py-1 text-[12px] font-medium text-red no-underline transition-colors hover:border-red/50",
        className
      )}
      title="Plenário do Senado em sessão — ver a pauta ao vivo"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-red live-dot" aria-hidden="true" />
      <span>Ao vivo</span>
      <span className="hidden text-red/80 sm:inline">· Senado · {rotulo}</span>
    </a>
  );
}
