import type { Posicao } from "@/lib/historico";
import { CATEGORIA_COR } from "@/lib/votos";

export const POSICAO_LABEL: Record<Posicao, string> = {
  sim: "Votou Sim",
  nao: "Votou Não",
  abstencao: "Absteve-se",
  obstrucao: "Obstruiu",
  presidente: "Presidiu a sessão",
  presente: "Presente, sem voto",
  secreto: "Votou (secreto)",
  ausente: "Ausente",
  "sem-registro": "Sem registro",
};

export const POSICAO_ORDEM: Posicao[] = ["sim", "nao", "abstencao", "obstrucao", "presidente", "secreto", "presente", "ausente", "sem-registro"];

export function corDaPosicao(p: Posicao): string {
  return p === "sem-registro" ? "#4A4741" : CATEGORIA_COR[p];
}
