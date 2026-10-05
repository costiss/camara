import { ArrowLeft, ExternalLink, Mail } from "lucide-react";
import { MemberAvatar } from "@/components/shared";
import { BarRowsSkeleton } from "@/components/hud/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { useProposicoesPorAutor } from "@/hooks/useCamara";
import { routeHref } from "@/hooks/useUi";
import { formatDate } from "@/lib/format";
import { tipoDaProposta, tituloPopular } from "@/lib/linguagem";
import { partyColor } from "@/lib/parties";
import type { Parlamentar } from "@/lib/types";
import { cn } from "@/lib/utils";

function cargo(p: Parlamentar): string {
  const feminino = p.sexo?.toUpperCase().startsWith("F");
  if (p.casa === "senado") return feminino ? "Senadora" : "Senador";
  return feminino ? "Deputada federal" : "Deputado federal";
}

function Linha({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="label">{k}</dt>
      <dd className="text-right text-[13px] text-fg-2">{v}</dd>
    </div>
  );
}

export function PerfilSkeleton() {
  return (
    <section className="card" aria-busy="true" aria-label="Carregando perfil">
      <Skeleton className="h-3 w-28" />
      <div className="mt-4 flex items-center gap-4">
        <Skeleton className="h-[72px] w-[72px] rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
      </div>
      <BarRowsSkeleton rows={4} label="Carregando dados" />
    </section>
  );
}

export function PerfilCard({ parlamentar }: { parlamentar: Parlamentar }) {
  const casa = parlamentar.casa === "camara" ? "Câmara dos Deputados" : "Senado Federal";
  return (
    <section className="card enter" aria-labelledby="parlamentar-nome">
      <a href={routeHref(parlamentar.casa)} className="inline-flex items-center gap-1 text-[12px] text-fg-3 no-underline hover:text-fg">
        <ArrowLeft className="h-3.5 w-3.5" /> {casa}
      </a>
      <div className="mt-4 flex items-center gap-4">
        <MemberAvatar name={parlamentar.nome} photo={parlamentar.foto} party={parlamentar.partido} size={72} />
        <div className="min-w-0">
          <h1 id="parlamentar-nome" className="titulo-voto titulo-voto-medio">{parlamentar.nome}</h1>
          <p className="mt-1 text-[13px] text-fg-3">
            {cargo(parlamentar)} ·{" "}
            <span className="font-medium" style={{ color: partyColor(parlamentar.partido) }}>{parlamentar.partido}</span> · {parlamentar.uf}
          </p>
        </div>
      </div>
      {parlamentar.situacao && <p className="chip mt-3">{/^exerc[íi]cio$/i.test(parlamentar.situacao) ? "Em exercício" : parlamentar.situacao}</p>}

      <dl className="mt-4 border-t border-line pt-2">
        <Linha k="Nome civil" v={parlamentar.nomeCompleto !== parlamentar.nome ? parlamentar.nomeCompleto : undefined} />
        <Linha k="Bloco" v={parlamentar.bloco} />
        <Linha k="Legislatura" v={parlamentar.legislatura ? `${parlamentar.legislatura}ª` : undefined} />
        <Linha k="Nascimento" v={parlamentar.nascimento ? formatDate(parlamentar.nascimento) : undefined} />
        <Linha k="Naturalidade" v={parlamentar.naturalidade} />
        <Linha k="Escolaridade" v={parlamentar.escolaridade} />
      </dl>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
        {parlamentar.urlPerfil && (
          <a className="link inline-flex items-center gap-1" href={parlamentar.urlPerfil} target="_blank" rel="noopener noreferrer">
            Página oficial <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {parlamentar.email && (
          <a className="link inline-flex items-center gap-1" href={`mailto:${parlamentar.email}`}>
            <Mail className="h-3 w-3" /> E-mail
          </a>
        )}
      </div>
    </section>
  );
}

export function ProjetosCard({ id }: { id: string }) {
  const numerico = id.replace(/^camara-/, "");
  const { data, isLoading } = useProposicoesPorAutor(numerico);
  const itens = data ?? [];
  return (
    <section className="card" aria-labelledby="projetos-title">
      <div className="card-head">
        <h2 id="projetos-title">Propostas de autoria</h2>
        <span className="meta">leis e emendas, mais recentes</span>
      </div>
      {isLoading ? (
        <BarRowsSkeleton rows={4} label="Carregando propostas" />
      ) : itens.length === 0 ? (
        <p className="py-2 text-[12px] text-fg-4">Nenhuma proposta encontrada.</p>
      ) : (
        <ol className="flex flex-col">
          {itens.slice(0, 8).map((p, i) => (
            <li key={p.id} className={cn("py-2", i > 0 && "rowline")}>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="block no-underline">
                <span className="line-clamp-2 text-[13px] leading-snug text-fg hover:underline">{tituloPopular(p.ementa) || p.sigla}</span>
                <span className="mt-0.5 block text-[11px] text-fg-4">
                  {[tipoDaProposta(p.sigla)?.curto, p.sigla, p.apresentacao && formatDate(p.apresentacao)].filter(Boolean).join(" · ")}
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
