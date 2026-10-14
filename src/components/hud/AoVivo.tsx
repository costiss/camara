import { Check, ExternalLink, Minus, X } from "lucide-react";
import type { ItemAoVivo, StatusTone } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOM: Record<StatusTone, string> = {
  success: "text-green",
  danger: "text-red",
  warning: "text-yellow",
  info: "text-blue",
  accent: "text-fg",
  neutral: "text-fg-3",
};

/**
 * The red "ao vivo" stamp that marks an item as part of a session in progress.
 * The pulse is decorative; the word carries the meaning.
 */
export function SeloAoVivo({ className }: { className?: string }) {
  return (
    <span className={cn("ao-vivo-selo", className)}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red live-dot" aria-hidden="true" />
      ao vivo
    </span>
  );
}

/**
 * Where a live order-paper item stands: the announced verdict when decided,
 * "em apreciação" for the one on the floor, the stage for the rest. Always an
 * icon or a word, never colour alone.
 */
export function SituacaoAoVivo({ item, className }: { item: ItemAoVivo; className?: string }) {
  if (item.estado === "decidida") {
    const Icone = item.tone === "success" ? Check : item.tone === "danger" ? X : Minus;
    return (
      <span className={cn("inline-flex items-center gap-1 font-medium", TOM[item.tone ?? "neutral"], className)}>
        <Icone className="h-[1.1em] w-[1.1em] shrink-0" strokeWidth={2.5} aria-hidden="true" />
        {item.rotulo}
      </span>
    );
  }
  return (
    <span className={cn(item.estado === "atual" ? "font-medium text-accent" : "text-fg-4", className)}>
      {item.rotulo}
    </span>
  );
}

/** `PL 1234/2026 · Discussão`: the code, plus the item's slotted topic when there is one. */
export function CodigoAoVivo({ item, className }: { item: ItemAoVivo; className?: string }) {
  return (
    <span className={className}>
      <span className="tn">{item.sigla}</span>
      {item.qualificador && <span> · {item.qualificador}</span>}
    </span>
  );
}

/** A live item opens its official page in a new tab; this says so. */
export function IconeExterno({ className }: { className?: string }) {
  return <ExternalLink className={cn("h-3 w-3 shrink-0 text-fg-5", className)} aria-hidden="true" />;
}
