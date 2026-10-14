import type { ReactNode } from "react";
import { ErrorState, LoadingRows } from "@/components/shared";
import { cn } from "@/lib/utils";

const diaFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

/** A date-grouped list of sessions or events, with its loading and empty states. */
export function ListaDias<T>({ grupos, chave, isLoading, isError, onRetry, vazio, children }: {
  grupos: [string, T[]][];
  chave: (item: T) => string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  vazio: string;
  children: (item: T) => ReactNode;
}) {
  if (isLoading) return <LoadingRows rows={6} height={54} />;
  if (isError) return <ErrorState compact onRetry={onRetry} />;
  if (grupos.length === 0) return <p className="py-12 text-center text-[12px] text-fg-4">{vazio}</p>;

  return (
    <>
      {grupos.map(([dia, itens]) => (
        <div key={dia} className="mb-2">
          <h2 className="sticky top-0 z-[1] bg-panel/95 py-2 text-[12px] font-medium text-fg-3 backdrop-blur first-letter:uppercase">
            {diaFmt.format(new Date(`${dia}T12:00:00`))}
          </h2>
          {itens.map((item, i) => (
            <div key={chave(item)} className={cn(i > 0 && "rowline")}>
              {children(item)}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
