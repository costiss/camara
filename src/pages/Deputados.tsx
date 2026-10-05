import { useState, useMemo } from "react";
import { useDeputados } from "@/hooks/useDeputados";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users } from "lucide-react";

export function Deputados() {
  const [search, setSearch] = useState("");
  const [partidoFilter, setPartidoFilter] = useState("");
  const [ufFilter, setUfFilter] = useState("");

  const { data, isLoading } = useDeputados({ itens: 500 });

  const deputados = (data?.dados ?? []) as Array<{
    id: number;
    nome: string;
    siglaPartido: string;
    siglaUf: string;
    urlFoto: string;
    email: string;
  }>;

  const partidos = useMemo(
    () => [...new Set(deputados.map((d) => d.siglaPartido))].sort(),
    [deputados]
  );

  const ufs = useMemo(
    () => [...new Set(deputados.map((d) => d.siglaUf))].sort(),
    [deputados]
  );

  const filtered = deputados.filter((d) => {
    const matchSearch = d.nome.toLowerCase().includes(search.toLowerCase());
    const matchPartido = !partidoFilter || d.siglaPartido === partidoFilter;
    const matchUf = !ufFilter || d.siglaUf === ufFilter;
    return matchSearch && matchPartido && matchUf;
  });

  const partyCount = useMemo(
    () =>
      deputados.reduce(
        (acc, d) => {
          acc[d.siglaPartido] = (acc[d.siglaPartido] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    [deputados]
  );

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-medium tracking-tight text-fg">
            Câmara dos Deputados
          </h2>
          <p className="text-xs text-fg-4">
            {deputados.length} deputados federais em exercício
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-5" />
            <input
              type="text"
              placeholder="Buscar deputado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-48 rounded-md border border-line bg-panel-2 pl-8 pr-3 text-xs text-fg placeholder:text-fg-5 focus:border-accent/50 focus:outline-none"
            />
          </div>
          <select
            value={partidoFilter}
            onChange={(e) => setPartidoFilter(e.target.value)}
            className="h-8 rounded-md border border-line bg-panel-2 px-2 text-xs text-fg focus:border-accent/50 focus:outline-none"
          >
            <option value="">Todos os partidos</option>
            {partidos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={ufFilter}
            onChange={(e) => setUfFilter(e.target.value)}
            className="h-8 rounded-md border border-line bg-panel-2 px-2 text-xs text-fg focus:border-accent/50 focus:outline-none"
          >
            <option value="">Todos os estados</option>
            {ufs.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(partyCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([party, count]) => (
            <Card
              key={party}
              className="cursor-pointer transition-all hover:border-line-2"
              onClick={() => setPartidoFilter(party)}
            >
              <CardContent className="p-3 text-center">
                <div className="tn font-serif text-lg font-semibold text-fg">
                  {count}
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-fg-4">
                  {party}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((dep) => (
            <Card
              key={dep.id}
              className="group overflow-hidden transition-all hover:border-line-2"
            >
              <CardContent className="p-0">
                <div className="relative h-28 overflow-hidden bg-panel-3">
                  <img
                    src={dep.urlFoto}
                    alt={dep.nome}
                    className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-transparent" />
                </div>
                <div className="p-3">
                  <h3 className="truncate text-xs font-medium text-fg">
                    {dep.nome}
                  </h3>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] text-fg-4">
                      {dep.siglaUf}
                    </span>
                    <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                      {dep.siglaPartido}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filtered.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="mb-3 h-8 w-8 text-fg-5" />
          <p className="text-sm text-fg-4">Nenhum deputado encontrado</p>
          <p className="text-xs text-fg-5">Tente ajustar os filtros</p>
        </div>
      )}
    </div>
  );
}
