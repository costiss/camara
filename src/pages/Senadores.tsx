import { useMemo, useState } from "react";
import { Landmark, Search } from "lucide-react";
import { useSenadores } from "@/hooks/useSenado";
import { useDebouncedValue } from "@/hooks/useUi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DistributionBars,
  EmptyState,
  ErrorState,
  KpiCard,
  LoadingRows,
  MemberCard,
  SectionHeader,
} from "@/components/shared";
import { ParlamentarDetail } from "@/components/detail/ParlamentarDetail";
import { distributionBy } from "@/lib/aggregate";
import { partyColor } from "@/lib/parties";
import type { Parlamentar } from "@/lib/types";

export function Senadores() {
  const { data, isLoading, isError, refetch } = useSenadores();
  const [search, setSearch] = useState("");
  const [partido, setPartido] = useState("todos");
  const [uf, setUf] = useState("todas");
  const [selected, setSelected] = useState<Parlamentar | null>(null);
  const debounced = useDebouncedValue(search, 200);

  const senadores = useMemo(() => data ?? [], [data]);

  const partidos = useMemo(
    () => [...new Set(senadores.map((s) => s.partido))].sort(),
    [senadores]
  );
  const ufs = useMemo(
    () => [...new Set(senadores.map((s) => s.uf))].sort(),
    [senadores]
  );

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return senadores.filter((s) => {
      const okSearch = !q || s.nome.toLowerCase().includes(q);
      const okPartido = partido === "todos" || s.partido === partido;
      const okUf = uf === "todas" || s.uf === uf;
      return okSearch && okPartido && okUf;
    });
  }, [senadores, debounced, partido, uf]);

  const bancadas = useMemo(
    () => distributionBy(senadores, (s) => s.partido),
    [senadores]
  );
  const mesa = senadores.filter((s) => s.papel === "Mesa Diretora").length;
  const liderancas = senadores.filter((s) => s.papel === "Liderança").length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Senadores"
          value={senadores.length}
          icon={Landmark}
          tone="accent"
          loading={isLoading}
        />
        <KpiCard label="Partidos" value={partidos.length} loading={isLoading} />
        <KpiCard label="Mesa Diretora" value={mesa} loading={isLoading} tone="info" />
        <KpiCard label="Lideranças" value={liderancas} loading={isLoading} tone="success" />
      </div>

      <div className="surface flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar senador..."
            className="field pl-9"
          />
        </div>
        <Select value={partido} onValueChange={setPartido}>
          <SelectTrigger className="w-full lg:w-[180px]">
            <SelectValue placeholder="Partido" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os partidos</SelectItem>
            {partidos.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={uf} onValueChange={setUf}>
          <SelectTrigger className="w-full lg:w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os estados</SelectItem>
            {ufs.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
          <div>
            <SectionHeader
              title="Bancada do Senado"
              description={`${filtered.length} senadores exibidos`}
              className="mb-3"
            />
            {isLoading ? (
              <LoadingRows rows={8} height={70} />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Landmark}
                title="Nenhum senador encontrado"
                description="Ajuste a busca ou os filtros de partido e estado."
              />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filtered.map((s) => (
                  <MemberCard key={s.id} m={s} onOpen={setSelected} />
                ))}
              </div>
            )}
          </div>

          <aside className="hidden xl:block">
            <div className="surface sticky top-[72px] p-4">
              <p className="label mb-3">Maiores bancadas</p>
              <DistributionBars
                items={bancadas}
                total={senadores.length}
                limit={12}
                colorFor={partyColor}
                onSelect={(p) => setPartido(p)}
              />
            </div>
          </aside>
        </div>
      )}

      <ParlamentarDetail
        parlamentar={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}
