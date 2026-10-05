const CAMARA_API = "https://dadosabertos.camara.leg.br/api/v2";
const SENADO_API = "https://www12.senado.leg.br/dadosabertos";

export interface Proposicao {
  id: number;
  uri: string;
  siglaTipo: string;
  codTipo: number;
  numero: number;
  ano: number;
  ementa: string;
  dataApresentacao: string;
  statusProposicao?: {
    dataHora: string;
    sequencia: number;
    siglaOrgao: string;
    uriOrgao: string;
    regime: string;
    descricaoTramitacao: string;
    codTipoTramitacao: string;
    descricaoSituacao: string;
    codSituacao: number;
    despacho: string;
    url: string;
    ambito: string;
    apreciacao: string;
  };
  uriAutores?: string;
  descricaoTipo?: string;
  ementaDetalhada?: string;
  keywords?: string;
  urlInteiroTeor?: string;
}

export interface Deputado {
  id: number;
  uri: string;
  nome: string;
  siglaPartido: string;
  uriPartido: string;
  siglaUf: string;
  idLegislatura: number;
  urlFoto: string;
  email: string;
}

export interface Partido {
  id: number;
  uri: string;
  sigla: string;
  nome: string;
  urlLogo?: string;
}

export interface Tramitacao {
  dataHora: string;
  sequencia: number;
  siglaOrgao: string;
  uriOrgao: string;
  regime: string;
  descricaoTramitacao: string;
  codTipoTramitacao: string;
  descricaoSituacao: string;
  codSituacao: number;
  despacho: string;
  url: string;
  ambito: string;
}

export interface Paginacao {
  dados: unknown[];
  links: { rel: string; href: string }[];
}

async function fetchApi<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getProposicoes(
  params: {
    siglaTipo?: string;
    ano?: number;
    itens?: number;
    pagina?: number;
    ordenarPor?: string;
  } = {}
): Promise<Paginacao> {
  const search = new URLSearchParams();
  if (params.siglaTipo) search.set("siglaTipo", params.siglaTipo);
  if (params.ano) search.set("ano", String(params.ano));
  if (params.itens) search.set("itens", String(params.itens));
  if (params.pagina) search.set("pagina", String(params.pagina));
  if (params.ordenarPor) search.set("ordenarPor", params.ordenarPor);
  search.set("ordem", "ASC");

  return fetchApi<Paginacao>(`${CAMARA_API}/proposicoes?${search}`);
}

export async function getProposicao(id: number): Promise<{ dados: Proposicao }> {
  return fetchApi(`${CAMARA_API}/proposicoes/${id}`);
}

export async function getProposicaoTramitacoes(
  id: number,
  params: { itens?: number; pagina?: number } = {}
): Promise<Paginacao> {
  const search = new URLSearchParams();
  if (params.itens) search.set("itens", String(params.itens));
  if (params.pagina) search.set("pagina", String(params.pagina));
  search.set("ordem", "DESC");

  return fetchApi<Paginacao>(
    `${CAMARA_API}/proposicoes/${id}/tramitacoes?${search}`
  );
}

export async function getDeputados(
  params: { itens?: number; pagina?: number; ordenarPor?: string } = {}
): Promise<Paginacao> {
  const search = new URLSearchParams();
  if (params.itens) search.set("itens", String(params.itens));
  if (params.pagina) search.set("pagina", String(params.pagina));
  if (params.ordenarPor) search.set("ordenarPor", params.ordenarPor);
  search.set("ordem", "ASC");

  return fetchApi<Paginacao>(`${CAMARA_API}/deputados?${search}`);
}

export async function getPartidos(): Promise<Paginacao> {
  return fetchApi<Paginacao>(`${CAMARA_API}/partidos?itens=100&ordem=ASC&ordenarPor=sigla`);
}

export async function getDeputado(id: number): Promise<{ dados: Deputado }> {
  return fetchApi(`${CAMARA_API}/deputados/${id}`);
}

export async function getProposicaoAutores(
  id: number
): Promise<Paginacao> {
  return fetchApi<Paginacao>(`${CAMARA_API}/proposicoes/${id}/autores`);
}

export async function getSenadoMesa(): Promise<Paginacao> {
  return fetchApi<Paginacao>(`${SENADO_API}/mesa`);
}

export async function getSenadores(): Promise<Paginacao> {
  return fetchApi<Paginacao>(`${SENADO_API}/senador/lista/atual`);
}

export async function getSenador(id: number): Promise<unknown> {
  return fetchApi(`${SENADO_API}/senador/${id}`);
}
