/** Shared semantics for the live floor panels of both houses. */
import type { EstadoItem, ItemAoVivo, SessaoAoVivo, StatusTone } from "./types";

/** What the per-house live hooks return. */
export interface SessaoAoVivoResult {
  sessao?: SessaoAoVivo;
  isLoading: boolean;
}

/** The parts both houses' order-paper items share, before their state is set. */
export interface ItemBruto {
  id: string;
  sigla: string;
  qualificador?: string;
  ementa?: string;
  /** Already decided (voted). */
  decidida: boolean;
  /** The item the floor is on. */
  atual: boolean;
  /** The announced result, or the stage it is at. */
  detalhe?: string;
  /** Label shown for a pending item. */
  pendente: string;
  url?: string;
}

/** Turns a raw order-paper item into the normalised one the panel renders. */
export function itemAoVivo(base: ItemBruto): ItemAoVivo {
  const estado: EstadoItem = base.decidida ? "decidida" : base.atual ? "atual" : "pendente";
  const veredito = base.decidida && base.detalhe ? vereditoDe(base.detalhe) : undefined;
  return {
    id: base.id,
    sigla: base.sigla,
    qualificador: base.qualificador,
    ementa: base.ementa,
    estado,
    rotulo: veredito?.label ?? (estado === "atual" ? "Em apreciação" : base.pendente),
    tone: veredito?.tone,
    detalhe: base.detalhe,
    url: base.url,
  };
}

/** How often to poll while a session runs, and while the floor is idle. */
export const AO_VIVO_MS = 30_000;
export const PARADO_MS = 90_000;

/**
 * Reads a verdict out of the prose both houses announce results in
 * ("Aprovado o projeto…", "Aprovado, por unanimidade, o Requerimento…").
 */
export function vereditoDe(texto: string): { label: string; tone: StatusTone } {
  const t = texto.toLowerCase();
  if (/aprovad/.test(t)) return { label: "Aprovado", tone: "success" };
  if (/rejeitad/.test(t)) return { label: "Rejeitado", tone: "danger" };
  if (/prejudicad/.test(t)) return { label: "Prejudicado", tone: "neutral" };
  if (/retirad/.test(t)) return { label: "Retirado", tone: "neutral" };
  if (/encerrad/.test(t)) return { label: "Discussão encerrada", tone: "info" };
  return { label: "Apreciado", tone: "neutral" };
}

/** One readable line from a possibly long, multi-line result text. */
export function truncar(texto: string, max = 160): string {
  const linha = texto.replace(/\s+/g, " ").trim();
  return linha.length > max ? `${linha.slice(0, max - 1).trimEnd()}…` : linha;
}
