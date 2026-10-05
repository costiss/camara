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
  descricao: string;
  ementa?: string;
  /** 1 = aprovada, 0 = rejeitada, null = sem placar/desconhecido. */
  aprovacao?: number | null;
  placar?: Placar | null;
  proposicao?: string;
  url?: string;
  /** Propositions that could be the object of the vote (Câmara detail). */
  objetos?: VotacaoObjeto[];
  /** Individual votes (loaded on demand). */
  votos?: VotoParlamentar[];
}

export interface VotoParlamentar {
  parlamentarId: string;
  nome: string;
  partido: string;
  uf: string;
  foto?: string;
  voto: string;
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
