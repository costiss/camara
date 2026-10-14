/**
 * Senado Federal adapter (`legis.senado.leg.br/dadosabertos`).
 *
 * The Senate open data is XML-turned-JSON: deeply nested, with
 * single-element collections rendered as objects rather than arrays.
 * `asArray` smooths that over. Media URLs sometimes come back as
 * `http://` and are upgraded to avoid mixed-content blocking.
 */
import type { ContextoProposta, ItemAoVivo, Parlamentar, Proposicao, SessaoAoVivo, SessaoPauta, Votacao, VotoParlamentar } from "../types";
import { itemAoVivo } from "../aoVivo";
import { CADEIRAS, VotoClassifier, VoteTally } from "../votos";
import { SENADO_BASE } from "./config";
import { getJson } from "./http";

const BASE = SENADO_BASE;

/* ------------------------------ helpers ------------------------------- */

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function https(url?: string | null): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:\/\//i, "https://");
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
export async function getSenadoVotacoes(intervalo?: { ini: string; fim: string }): Promise<Votacao[]> {
  const filtro = intervalo ? `?dataInicio=${intervalo.ini}&dataFim=${intervalo.fim}` : "";
  const data = await getJson<RawVotacaoPlenario[]>(`${BASE}/votacao${filtro}`);
  return asArray(data)
    .filter((v) => v.dataSessao && v.codigoSessaoVotacao)
    .map(mapVotacaoPlenario)
    .sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id, undefined, { numeric: true }));
}

interface RawProcessoResumo {
  autoria?: string;
  situacaoAtual?: string;
  dataSituacaoAtual?: string;
  normaGerada?: string;
}

function fraseNormal(s?: string): string | undefined {
  if (!s) return undefined;
  const t = s.trim();
  return t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t;
}

/** Current status, author and resulting law of a Senate matter. */
export async function getContextoMateria(codigoMateria: string): Promise<ContextoProposta> {
  const data = await getJson<RawProcessoResumo[]>(`${BASE}/processo?codigoMateria=${encodeURIComponent(codigoMateria)}`);
  const p = asArray(data)[0] ?? {};
  const situacao = fraseNormal(p.situacaoAtual);
  const norma = /^(.+?)\s+n[º°]\s*([\d.]+)/i.exec(p.normaGerada ?? "");
  return {
    situacao,
    dataSituacao: p.dataSituacaoAtual,
    norma: norma ? `${norma[1]} ${norma[2]}/${(p.normaGerada ?? "").match(/(\d{4})\s*$/)?.[1] ?? ""}`.replace(/\/$/, "") : undefined,
    vetos: /veto total/i.test(situacao ?? "") ? "total" : /veto parcial/i.test(situacao ?? "") ? "parcial" : undefined,
    temas: [],
    autores: p.autoria ? [p.autoria] : [],
  };
}

interface RawProcessoAutor {
  codigoMateria?: number;
  identificacao?: string;
  ementa?: string;
  dataApresentacao?: string;
  situacaoAtual?: string;
  dataSituacaoAtual?: string;
  tramitando?: string;
  urlDocumento?: string;
  autoria?: string;
}

const TIPOS_DE_LEI = new Set(["PEC", "PLP", "PL", "PDL", "PLS"]);

/** Every bill a senator authored or co-authored, newest first; `nome` tells first author from co-author. */
export async function getAutoriaSenador(codigo: string, nome?: string): Promise<Proposicao[]> {
  const data = await getJson<RawProcessoAutor[]>(`${BASE}/processo?codigoParlamentarAutor=${encodeURIComponent(codigo)}`);
  const primeiro = (autoria?: string) => (autoria ?? "").split(",")[0].toLowerCase();
  return asArray(data)
    .map((p): Proposicao | null => {
      const m = /^(\S+)\s+(\d+)\/(\d{4})/.exec(p.identificacao ?? "");
      if (!m || !TIPOS_DE_LEI.has(m[1]) || !p.codigoMateria) return null;
      return {
        id: String(p.codigoMateria),
        casa: "senado",
        tipo: m[1],
        sigla: p.identificacao as string,
        numero: Number(m[2]),
        ano: Number(m[3]),
        ementa: p.ementa ?? "",
        apresentacao: p.dataApresentacao,
        autor: p.autoria,
        status: fraseNormal(p.situacaoAtual),
        situacaoData: p.dataSituacaoAtual,
        tramitando: p.tramitando === "Sim",
        url: p.urlDocumento,
        coautoria: nome ? !primeiro(p.autoria).includes(nome.toLowerCase()) : undefined,
      };
    })
    .filter((p): p is Proposicao => p !== null)
    .sort((a, b) => (b.apresentacao ?? "").localeCompare(a.apresentacao ?? ""));
}

