/**
 * Câmara dos Deputados adapter (`dadosabertos.camara.leg.br/api/v2`).
 * Raw payloads are normalised into the shared domain model.
 */
import type {
  Autor,
  ContextoProposta,
  Evento,
  OrientacaoBancada,
  Parlamentar,
  Partido,
  Placar,
  Proposicao,
  Tramitacao,
  Votacao,
  VotoParlamentar,
} from "../types";
import { VotoClassifier } from "../votos";
import { CAMARA_BASE, VIA_PROXY } from "./config";
import { createLimiter, getJson, getPaged, hasRel, type PagedResult } from "./http";

const BASE = CAMARA_BASE;

/** Cap concurrent Câmara requests to stay under its rate limiter. */
const limit = createLimiter(VIA_PROXY ? 8 : 3);
const getApi = <T>(url: string, init?: RequestInit) => limit(() => getJson<T>(url, init));
const getApiPaged = <T>(url: string) => limit(() => getPaged<T>(url));

/* ----------------------------- raw shapes ----------------------------- */

interface RawDeputado {
  id: number;
  nome: string;
  siglaPartido: string;
  siglaUf: string;
  idLegislatura: number;
  urlFoto: string;
  email: string;
}

interface RawDeputadoDetalhe {
  id: number;
  nomeCivil: string;
  sexo: string;
  urlWebsite: string | null;
  redeSocial: string[];
  dataNascimento: string;
  dataFalecimento: string | null;
  ufNascimento: string;
  municipioNascimento: string;
  escolaridade: string;
  ultimoStatus: {
    nome: string;
    siglaPartido: string;
    siglaUf: string;
    idLegislatura: number;
    urlFoto: string;
    email: string;
    nomeEleitoral: string;
    situacao: string;
    condicaoEleitoral: string;
    descricaoStatus: string;
    gabinete?: { nome?: string; predio?: string; sala?: string; andar?: string };
  };
}

interface RawStatusProposicao {
  dataHora: string;
  sequencia: number;
  siglaOrgao: string;
  regime: string;
  descricaoTramitacao: string;
  codTipoTramitacao: string;
  descricaoSituacao: string;
  codSituacao: number;
  despacho: string;
  url?: string;
}

interface RawProposicao {
  id: number;
  uri: string;
  siglaTipo: string;
  codTipo: number;
  numero: number;
  ano: number;
  ementa: string;
  dataApresentacao: string;
  statusProposicao?: RawStatusProposicao;
  ementaDetalhada?: string;
  keywords?: string;
  urlInteiroTeor?: string;
}

interface RawTramitacao {
  dataHora: string;
  sequencia: number;
  siglaOrgao: string;
  regime: string;
  descricaoTramitacao: string;
  descricaoSituacao: string;
  despacho: string;
}

interface RawAutor {
  uri: string;
  nome: string;
  tipo: string;
  proponente: number;
}

interface RawVotacao {
  id: string;
  uri: string;
  data: string;
  dataHoraRegistro: string;
  siglaOrgao: string;
  uriEvento?: string;
  proposicaoObjeto?: unknown;
  descricao: string;
  aprovacao: number | null;
}

interface RawVotacaoDetalhe extends RawVotacao {
  objetosPossiveis?: RawProposicao[];
  proposicoesAfetadas?: RawProposicao[];
}

interface RawOrientacao {
  orientacaoVoto: string;
  codTipoLideranca: string;
  siglaPartidoBloco: string;
}

interface RawVoto {
  tipoVoto: string;
  deputado_: {
    id: number;
    nome: string;
    siglaPartido: string;
    siglaUf: string;
    urlFoto: string;
  };
}

interface RawEvento {
  id: number;
  dataHoraInicio: string;
  dataHoraFim: string | null;
  situacao: string;
  descricaoTipo: string;
  descricao: string;
  localExterno: string | null;
  orgaos: { sigla: string; nome: string; apelido: string }[];
  localCamara: { nome: string } | null;
}

interface RawPautaItem {
  ordem: number;
  titulo: string;
  topico: string;
  situacaoItem: string | null;
  regime: string;
  uriVotacao: string | null;
  proposicao_: RawProposicao | null;
}

/* ------------------------------ mapping ------------------------------- */

