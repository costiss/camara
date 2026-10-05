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

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function currentRoute(): string {
  const raw = window.location.hash.replace(/^#\/?/, "").trim();
  return raw || "dashboard";
}

export function navigate(route: string) {
  if (currentRoute() === route) return;
  window.location.hash = `/${route}`;
}

export function useRoute(): string {
  return useSyncExternalStore(subscribe, currentRoute, () => "dashboard");
}
