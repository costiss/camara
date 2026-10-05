import { ExternalLink, Gavel, FileText } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EmptyState,
  InfoRow,
  MemberAvatar,
  PartyTag,
  ProposicaoRow,
  StatusBadge,
} from "@/components/shared";
import { useDeputado, useProposicoesPorAutor } from "@/hooks/useCamara";
import { useSenador, useSenadorVotacoes } from "@/hooks/useSenado";
import type { Parlamentar } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/format";

export function ParlamentarDetail({
  parlamentar,
  open,
  onOpenChange,
}: {
  parlamentar: Parlamentar | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const numericId = parlamentar?.id.replace(/^\w+-/, "");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(720px,100vw)]">
        {parlamentar && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3.5">
                <MemberAvatar
                  name={parlamentar.nome}
                  photo={parlamentar.foto}
                  party={parlamentar.partido}
                  size={56}
                />
                <div className="min-w-0">
                  <SheetTitle className="font-serif text-[19px] font-medium leading-tight">
                    {parlamentar.nome}
                  </SheetTitle>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <PartyTag sigla={parlamentar.partido} />
                    <span className="text-[11px] text-fg-4">{parlamentar.uf}</span>
                    <span className="text-[11px] text-fg-5">
                      {parlamentar.casa === "camara" ? "Câmara" : "Senado"}
                    </span>
                    {parlamentar.papel && (
                      <span className="rounded-md border border-accent/25 bg-accent-dim px-1.5 py-0.5 text-[10px] font-medium text-accent">
                        {parlamentar.papel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            <SheetBody>
              <Perfil parlamentar={parlamentar} numericId={numericId} />
              {parlamentar.casa === "camara" ? (
                <div className="mt-5">
                  <p className="label mb-2">Proposições recentes</p>
                  <ProposicoesAutor id={numericId} />
                </div>
              ) : (
                <div className="mt-5">
                  <p className="label mb-2">Votações recentes</p>
                  <VotacoesSenador codigo={numericId} />
                </div>
              )}
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Perfil({
  parlamentar,
  numericId,
}: {
  parlamentar: Parlamentar;
  numericId?: string;
}) {
  const dep = useDeputado(parlamentar.casa === "camara" ? numericId : undefined);
  const sen = useSenador(parlamentar.casa === "senado" ? numericId : undefined);
  const detail = parlamentar.casa === "camara" ? dep.data : sen.data;
  const merged: Parlamentar = { ...parlamentar, ...(detail ?? {}) };

  return (
    <div className="space-y-3">
      <div className="surface divide-y divide-line px-4 py-2">
        <InfoRow label="Nome completo" value={merged.nomeCompleto ?? merged.nome} />
        <InfoRow
          label="Partido / UF"
          value={`${merged.partido} · ${merged.uf}`}
        />
        {merged.situacao && <InfoRow label="Situação" value={merged.situacao} />}
        {merged.legislatura && (
          <InfoRow label="Legislatura" value={`${merged.legislatura}ª`} />
        )}
        {merged.nascimento && (
          <InfoRow label="Nascimento" value={formatDate(merged.nascimento)} />
        )}
        {merged.naturalidade && (
          <InfoRow label="Naturalidade" value={merged.naturalidade} />
        )}
        {merged.escolaridade && (
          <InfoRow label="Escolaridade" value={merged.escolaridade} />
        )}
        {merged.bloco && <InfoRow label="Bloco" value={merged.bloco} />}
        {merged.email && <InfoRow label="E-mail" value={merged.email} />}
      </div>
      {merged.urlPerfil && (
        <a
          href={merged.urlPerfil}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent hover:text-accent-2"
        >
          Perfil oficial <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function ProposicoesAutor({ id }: { id?: string }) {
  const { data, isLoading } = useProposicoesPorAutor(id);
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data || data.length === 0) {
    return <EmptyState title="Sem proposições recentes" icon={FileText} />;
  }
  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((p) => (
        <ProposicaoRow key={p.id} p={p} />
      ))}
    </div>
  );
}

function VotacoesSenador({ codigo }: { codigo?: string }) {
  const { data, isLoading } = useSenadorVotacoes(codigo);
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data || data.length === 0) {
    return <EmptyState title="Sem votações recentes" icon={Gavel} />;
  }
  return (
    <ul className="space-y-2">
      {data.slice(0, 12).map((v) => (
        <li key={v.id} className="surface p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {v.proposicao && (
              <span className="tn text-[11px] font-medium text-fg-2">
                {v.proposicao}
              </span>
            )}
            <StatusBadge status="Voto registrado" icon={false} />
          </div>
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-fg-3">
            {v.descricao}
          </p>
          <p className="mt-1.5 text-[10.5px] text-fg-5">{formatDateTime(v.data)}</p>
        </li>
      ))}
    </ul>
  );
}
