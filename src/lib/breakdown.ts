import { CATEGORIA_COR, CATEGORIA_ORDEM, VoteTally } from "./votos";
import { espectroDe, partyColor, type Espectro } from "./parties";
import type { Parlamentar, VotoCategoria, VotoParlamentar } from "./types";

export function mix(from: string, to: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(from);
  const b = p(to);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t))));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const BASE = "#2C2A26";

/** Diverging fill: green when "Sim" leads, red when "Não" leads, stronger with the margin. */
export function corDaDisputa(sim: number, nao: number): string {
  if (sim + nao === 0) return BASE;
  const share = sim / (sim + nao);
  const margin = Math.abs(share - 0.5) * 2;
  return mix(BASE, share >= 0.5 ? CATEGORIA_COR.sim : CATEGORIA_COR.nao, 0.35 + 0.65 * margin);
}

export interface GrupoVotos {
  chave: string;
  tally: VoteTally;
  membros: number;
}

export function agruparVotos(
  assentos: VotoParlamentar[],
  chave: (v: VotoParlamentar) => string
): GrupoVotos[] {
  const map = new Map<string, VotoParlamentar[]>();
  for (const v of assentos) map.set(chave(v), [...(map.get(chave(v)) ?? []), v]);
  return [...map.entries()]
    .map(([k, vs]) => ({ chave: k, tally: new VoteTally(vs, vs.length), membros: vs.length }))
    .sort((a, b) => b.membros - a.membros);
}

const ESPECTRO_ORDEM: Record<Espectro, number> = { esquerda: 0, centro: 1, direita: 2 };

/** Seats ordered left→right by political spectrum, then party size, then vote. */
export function ordenarPorEspectro<T extends { partido: string; nome: string }>(
  items: T[],
  extra?: (t: T) => number
): T[] {
  const size = new Map<string, number>();
  for (const i of items) size.set(i.partido, (size.get(i.partido) ?? 0) + 1);
  return [...items].sort(
    (a, b) =>
      ESPECTRO_ORDEM[espectroDe(a.partido)] - ESPECTRO_ORDEM[espectroDe(b.partido)] ||
      (size.get(b.partido) ?? 0) - (size.get(a.partido) ?? 0) ||
      a.partido.localeCompare(b.partido) ||
      (extra ? extra(a) - extra(b) : 0) ||
      a.nome.localeCompare(b.nome, "pt-BR")
  );
}

export const rankCategoria = (c: VotoCategoria) => CATEGORIA_ORDEM.indexOf(c);

export interface Bancada {
  partido: string;
  total: number;
  cor: string;
}

export function bancadas(membros: Parlamentar[]): Bancada[] {
  const map = new Map<string, number>();
  for (const m of membros) map.set(m.partido, (map.get(m.partido) ?? 0) + 1);
  return [...map.entries()]
    .map(([partido, total]) => ({ partido, total, cor: partyColor(partido) }))
    .sort((a, b) => b.total - a.total || a.partido.localeCompare(b.partido));
}

export function espectroTotais(membros: Parlamentar[]): Record<Espectro, number> {
  const out: Record<Espectro, number> = { esquerda: 0, centro: 0, direita: 0 };
  for (const m of membros) out[espectroDe(m.partido)] += 1;
  return out;
}

/** Largest party per state, shaded by how dominant it is. */
export function partidoLiderPorUf(membros: Parlamentar[]) {
  const porUf = new Map<string, Parlamentar[]>();
  for (const m of membros) porUf.set(m.uf, [...(porUf.get(m.uf) ?? []), m]);
  const out: Record<string, { partido: string; n: number; total: number; fill: string }> = {};
  for (const [uf, ms] of porUf) {
    const [lider] = bancadas(ms);
    const share = lider.total / ms.length;
    out[uf] = {
      partido: lider.partido,
      n: lider.total,
      total: ms.length,
      fill: mix(BASE, lider.cor, 0.55 + 0.45 * Math.min(1, share * 1.6)),
    };
  }
  return out;
}