function parsePlacar(descricao: string): Placar | null {
  const sim = /Sim:\s*(\d+)/i.exec(descricao);
  const nao = /N[ãa]o:\s*(\d+)/i.exec(descricao);
  const abst = /Absten[çc][ãa]o(?:es)?:\s*(\d+)/i.exec(descricao);
  const total = /Total:\s*(\d+)/i.exec(descricao);
  if (!sim && !nao && !total) return null;
  return {
    sim: sim ? Number(sim[1]) : 0,
    nao: nao ? Number(nao[1]) : 0,
    abstencao: abst ? Number(abst[1]) : 0,
    total: total ? Number(total[1]) : 0,
  };
}

export function mapDeputado(d: RawDeputado): Parlamentar {
  return {
    id: `camara-${d.id}`,
    casa: "camara",
    nome: d.nome,
    partido: d.siglaPartido,
    uf: d.siglaUf,
    foto: d.urlFoto,
    email: d.email,
    legislatura: d.idLegislatura,
    urlPerfil: `https://www.camara.leg.br/deputados/${d.id}`,
  };
}

export function mapDeputadoDetalhe(d: RawDeputadoDetalhe): Parlamentar {
  const u = d.ultimoStatus ?? ({} as RawDeputadoDetalhe["ultimoStatus"]);
  return {
    id: `camara-${d.id}`,
    casa: "camara",
    nome: u.nome ?? d.nomeCivil,
    nomeCompleto: d.nomeCivil,
    partido: u.siglaPartido,
    uf: u.siglaUf,
    foto: u.urlFoto,
    email: u.email,
    legislatura: u.idLegislatura,
    situacao: u.descricaoStatus ?? u.situacao,
    sexo: d.sexo,
    nascimento: d.dataNascimento,
    naturalidade: [d.municipioNascimento, d.ufNascimento].filter(Boolean).join(" / "),
    escolaridade: d.escolaridade,
    urlPerfil: `https://www.camara.leg.br/deputados/${d.id}`,
  };
}

export function mapProposicao(p: RawProposicao): Proposicao {
  const st = p.statusProposicao;
  return {
    id: String(p.id),
    casa: "camara",
    tipo: p.siglaTipo,
    sigla: `${p.siglaTipo} ${p.numero}/${p.ano}`,
    numero: p.numero,
    ano: p.ano,
    ementa: p.ementa,
    apresentacao: p.dataApresentacao,
    status: st?.descricaoSituacao,
    orgao: st?.siglaOrgao,
    despacho: st?.despacho,
    situacaoData: st?.dataHora,
    url: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${p.id}`,
    inteiroTeor: p.urlInteiroTeor,
  };
}

function mapTramitacao(t: RawTramitacao): Tramitacao {
  return {
    data: t.dataHora,
    sequencia: t.sequencia,
    orgao: t.siglaOrgao,
    orgaoSigla: t.siglaOrgao,
    descricao: t.descricaoTramitacao,
    situacao: t.descricaoSituacao,
    despacho: t.despacho,
    regime: t.regime,
  };
}

export const PLENARIO_CAMARA = 180;

/** Câmara vote ids are `{idProposicao}-{sequência}`. */
export function proposicaoIdDaVotacao(votacaoId: string): string {
  return votacaoId.replace(/^camara-/, "").split("-")[0];
}

function mapVotacao(v: RawVotacao): Votacao {
  const placar = parsePlacar(v.descricao ?? "");
  return {
    id: `camara-${v.id}`,
    casa: "camara",
    data: v.data,
    dataHora: v.dataHoraRegistro,
    orgao: v.siglaOrgao,
    plenario: v.siglaOrgao === "PLEN",
    descricao: v.descricao ?? "",
    aprovacao: v.aprovacao,
    placar,
    nominal: placar !== null,
    proposicaoId: proposicaoIdDaVotacao(v.id),
    url: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${proposicaoIdDaVotacao(v.id)}`,
  };
}

const siglaDe = (o: RawProposicao) => `${o.siglaTipo} ${o.numero}/${o.ano}`;

