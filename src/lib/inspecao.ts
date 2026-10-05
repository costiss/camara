import type { OrientacaoBancada, VotoCategoria, VotoParlamentar } from "./types";
import { CATEGORIA_LABEL, CATEGORIA_ORDEM } from "./votos";

const VOTOS_DE_MERITO: ReadonlySet<VotoCategoria> = new Set(["sim", "nao", "abstencao", "obstrucao"]);

export interface LinhaGrupo {
  chave: string;
  cadeiras: number;
  contagem: Record<VotoCategoria, number>;
  pctSim: number | null;
  orientacao?: OrientacaoBancada;
  /** Share of the party's merit votes that matched its leader's orientation. */
  fidelidade: number | null;
}

function contar(votos: VotoParlamentar[]): Record<VotoCategoria, number> {
  const out = Object.fromEntries(CATEGORIA_ORDEM.map((c) => [c, 0])) as Record<VotoCategoria, number>;
  for (const v of votos) out[v.categoria] += 1;
  return out;
}

/**
 * Orientation that binds each party: its own leader's, else its federation's
 * (federations list their members, e.g. `Fdr PT-PCdoB-PV`). Bloc names are
 * abbreviated by the API and cannot be resolved to parties.
 */
export class OrientacoesPorPartido {
  private readonly mapa = new Map<string, OrientacaoBancada>();

  constructor(orientacoes: OrientacaoBancada[]) {
    for (const o of orientacoes) {
      const federacao = /^Fdr\s+(.+)$/i.exec(o.sigla);
      if (!federacao) continue;
      for (const p of federacao[1].split("-")) this.mapa.set(p.trim().toUpperCase(), o);
    }
    for (const o of orientacoes) if (o.lideranca === "partido") this.mapa.set(o.sigla.toUpperCase(), o);
  }

  get vazio(): boolean {
    return this.mapa.size === 0;
  }

  de(partido: string): OrientacaoBancada | undefined {
    return this.mapa.get(partido.toUpperCase());
  }
}

/** Everything the inspect screen derives from one vote's seats and orientations. */
export class InspecaoVotacao {
  readonly assentos: VotoParlamentar[];
  private readonly porPartido: OrientacoesPorPartido;

  constructor(assentos: VotoParlamentar[], orientacoes: OrientacaoBancada[]) {
    this.assentos = assentos;
    this.porPartido = new OrientacoesPorPartido(orientacoes);
  }

  get temOrientacao(): boolean {
    return !this.porPartido.vazio;
  }

  orientacaoDe(partido: string): OrientacaoBancada | undefined {
    return this.porPartido.de(partido);
  }

  /** Voted on the merits against a binding party orientation. */
  contrariou(v: VotoParlamentar): boolean {
    const o = this.orientacaoDe(v.partido);
    return !!o?.categoria && VOTOS_DE_MERITO.has(o.categoria) && VOTOS_DE_MERITO.has(v.categoria) && v.categoria !== o.categoria;
  }

  get contagem(): Record<VotoCategoria, number> {
    return contar(this.assentos);
  }

  partidos(): LinhaGrupo[] {
    return this.agrupar((v) => v.partido, true);
  }

  estados(): LinhaGrupo[] {
    return this.agrupar((v) => v.uf, false).sort((a, b) => a.chave.localeCompare(b.chave));
  }

  private agrupar(chave: (v: VotoParlamentar) => string, comOrientacao: boolean): LinhaGrupo[] {
    const grupos = new Map<string, VotoParlamentar[]>();
    for (const v of this.assentos) grupos.set(chave(v), [...(grupos.get(chave(v)) ?? []), v]);
    return [...grupos.entries()]
      .map(([k, vs]) => {
        const contagem = contar(vs);
        const validos = contagem.sim + contagem.nao;
        const orientacao = comOrientacao ? this.orientacaoDe(k) : undefined;
        const merito = vs.filter((v) => VOTOS_DE_MERITO.has(v.categoria));
        const seguiram = merito.filter((v) => !this.contrariou(v)).length;
        const vinculante = !!orientacao?.categoria && VOTOS_DE_MERITO.has(orientacao.categoria);
        return {
          chave: k,
          cadeiras: vs.length,
          contagem,
          pctSim: validos ? (contagem.sim / validos) * 100 : null,
          orientacao,
          fidelidade: vinculante && merito.length ? (seguiram / merito.length) * 100 : null,
        };
      })
      .sort((a, b) => b.cadeiras - a.cadeiras || a.chave.localeCompare(b.chave));
  }
}

