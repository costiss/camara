import type { Deliberacao } from "./deliberacoes";
import { Periodo } from "./periodo";
import type { Casa } from "./types";
import { resultadoVotacao } from "./votos";

export type CasaFiltro = Casa | "ambas";
export type ResultadoFiltro = "todos" | "aprovada" | "rejeitada" | "outros";
export type Ordem = "recentes" | "antigas";
type Faceta = "tipo" | "resultado";

export const CASAS: readonly CasaFiltro[] = ["ambas", "camara", "senado"];
export const RESULTADOS: readonly ResultadoFiltro[] = ["todos", "aprovada", "rejeitada", "outros"];
export const ORDENS: readonly Ordem[] = ["recentes", "antigas"];
export const POR_PAGINA = 25;
const SEM_TIPO = "Outros";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function escolher<T extends string>(raw: string | null, opcoes: readonly T[], fallback: T): T {
  return raw && (opcoes as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

/** Filters of the votes list, read from and written to the URL query. */
export class FiltroVotacoes {
  readonly casa: CasaFiltro;
  readonly periodo: string;
  readonly tipo: string;
  readonly resultado: ResultadoFiltro;
  readonly nominal: boolean;
  readonly busca: string;
  readonly ordem: Ordem;
  readonly pagina: number;

  constructor(query: URLSearchParams) {
    this.casa = escolher(query.get("casa"), CASAS, "ambas");
    this.periodo = query.get("periodo") ?? Periodo.PADRAO;
    this.tipo = query.get("tipo") ?? "";
    this.resultado = escolher(query.get("resultado"), RESULTADOS, "todos");
    this.nominal = query.get("nominal") === "1";
    this.busca = query.get("q") ?? "";
    this.ordem = escolher(query.get("ordem"), ORDENS, "recentes");
    this.pagina = Math.max(1, Number(query.get("pagina")) || 1);
  }

  static tipoDe(d: Deliberacao): string {
    return d.principal.proposicaoTipo ?? d.proposicao?.split(" ")[0] ?? SEM_TIPO;
  }

  static resultadoDe(d: Deliberacao): Exclude<ResultadoFiltro, "todos"> {
    const tone = resultadoVotacao(d.principal).tone;
    if (tone === "success") return "aprovada";
    if (tone === "danger") return "rejeitada";
    return "outros";
  }

  get ativos(): number {
    return [this.tipo, this.resultado !== "todos", this.nominal, this.busca.trim()].filter(Boolean).length;
  }

  /** Applies every filter except `ignorar`, so facet counts show what each choice would yield. */
  filtrar(deliberacoes: Deliberacao[], ignorar?: Faceta): Deliberacao[] {
    const q = norm(this.busca.trim());
    const out = deliberacoes.filter(
      (d) =>
        (ignorar === "tipo" || !this.tipo || FiltroVotacoes.tipoDe(d) === this.tipo) &&
        (ignorar === "resultado" || this.resultado === "todos" || FiltroVotacoes.resultadoDe(d) === this.resultado) &&
        (!this.nominal || d.votacoes.some((v) => v.nominal)) &&
        (!q || norm(`${d.proposicao ?? ""} ${d.ementa ?? ""} ${d.principal.descricao ?? ""}`).includes(q))
    );
    return this.ordem === "antigas" ? out.reverse() : out;
  }

  contar(deliberacoes: Deliberacao[], faceta: Faceta): Map<string, number> {
    const out = new Map<string, number>();
    for (const d of this.filtrar(deliberacoes, faceta)) {
      const chave = faceta === "tipo" ? FiltroVotacoes.tipoDe(d) : FiltroVotacoes.resultadoDe(d);
      out.set(chave, (out.get(chave) ?? 0) + 1);
    }
    return out;
  }
}
