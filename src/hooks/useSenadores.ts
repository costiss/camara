import { useQuery } from "@tanstack/react-query";
import { getSenadores } from "@/lib/api";

export function useSenadores() {
  return useQuery({
    queryKey: ["senadores"],
    queryFn: () => getSenadores(),
    staleTime: 5 * 60 * 1000,
  });
}
