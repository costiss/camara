import type {
  Casa,
  Parlamentar,
  Placar,
  StatusTone,
  Votacao,
  VotoCategoria,
  VotoParlamentar,
} from "./types";

export const CADEIRAS: Record<Casa, number> = { camara: 513, senado: 81 };

const SENADO_AUSENCIA: Record<string, string> = {
  AP: "Atividade parlamentar",
  LS: "Licença saúde",
  LP: "Licença particular",
  LG: "Licença gestante",
  LAP: "Licença (atividade parlamentar)",
  MIS: "Em missão",
  NCom: "Não compareceu",
  NA: "Não apurado",
  REP: "Em representação",
};

export interface VotoClassificado {
  voto: string;
  categoria: VotoCategoria;
  detalhe?: string;
}

/** Normalises the vote codes of both houses into one vocabulary. */
export class VotoClassifier {
  static classify(raw: string | null | undefined): VotoClassificado {
    const code = (raw ?? "").trim();
    const lower = code.toLowerCase();
    if (lower === "sim") return { voto: "Sim", categoria: "sim" };
    if (lower === "não" || lower === "nao") return { voto: "Não", categoria: "nao" };
    if (lower.startsWith("absten")) return { voto: "Abstenção", categoria: "abstencao" };
    if (lower.startsWith("obstr") || lower === "p-od") {
      return { voto: "Obstrução", categoria: "obstrucao" };
    }
    if (lower.startsWith("artigo 17") || lower.startsWith("art. 17")) {
      return { voto: "Presidente", categoria: "presidente", detalhe: "Art. 17 do RICD" };
    }
    if (lower.startsWith("presidente")) {
      return { voto: "Presidente", categoria: "presidente", detalhe: "Art. 51 do RISF" };
    }
    if (lower === "votou") return { voto: "Votou (secreto)", categoria: "secreto" };
    if (lower === "p-nrv") {
      return { voto: "Presente, não votou", categoria: "presente", detalhe: code };
    }
    if (!code) return { voto: "Ausente", categoria: "ausente" };
    return { voto: "Ausente", categoria: "ausente", detalhe: SENADO_AUSENCIA[code] ?? code };
  }
}

export const CATEGORIA_LABEL: Record<VotoCategoria, string> = {
  sim: "Sim",
  nao: "Não",
  abstencao: "Abstenção",
  obstrucao: "Obstrução",
  presidente: "Presidente",
  presente: "Presente, não votou",
  secreto: "Votou (secreto)",
  ausente: "Ausente",
};

export const CATEGORIA_ORDEM: VotoCategoria[] = [
  "sim",
  "nao",
  "abstencao",
  "obstrucao",
  "secreto",
  "presidente",
  "presente",
  "ausente",
];

export const CATEGORIA_COR: Record<VotoCategoria, string> = {
  sim: "#3FB27F",
  nao: "#E5484D",
  abstencao: "#A6A39C",
  obstrucao: "#E2A336",
  secreto: "#8E9BFF",
  presidente: "#5B8DEF",
  presente: "#6F6C66",
  ausente: "#2C2A26",
};

export type Tally = Record<VotoCategoria, number>;

export class VoteTally {
  readonly counts: Tally;
  readonly cadeiras: number;

  constructor(votos: VotoParlamentar[], cadeiras: number) {
    this.cadeiras = cadeiras;
    this.counts = {
      sim: 0,
      nao: 0,
      abstencao: 0,
      obstrucao: 0,
      presidente: 0,
      presente: 0,
      secreto: 0,
      ausente: 0,
    };
    for (const v of votos) this.counts[v.categoria] += 1;
  }

  /** Members who registered any vote (including abstention and the chair). */
  get votantes(): number {
    const c = this.counts;
    return c.sim + c.nao + c.abstencao + c.obstrucao + c.presidente + c.secreto;
  }

  /** Seats without a recorded vote: explicit absences plus unlisted seats. */
  get ausentes(): number {
    return Math.max(0, this.cadeiras - this.votantes - this.counts.presente);
  }

  get placar(): Placar {
    const c = this.counts;
    return { sim: c.sim, nao: c.nao, abstencao: c.abstencao, total: this.votantes };
  }
}

export interface Resultado {
  label: string;
  tone: StatusTone;
}

/**
 * The API's `aprovacao` flag is null for destaque votes ("Mantido o texto")
 * and for secret ballots, so the description is the source of truth.
 */
export function resultadoVotacao(v: Pick<Votacao, "descricao" | "aprovacao">): Resultado {
  const d = (v.descricao ?? "").trim().toLowerCase();
  if (/^mantid[oa]/.test(d)) return { label: "Texto mantido", tone: "info" };
  if (/^suprimid[oa]/.test(d)) return { label: "Texto suprimido", tone: "warning" };
  if (/^prejudicad[oa]/.test(d)) return { label: "Prejudicada", tone: "neutral" };
  if (/^retirad[oa]/.test(d)) return { label: "Retirada", tone: "neutral" };
  if (/^aprovad[oa]/.test(d) || v.aprovacao === 1) return { label: "Aprovada", tone: "success" };
  if (/^rejeitad[oa]/.test(d) || v.aprovacao === 0) return { label: "Rejeitada", tone: "danger" };
  return { label: "Sem resultado", tone: "neutral" };
}

export interface Quorum {
  regra: string;
  minimoSim: number | null;
}

/** Constitutional thresholds for the floor of each house. */
export function quorumDe(casa: Casa, tipo?: string): Quorum {
  const membros = CADEIRAS[casa];
  if (tipo === "PEC") {
    return { regra: "3/5 dos membros, em dois turnos", minimoSim: Math.ceil((membros * 3) / 5) };
  }
  if (tipo === "PLP") {
    return { regra: "Maioria absoluta", minimoSim: Math.floor(membros / 2) + 1 };
  }
  return { regra: "Maioria simples dos presentes", minimoSim: null };
}

/** Adds an `Ausente` entry for every current member missing from a roll-call. */
export function completarAusentes(
  votos: VotoParlamentar[],
  membros: Parlamentar[],
  cadeiras: number
): VotoParlamentar[] {
  const listed = new Set(votos.map((v) => v.parlamentarId));
  const vagas = Math.max(0, cadeiras - votos.length);
  const ausentes: VotoParlamentar[] = membros
    .filter((m) => !listed.has(m.id))
    .slice(0, vagas)
    .map((m) => ({
      parlamentarId: m.id,
      nome: m.nome,
      partido: m.partido,
      uf: m.uf,
      foto: m.foto,
      voto: "Ausente",
      categoria: "ausente",
    }));
  return [...votos, ...ausentes];
}

export function corDoVoto(categoria: VotoCategoria): string {
  return CATEGORIA_COR[categoria];
}

export function toneDoVoto(categoria: VotoCategoria): StatusTone {
  if (categoria === "sim") return "success";
  if (categoria === "nao") return "danger";
  if (categoria === "obstrucao") return "warning";
  if (categoria === "presidente" || categoria === "secreto") return "info";
  return "neutral";
}
