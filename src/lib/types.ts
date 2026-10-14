/**
 * Normalised domain model for the Congresso Aberto SPA.
 *
 * The Brazilian open-data APIs (Câmara and Senado) speak two very
 * different dialects. Everything below is the shape the UI consumes,
 * produced by the adapters in `lib/api`.
 */

export type Casa = "camara" | "senado";

export const CASA_LABEL: Record<Casa, string> = {
  camara: "Câmara dos Deputados",
  senado: "Senado Federal",
};

export interface Parlamentar {
  /** Globally unique, namespaced id, e.g. `camara-204379` or `senado-5672`. */
  id: string;
  casa: Casa;
  nome: string;
  nomeCompleto?: string;
  partido: string;
  uf: string;
  foto?: string;
  email?: string;
  legislatura?: number;
  situacao?: string;
  /** Papel institucional: Mesa, Liderança, etc. */
  papel?: string;
  sexo?: string;
  nascimento?: string;
  naturalidade?: string;
  escolaridade?: string;
  urlPerfil?: string;
  bloco?: string;
}

/** Where a proposal stands today and who is behind it, for the plain-language explainer. */
export interface ContextoProposta {
  situacao?: string;
  dataSituacao?: string;
  /** The law it became, e.g. "Lei Complementar 237/2026". */
  norma?: string;
  vetos?: "parcial" | "total";
  temas: string[];
  autores: string[];
  textoIntegral?: string;
}

export interface Proposicao {
  id: string;
  casa: Casa;
  tipo: string;
  sigla: string;
  numero: number;
  ano: number;
  ementa: string;
  apresentacao?: string;
  autor?: string;
  status?: string;
  orgao?: string;
  despacho?: string;
  situacaoData?: string;
  tramitando?: boolean;
  /** Listed as one of several authors rather than the first one. */
  coautoria?: boolean;
  /** True when this proposition already has a recorded vote. */
  votado?: boolean;
  /** Date of the recorded vote (when known). */
  votacaoData?: string;
  /** Latest merit vote, routable as `#/votacoes/<id>`. */
  votacaoId?: string;
  url?: string;
  inteiroTeor?: string;
}

export interface Tramitacao {
  data: string;
  sequencia?: number;
  orgao: string;
  orgaoSigla: string;
  descricao: string;
  situacao?: string;
  despacho?: string;
  regime?: string;
}

export interface Autor {
  nome: string;
  tipo?: string;
  partido?: string;
  uf?: string;
  proponente?: boolean;
}

export interface Placar {
  sim: number;
  nao: number;
  abstencao: number;
  total: number;
}

export interface VotacaoObjeto {
  id: string;
  sigla: string;
  ementa: string;
  url?: string;
}

export interface Votacao {
  id: string;
  casa: Casa;
  data: string;
  dataHora?: string;
  orgao: string;
  /** True for floor (plenário) votes. */
  plenario?: boolean;
  descricao: string;
  ementa?: string;
  /** 1 = aprovada, 0 = rejeitada, null = sem resultado binário (ex.: destaque). */
  aprovacao?: number | null;
  placar?: Placar | null;
  /** Sigla of the voted proposition, e.g. `PLP 74/2026`. */
  proposicao?: string;
  /** Câmara proposition id (the vote id prefix) or Senate matéria code. */
  proposicaoId?: string;
  proposicaoTipo?: string;
  /** Roll-call vote (individual votes are recorded). */
  nominal?: boolean;
  secreta?: boolean;
  url?: string;
  /** Senate: código da matéria, used to cross-reference propositions. */
  materiaId?: number;
  /** Propositions affected by the vote (Câmara detail). */
  objetos?: VotacaoObjeto[];
  /** Individual votes (Senate payload ships them inline). */
  votos?: VotoParlamentar[];
}

export type VotoCategoria =
  | "sim"
  | "nao"
  | "abstencao"
  | "obstrucao"
  | "presidente"
  | "presente"
  | "secreto"
  | "ausente";

export interface VotoParlamentar {
  parlamentarId: string;
  nome: string;
  partido: string;
  uf: string;
  foto?: string;
  /** Normalised, human-readable vote label. */
  voto: string;
  categoria: VotoCategoria;
  /** Raw code when it carries extra meaning (e.g. Senate `LS`, `MIS`). */
  detalhe?: string;
}

export interface OrientacaoBancada {
  sigla: string;
  orientacao: string;
  categoria: VotoCategoria | null;
  lideranca: "partido" | "bloco" | "governo" | "outro";
}

export interface Evento {
  id: string;
  casa: Casa;
  titulo: string;
  tipo: string;
  inicio: string;
  fim?: string;
  situacao: string;
  local?: string;
  orgao?: string;
  url?: string;
  pauta: Proposicao[];
}

/** Where an order-paper item stands in a live floor session. */
export type EstadoItem = "decidida" | "atual" | "pendente";

/** One item on a live floor order paper, normalised across both houses. */
export interface ItemAoVivo {
  id: string;
  /** Short code of the matter, e.g. `PEC 221/2019`. */
  sigla: string;
  /** A short qualifier beside the code (the Senate's cabeçalho, the Câmara's topic). */
  qualificador?: string;
  ementa?: string;
  estado: EstadoItem;
  /** Right-aligned status: the verdict when decided, the stage otherwise. */
  rotulo: string;
  /** Tone of `rotulo`, for a decided item. */
  tone?: StatusTone;
  /** A line under the item: the announced result, or the stage it is at. */
  detalhe?: string;
  url?: string;
}

/** A floor session currently in progress, in either house. */
export interface SessaoAoVivo {
  casa: Casa;
  /** Card title, e.g. "Plenário do Senado". */
  titulo: string;
  /** Secondary line: session number, type, start time. */
  meta?: string;
  itens: ItemAoVivo[];
}

/** A session's order paper, past or live, for the pauta inspector. */
export interface SessaoPauta {
  /** Namespaced id, e.g. `camara-83057` or `senado-591267`. */
  id: string;
  casa: Casa;
  /** YYYY-MM-DD. */
  data: string;
  hora?: string;
  tipo: string;
  orgao?: string;
  situacao?: string;
  aoVivo: boolean;
  /** Order-paper items; for a Câmara event they arrive when it is opened. */
  itens: ItemAoVivo[];
}

export interface Partido {
  sigla: string;
  nome: string;
  id?: number;
  logo?: string;
}

export interface DistribuicaoItem {
  name: string;
  value: number;
}

export type StatusTone =
  | "neutral"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "accent";
