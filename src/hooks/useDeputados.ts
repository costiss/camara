import { useQuery } from "@tanstack/react-query";
import { getDeputados, getPartidos } from "@/lib/api";

export function useDeputados(
  params: { itens?: number; pagina?: number } = {}
) {
  return useQuery({
    queryKey: ["deputados", params],
    queryFn: () => getDeputados(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePartidos() {
  return useQuery({
    queryKey: ["partidos"],
    queryFn: () => getPartidos(),
    staleTime: 10 * 60 * 1000,
  });
}
