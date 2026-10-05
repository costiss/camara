import type { StatusTone } from "./types";

/**
 * Party palette. Brazilian parties have recognisable colours; where a
 * party is not listed we fall back to a stable slot in a neutral,
 * editorially-muted palette so charts never look accidental.
 */
const PARTY_COLORS: Record<string, string> = {
  PT: "#d64550",
  PL: "#2f5bb7",
  UNIÃO: "#3d7fd6",
  "UNIAO": "#3d7fd6",
  PP: "#4a6fa5",
  MDB: "#3f9d6b",
  PSD: "#e0902f",
  REPUBLICANOS: "#2b6cb0",
  PSDB: "#3b6fb0",
  PDT: "#d94f4f",
  PSB: "#e0b431",
  PODE: "#2f9d63",
  PODEMOS: "#2f9d63",
  PSOL: "#d64550",
  NOVO: "#e0792f",
  CIDADANIA: "#c65c9e",
  PCDOB: "#b83a3f",
  SOLIDARIEDADE: "#d99a2b",
  AVANTE: "#d97b2b",
  PRD: "#2f8d5a",
  REDE: "#2fa89d",
  PV: "#3f9d55",
  PROS: "#c47a3a",
  PSC: "#3a7a8d",
  PATRIOTA: "#4a8d6f",
  PMN: "#7a6fb0",
  DC: "#6f8fb0",
  PCB: "#b03a3a",
  PSTU: "#a83a5a",
  PCO: "#8a3a8a",
};

const FALLBACK = [
  "#d4a853",
  "#60a5fa",
  "#4ade80",
  "#f87171",
  "#c084fc",
  "#fb923c",
  "#2dd4bf",
  "#f472b6",
  "#fbbf24",
  "#a3e635",
  "#7dd3fc",
  "#fda4af",
];

export function partyColor(party: string): string {
  const key = (party || "").toUpperCase();
  if (PARTY_COLORS[key]) return PARTY_COLORS[key];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
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

/** Map a free-text legislative status onto a visual tone. */
export function statusTone(status?: string): StatusTone {
  const s = (status || "").toLowerCase();
  if (!s) return "neutral";
  if (
    s.includes("aprovad") ||
    s.includes("promulgad") ||
    s.includes("sancionad") ||
    s.includes("transformad")
  ) {
    return "success";
  }
  if (
    s.includes("rejeitad") ||
    s.includes("arquivad") ||
    s.includes("encerrad") ||
    s.includes("prejudicad") ||
    s.includes("retirad") ||
    s.includes("cancelad")
  ) {
    return "danger";
  }
  if (
    s.includes("tramita") ||
    s.includes("aguardando") ||
    s.includes("pronta") ||
    s.includes("pauta")
  ) {
    return "warning";
  }
  if (s.includes("convocad") || s.includes("agendad")) return "info";
  return "neutral";
}

export function votacaoTone(aprovacao?: number | null): StatusTone {
  if (aprovacao === 1) return "success";
  if (aprovacao === 0) return "danger";
  return "neutral";
}
