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

/** One item on the order paper of a Senate floor session. */
export interface ItemPauta {
  codigo: string;
  /** Short code of the matter, e.g. `PEC 221/2019`. */
  sigla?: string;
  identificacao: string;
  cabecalho?: string;
  ementa?: string;
  apreciacao?: string;
  parecer?: string;
  autor?: string;
  /** "Não apreciado", "Apreciado", "Apreciação não concluída"… */
  deliberacao?: string;
  /** The Senate's own verdict flag: the item has been appreciated (voted). */
  apreciado: boolean;
  /** Result text announced for the item. */
  resultado?: string;
  votado: boolean;
  materiaId?: number;
  url?: string;
}

/** A Senate floor session; live while `emAndamento`. */
export interface SessaoPlenario {
  codigo: string;
  numero?: string;
  tipo?: string;
  hora?: string;
  casa?: string;
  situacao?: string;
  emAndamento: boolean;
  evento?: string;
  itens: ItemPauta[];
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