export type OrdemVotos = "nome" | "partido" | "uf" | "voto";
export const ORDENS_VOTOS: readonly OrdemVotos[] = ["nome", "partido", "uf", "voto"];
export const FILTROS_VOTO: readonly (VotoCategoria | "todos")[] = ["todos", ...CATEGORIA_ORDEM];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Roll-call filters, read from the URL query. */
export class FiltroVotos {
  readonly voto: VotoCategoria | "todos";
  readonly partido: string;
  readonly uf: string;
  readonly nome: string;
  readonly contra: boolean;
  readonly ordem: OrdemVotos;

  constructor(query: URLSearchParams) {
    const voto = query.get("voto");
    this.voto = voto && (FILTROS_VOTO as readonly string[]).includes(voto) ? (voto as VotoCategoria) : "todos";
    this.partido = query.get("partido") ?? "";
    this.uf = query.get("uf") ?? "";
    this.nome = query.get("nome") ?? "";
    this.contra = query.get("contra") === "1";
    const ordem = query.get("ordem");
    this.ordem = ordem && (ORDENS_VOTOS as readonly string[]).includes(ordem) ? (ordem as OrdemVotos) : "nome";
  }

  get ativos(): number {
    return [this.voto !== "todos", this.partido, this.uf, this.nome.trim(), this.contra].filter(Boolean).length;
  }

  /** Applies every filter except the vote category, so its tabs can show counts. */
  semVoto(inspecao: InspecaoVotacao): VotoParlamentar[] {
    const q = norm(this.nome.trim());
    return inspecao.assentos.filter(
      (a) =>
        (!this.partido || a.partido === this.partido) &&
        (!this.uf || a.uf === this.uf) &&
        (!this.contra || inspecao.contrariou(a)) &&
        (!q || norm(a.nome).includes(q))
    );
  }

  aplicar(inspecao: InspecaoVotacao): VotoParlamentar[] {
    const base = this.semVoto(inspecao).filter((a) => this.voto === "todos" || a.categoria === this.voto);
    const rank = (c: VotoCategoria) => CATEGORIA_ORDEM.indexOf(c);
    const porNome = (a: VotoParlamentar, b: VotoParlamentar) => a.nome.localeCompare(b.nome, "pt-BR");
    const criterio: Record<OrdemVotos, (a: VotoParlamentar, b: VotoParlamentar) => number> = {
      nome: porNome,
      partido: (a, b) => a.partido.localeCompare(b.partido) || porNome(a, b),
      uf: (a, b) => a.uf.localeCompare(b.uf) || porNome(a, b),
      voto: (a, b) => rank(a.categoria) - rank(b.categoria) || porNome(a, b),
    };
    return [...base].sort(criterio[this.ordem]);
  }
}

/** Semicolon-separated, BOM-prefixed so spreadsheet apps in pt-BR open it cleanly. */
export function votosCsv(votos: VotoParlamentar[], inspecao: InspecaoVotacao): string {
  const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const linhas = [["Parlamentar", "Partido", "UF", "Voto", "Orientação do partido", "Contrariou orientação"]];
  for (const v of votos) {
    const o = inspecao.orientacaoDe(v.partido);
    linhas.push([v.nome, v.partido, v.uf, v.voto || CATEGORIA_LABEL[v.categoria], o?.orientacao ?? "", inspecao.contrariou(v) ? "sim" : ""]);
  }
  return "﻿" + linhas.map((l) => l.map(esc).join(";")).join("\n");
}
