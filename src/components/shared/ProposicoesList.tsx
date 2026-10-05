import { useProposicaoDetalhes } from "@/hooks/useCamara";
import type { Proposicao } from "@/lib/types";
import { ProposicaoRow } from "./cards";

/**
 * Renders proposition rows, lazily fetching the Câmara detail (which is
 * where `statusProposicao` lives) for any row that does not already have
 * a status.
 */
export function ProposicoesList({
  items,
  onOpen,
  enrichStatus = true,
  className,
}: {
  items: Proposicao[];
  onOpen?: (p: Proposicao) => void;
  enrichStatus?: boolean;
  className?: string;
}) {
  const missing = enrichStatus
    ? items.filter((p) => p.casa === "camara" && !p.status).map((p) => p.id)
    : [];
  const queries = useProposicaoDetalhes(missing);

  const statusById = new Map<string, string | undefined>();
  missing.forEach((id, i) => statusById.set(id, queries[i]?.data?.status));

  return (
    <div className={className}>
      {items.map((p) => (
        <ProposicaoRow
          key={p.id}
          p={{ ...p, status: p.status ?? statusById.get(p.id) }}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
