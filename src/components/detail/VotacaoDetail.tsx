import { ExternalLink, Gavel } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AprovacaoBadge,
  EmptyState,
  HouseTag,
  MemberAvatar,
  PartyTag,
} from "@/components/shared";
import { useVotacaoVotos } from "@/hooks/useCamara";
import type { Votacao } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

const VOTE_ORDER = ["Sim", "Não", "Abstenção", "Obstrução"];
const VOTE_COLOR: Record<string, string> = {
  Sim: "var(--color-green)",
  "Não": "var(--color-red)",
  "Abstenção": "var(--color-fg-4)",
  "Obstrução": "var(--color-yellow)",
};

export function VotacaoDetail({
  votacao,
  open,
  onOpenChange,
}: {
  votacao: Votacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const rawId = votacao?.id.replace(/^camara-/, "");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(760px,100vw)]">
        {votacao && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">
                  <Gavel className="h-3 w-3" />
                  {votacao.orgao}
                </span>
                <HouseTag casa={votacao.casa} />
                {votacao.proposicao && (
                  <span className="tn text-[12px] font-medium text-fg-2">
                    {votacao.proposicao}
                  </span>
                )}
                <AprovacaoBadge aprovacao={votacao.aprovacao} className="ml-auto" />
              </div>
              <SheetTitle className="sr">Detalhe da votação</SheetTitle>
              <p className="mt-2 text-[12.5px] leading-relaxed text-fg-3">
                {votacao.descricao}
              </p>
              <p className="mt-1.5 text-[11px] text-fg-5">
                {formatDateTime(votacao.dataHora ?? votacao.data)}
              </p>
            </SheetHeader>

            <SheetBody>
              {votacao.placar && <Placar votacao={votacao} />}
              {votacao.casa === "camara" && rawId ? (
                <Votos id={rawId} />
              ) : votacao.ementa ? (
                <div className="surface mt-2 p-4">
                  <p className="label mb-1.5">Matéria</p>
                  <p className="text-[12px] leading-relaxed text-fg-2">
                    {votacao.ementa}
                  </p>
                </div>
              ) : null}
              {votacao.url && (
                <a
                  href={votacao.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-accent hover:text-accent-2"
                >
                  Ver detalhes oficiais <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Placar({ votacao }: { votacao: Votacao }) {
  const p = votacao.placar!;
  const total = p.total || p.sim + p.nao + p.abstencao || 1;
  const seg = (v: number) => `${(v / total) * 100}%`;
  return (
    <div className="surface mb-4 p-4">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-panel-3">
        <span style={{ width: seg(p.sim), background: "var(--color-green)" }} />
        <span style={{ width: seg(p.nao), background: "var(--color-red)" }} />
        <span style={{ width: seg(p.abstencao), background: "var(--color-fg-4)" }} />
      </div>
      <div className="mt-2 flex items-center gap-4 text-[12px]">
        <span className="tn text-green">Sim {p.sim}</span>
        <span className="tn text-red">Não {p.nao}</span>
        <span className="tn text-fg-4">Abst. {p.abstencao}</span>
        <span className="tn ml-auto text-fg-5">Total {p.total}</span>
      </div>
    </div>
  );
}

function Votos({ id }: { id: string }) {
  const { data, isLoading } = useVotacaoVotos(id);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="Votos nominais indisponíveis"
        description="A Câmara não publicou a lista individual de votos desta votação."
        icon={Gavel}
      />
    );
  }

  const grupos = new Map<string, typeof data>();
  for (const v of data) {
    const list = grupos.get(v.voto) ?? [];
    list.push(v);
    grupos.set(v.voto, list);
  }
  const ordered = [...grupos.entries()].sort((a, b) => {
    const ia = VOTE_ORDER.indexOf(a[0]);
    const ib = VOTE_ORDER.indexOf(b[0]);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div className="space-y-5">
      {ordered.map(([voto, list]) => (
        <div key={voto}>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: VOTE_COLOR[voto] ?? "var(--color-blue)" }}
            />
            <span className="text-[12px] font-medium text-fg-2">{voto}</span>
            <span className="tn text-[11px] text-fg-5">{list.length}</span>
          </div>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {list.map((v) => (
              <li key={v.parlamentarId} className="flex items-center gap-2.5 rounded-lg bg-panel-2/50 px-2.5 py-1.5">
                <MemberAvatar
                  name={v.nome}
                  photo={v.foto}
                  party={v.partido}
                  size={28}
                />
                <span className="min-w-0 flex-1 truncate text-[12px] text-fg-2">
                  {v.nome}
                </span>
                <PartyTag sigla={v.partido} short />
                <span className="text-[10.5px] text-fg-5">{v.uf}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
