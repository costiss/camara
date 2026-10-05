/**
 * Where API calls go. With VITE_API_PROXY set (e.g. "/api" or
 * "https://proxy.example.org/api") every request goes through the caching,
 * rate-limited proxy in server/; without it the browser calls the government
 * APIs directly.
 */
const proxy = (import.meta.env.VITE_API_PROXY as string | undefined)?.trim();

function proxied(name: string): string | null {
  if (!proxy) return null;
  return `${new URL(proxy, window.location.origin).toString().replace(/\/$/, "")}/${name}`;
}

export const CAMARA_BASE = proxied("camara") ?? "https://dadosabertos.camara.leg.br/api/v2";
export const SENADO_BASE = proxied("senado") ?? "https://legis.senado.leg.br/dadosabertos";
export const VIA_PROXY = !!proxy;
