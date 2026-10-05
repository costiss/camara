import type { DistribuicaoItem, Parlamentar, Proposicao, Votacao } from "./types";

export function countBy<T>(
  items: T[],
  key: (item: T) => string | undefined | null
): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item);
    if (!k) return acc;
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

export function toDistribution(
  map: Record<string, number>,
  limit?: number
): DistribuicaoItem[] {
  const list = Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  return limit ? list.slice(0, limit) : list;
}

export function distributionBy<T>(
  items: T[],
  key: (item: T) => string | undefined | null,
  limit?: number
): DistribuicaoItem[] {
  return toDistribution(countBy(items, key), limit);
}

export function mediaParlamentar(items: Parlamentar[]) {
  const partidos = new Set(items.map((i) => i.partido).filter(Boolean));
  const ufs = new Set(items.map((i) => i.uf).filter(Boolean));
  const mulheres = items.filter((i) =>
    /^f/i.test(i.sexo ?? "")
  ).length;
  return {
    total: items.length,
    partidos: partidos.size,
    ufs: ufs.size,
    mulheres,
  };
}

export function distribuicaoStatus(proposicoes: Proposicao[]): DistribuicaoItem[] {
  const map = proposicoes.reduce<Record<string, number>>((acc, p) => {
    const key = p.status?.trim() || "Sem situação";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  return toDistribution(map);
}

export function distribuicaoVotos(votacoes: Votacao[]) {
  return {
    total: votacoes.length,
    aprovadas: votacoes.filter((v) => v.aprovacao === 1).length,
    rejeitadas: votacoes.filter((v) => v.aprovacao === 0).length,
  };
}

export function topN<T>(items: T[], n: number, score: (t: T) => number): T[] {
  return [...items].sort((a, b) => score(b) - score(a)).slice(0, n);
}

/** Normalise a value to a 0–100 percentage, guarding divide-by-zero. */
export function pct(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
