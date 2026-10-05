import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { MemberAvatar } from "@/components/shared";
import { useDebouncedValue } from "@/hooks/useUi";
import { partyColor } from "@/lib/parties";
import type { Casa, Parlamentar } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGINA = 10;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function MembersCard({ casa, membros, uf, partido, onClear, onSelect }: {
  casa: Casa;
  membros: Parlamentar[];
  uf: string | null;
  partido: string | null;
  onClear: () => void;
  onSelect: (p: Parlamentar) => void;
}) {
  const [q, setQ] = useState("");
  const [limite, setLimite] = useState(PAGINA);
  const query = norm(useDebouncedValue(q, 150).trim());
  const filtrados = useMemo(
    () =>
      membros.filter(
        (m) =>
          (!uf || m.uf === uf) &&
          (!partido || m.partido === partido) &&
          (!query || norm(`${m.nome} ${m.partido} ${m.uf}`).includes(query))
      ),
    [membros, uf, partido, query]
  );
  const rotulo = casa === "camara" ? "deputados" : "senadores";
  const filtro = [partido, uf].filter(Boolean).join(" · ");

  return (
    <section className="card" aria-label={`Lista de ${rotulo}`}>
      <div className="card-head">
        <h2>{filtro ? `${rotulo[0].toUpperCase()}${rotulo.slice(1)} · ${filtro}` : `Todos os ${rotulo}`}</h2>
        {filtro ? (
          <button type="button" className="meta link" onClick={onClear}>Limpar</button>
        ) : (
          <span className="meta tn">{membros.length}</span>
        )}
      </div>
      <label className="relative mb-2 block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-5" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, partido ou UF" className="field pl-9" aria-label={`Buscar ${rotulo}`} />
      </label>
      <ol className="flex flex-col">
        {filtrados.slice(0, limite).map((m, i) => (
          <li key={m.id} className={cn(i > 0 && "rowline")}>
            <button type="button" onClick={() => onSelect(m)} className="flex w-full items-center gap-2.5 rounded-lg px-1 py-2 text-left transition-colors hover:bg-fg/5">
              <MemberAvatar name={m.nome} photo={m.foto} party={m.partido} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-fg">{m.nome}</span>
                <span className="block text-[12px]">
                  <span style={{ color: partyColor(m.partido) }}>{m.partido}</span>
                  <span className="text-fg-4"> · {m.uf}</span>
                </span>
              </span>
              {m.papel && <span className="chip h-5 px-2 text-[11px]">{m.papel}</span>}
            </button>
          </li>
        ))}
      </ol>
      {filtrados.length === 0 && <p className="py-6 text-center text-[12px] text-fg-4">Ninguém encontrado.</p>}
      {filtrados.length > limite && (
        <button type="button" className="btn btn-sm btn-block mt-2" onClick={() => setLimite((l) => l + 40)}>
          Ver mais ({filtrados.length - limite} restantes)
        </button>
      )}
      {!uf && <p className="mt-2 text-center text-[11px] text-fg-4">ou clique num estado no mapa para ver só os dele</p>}
    </section>
  );
}
