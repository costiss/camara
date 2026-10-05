import { useMemo } from "react";
import { Hemicycle } from "@/components/shared";
import { bancadas, espectroTotais, ordenarPorEspectro } from "@/lib/breakdown";
import { formatNumber } from "@/lib/format";
import { ESPECTRO_CENTRO_NOTA, ESPECTRO_COR, ESPECTRO_REGRA, partyColor } from "@/lib/parties";
import type { Casa, Parlamentar } from "@/lib/types";
import { CADEIRAS } from "@/lib/votos";

const TITULO: Record<Casa, string> = { camara: "Câmara dos Deputados", senado: "Senado Federal" };

function EspectroBar({ membros, cadeiras }: { membros: Parlamentar[]; cadeiras: number }) {
  const t = espectroTotais(membros);
  const maioria = Math.floor(cadeiras / 2) + 1;
  return (
    <div>
      <div className="flex items-end justify-between gap-1 text-[12px]">
        <span className="flex items-baseline gap-1"><span className="text-fg-2">Esquerda</span><span className="fig-m text-[22px]">{t.esquerda}</span></span>
        <span className="flex items-baseline gap-1"><span className="text-fg-2">Centro</span><span className="fig-m text-[22px] text-[#BFA98A]">{t.centro}</span></span>
        <span className="flex items-baseline gap-1"><span className="fig-m text-[22px]">{t.direita}</span><span className="text-fg-2">Direita</span></span>
      </div>
      <div className="duel mt-2" role="img" aria-label={`Esquerda ${t.esquerda}, centro ${t.centro}, direita ${t.direita}; maioria ${maioria}`}>
        <span style={{ flexGrow: t.esquerda, background: ESPECTRO_COR.esquerda }} />
        <span style={{ flexGrow: t.centro, background: ESPECTRO_COR.centro }} />
        <span style={{ flexGrow: t.direita, background: ESPECTRO_COR.direita }} />
        <span className="duel-mark" style={{ left: "50%" }} />
      </div>
      <p className="mt-2 text-center text-[11px] leading-snug text-fg-3" title={ESPECTRO_REGRA}>
        maioria {maioria} · {ESPECTRO_CENTRO_NOTA}
      </p>
    </div>
  );
}

export function CompositionCard({ casa, membros, partido, uf, onPartido }: {
  casa: Casa;
  membros: Parlamentar[];
  partido: string | null;
  uf: string | null;
  onPartido: (p: string | null) => void;
}) {
  const cadeiras = CADEIRAS[casa];
  const seats = useMemo(
    () =>
      ordenarPorEspectro(membros).map((m) => ({
        id: m.id,
        color: partyColor(m.partido),
        title: `${m.nome} · ${m.partido}-${m.uf}`,
        dim: (!!partido && m.partido !== partido) || (!!uf && m.uf !== uf),
      })),
    [membros, partido, uf]
  );
  const lista = bancadas(membros);
  const top = lista.slice(0, 5);
  const outros = lista.slice(5).reduce((a, b) => a + b.total, 0);

  return (
    <section className="card enter" aria-labelledby="casa-title">
      <div className="card-head">
        <h1 id="casa-title" className="text-[14px] font-medium">{TITULO[casa]}</h1>
        <span className="meta">{cadeiras} cadeiras</span>
      </div>
      <EspectroBar membros={membros} cadeiras={cadeiras} />
      <Hemicycle
        seats={seats}
        label={`${membros.length} parlamentares em exercício por partido`}
        className="mt-4"
        center={
          <>
            <span className="fig-m">{formatNumber(membros.length)}</span>
            <span className="text-[11px] text-fg-3">em exercício</span>
          </>
        }
      />
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[12px]">
        {top.map((b) => (
          <button
            key={b.partido}
            type="button"
            aria-pressed={partido === b.partido}
            onClick={() => onPartido(partido === b.partido ? null : b.partido)}
            className="flex items-center gap-1.5 rounded px-0.5 text-fg-2 hover:text-fg aria-pressed:text-fg aria-pressed:underline"
          >
            <span className="dot" style={{ background: b.cor }} />
            {b.partido} <span className="tn font-medium text-fg">{b.total}</span>
          </button>
        ))}
        {outros > 0 && <span className="text-fg-3">Outros <span className="tn font-medium text-fg">{outros}</span></span>}
      </div>
    </section>
  );
}
