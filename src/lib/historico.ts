import type { Deliberacao } from "./deliberacoes";
import { OrientacoesPorPartido } from "./inspecao";
import { etapaDaVotacao } from "./linguagem";
import type { OrientacaoBancada, Votacao, VotoCategoria, VotoParlamentar } from "./types";

const MERITO: ReadonlySet<string> = new Set(["sim", "nao", "abstencao", "obstrucao"]);
const PARTICIPOU: ReadonlySet<string> = new Set(["sim", "nao", "abstencao", "obstrucao", "presidente", "secreto"]);

/** A member's position in one vote; "sem-registro" when the roll-call does not list them. */
export type Posicao = VotoCategoria | "sem-registro";

export interface FonteVotacao {
  votacao: Votacao;
  deliberacao: Deliberacao;
  votos: VotoParlamentar[];
  orientacoes: OrientacaoBancada[];
}

export interface RegistroVoto {
  votacao: Votacao;
  deliberacao: Deliberacao;
  posicao: Posicao;
  /** Party at the time of the vote. */
  partido?: string;
  pedidoPartido?: VotoCategoria;
  /** Where the party position came from: its leader's orientation or its members' majority. */
  fontePartido?: "orientacao" | "maioria";
  pedidoGoverno?: VotoCategoria;
  seguiuPartido: boolean | null;
  seguiuGoverno: boolean | null;
  merito: boolean;
}

export interface Alinhamento {
  seguiu: number;
  comparaveis: number;
}

export interface ResumoHistorico {
  total: number;
  participou: number;
  partido: Alinhamento;
  governo: Alinhamento;
  contagem: Partial<Record<Posicao, number>>;
}

/** How one member voted across a set of roll-calls, and how that compares to party and government. */
export class HistoricoParlamentar {
  private readonly id: string;
  private readonly partidoAtual?: string;

  constructor(id: string, partidoAtual?: string) {
    this.id = id;
    this.partidoAtual = partidoAtual;
  }

  registro(fonte: FonteVotacao): RegistroVoto {
    const voto = fonte.votos.find((v) => v.parlamentarId === this.id);
    const posicao: Posicao = voto?.categoria ?? "sem-registro";
    const partido = voto?.partido || this.partidoAtual;
    const orientacao = partido ? new OrientacoesPorPartido(fonte.orientacoes).de(partido) : undefined;
    const governo = fonte.orientacoes.find((o) => o.lideranca === "governo")?.categoria ?? undefined;

    let pedidoPartido: VotoCategoria | undefined;
    let fontePartido: RegistroVoto["fontePartido"];
    if (orientacao?.categoria && MERITO.has(orientacao.categoria)) {
      pedidoPartido = orientacao.categoria;
      fontePartido = "orientacao";
    } else if (partido) {
      pedidoPartido = this.maioria(fonte.votos, partido);
      fontePartido = pedidoPartido ? "maioria" : undefined;
    }
    const pedidoGoverno = governo && MERITO.has(governo) ? governo : undefined;

    return {
      votacao: fonte.votacao,
      deliberacao: fonte.deliberacao,
      posicao,
      partido,
      pedidoPartido,
      fontePartido,
      pedidoGoverno,
      seguiuPartido: this.comparar(posicao, pedidoPartido),
      seguiuGoverno: this.comparar(posicao, pedidoGoverno),
      merito: etapaDaVotacao(fonte.votacao.descricao).merito,
    };
  }

  static resumo(registros: RegistroVoto[]): ResumoHistorico {
    const contagem: Partial<Record<Posicao, number>> = {};
    const partido: Alinhamento = { seguiu: 0, comparaveis: 0 };
    const governo: Alinhamento = { seguiu: 0, comparaveis: 0 };
    let participou = 0;
    for (const r of registros) {
      contagem[r.posicao] = (contagem[r.posicao] ?? 0) + 1;
      if (PARTICIPOU.has(r.posicao)) participou += 1;
      if (r.seguiuPartido !== null) {
        partido.comparaveis += 1;
        if (r.seguiuPartido) partido.seguiu += 1;
      }
      if (r.seguiuGoverno !== null) {
        governo.comparaveis += 1;
        if (r.seguiuGoverno) governo.seguiu += 1;
      }
    }
    return { total: registros.length, participou, partido, governo, contagem };
  }

  /** Sim or Não, whichever most other members of the party chose; none on a tie. */
  private maioria(votos: VotoParlamentar[], partido: string): VotoCategoria | undefined {
    let sim = 0;
    let nao = 0;
    for (const v of votos) {
      if (v.parlamentarId === this.id || v.partido !== partido) continue;
      if (v.categoria === "sim") sim += 1;
      else if (v.categoria === "nao") nao += 1;
    }
    if (sim === nao) return undefined;
    return sim > nao ? "sim" : "nao";
  }

  private comparar(posicao: Posicao, pedido?: VotoCategoria): boolean | null {
    if (!pedido || !MERITO.has(posicao)) return null;
    return posicao === pedido;
  }
}
