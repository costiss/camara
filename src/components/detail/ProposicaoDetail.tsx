import { ExternalLink, FileText, Gavel, Users } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AprovacaoBadge,
  EmptyState,
  HouseTag,
  StatusBadge,
} from "@/components/shared";
import {
  useAutores,
  useProposicaoVotacoes,
  useTramitacoes,
} from "@/hooks/useCamara";
import type { Proposicao } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/format";

export function ProposicaoDetail({
  proposicao,
  open,
  onOpenChange,
}: {
  proposicao: Proposicao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isCamara = proposicao?.casa === "camara";
  const camaraId = isCamara ? proposicao?.id : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(760px,100vw)]">
        {proposicao && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <span className="tn font-serif text-[20px] font-medium text-fg">
                  {proposicao.sigla}
                </span>
                <HouseTag casa={proposicao.casa} />
                <StatusBadge status={proposicao.status} maxLength={48} />
              </div>
              <SheetTitle className="sr">
                {proposicao.sigla}
              </SheetTitle>
              <p className="mt-2 text-[12.5px] leading-relaxed text-fg-3">
                {proposicao.ementa}
              </p>
              {proposicao.url && (
                <a
                  href={proposicao.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-accent hover:text-accent-2"
                >
                  Ficha oficial <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </SheetHeader>

            <SheetBody>
              {isCamara ? (
                <Tabs defaultValue="tramitacao">
                  <TabsList>
                    <TabsTrigger value="tramitacao">Tramitação</TabsTrigger>
                    <TabsTrigger value="autores">Autores</TabsTrigger>
                    <TabsTrigger value="votacoes">Votações</TabsTrigger>
                  </TabsList>
                  <TabsContent value="tramitacao">
                    <TramitacaoTimeline id={camaraId} />
                  </TabsContent>
                  <TabsContent value="autores">
                    <Autores id={camaraId} />
                  </TabsContent>
                  <TabsContent value="votacoes">
                    <Votacoes id={camaraId} />
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="space-y-3">
                  <div className="surface p-4">
                    <p className="label mb-2">Situação atual</p>
                    <StatusBadge status={proposicao.status} maxLength={120} />
                    {proposicao.situacaoData && (
                      <p className="mt-2 text-[11px] text-fg-5">
                        Atualizada em {formatDate(proposicao.situacaoData)}
                      </p>
                    )}
                  </div>
                  {proposicao.autor && (
                    <div className="surface p-4">
                      <p className="label mb-1.5">Autoria</p>
                      <p className="text-[12px] leading-relaxed text-fg-2">
                        {proposicao.autor}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TramitacaoTimeline({ id }: { id?: string }) {
  const { data, isLoading } = useTramitacoes(id);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data || data.length === 0) {
    return <EmptyState title="Sem tramitações registradas" icon={FileText} />;
  }
  return (
    <div className="timeline">
      {data.map((t, i) => (
        <div key={`${t.sequencia}-${t.data}`} className="timeline-item" data-current={i === 0}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium text-fg-2">
              {t.descricao || t.orgao}
            </span>
            {t.orgao && <span className="chip">{t.orgao}</span>}
          </div>
          {t.situacao && (
            <p className="mt-1 text-[11px] text-fg-4">{t.situacao}</p>
          )}
          {t.despacho && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-fg-5">
              {t.despacho}
            </p>
          )}
          <p className="mt-1.5 text-[10.5px] text-fg-5">{formatDateTime(t.data)}</p>
        </div>
      ))}
    </div>
  );
}

function Autores({ id }: { id?: string }) {
  const { data, isLoading } = useAutores(id);
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data || data.length === 0) {
    return <EmptyState title="Autoria não disponível" icon={Users} />;
  }
  return (
    <ul className="space-y-1.5">
      {data.map((a, i) => (
        <li
          key={`${a.nome}-${i}`}
          className="surface flex items-center gap-3 p-3"
        >
          <div className="grid h-8 w-8 place-items-center rounded-full bg-panel-3 text-[10px] text-fg-4">
            <Users className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] text-fg-2">{a.nome}</p>
            <p className="text-[10.5px] text-fg-5">{a.tipo}</p>
          </div>
          {a.proponente && (
            <span className="ml-auto text-[10px] uppercase tracking-wide text-accent">
              Proponente
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Votacoes({ id }: { id?: string }) {
  const { data, isLoading } = useProposicaoVotacoes(id);
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="Nenhuma votação registrada"
        description="Esta proposição ainda não teve votações nominais na Câmara."
        icon={Gavel}
      />
    );
  }
  return (
    <ul className="space-y-2">
      {data.map((v) => (
        <li key={v.id} className="surface p-3.5">
          <div className="flex items-center gap-2">
            <span className="chip">{v.orgao}</span>
            <AprovacaoBadge aprovacao={v.aprovacao} className="ml-auto" />
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-fg-3">{v.descricao}</p>
          <p className="mt-1.5 text-[10.5px] text-fg-5">{formatDateTime(v.dataHora)}</p>
        </li>
      ))}
    </ul>
  );
}