/** Floor votes on one Senate matter. */
export async function getSenadoVotacoesDaMateria(codigoMateria: string): Promise<Votacao[]> {
  const data = await getJson<RawVotacaoPlenario[]>(`${BASE}/votacao?codigoMateria=${encodeURIComponent(codigoMateria)}`);
  return asArray(data).filter((v) => v.dataSessao && v.codigoSessaoVotacao).map(mapVotacaoPlenario);
}

/* --------------------------- live floor session ------------------------- */

/** One item on the order paper of a Senate floor session. */
interface ItemPauta {
  codigo: string;
  sigla?: string;
  identificacao: string;
  cabecalho?: string;
  ementa?: string;
  deliberacao?: string;
  /** The Senate's own verdict flag: the item has been appreciated (voted). */
  apreciado: boolean;
  resultado?: string;
  url?: string;
}

/** A Senate floor session; live while `emAndamento`. */
interface SessaoPlenario {
  codigo: string;
  numero?: string;
  tipo?: string;
  hora?: string;
  emAndamento: boolean;
  itens: ItemPauta[];
}

interface RawAgendaSessao {
  CodigoSessao?: string;
  NumeroSessao?: string;
  TipoSessao?: string;
  Hora?: string;
  Casa?: string;
  SituacaoSessao?: string;
  Evento?: { DescricaoEvento?: string };
}

interface RawItemPauta {
  codigoItem?: string;
  codigoMateria?: string;
  identificacao?: string;
  cabecalho?: string;
  ementaPapeleta?: string;
  siglaMateria?: string;
  numeroMateria?: string;
  anoMateria?: string;
  textoResultado?: string;
  descricaoDeliberacao?: string;
  indicadorDeliberacao?: string;
}

interface RawResultadoSessao {
  codigoSessao?: string | number;
  numeroSessao?: string;
  dataSessao?: string;
  horaSessao?: string;
  tipoSessao?: string;
  descricaoTipoSessao?: string;
  siglaCasa?: string;
  Itens?: { Item?: RawItemPauta | RawItemPauta[] };
}

/** The plenário endpoints key on a compact date: `2026-10-14` → `20261014`. */
const semTraco = (data: string) => data.replace(/-/g, "");

function mapItemPauta(it: RawItemPauta): ItemPauta {
  const numero = (it.numeroMateria ?? "").replace(/^0+(?=\d)/, "");
  return {
    codigo: String(it.codigoItem ?? ""),
    sigla: it.siglaMateria ? `${it.siglaMateria} ${numero}/${it.anoMateria ?? ""}`.trim() : undefined,
    identificacao: (it.identificacao ?? "").trim(),
    cabecalho: it.cabecalho?.trim() || undefined,
    ementa: it.ementaPapeleta,
    deliberacao: it.descricaoDeliberacao,
    apreciado: it.indicadorDeliberacao === "S",
    resultado: (it.textoResultado ?? "").trim() || undefined,
    url: it.codigoMateria
      ? `https://www25.senado.leg.br/web/atividade/materias/-/materia/${it.codigoMateria}`
      : undefined,
  };
}

/** The day's floor agenda; `SituacaoSessao` says whether a session is running. */
async function getPlenarioAgenda(data: string): Promise<SessaoPlenario[]> {
  const d = await getJson<{ AgendaPlenario?: { Sessoes?: { Sessao?: RawAgendaSessao | RawAgendaSessao[] } } }>(
    `${BASE}/plenario/agenda/dia/${semTraco(data)}`
  );
  return asArray(d.AgendaPlenario?.Sessoes?.Sessao).map((s) => ({
    codigo: String(s.CodigoSessao ?? ""),
    numero: (s.NumeroSessao ?? "").match(/\d+/)?.[0],
    tipo: s.TipoSessao?.trim(),
    hora: s.Hora?.trim(),
    emAndamento: /andamento/i.test(s.SituacaoSessao ?? ""),
    itens: [],
  }));
}

