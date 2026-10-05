import { useMemo } from "react";
import { Search } from "lucide-react";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MemberAvatar } from "@/components/shared";
import { useDebouncedValue, useQueryEnum, useQueryParam } from "@/hooks/useUi";
import { partyColor } from "@/lib/parties";
import { CATEGORIA_COR, CATEGORIA_LABEL, CATEGORIA_ORDEM } from "@/lib/votos";
import type { Parlamentar, Votacao, VotoCategoria, VotoParlamentar } from "@/lib/types";

const FILTROS: readonly (VotoCategoria | "todos")[] = ["todos", ...CATEGORIA_ORDEM];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function RollCallSheet({ open, onOpenChange, votacao, assentos, onSelect }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  votacao: Votacao;
  assentos: VotoParlamentar[];
  onSelect: (p: Parlamentar) => void;
}) {
  const [q, setQ] = useQueryParam("nome");
  const [cat, setCat] = useQueryEnum<VotoCategoria | "todos">("voto", FILTROS, "todos");
  const query = norm(useDebouncedValue(q, 150).trim());

  const presentes = useMemo(
    () => CATEGORIA_ORDEM.filter((c) => assentos.some((a) => a.categoria === c)),
    [assentos]
  );

  const grupos = useMemo(() => {
    const filtrados = assentos.filter(
      (a) => (cat === "todos" || a.categoria === cat) && (!query || norm(`${a.nome} ${a.partido} ${a.uf}`).includes(query))
    );
    return presentes
      .map((c) => ({
        c,
        itens: filtrados.filter((a) => a.categoria === c).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      }))
      .filter((g) => g.itens.length > 0);
  }, [assentos, cat, query, presentes]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(640px,100vw)]">
        <SheetHeader>
          <SheetTitle>Votação nominal · {votacao.proposicao ?? "Plenário"}</SheetTitle>
          <SheetDescription>
            {assentos.length} cadeiras. Ausências incluem quem não registrou voto no painel.
          </SheetDescription>
          <label className="relative mt-3 block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-5" />
            <input value={q} onChange={(e) => setQ(e.target.value || null)} placeholder="Nome, partido ou UF" className="field pl-9" aria-label="Filtrar parlamentares" />
          </label>
          <div className="tabs-mini mt-3 flex-wrap" role="group" aria-label="Filtrar por voto">
            <button type="button" aria-pressed={cat === "todos"} onClick={() => setCat("todos")}>Todos</button>
            {presentes.map((c) => (
              <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
                {CATEGORIA_LABEL[c]}
              </button>
            ))}
          </div>
        </SheetHeader>
        <SheetBody className="space-y-5">
          {grupos.length === 0 && <p className="py-10 text-center text-[12px] text-fg-4">Ninguém encontrado.</p>}
          {grupos.map((g) => (
            <section key={g.c}>
              <h3 className="mb-2 flex items-center gap-2 text-[13px] font-medium">
                <span className="dot" style={{ background: CATEGORIA_COR[g.c], outline: g.c === "ausente" ? "1px solid var(--color-line-3)" : undefined }} />
                {CATEGORIA_LABEL[g.c]}
                <span className="tn text-fg-4">{g.itens.length}</span>
              </h3>
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {g.itens.map((a) => (
                  <li key={a.parlamentarId}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-fg/5"
                      onClick={() => onSelect({ id: a.parlamentarId, casa: votacao.casa, nome: a.nome, partido: a.partido, uf: a.uf, foto: a.foto })}
                    >
                      <MemberAvatar name={a.nome} photo={a.foto} party={a.partido} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-fg">{a.nome}</span>
                        <span className="block text-[12px]">
                          <span style={{ color: partyColor(a.partido) }}>{a.partido}</span>
                          <span className="text-fg-4"> · {a.uf}{a.detalhe && a.categoria === "ausente" ? ` · ${a.detalhe}` : ""}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
