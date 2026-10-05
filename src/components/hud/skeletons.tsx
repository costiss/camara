import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BrazilMap } from "./BrazilMap";

/** Placeholders shaped like the cards they stand in for, so loading never shifts the layout. */

function Linhas({ n, className }: { n: number; className?: string }) {
  return (
    <div className={cn("flex flex-col", className)}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={cn("flex items-center justify-between py-1.5", i > 0 && "rowline")}>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <section className="card" aria-busy="true" aria-label="Carregando votação">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-40 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-7 w-3/4" />
      <Skeleton className="mt-2 h-7 w-1/2" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-1.5 h-3 w-5/6" />
      <div className="mt-6 flex items-end justify-between">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-16" />
      </div>
      <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
      <Linhas n={3} className="mt-4 border-t border-line pt-2" />
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="mt-2 h-5 w-10" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function StageSkeleton() {
  return (
    <div className="relative flex h-full flex-col min-[1180px]:min-h-[420px]" aria-busy="true" aria-label="Carregando mapa">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-36 rounded-full" />
        <Skeleton className="hidden h-9 w-72 rounded-full xl:block" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="relative min-h-0 flex-1 py-3">
        <BrazilMap data={{}} label="Carregando mapa" className="map-loading" />
      </div>
    </div>
  );
}

export function BarRowsSkeleton({ rows, label }: { rows: number; label: string }) {
  return (
    <ul className="flex flex-col" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className={cn("py-2", i > 0 && "rowline")}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3" style={{ width: `${70 - ((i * 7) % 30)}px` }} />
            <Skeleton className="h-3 w-9" />
          </div>
          <Skeleton className="mt-2 h-[3px] w-full rounded-full" />
        </li>
      ))}
    </ul>
  );
}

export function PartyBreakdownSkeleton() {
  return (
    <section className="card">
      <div className="card-head">
        <h2>Por partido</h2>
        <span className="meta">% de votos Sim</span>
      </div>
      <BarRowsSkeleton rows={9} label="Carregando partidos" />
    </section>
  );
}

export function CompositionSkeleton() {
  return (
    <section className="card" aria-busy="true" aria-label="Carregando composição">
      <div className="card-head">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
      <Skeleton className="mx-auto mt-2 h-3 w-3/4" />
      <Skeleton className="mx-auto mt-4 aspect-[2/1] w-full rounded-t-full" />
      <div className="mt-3 flex flex-wrap gap-3">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-3 w-12" />)}
      </div>
    </section>
  );
}

export function MembersSkeleton() {
  return (
    <section className="card" aria-busy="true" aria-label="Carregando parlamentares">
      <div className="card-head">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-8" />
      </div>
      <Skeleton className="mb-2 h-9 w-full rounded-lg" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className={cn("flex items-center gap-2.5 px-1 py-2", i > 0 && "rowline")}>
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="mt-1.5 h-2.5 w-16" />
          </div>
        </div>
      ))}
    </section>
  );
}
