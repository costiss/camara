import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Gavel,
  Info,
  Search,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AprovacaoBadge,
  Donut,
  EmptyState,
  ErrorState,
  Hemicycle,
  HouseTag,
  KpiCard,
  LoadingRows,
  MemberAvatar,
  PartyTag,
  SectionHeader,
  StackedPartyBars,
} from "@/components/shared";
import { ParlamentarDetail } from "@/components/detail/ParlamentarDetail";
import { useVotacao, useVotacaoVotos } from "@/hooks/useCamara";
import { useSenadoVotacoes } from "@/hooks/useSenado";
import { navigate, useDebouncedValue } from "@/hooks/useUi";
import { partyColor, voteColor, voteRank, voteTone } from "@/lib/parties";
import { formatDate, formatDateTime } from "@/lib/format";
import { pct } from "@/lib/aggregate";
import { cn } from "@/lib/utils";
import type { Parlamentar, VotoParlamentar } from "@/lib/types";

type ColorBy = "voto" | "partido";
type GroupBy = "voto" | "partido" | "lista";

function VotoBadge({ voto }: { voto: string }) {
  return <Badge tone={voteTone(voto)}>{voto}</Badge>;
}

export function Votacao({ id }: { id: string }) {
  const isCamara = id.startsWith("camara-");
  const rawId = id.replace(/^\w+-/, "");

  const votacaoQ = useVotacao(isCamara ? rawId : undefined);
  const votosQ = useVotacaoVotos(isCamara ? rawId : undefined);
  const senadoQ = useSenadoVotacoes();

  const votacao = isCamara
    ? votacaoQ.data
    : (senadoQ.data ?? []).find((v) => v.id === id);

  const votos = votosQ.data ?? [];

  const [colorBy, setColorBy] = useState<ColorBy>("voto");
  const [groupBy, setGroupBy] = useState<GroupBy>("voto");
  const [votoFilter, setVotoFilter] = useState("todos");
  const [soVotados, setSoVotados] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Parlamentar | null>(null);
  const debounced = useDebouncedValue(search, 200);

  const votosDistintos = useMemo(() => {
    const set = new Set(votos.map((v) => v.voto));
    return [...set].sort((a, b) => voteRank(a) - voteRank(b));
  }, [votos]);

  const placar = useMemo(() => {
    if (votos.length === 0) return null;
    const total = votos.length;
    const sim = votos.filter((v) => /^sim/i.test(v.voto)).length;
    const nao = votos.filter((v) => /^n[ãa]o/i.test(v.voto)).length;
    const abst = votos.filter((v) => /absten/i.test(v.voto)).length;
    return { sim, nao, abstencao: abst, total };
  }, [votos]);

  const donutData = useMemo(
    () =>
      votosDistintos.map((voto) => ({
        name: voto,
        value: votos.filter((v) => v.voto === voto).length,
      })),
    [votos, votosDistintos]
  );

  const partyRows = useMemo(() => {
    const map = new Map<string, Record<string, string | number>>();
    for (const v of votos) {
      const row = map.get(v.partido) ?? { name: v.partido, __total: 0 };
      row[v.voto] = (Number(row[v.voto]) || 0) + 1;
      row.__total = (Number(row.__total) || 0) + 1;
      map.set(v.partido, row);
    }
    return [...map.values()].sort(
      (a, b) => Number(b.__total) - Number(a.__total)
    );
  }, [votos]);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return votos.filter((v) => {
      const okVoto = votoFilter === "todos" || v.voto === votoFilter;
      const okRegistrado = !soVotados || v.voto.trim() !== "";
      const okSearch =
        !q ||
        v.nome.toLowerCase().includes(q) ||
        v.partido.toLowerCase().includes(q) ||
        v.uf.toLowerCase().includes(q);
      return okVoto && okRegistrado && okSearch;
    });
  }, [votos, votoFilter, soVotados, debounced]);

  const groups = useMemo(() => {
    const byName = (a: VotoParlamentar, b: VotoParlamentar) =>
      a.nome.localeCompare(b.nome, "pt-BR");

    if (groupBy === "lista") {
      return [
        {
          key: "todos",
          label: "Todos os votantes",
          color: "var(--color-accent)",
          items: [...filtered].sort(byName),
        },
      ];
    }

    const map = new Map<
      string,
      { key: string; label: string; color: string; items: VotoParlamentar[] }
    >();
    for (const v of filtered) {
      const key = groupBy === "voto" ? v.voto : v.partido;
      const color = groupBy === "voto" ? voteColor(v.voto) : partyColor(v.partido);
      const g = map.get(key);
      if (g) g.items.push(v);
      else map.set(key, { key, label: key, color, items: [v] });
    }
    const arr = [...map.values()];
    arr.sort((a, b) =>
      groupBy === "voto"
        ? voteRank(a.label) - voteRank(b.label)
        : b.items.length - a.items.length
    );
    arr.forEach((g) => g.items.sort(byName));
    return arr;
  }, [filtered, groupBy]);

  const loading = isCamara ? votacaoQ.isLoading || votosQ.isLoading : senadoQ.isLoading;
  const error = isCamara ? votacaoQ.isError : senadoQ.isError;

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingRows rows={2} height={90} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingRows key={i} rows={1} height={78} />
          ))}
        </div>
        <LoadingRows rows={1} height={360} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        description="Não foi possível carregar esta votação."
        onRetry={() => {
          votacaoQ.refetch();
          votosQ.refetch();
        }}
      />
    );
  }

  if (!votacao) {
    return (
      <EmptyState
        icon={Gavel}
        title="Votação não encontrada"
        description="O identificador informado não corresponde a uma votação disponível."
        action={
          <button className="btn btn-sm" onClick={() => navigate("agenda")}>
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a agenda
          </button>
        }
      />
    );
  }

  const showRollCall = isCamara && votos.length > 0;
  const placarFinal =
    votacao.placar && votacao.placar.total > 0 ? votacao.placar : placar;
  const aprovacaoPct =
    placarFinal && placarFinal.total
      ? pct(placarFinal.sim, placarFinal.sim + placarFinal.nao || placarFinal.total)
      : null;

  return (
    <div className="space-y-5">
      <button
        className="btn btn-ghost btn-sm -ml-2"
        onClick={() => navigate("agenda")}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Agenda & votações
      </button>

      {/* Header */}
      <Card className="enter">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">
              <Gavel className="h-3 w-3" />
              {votacao.orgao}
            </span>
            <HouseTag casa={votacao.casa} />
            {votacao.proposicao && (
              <span className="tn text-[12px] font-medium text-fg-2">
                {votacao.proposicao}
              </span>
            )}
            <AprovacaoBadge aprovacao={votacao.aprovacao} className="ml-auto" />
          </div>

          <p className="mt-3 max-w-4xl text-[14px] leading-relaxed text-fg-2">
            {votacao.descricao}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-fg-5">
            <span>{formatDateTime(votacao.dataHora ?? votacao.data)}</span>
            {votacao.url && (
              <a
                href={votacao.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-accent hover:text-accent-2"
              >
                Fonte oficial <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {votacao.objetos && votacao.objetos.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="label">Objeto da votação</p>
              {votacao.objetos.slice(0, 4).map((o) => (
                <a
                  key={o.id}
                  href={o.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="surface surface-hover flex items-start gap-3 p-3"
                >
                  <span className="tn shrink-0 text-[12px] font-semibold text-accent">
                    {o.sigla}
                  </span>
                  <span className="line-clamp-2 text-[11.5px] leading-relaxed text-fg-4">
                    {o.ementa}
                  </span>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      {placarFinal && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <KpiCard
            label="Votantes"
            value={placarFinal.total}
            icon={Users}
            loading={isCamara && votosQ.isLoading}
          />
          <KpiCard label="Sim" value={placarFinal.sim} tone="success" />
          <KpiCard label="Não" value={placarFinal.nao} tone="danger" />
          <KpiCard
            label="Abstenções"
            value={placarFinal.abstencao}
            tone="neutral"
          />
          <KpiCard
            label={votacao.aprovacao === 0 ? "Rejeição" : "Aprovação"}
            value={aprovacaoPct !== null ? `${aprovacaoPct}%` : "—"}
            tone={votacao.aprovacao === 0 ? "danger" : "success"}
            hint="do plenário"
          />
        </div>
      )}

      {showRollCall ? (
        <>
          {/* Hemicycle */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-accent" />
                  Plenário — divisão de cadeiras
                </CardTitle>
                <p className="mt-0.5 text-[11px] text-fg-4">
                  Cada cadeira é um voto. Passe o mouse para ver o nome.
                </p>
              </div>
              <div className="seg">
                <button
                  data-active={colorBy === "voto"}
                  onClick={() => setColorBy("voto")}
                >
                  Por voto
                </button>
                <button
                  data-active={colorBy === "partido"}
                  onClick={() => setColorBy("partido")}
                >
                  Por partido
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <Hemicycle votos={votos} colorBy={colorBy} />
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por voto</CardTitle>
              </CardHeader>
              <CardContent>
                <Donut
                  items={donutData}
                  colorFor={voteColor}
                  centerValue={votos.length}
                  centerLabel="votos"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Como cada partido votou</CardTitle>
                <p className="mt-0.5 text-[11px] text-fg-4">
                  {partyRows.length} partidos com votantes
                </p>
              </CardHeader>
              <CardContent>
                <StackedPartyBars
                  rows={partyRows}
                  keys={votosDistintos}
                  colorFor={voteColor}
                />
              </CardContent>
            </Card>
          </div>

          {/* Roll call */}
          <div>
            <SectionHeader
              title="Votação nominal"
              description={`${filtered.length} de ${votos.length} votos`}
              className="mb-3"
            />
            <div className="surface mb-3 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-5" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, partido ou estado..."
                  className="field pl-9"
                />
              </div>
              <Select value={votoFilter} onValueChange={setVotoFilter}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="Voto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os votos</SelectItem>
                  {votosDistintos.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={groupBy}
                onValueChange={(v) => setGroupBy(v as GroupBy)}
              >
                <SelectTrigger className="w-full lg:w-[170px]">
                  <SelectValue placeholder="Agrupar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="voto">Agrupar por voto</SelectItem>
                  <SelectItem value="partido">Agrupar por partido</SelectItem>
                  <SelectItem value="lista">Lista única</SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={() => setSoVotados((v) => !v)}
                aria-pressed={soVotados}
                className={cn(
                  "chip shrink-0 transition-colors",
                  soVotados && "border-green/40 bg-green/10 text-green"
                )}
              >
                <CheckCircle2 className="h-3 w-3" />
                Já votados
              </button>
            </div>

            {groups.length === 0 ? (
              <EmptyState icon={Users} title="Nenhum voto encontrado" />
            ) : (
              <div className="space-y-5">
                {groups.map((g) => (
                  <div key={g.key}>
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ background: g.color }}
                      />
                      <span className="text-[12px] font-medium text-fg-2">
                        {g.label}
                      </span>
                      <span className="tn text-[11px] text-fg-5">
                        {g.items.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                      {g.items.map((v) => (
                        <button
                          key={v.parlamentarId}
                          onClick={() =>
                            setSelected({
                              id: v.parlamentarId,
                              casa: "camara",
                              nome: v.nome,
                              partido: v.partido,
                              uf: v.uf,
                              foto: v.foto,
                            })
                          }
                          className="flex items-center gap-2.5 rounded-lg border border-transparent bg-panel-2/50 px-2.5 py-2 text-left transition-colors hover:border-line-2 hover:bg-panel-2"
                        >
                          <MemberAvatar
                            name={v.nome}
                            photo={v.foto}
                            party={v.partido}
                            size={30}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] text-fg-2">
                              {v.nome}
                            </span>
                            <span className="mt-0.5 flex items-center gap-1.5">
                              <PartyTag sigla={v.partido} short />
                              <span className="text-[10px] text-fg-5">{v.uf}</span>
                            </span>
                          </span>
                          <VotoBadge voto={v.voto} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-panel-2">
                <Info className="h-4 w-4 text-fg-4" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-fg-2">
                  {isCamara
                    ? "Votação nominal indisponível"
                    : "Votação do Senado Federal"}
                </p>
                <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-fg-4">
                  {isCamara
                    ? "A Câmara não publicou a lista individual de votos desta votação. Os dados oficiais estão abaixo."
                    : "O Senado não disponibiliza, em dados abertos, o voto individual por senador para esta votação. Abaixo estão os dados oficiais publicados."}
                </p>
                {votacao.ementa && (
                  <p className="mt-3 max-w-3xl text-[12px] leading-relaxed text-fg-3">
                    {votacao.ementa}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-fg-5">
                  Sessão de {formatDate(votacao.data)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ParlamentarDetail
        parlamentar={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}
