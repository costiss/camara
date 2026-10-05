/**
 * Senado Federal adapter (`legis.senado.leg.br/dadosabertos`).
 *
 * The Senate open data is XML-turned-JSON: deeply nested, with
 * single-element collections rendered as objects rather than arrays.
 * `asArray` smooths that over. Media URLs sometimes come back as
 * `http://` and are upgraded to avoid mixed-content blocking.
 */
import type { Parlamentar, Proposicao, Votacao, VotoParlamentar } from "../types";
import { CADEIRAS, VotoClassifier, VoteTally } from "../votos";
import { getJson } from "./http";

const BASE = "https://legis.senado.leg.br/dadosabertos";

/* ------------------------------ helpers ------------------------------- */

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function https(url?: string | null): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:\/\//i, "https://");
}

function textOf(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const candidate =
      o.descricao ?? o.Descricao ?? o.situacao ?? o.Situacao ?? o.nome ?? o.Nome;
    return candidate === undefined ? undefined : String(candidate);
  }
  return undefined;
}

interface RawIdentificacao {
  CodigoParlamentar: string;
  CodigoPublicoNaLegAtual?: string;
  NomeParlamentar: string;
  NomeCompletoParlamentar?: string;
  SexoParlamentar?: string;
  UrlFotoParlamentar?: string;
  UrlPaginaParlamentar?: string;
  EmailParlamentar?: string;
  SiglaPartidoParlamentar?: string;
  UfParlamentar?: string;
  Bloco?: { NomeBloco?: string; NomeApelido?: string };
  MembroMesa?: string;
  MembroLideranca?: string;
}

interface RawSenador {
  IdentificacaoParlamentar: RawIdentificacao;
  Mandato?: {
    PrimeiraLegislaturaDoMandato?: { NumeroLegislatura?: string };
  };
}

interface RawDetalheIdentificacao extends RawIdentificacao {
  FormaTratamento?: string;
}

interface RawSenadorDetalhe {
  DetalheParlamentar: {
    Parlamentar: {
      IdentificacaoParlamentar: RawDetalheIdentificacao;
      DadosBasicosParlamentar?: {
        DataNascimento?: string;
        Naturalidade?: string;
        UfNaturalidade?: string;
      };
    };
  };
}

interface RawSenadorVotacao {
  CodigoSessaoVotacao: string;
  DescricaoResultado?: string;
  DescricaoVotacao?: string;
  SiglaDescricaoVoto?: string;
  Materia?: {
    Sigla?: string;
    Numero?: string;
    Ano?: string;
    DescricaoIdentificacao?: string;
    Ementa?: string;
    IdentificacaoProcesso?: string;
  };
  SessaoPlenaria?: { DataSessao?: string };
}

interface RawVotoSenador {
  codigoParlamentar: number;
  nomeParlamentar: string;
  siglaPartidoParlamentar?: string;
  siglaUFParlamentar?: string;
  siglaVotoParlamentar?: string;
}

interface RawVotacaoPlenario {
  codigoSessaoVotacao?: number | string;
  dataSessao?: string;
  descricaoVotacao?: string;
  ementa?: string;
  identificacao?: string;
  sigla?: string;
  codigoMateria?: number;
  idProcesso?: number;
  resultadoVotacao?: string;
  votacaoSecreta?: string;
  totalVotosSim?: number | null;
  totalVotosNao?: number | null;
  totalVotosAbstencao?: number | null;
  informeLegislativo?: { nomeColegiado?: string; texto?: string };
  votos?: RawVotoSenador[];
}

interface RawProcesso {
  id?: number;
  codigoMateria?: number;
  identificacao?: string;
  ementa?: string;
  autoria?: string;
  dataApresentacao?: string;
  dataSituacaoAtual?: string;
  situacaoAtual?: unknown;
  tramitando?: unknown;
  tipoDocumento?: string;
  casaIdentificadora?: string;
  enteIdentificador?: string;
  urlDocumento?: string;
}

/* ------------------------------ mapping ------------------------------- */

function mapParlamentar(r: RawSenador): Parlamentar {
  const i = r.IdentificacaoParlamentar;
  return {
    id: `senado-${i.CodigoParlamentar}`,
    casa: "senado",
    nome: i.NomeParlamentar,
    nomeCompleto: i.NomeCompletoParlamentar,
    partido: i.SiglaPartidoParlamentar ?? "—",
    uf: i.UfParlamentar ?? "—",
    foto: https(i.UrlFotoParlamentar),
    email: i.EmailParlamentar,
    sexo: i.SexoParlamentar,
    legislatura:
      Number(r.Mandato?.PrimeiraLegislaturaDoMandato?.NumeroLegislatura) ||
      undefined,
    bloco: i.Bloco?.NomeApelido ?? i.Bloco?.NomeBloco,
    papel:
      i.MembroMesa === "Sim"
        ? "Mesa Diretora"
        : i.MembroLideranca === "Sim"
          ? "Liderança"
          : undefined,
    urlPerfil: https(i.UrlPaginaParlamentar),
  };
}

function mapSenadorVotacao(v: RawSenadorVotacao): Votacao {
  const m = v.Materia;
  return {
    id: `senado-${v.CodigoSessaoVotacao}`,
    casa: "senado",
    data: v.SessaoPlenaria?.DataSessao ?? "",
    dataHora: v.SessaoPlenaria?.DataSessao,
    orgao: "Plenário",
    descricao: v.DescricaoVotacao ?? v.DescricaoResultado ?? "Votação",
    ementa: m?.Ementa,
    proposicao: m?.DescricaoIdentificacao ?? (m?.Sigla ? `${m.Sigla} ${m.Numero}/${m.Ano}` : undefined),
    aprovacao: /aprovad/i.test(v.DescricaoResultado ?? "")
      ? 1
      : /rejeitad/i.test(v.DescricaoResultado ?? "")
        ? 0
        : null,
    placar: null,
    plenario: true,
  };
}

