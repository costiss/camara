import type { StatusTone } from "./types";

const PARTY_COLORS: Record<string, string> = {
  PL: "#3D63DD",
  PT: "#E5484D",
  "UNIÃO": "#38BDF8",
  UNIAO: "#38BDF8",
  PP: "#9CC9F5",
  PSD: "#86C25B",
  MDB: "#1F8A4C",
  REPUBLICANOS: "#3E7CB1",
  PSB: "#E8B73A",
  PDT: "#C2413B",
  PSDB: "#2E64A8",
  PODE: "#4FB3A9",
  PODEMOS: "#4FB3A9",
  PSOL: "#F2C94C",
  NOVO: "#F08A24",
  "PC DO B": "#B5283A",
  PCDOB: "#B5283A",
  SOLIDARIEDADE: "#E37B2F",
  AVANTE: "#D9902F",
  PRD: "#2F9A6B",
  CIDADANIA: "#D46BA8",
  PV: "#5BAF4A",
  REDE: "#2FA89D",
  PSC: "#3A7A8D",
  PMB: "#9B6FD1",
  AGIR: "#7C8FB0",
  MOBILIZA: "#A08A5C",
  DC: "#6F8FB0",
  PCO: "#8A3A8A",
  "S.PART.": "#85827C",
};

const FALLBACK = ["#C9A86A", "#7DD3FC", "#A3E635", "#F472B6", "#C084FC", "#2DD4BF"];

export function partyColor(party: string): string {
  const key = (party || "").toUpperCase();
  if (PARTY_COLORS[key]) return PARTY_COLORS[key];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return FALLBACK[hash % FALLBACK.length];
}

export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type Espectro = "esquerda" | "centro" | "direita";

const CENTRO = new Set(["MDB", "PSD", "PP", "UNIÃO", "UNIAO", "REPUBLICANOS"]);
const ESQUERDA = new Set(["PT", "PSOL", "PC DO B", "PCDOB", "PSB", "PDT", "PV", "REDE", "CIDADANIA", "PCB", "PSTU", "PCO", "UP"]);

export const ESPECTRO_COR: Record<Espectro, string> = {
  esquerda: "#E5484D",
  centro: "#BFA98A",
  direita: "#3D63DD",
};

export const ESPECTRO_CENTRO_NOTA = "Centro: MDB, PSD, PP, União e Republicanos";
export const ESPECTRO_REGRA =
  "Esquerda: PT, PSOL, PCdoB, PSB, PDT, PV, Rede e Cidadania. Centro: MDB, PSD, PP, União e Republicanos. Demais siglas à direita.";

/** Coarse left/centre/right grouping used by the composition bar. */
export function espectroDe(party: string): Espectro {
  const key = (party || "").toUpperCase();
  if (CENTRO.has(key)) return "centro";
  return ESQUERDA.has(key) ? "esquerda" : "direita";
}

const CURTA: Record<string, string> = {
  REPUBLICANOS: "REPUB.",
  SOLIDARIEDADE: "SOLID.",
  CIDADANIA: "CIDAD.",
  MOBILIZA: "MOBIL.",
};

/** Short label for tight spaces such as map callouts. */
export function siglaCurta(party: string): string {
  return CURTA[(party || "").toUpperCase()] ?? party;
}

export function statusTone(status?: string): StatusTone {
  const s = (status || "").toLowerCase();
  if (!s) return "neutral";
  if (/aprovad|promulgad|sancionad|transformad/.test(s)) return "success";
  if (/rejeitad|arquivad|encerrad|prejudicad|retirad|cancelad/.test(s)) return "danger";
  if (/tramita|aguardando|pronta|pauta/.test(s)) return "warning";
  if (/convocad|agendad/.test(s)) return "info";
  return "neutral";
}
