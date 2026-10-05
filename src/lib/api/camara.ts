/**
 * Câmara dos Deputados adapter (`dadosabertos.camara.leg.br/api/v2`).
 * Raw payloads are normalised into the shared domain model.
 */
import type {
  Autor,
  Evento,
  Parlamentar,
  Partido,
  Placar,
  Proposicao,
  Tramitacao,
  Votacao,
  VotoParlamentar,
} from "../types";
import { createLimiter, getJson, getPaged, hasRel, type PagedResult } from "./http";

const BASE = "https://dadosabertos.camara.leg.br/api/v2";

/** Cap concurrent Câmara requests to stay under its rate limiter. */
const limit = createLimiter(3);
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

function mapVotacao(v: RawVotacao): Votacao {
  return {
    id: `camara-${v.id}`,
    casa: "camara",
    data: v.data,
    dataHora: v.dataHoraRegistro,
    orgao: v.siglaOrgao,
    descricao: v.descricao,
    aprovacao: v.aprovacao,
    placar: parsePlacar(v.descricao),
    url: v.uri,
  };
}

function mapVotacaoDetalhe(v: RawVotacaoDetalhe): Votacao {
  return {
    ...mapVotacao(v),
    objetos: (v.objetosPossiveis ?? []).map((o) => ({
      id: String(o.id),
      sigla: `${o.siglaTipo} ${o.numero}/${o.ano}`,
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

export interface ProposicoesQuery {
  tipo?: string;
  ano?: number;
  itens?: number;
  pagina?: number;
  ordem?: "ASC" | "DESC";
  ordenarPor?: string;
}

export async function getProposicoes(
  q: ProposicoesQuery = {}
): Promise<PagedResult<Proposicao>> {
  const url = new URL(`${BASE}/proposicoes`);
  if (q.tipo) url.searchParams.set("siglaTipo", q.tipo);
  if (q.ano) url.searchParams.set("ano", String(q.ano));
  url.searchParams.set("itens", String(q.itens ?? 20));
  url.searchParams.set("pagina", String(q.pagina ?? 1));
  url.searchParams.set("ordem", q.ordem ?? "DESC");
  url.searchParams.set("ordenarPor", q.ordenarPor ?? "id");

  const page = await getApiPaged<RawProposicao>(url.toString());
  return {
    items: page.dados.map(mapProposicao),
    total: page.total,
    hasNext: hasRel(page.links, "next"),
    hasPrev: hasRel(page.links, "previous"),
  };
}

export async function getProposicao(id: number | string): Promise<Proposicao> {
  const { dados } = await getApi<{ dados: RawProposicao }>(
    `${BASE}/proposicoes/${id}`
  );
  return mapProposicao(dados);
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
}): Promise<PagedResult<Votacao>> {
  const url = new URL(`${BASE}/votacoes`);
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
    voto: v.tipoVoto,
  }));
}

export async function getEventos(q: {
  dataInicio: string;
  dataFim: string;
  itens?: number;
}): Promise<Evento[]> {
  const url = new URL(`${BASE}/eventos`);
  url.searchParams.set("dataInicio", q.dataInicio);
  url.searchParams.set("dataFim", q.dataFim);
  url.searchParams.set("itens", String(q.itens ?? 50));
  url.searchParams.set("ordem", "ASC");
  const { dados } = await getApi<{ dados: RawEvento[] }>(url.toString());
  return (dados ?? []).map(mapEvento);
}

export async function getEventoPauta(eventoId: number | string): Promise<Proposicao[]> {
  const { dados } = await getApi<{ dados: RawPautaItem[] }>(
    `${BASE}/eventos/${eventoId}/pauta`
  );
  return (dados ?? []).map(mapPautaItem);
}

/** Cheap historical counter: one item + `X-Total-Count`. */
export async function countProposicoes(
  tipo: string,
  ano: number
): Promise<number> {
  const page = await getApiPaged<RawProposicao>(
    `${BASE}/proposicoes?siglaTipo=${tipo}&ano=${ano}&itens=1`
  );
  return page.total ?? page.dados.length;
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
export async function getProposicoesPorAutor(
  id: number | string,
  itens = 12
): Promise<Proposicao[]> {
  const url = new URL(`${BASE}/proposicoes`);
  url.searchParams.set("idDeputadoAutor", String(id));
  url.searchParams.set("itens", String(itens));
  url.searchParams.set("ordem", "DESC");
  url.searchParams.set("ordenarPor", "id");
  const { dados } = await getApi<{ dados: RawProposicao[] }>(url.toString());
  return (dados ?? []).map(mapProposicao);
}

/* ---------------- PECs voted in a given year (Câmara floor) ------------- */

/** Split a year into the ≤3-month windows the `votacoes` API requires. */
function periodosDoAno(ano: number): { ini: string; fim: string }[] {
  const hoje = new Date().toISOString().slice(0, 10);
  return [
    { ini: `${ano}-01-01`, fim: `${ano}-03-31` },
    { ini: `${ano}-04-01`, fim: `${ano}-06-30` },
    { ini: `${ano}-07-01`, fim: `${ano}-09-30` },
    { ini: `${ano}-10-01`, fim: `${ano}-12-31` },
  ]
    .map((w) => ({ ini: w.ini, fim: w.fim > hoje ? hoje : w.fim }))
    .filter((w) => w.ini <= hoje && w.ini <= w.fim);
}

const PEC_DESC_RE =
  /Proposta de Emenda (?:à|a) Constitui[çc][ãa]o\s*n?[º°o]?\s*(\d+)\s*,?\s*(?:de\s*)?(\d{4})/i;

/**
 * Reads a plenary vote description and returns the PEC whose *merit* was
 * voted, or null for procedural votes (requerimentos, interstícios…).
 */
function parsePecMerito(descricao: string): { numero: number; ano: number } | null {
  const m = PEC_DESC_RE.exec(descricao);
  if (!m) return null;
  const d = descricao.toLowerCase();
  if (/^\s*(aprovad|rejeitad)[ao]?\s+o\s+requerimento/.test(d)) return null;
  if (
    d.includes("desmembramento") ||
    d.includes("inclusão da proposta") ||
    d.includes("inclusao da proposta") ||
    d.includes("dispensa de interstício") ||
    d.includes("dispensa de intersticio") ||
    d.includes("quebra de interstício") ||
    d.includes("quebra de intersticio")
  ) {
    return null;
  }
  return { numero: Number(m[1]), ano: Number(m[2]) };
}

/**
 * PECs whose merit was voted on the Câmara floor during `ano`, regardless
 * of the year they were presented. Walks the year's plenary votes,
 * extracts PEC references from the vote descriptions and resolves each
 * one back to its proposition.
 */
export async function getPecsVotadasNoAno(ano: number): Promise<Proposicao[]> {
  interface Ref {
    numero: number;
    ano: number;
    data: string;
    aprovacao: number | null;
    count: number;
  }
  const refs = new Map<string, Ref>();

  for (const w of periodosDoAno(ano)) {
    for (let pagina = 1; pagina <= 60; pagina += 1) {
      let page: { dados: RawVotacao[] };
      try {
        page = await getApiPaged<RawVotacao>(
          `${BASE}/votacoes?dataInicio=${w.ini}&dataFim=${w.fim}&idOrgao=180&itens=100&pagina=${pagina}`
        );
      } catch {
        break; // skip a failing window rather than fail the whole apuração
      }
      if (page.dados.length === 0) break;
      for (const v of page.dados) {
        const parsed = parsePecMerito(v.descricao ?? "");
        if (!parsed) continue;
        const key = `${parsed.ano}-${parsed.numero}`;
        const cur = refs.get(key);
        if (cur) {
          cur.count += 1;
          if (v.data && v.data < cur.data) cur.data = v.data;
        } else {
          refs.set(key, {
            numero: parsed.numero,
            ano: parsed.ano,
            data: v.data,
            aprovacao: v.aprovacao,
            count: 1,
          });
        }
      }
      if (page.dados.length < 100) break;
    }
  }

  const result: Proposicao[] = [];
  for (const ref of refs.values()) {
    let raw: RawProposicao | undefined;
    try {
      const { dados } = await getApi<{ dados: RawProposicao[] }>(
        `${BASE}/proposicoes?siglaTipo=PEC&ano=${ref.ano}&numero=${ref.numero}`
      );
      raw = (dados ?? []).find((x) => x.numero === ref.numero) ?? dados?.[0];
    } catch {
      raw = undefined;
    }
    if (!raw) continue;
    const base = mapProposicao(raw);
    result.push({
      ...base,
      votado: true,
      votacaoData: ref.data,
      status:
        ref.aprovacao === 1
          ? "Aprovada no Plenário"
          : ref.aprovacao === 0
            ? "Rejeitada no Plenário"
            : base.status,
      despacho: `${ref.count} votaç${ref.count === 1 ? "ão" : "ões"} de mérito em ${ano}`,
    });
  }

  return result.sort((a, b) =>
    (b.votacaoData ?? "").localeCompare(a.votacaoData ?? "")
  );
}