function mapVotacaoDetalhe(v: RawVotacaoDetalhe): Votacao {
  const base = mapVotacao(v);
  const afetadas = v.proposicoesAfetadas?.length
    ? v.proposicoesAfetadas
    : (v.objetosPossiveis ?? []);
  const principal =
    afetadas.find((o) => String(o.id) === base.proposicaoId) ?? afetadas[0];
  return {
    ...base,
    proposicao: principal ? siglaDe(principal) : undefined,
    proposicaoTipo: principal?.siglaTipo,
    ementa: principal?.ementa,
    objetos: afetadas.map((o) => ({
      id: String(o.id),
      sigla: siglaDe(o),
      ementa: o.ementa,
      url: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${o.id}`,
    })),
  };
}

function mapEvento(e: RawEvento): Evento {
  return {
    id: `camara-${e.id}`,
    casa: "camara",
    titulo: e.descricao,
    tipo: e.descricaoTipo,
    inicio: e.dataHoraInicio,
    fim: e.dataHoraFim ?? undefined,
    situacao: e.situacao,
    local: e.localCamara?.nome ?? e.localExterno ?? undefined,
    orgao: e.orgaos?.[0]?.apelido ?? e.orgaos?.[0]?.sigla,
    url: `https://www.camara.leg.br/evento-legislativo/${e.id}`,
    pauta: [],
  };
}

function mapPautaItem(item: RawPautaItem): Proposicao {
  if (item.proposicao_) {
    return { ...mapProposicao(item.proposicao_), votado: !!item.uriVotacao };
  }
  return {
    id: `pauta-${item.titulo}`,
    casa: "camara",
    tipo: item.topico || "Item",
    sigla: item.titulo,
    numero: 0,
    ano: 0,
    ementa: item.situacaoItem ?? item.titulo,
    orgao: item.titulo,
    status: item.situacaoItem ?? undefined,
    votado: !!item.uriVotacao || !!item.situacaoItem,
  };
}

/* ----------------------------- endpoints ------------------------------ */

export async function getDeputados(): Promise<Parlamentar[]> {
  const { dados } = await getApi<{ dados: RawDeputado[] }>(
    `${BASE}/deputados?itens=1000&ordem=ASC&ordenarPor=nome`
  );
  return dados.map(mapDeputado);
}

export async function getDeputado(id: number | string): Promise<Parlamentar> {
  const { dados } = await getApi<{ dados: RawDeputadoDetalhe }>(
    `${BASE}/deputados/${id}`
  );
  return mapDeputadoDetalhe(dados);
}

export async function getPartidos(): Promise<Partido[]> {
  const { dados } = await getApi<{ dados: { id: number; sigla: string; nome: string }[] }>(
    `${BASE}/partidos?itens=100&ordem=ASC&ordenarPor=sigla`
  );
  return dados.map((p) => ({ id: p.id, sigla: p.sigla, nome: p.nome }));
}

export async function getProposicao(id: number | string): Promise<Proposicao> {
  const { dados } = await getApi<{ dados: RawProposicao }>(
    `${BASE}/proposicoes/${id}`
  );
  return mapProposicao(dados);
}

/** Batch lookup: the API accepts a comma-separated `id` list. */
export async function getProposicoesPorIds(ids: string[]): Promise<Proposicao[]> {
  const out: Proposicao[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const lote = ids.slice(i, i + 50);
    const { dados } = await getApi<{ dados: RawProposicao[] }>(
      `${BASE}/proposicoes?id=${lote.join(",")}&itens=100`
    );
    out.push(...(dados ?? []).map(mapProposicao));
  }
  return out;
}

export async function getTramitacoes(id: number | string): Promise<Tramitacao[]> {
  const { dados } = await getApi<{ dados: RawTramitacao[] }>(
    `${BASE}/proposicoes/${id}/tramitacoes`
  );
  return (dados ?? [])
    .map(mapTramitacao)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

export async function getAutores(id: number | string): Promise<Autor[]> {
  const { dados } = await getApi<{ dados: RawAutor[] }>(
    `${BASE}/proposicoes/${id}/autores`
  );
  return (dados ?? []).map((a) => ({
    nome: a.nome,
    tipo: a.tipo,
    proponente: a.proponente === 1,
  }));
}

export async function getProposicaoVotacoes(
  id: number | string
): Promise<Votacao[]> {
  const { dados } = await getApi<{ dados: RawVotacao[] }>(
    `${BASE}/proposicoes/${id}/votacoes`
  );
  return (dados ?? []).map(mapVotacao);
}

export async function getVotacao(id: string): Promise<Votacao> {
  const { dados } = await getApi<{ dados: RawVotacaoDetalhe }>(
    `${BASE}/votacoes/${id}`
  );
  return mapVotacaoDetalhe(dados);
}

export async function getVotacoes(q: {
  dataInicio: string;
  dataFim: string;
  itens?: number;
  pagina?: number;
  idOrgao?: number;
}): Promise<PagedResult<Votacao>> {
  const url = new URL(`${BASE}/votacoes`);
  if (q.idOrgao) url.searchParams.set("idOrgao", String(q.idOrgao));
  url.searchParams.set("dataInicio", q.dataInicio);
  url.searchParams.set("dataFim", q.dataFim);
  url.searchParams.set("itens", String(q.itens ?? 20));
  url.searchParams.set("pagina", String(q.pagina ?? 1));
  url.searchParams.set("ordem", "DESC");
  url.searchParams.set("ordenarPor", "dataHoraRegistro");

  const page = await getApiPaged<RawVotacao>(url.toString());
  return {
    items: page.dados.map(mapVotacao),
    total: page.total,
    hasNext: hasRel(page.links, "next"),
    hasPrev: hasRel(page.links, "previous"),
  };
}

/** Every floor vote in a window of up to three months, newest first. */
export async function getVotacoesPlenario(dataInicio: string, dataFim: string): Promise<Votacao[]> {
  const dados = await paginarTudo<RawVotacao>(
    `${BASE}/votacoes?idOrgao=${PLENARIO_CAMARA}&dataInicio=${dataInicio}&dataFim=${dataFim}&ordem=DESC&ordenarPor=dataHoraRegistro`,
    20
  );
  return dados.map(mapVotacao);
}

export async function getVotacaoVotos(id: string): Promise<VotoParlamentar[]> {
  const { dados } = await getApi<{ dados: RawVoto[] }>(
    `${BASE}/votacoes/${id}/votos`
  );
  return (dados ?? []).map((v) => ({
    parlamentarId: `camara-${v.deputado_.id}`,
    nome: v.deputado_.nome,
    partido: v.deputado_.siglaPartido,
    uf: v.deputado_.siglaUf,
    foto: v.deputado_.urlFoto,
    ...VotoClassifier.classify(v.tipoVoto),
  }));
}

const LIDERANCA: Record<string, OrientacaoBancada["lideranca"]> = {
  P: "partido",
  B: "bloco",
  G: "governo",
};

/** How each party/bloc leader oriented its members (empty for symbolic votes). */
export async function getVotacaoOrientacoes(id: string): Promise<OrientacaoBancada[]> {
  const { dados } = await getApi<{ dados: RawOrientacao[] }>(
    `${BASE}/votacoes/${id}/orientacoes`
  );
  return (dados ?? [])
    .filter((o) => o.orientacaoVoto?.trim())
    .map((o) => {
      const c = VotoClassifier.classify(o.orientacaoVoto);
      const liberado = /libera/i.test(o.orientacaoVoto);
      return {
        sigla: o.siglaPartidoBloco,
        orientacao: liberado ? "Liberado" : c.voto,
        categoria: liberado ? null : c.categoria,
        lideranca: /^governo$/i.test(o.siglaPartidoBloco) ? "governo" : (LIDERANCA[o.codTipoLideranca] ?? "outro"),
      };
    });
}

export async function getEventos(q: {
  dataInicio: string;
  dataFim: string;
  ordem?: "ASC" | "DESC";
}): Promise<Evento[]> {
  const url = new URL(`${BASE}/eventos`);
  url.searchParams.set("dataInicio", q.dataInicio);
  url.searchParams.set("dataFim", q.dataFim);
  url.searchParams.set("ordem", q.ordem ?? "ASC");
  url.searchParams.set("ordenarPor", "dataHoraInicio");
  const dados = await paginarTudo<RawEvento>(url.toString(), 10);
  return dados.map(mapEvento);
}

export async function getEventoPauta(eventoId: number | string): Promise<Proposicao[]> {
  const { dados } = await getApi<{ dados: RawPautaItem[] }>(
    `${BASE}/eventos/${eventoId}/pauta`
  );
  return (dados ?? []).map(mapPautaItem);
}

export async function countVotacoes(
  dataInicio: string,
  dataFim: string
): Promise<number> {
  const page = await getApiPaged<RawVotacao>(
    `${BASE}/votacoes?dataInicio=${dataInicio}&dataFim=${dataFim}&itens=1`
  );
  return page.total ?? page.dados.length;
}

/** Recent propositions authored by a deputy. */
interface RawProposicaoDetalhe {
  keywords?: string | null;
  urlInteiroTeor?: string | null;
  statusProposicao?: {
    dataHora?: string;
    descricaoSituacao?: string | null;
    descricaoTramitacao?: string | null;
    despacho?: string | null;
  } | null;
}

const TEMAS_GENERICOS = /^(altera[çc][ãa]o|lei federal|lei|cria[çc][ãa]o|normas?|crit[ée]rios?|proposi[çc][ãa]o legislativa|projeto de lei|inaplica[çc][ãa]o|concess[ãa]o|proibi[çc][ãa]o|prorroga[çc][ãa]o|prazo|vig[êe]ncia|\d{4})$/i;

export function limparTemas(raw?: string | null): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const t of (raw ?? "").replace(/\.$/, "").split(/[,;]/)) {
    const tema = t.trim();
    const chave = tema.toLowerCase();
    if (!tema || TEMAS_GENERICOS.test(tema) || vistos.has(chave)) continue;
    vistos.add(chave);
    out.push(tema);
  }
  return out.slice(0, 6);
}

/** Current status, themes, authors and full text of a Câmara proposal. */
export async function getContextoProposicao(id: string): Promise<ContextoProposta> {
  const [detalhe, autores] = await Promise.all([
    getApi<{ dados: RawProposicaoDetalhe }>(`${BASE}/proposicoes/${id}`),
    getApi<{ dados: RawAutor[] }>(`${BASE}/proposicoes/${id}/autores`).catch(() => ({ dados: [] as RawAutor[] })),
  ]);
  const d = detalhe.dados ?? {};
  const st = d.statusProposicao ?? {};
  const texto = `${st.descricaoTramitacao ?? ""} ${st.despacho ?? ""}`;
  const norma = /Transformad[oa] n[oa] (Lei(?: Complementar)?|Emenda Constitucional|Decreto Legislativo|Resolu[çc][ãa]o)\s+([\d.]+\/\d{4})/i.exec(st.despacho ?? "");
  return {
    situacao: st.descricaoSituacao ?? undefined,
    dataSituacao: st.dataHora,
    norma: norma ? `${norma[1]} ${norma[2]}` : undefined,
    vetos: /veto(?:\s+|-)?total|vetad[oa] totalmente/i.test(texto) ? "total" : /veto parcial|vetad[oa] parcialmente/i.test(texto) ? "parcial" : undefined,
    temas: limparTemas(d.keywords),
    autores: (autores.dados ?? []).map((a) => a.nome).filter(Boolean),
    textoIntegral: d.urlInteiroTeor ?? undefined,
  };
}

export async function getProposicoesPorAutor(
  id: number | string,
  itens = 12
): Promise<Proposicao[]> {
  const url = new URL(`${BASE}/proposicoes`);
  url.searchParams.set("idDeputadoAutor", String(id));
  for (const tipo of ["PEC", "PLP", "PL", "PDL"]) url.searchParams.append("siglaTipo", tipo);
  url.searchParams.set("itens", String(itens));
  url.searchParams.set("ordem", "DESC");
  url.searchParams.set("ordenarPor", "id");
  const { dados } = await getApi<{ dados: RawProposicao[] }>(url.toString());
  return (dados ?? []).map(mapProposicao);
}


async function paginarTudo<T>(url: string, maxPaginas = 40): Promise<T[]> {
  const out: T[] = [];
  for (let pagina = 1; pagina <= maxPaginas; pagina += 1) {
    const page = await getApiPaged<T>(`${url}&itens=100&pagina=${pagina}`);
    out.push(...page.dados);
    if (!hasRel(page.links, "next")) break;
  }
  return out;
}

