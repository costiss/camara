import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* --------------------------- tiny hash router --------------------------- */

export type View = "votacoes" | "inspecionar" | "parlamentar" | "lista" | "camara" | "senado" | "agenda";
export type Query = Record<string, string | null | undefined>;

export interface Route {
  view: View;
  param?: string;
  query: URLSearchParams;
}

const VIEWS: View[] = ["votacoes", "inspecionar", "parlamentar", "lista", "camara", "senado", "agenda"];

const LEGADO: Record<string, { view: View; query?: Query }> = {
  dashboard: { view: "votacoes" },
  votacao: { view: "votacoes" },
  atividades: { view: "lista" },
  pecs: { view: "lista", query: { tipo: "PEC", periodo: String(new Date().getFullYear()) } },
  deputados: { view: "camara" },
  metricas: { view: "camara" },
  senadores: { view: "senado" },
};

function decodificar(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function serializar(query?: Query | URLSearchParams): string {
  const out = new URLSearchParams();
  const entradas = query instanceof URLSearchParams ? [...query.entries()] : Object.entries(query ?? {});
  for (const [k, v] of entradas) if (v) out.set(k, v);
  const s = out.toString();
  return s ? `?${s}` : "";
}

export function parseRoute(hash: string): Route {
  const [path, search = ""] = hash.split("?");
  const [head, ...rest] = path.split("/").filter(Boolean);
  const param = rest.length ? decodificar(rest.join("/")) : undefined;
  const query = new URLSearchParams(search);
  if ((VIEWS as string[]).includes(head)) return { view: head as View, param, query };
  const legado = LEGADO[head];
  if (legado) return { view: legado.view, param, query: new URLSearchParams(serializar({ ...legado.query, ...Object.fromEntries(query) })) };
  return { view: "votacoes", query };
}

export function routeHref(view: View, param?: string, query?: Query): string {
  return `#/${view}${param ? `/${encodeURIComponent(param)}` : ""}${serializar(query)}`;
}

/** Hash-based router: pushes on navigation, replaces on filter changes. */
class HashRouter {
  private readonly listeners = new Set<() => void>();

  constructor() {
    this.canonicalizar();
    window.addEventListener("hashchange", () => {
      this.canonicalizar();
      this.emit();
    });
  }

  /** Rewrites legacy links (e.g. #/pecs) to the route they now resolve to. */
  private canonicalizar() {
    const hash = this.hash();
    const head = hash.split(/[/?]/)[0];
    if (!LEGADO[head]) return;
    const r = parseRoute(hash);
    window.history.replaceState(window.history.state, "", routeHref(r.view, r.param) + serializar(r.query));
  }

  readonly subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  readonly hash = () => window.location.hash.replace(/^#\/?/, "").trim();

  go(view: View, param?: string, query?: Query) {
    this.abrir(routeHref(view, param, query));
  }

  abrir(href: string) {
    if (window.location.hash !== href) window.location.hash = href.slice(1);
  }

  /** Navigates without adding a history entry, so Back skips it. */
  substituir(href: string) {
    if (window.location.hash !== href) window.location.replace(href);
  }

  patch(query: Query) {
    const atual = parseRoute(this.hash());
    const next = new URLSearchParams(atual.query);
    for (const [k, v] of Object.entries(query)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const href = routeHref(atual.view, atual.param) + serializar(next);
    if (href === `#/${this.hash()}`) return;
    window.history.replaceState(window.history.state, "", href);
    this.emit();
  }

  private emit() {
    this.listeners.forEach((cb) => cb());
  }
}

export const router = new HashRouter();

/** Link to a vote; Senate votes carry their session date so the page can fetch that day. */
export function votacaoHref(v: { id: string; casa: string; data?: string }, query?: Query): string {
  return routeHref("votacoes", v.id, { ...query, data: dataSenado(v) });
}

/** Link to the full inspection of a vote (roll-call, parties, states). */
export function inspecaoHref(v: { id: string; casa: string; data?: string }, query?: Query): string {
  return routeHref("inspecionar", v.id, { ...query, data: dataSenado(v) });
}

/** A deputy's or senator's page; `id` is namespaced (camara-123, senado-456). */
export function parlamentarHref(id: string, query?: Query): string {
  return routeHref("parlamentar", id, query);
}

function dataSenado(v: { casa: string; data?: string }): string | undefined {
  return v.casa === "senado" && v.data ? v.data.slice(0, 10) : undefined;
}

export function navigate(view: View, param?: string, query?: Query) {
  router.go(view, param, query);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(router.subscribe, router.hash, () => "");
  return useMemo(() => parseRoute(hash), [hash]);
}

/** A string filter stored in the URL; the fallback value is left out of it. */
export function useQueryParam(key: string, fallback = ""): [string, (v: string | null) => void] {
  const { query } = useRoute();
  const valor = query.get(key) ?? fallback;
  const definir = useCallback(
    (v: string | null) => router.patch({ [key]: v === fallback ? null : v }),
    [key, fallback]
  );
  return [valor, definir];
}

/** Like useQueryParam, restricted to a closed set of values. */
export function useQueryEnum<T extends string>(key: string, opcoes: readonly T[], fallback: T): [T, (v: T) => void] {
  const [raw, definir] = useQueryParam(key, fallback);
  const valor = (opcoes as readonly string[]).includes(raw) ? (raw as T) : fallback;
  return [valor, definir];
}
