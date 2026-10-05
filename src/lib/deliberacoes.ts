import type { Casa, Votacao } from "./types";

/** Every floor vote on one proposition during one session day. */
export interface Deliberacao {
  key: string;
  casa: Casa;
  data: string;
  dataHora: string;
  proposicaoId?: string;
  proposicao?: string;
  ementa?: string;
  principal: Votacao;
  votacoes: Votacao[];
}

const PROCEDIMENTAL =
  /^(aprovad[oa]|rejeitad[oa])\s+(o\s+requerimento|a\s+prefer[eê]ncia|a\s+reda[çc][ãa]o\s+final|o\s+parecer[^.]*aprecia[çc][ãa]o\s+preliminar)/i;
const DESTAQUE = /^(mantid[oa]|suprimid[oa])\b|\bemenda\s+(n[º°o]|de\s+reda)/i;

export class DeliberacaoBuilder {
  /** Merit votes outrank destaques, which outrank procedural ones. */
  static peso(v: Votacao): number {
    const d = v.descricao ?? "";
    let score = 0;
    if (v.nominal) score += 4;
    if (PROCEDIMENTAL.test(d)) score -= 3;
    else if (DESTAQUE.test(d)) score -= 1;
    else score += 2;
    if (/segundo\s+turno|2[ºo°]\s+turno/i.test(d)) score += 1;
    return score;
  }

  static principal(votacoes: Votacao[]): Votacao {
    return [...votacoes].sort(
      (a, b) =>
        DeliberacaoBuilder.peso(b) - DeliberacaoBuilder.peso(a) ||
        (b.dataHora ?? b.data).localeCompare(a.dataHora ?? a.data)
    )[0];
  }

  static agrupar(votacoes: Votacao[]): Deliberacao[] {
    const grupos = new Map<string, Votacao[]>();
    for (const v of votacoes) {
      const key = `${v.casa}:${v.proposicaoId ?? v.proposicao ?? v.id}:${v.data.slice(0, 10)}`;
      grupos.set(key, [...(grupos.get(key) ?? []), v]);
    }
    return [...grupos.entries()]
      .map(([key, vs]) => {
        const ordenadas = [...vs].sort((a, b) =>
          (b.dataHora ?? b.data).localeCompare(a.dataHora ?? a.data)
        );
        const principal = DeliberacaoBuilder.principal(ordenadas);
        return {
          key,
          casa: principal.casa,
          data: principal.data.slice(0, 10),
          dataHora: ordenadas[0].dataHora ?? ordenadas[0].data,
          proposicaoId: principal.proposicaoId,
          proposicao: principal.proposicao,
          ementa: principal.ementa,
          principal,
          votacoes: ordenadas,
        };
      })
      .sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  }
}
