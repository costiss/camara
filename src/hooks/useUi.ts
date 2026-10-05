import { useEffect, useState } from "react";
import { useSyncExternalStore } from "react";

export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* --------------------------- tiny hash router --------------------------- */

export type View = "votacoes" | "camara" | "senado" | "pecs" | "agenda";

export interface Route {
  view: View;
  param?: string;
}

const LEGADO: Record<string, View> = {
  dashboard: "votacoes",
  votacao: "votacoes",
  atividades: "votacoes",
  deputados: "camara",
  metricas: "camara",
  senadores: "senado",
};

const VIEWS: View[] = ["votacoes", "camara", "senado", "pecs", "agenda"];

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function currentHash(): string {
  return window.location.hash.replace(/^#\/?/, "").trim();
}

function decodificar(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function parseRoute(hash: string): Route {
  const [head, ...rest] = hash.split("/");
  const param = rest.length ? decodificar(rest.join("/")) : undefined;
  if ((VIEWS as string[]).includes(head)) return { view: head as View, param };
  if (LEGADO[head]) return { view: LEGADO[head], param };
  return { view: "votacoes" };
}

export function routeHref(view: View, param?: string): string {
  return `#/${view}${param ? `/${encodeURIComponent(param)}` : ""}`;
}

export function navigate(view: View, param?: string) {
  const href = routeHref(view, param);
  if (window.location.hash !== href) window.location.hash = href.slice(1);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, currentHash, () => "");
  return parseRoute(hash);
}
