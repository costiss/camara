/** Thin, typed HTTP helpers over the two open-data APIs. */

export interface ApiLink {
  rel: string;
  href: string;
}

export interface RawPaged<T> {
  dados: T[];
  links: ApiLink[];
}

export interface PagedResult<T> {
  items: T[];
  total: number | null;
  hasNext: boolean;
  hasPrev: boolean;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const DEFAULT_TIMEOUT = 20_000;
const TENTATIVAS_REDE = 3;

/**
 * Some backend nodes of the open-data APIs omit CORS headers on a 200 that the
 * browser then caches for 30 min, so every plain retry fails the same way.
 * Network-level failures are retried bypassing the HTTP cache.
 */
async function buscar(url: string, init: RequestInit): Promise<Response> {
  for (let tentativa = 1; ; tentativa += 1) {
    try {
      return await fetch(url, tentativa === 1 ? init : { ...init, cache: "reload" });
    } catch (err) {
      if (init.signal?.aborted || tentativa >= TENTATIVAS_REDE) throw err;
    }
  }
}

export async function getJson<T>(
  url: string,
  init?: RequestInit,
  timeout = DEFAULT_TIMEOUT
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await buscar(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      throw new ApiError(`${res.status} ${res.statusText}`, res.status);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Tempo esgotado ao consultar a API", 408);
    }
    throw new ApiError((err as Error).message || "Falha de rede", 0);
  } finally {
    clearTimeout(timer);
  }
}

/** GET a Câmara-style paged endpoint, also reading `X-Total-Count`. */
export async function getPaged<T>(url: string): Promise<{
  dados: T[];
  links: ApiLink[];
  total: number | null;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
  try {
    const res = await buscar(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new ApiError(`${res.status} ${res.statusText}`, res.status);
    }
    const body = (await res.json()) as RawPaged<T>;
    const header = res.headers.get("x-total-count");
    const total = header ? Number(header) : null;
    return {
      dados: body.dados ?? [],
      links: body.links ?? [],
      total: Number.isNaN(total) ? null : total,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError((err as Error).message || "Falha de rede", 0);
  } finally {
    clearTimeout(timer);
  }
}

export function hasRel(links: ApiLink[], rel: string): boolean {
  return links.some((l) => l.rel === rel);
}

/**
 * A tiny promise semaphore. The Câmara API rate-limits bursts of
 * concurrent requests from one origin and then answers without CORS
 * headers, which surfaces as a confusing network error. Capping
 * in-flight requests keeps the N+1 detail lookups reliable.
 */
export function createLimiter(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const release = () => {
    active -= 1;
    const next = queue.shift();
    if (next) next();
  };

  return async function limit<T>(task: () => Promise<T>): Promise<T> {
    if (active >= max) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active += 1;
    try {
      return await task();
    } finally {
      release();
    }
  };
}