function mapVotoSenador(v: RawVotoSenador): VotoParlamentar {
  return {
    parlamentarId: `senado-${v.codigoParlamentar}`,
    nome: v.nomeParlamentar,
    partido: v.siglaPartidoParlamentar ?? "—",
    uf: v.siglaUFParlamentar ?? "—",
    ...VotoClassifier.classify(v.siglaVotoParlamentar),
  };
}

function mapVotacaoPlenario(v: RawVotacaoPlenario): Votacao {
  const votos = asArray(v.votos).map(mapVotoSenador);
  const secreta = v.votacaoSecreta === "S";
  const tally = new VoteTally(votos, CADEIRAS.senado);
  const placar =
    v.totalVotosSim != null
      ? {
          sim: v.totalVotosSim,
          nao: v.totalVotosNao ?? 0,
          abstencao: v.totalVotosAbstencao ?? 0,
          total: (v.totalVotosSim ?? 0) + (v.totalVotosNao ?? 0) + (v.totalVotosAbstencao ?? 0),
        }
      : secreta
        ? null
        : tally.placar;
  const resultado = v.resultadoVotacao?.toUpperCase();
  return {
    id: `senado-${v.codigoSessaoVotacao ?? v.idProcesso}`,
    casa: "senado",
    data: v.dataSessao ?? "",
    dataHora: v.dataSessao,
    orgao: v.informeLegislativo?.nomeColegiado ?? "Plenário do Senado Federal",
    plenario: true,
    descricao: v.descricaoVotacao ?? "Votação",
    ementa: v.ementa,
    proposicao: v.identificacao,
    proposicaoTipo: v.sigla,
    proposicaoId: v.codigoMateria ? String(v.codigoMateria) : undefined,
    materiaId: v.codigoMateria,
    aprovacao: resultado === "A" ? 1 : resultado === "R" ? 0 : null,
    placar,
    nominal: votos.length > 0,
    secreta,
    votos,
    url: v.codigoMateria
      ? `https://www25.senado.leg.br/web/atividade/materias/-/materia/${v.codigoMateria}`
      : undefined,
  };
}

function mapProcesso(p: RawProcesso): Proposicao {
  const identificacao = p.identificacao ?? "";
  const match = /^([A-Z]+)\s+(\d+)\/(\d+)$/.exec(identificacao);
  return {
    id: `senado-${p.codigoMateria ?? p.id ?? identificacao}`,
    casa: "senado",
    tipo: match?.[1] ?? p.tipoDocumento ?? "MAT",
    sigla: identificacao || p.tipoDocumento || "Matéria",
    numero: match ? Number(match[2]) : 0,
    ano: match ? Number(match[3]) : 0,
    ementa: p.ementa ?? "",
    apresentacao: p.dataApresentacao,
    autor: p.autoria,
    status: textOf(p.situacaoAtual),
    situacaoData: p.dataSituacaoAtual,
    tramitando: String(p.tramitando ?? "").toLowerCase().startsWith("s"),
    orgao: p.enteIdentificador,
    url: https(p.urlDocumento),
  };
}

/* ----------------------------- endpoints ------------------------------ */

export async function getSenadores(): Promise<Parlamentar[]> {
  const data = await getJson<{
    ListaParlamentarEmExercicio: {
      Parlamentares: { Parlamentar: RawSenador | RawSenador[] };
    };
  }>(`${BASE}/senador/lista/atual`);
  const raw = asArray(
    data.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar
  );
  return raw
    .map(mapParlamentar)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function getSenador(codigo: number | string): Promise<Parlamentar> {
  const data = await getJson<RawSenadorDetalhe>(`${BASE}/senador/${codigo}`);
  const p = data.DetalheParlamentar.Parlamentar;
  const base = mapParlamentar({
    IdentificacaoParlamentar: p.IdentificacaoParlamentar,
  });
  const basicos = p.DadosBasicosParlamentar;
  return {
    ...base,
    nascimento: basicos?.DataNascimento,
    naturalidade: [basicos?.Naturalidade, basicos?.UfNaturalidade]
      .filter(Boolean)
      .join(" / "),
  };
}

export async function getSenadorVotacoes(
  codigo: number | string
): Promise<Votacao[]> {
  const data = await getJson<{
    VotacaoParlamentar: {
      Parlamentar: {
        Votacoes?: { Votacao: RawSenadorVotacao | RawSenadorVotacao[] };
      };
    };
  }>(`${BASE}/senador/${codigo}/votacoes`);
  return asArray(data.VotacaoParlamentar?.Parlamentar?.Votacoes?.Votacao)
    .map(mapSenadorVotacao)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

/** Recent nominal votes held on the Senate floor. */
export async function getSenadoVotacoes(): Promise<Votacao[]> {
  const data = await getJson<RawVotacaoPlenario[]>(`${BASE}/votacao`);
  return asArray(data)
    .filter((v) => v.dataSessao && v.codigoSessaoVotacao)
    .map(mapVotacaoPlenario)
    .sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id, undefined, { numeric: true }));
}

/** Senate propositions by type/year via the modern `/processo` endpoint. */
export async function getSenadoProcessos(q: {
  sigla: string;
  ano: number;
}): Promise<Proposicao[]> {
  const data = await getJson<RawProcesso[]>(
    `${BASE}/processo?sigla=${encodeURIComponent(q.sigla)}&ano=${q.ano}`
  );
  return asArray(data)
    .map(mapProcesso)
    .sort((a, b) => b.numero - a.numero);
}