async function getPlenarioResultado(data: string): Promise<Map<string, ItemPauta[]>> {
  const d = await getJson<{ ResultadoPlenario?: { Sessoes?: { Sessao?: RawResultadoSessao | RawResultadoSessao[] } } }>(
    `${BASE}/plenario/resultado/${semTraco(data)}`
  );
  const out = new Map<string, ItemPauta[]>();
  for (const s of asArray(d.ResultadoPlenario?.Sessoes?.Sessao)) {
    out.set(String(s.codigoSessao ?? ""), asArray(s.Itens?.Item).map(mapItemPauta));
  }
  return out;
}

/** The Senate announces the outcome in prose; read the matéria clause out of it. */
function clausulaMateria(texto: string): string {
  const m = /resultado da mat[ée]ria:\s*([^\n]*)/i.exec(texto);
  return (m?.[1] ?? texto.split("\n").find((l) => l.trim()) ?? "").trim();
}

function rotuloPendente(deliberacao?: string): string {
  return /não concluída/i.test(deliberacao ?? "") ? "Discussão em andamento" : "Ainda não votado";
}

/** Normalises a published order paper; the item on the floor is the first undecided. */
function itensSenado(itens: ItemPauta[]): ItemAoVivo[] {
  const atual = itens.findIndex((it) => !it.apreciado);
  return itens.map((it, i) =>
    itemAoVivo({
      id: it.codigo || String(i),
      sigla: it.sigla ?? it.identificacao,
      qualificador: it.cabecalho,
      ementa: it.ementa,
      decidida: it.apreciado,
      atual: i === atual,
      detalhe: it.apreciado && it.resultado ? clausulaMateria(it.resultado) : undefined,
      pendente: rotuloPendente(it.deliberacao),
      url: it.url,
    })
  );
}

function normalizar(s: SessaoPlenario): SessaoAoVivo {
  return {
    casa: "senado",
    titulo: "Plenário do Senado",
    meta: [s.numero && `${s.numero}ª sessão`, s.tipo?.toLowerCase(), s.hora].filter(Boolean).join(" · "),
    itens: itensSenado(s.itens),
  };
}

/**
 * The Senate floor session in progress, if any.
 *
 * The agenda is one call; the order-paper results are fetched only while a
 * session is running, so an idle day costs a single (cached) request. The
 * server caches both paths briefly, so every visitor shares one upstream call
 * per window instead of one each.
 */
export async function getSessaoSenado(data: string): Promise<SessaoAoVivo | undefined> {
  const agenda = await getPlenarioAgenda(data);
  const ativa = agenda.find((s) => s.emAndamento);
  if (!ativa) return undefined;
  const resultado = await getPlenarioResultado(data);
  return normalizar({ ...ativa, itens: resultado.get(ativa.codigo) ?? [] });
}

/* ------------------------------ pauta inspector ------------------------- */

/** `14/10/2026` → `2026-10-14`. */
function isoDeBR(s?: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s ?? "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : (s ?? "");
}

/** `YYYYMM01` for every month the window touches. */
function mesesDoIntervalo(ini: string, fim: string): string[] {
  const out: string[] = [];
  const d = new Date(`${ini}T12:00:00`);
  const end = new Date(`${fim}T12:00:00`);
  while (d <= end) {
    out.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}01`);
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

async function getResultadoMes(mes: string): Promise<RawResultadoSessao[]> {
  const d = await getJson<{ ResultadoPlenario?: { Sessoes?: { Sessao?: RawResultadoSessao | RawResultadoSessao[] } } }>(
    `${BASE}/plenario/resultado/mes/${mes}`
  );
  return asArray(d.ResultadoPlenario?.Sessoes?.Sessao);
}

/** Senate floor sessions with an order paper, for the pauta inspector. */
export async function getSessoesSenado(intervalo: { ini: string; fim: string }): Promise<SessaoPauta[]> {
  const partes = await Promise.all(mesesDoIntervalo(intervalo.ini, intervalo.fim).map(getResultadoMes));
  const out: SessaoPauta[] = [];
  for (const s of partes.flat()) {
    const itens = asArray(s.Itens?.Item).map(mapItemPauta);
    if (itens.length === 0) continue;
    out.push({
      id: `senado-${s.codigoSessao ?? ""}`,
      casa: "senado",
      data: isoDeBR(s.dataSessao),
      hora: s.horaSessao,
      tipo: s.descricaoTipoSessao ?? s.tipoSessao ?? "Sessão",
      orgao: "Plenário",
      aoVivo: false,
      itens: itensSenado(itens),
    });
  }
  return out.sort((a, b) => b.data.localeCompare(a.data));
}
