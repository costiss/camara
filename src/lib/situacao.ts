/** Where a proposal is in its life, from the free-text status the APIs return. */
export type Fase = "lei" | "sancao" | "vetada" | "tramitando" | "arquivada" | "retirada" | "encerrada";

export const FASE_LABEL: Record<Fase, string> = {
  lei: "Virou lei",
  sancao: "Aguarda sanção",
  vetada: "Vetada",
  tramitando: "Em tramitação",
  arquivada: "Arquivada",
  retirada: "Retirada pelo autor",
  encerrada: "Tramitação encerrada",
};

export const FASE_ORDEM: Fase[] = ["lei", "sancao", "tramitando", "vetada", "arquivada", "retirada", "encerrada"];

export const FASE_TOM: Record<Fase, string> = {
  lei: "text-green",
  sancao: "text-blue",
  vetada: "text-red",
  tramitando: "text-fg-2",
  arquivada: "text-fg-4",
  retirada: "text-fg-4",
  encerrada: "text-fg-4",
};

export function faseDaSituacao(situacao?: string, tramitando?: boolean): Fase | undefined {
  const s = (situacao ?? "").toLowerCase();
  if (!s) return tramitando === false ? "encerrada" : undefined;
  if (/norma jur[ií]dica|transformad[oa] em lei/.test(s)) return "lei";
  if (/aguardando (remessa [àa] )?san[çc][ãa]o/.test(s)) return "sancao";
  if (/vetad[oa] totalmente|veto total/.test(s)) return "vetada";
  if (/retirad/.test(s)) return "retirada";
  if (/arquiv/.test(s)) return "arquivada";
  if (tramitando === false) return "encerrada";
  return "tramitando";
}

const EM_PALAVRAS: [RegExp, string][] = [
  [/apresenta[çc][ãa]o de proposi[çc][ãa]o/i, "recém-apresentada, ainda sem andamento"],
  [/tramitando em conjunto/i, "tramita junto com outra proposta parecida"],
  [/aguardando designa[çc][ãa]o de relator/i, "aguardando a escolha de um relator"],
  [/aguardando parecer/i, "aguardando o parecer do relator"],
  [/pront[ao] para (a )?pauta/i, "pronta para ser votada"],
  [/aguardando aprecia[çc][ãa]o pelo senado/i, "aguardando votação no Senado"],
  [/aguardando despacho/i, "aguardando o despacho que define por onde vai tramitar"],
  [/aguardando delibera[çc][ãa]o/i, "aguardando votação"],
  [/aguardando recebimento/i, "aguardando ser recebida pela comissão"],
  [/aguardando audi[êe]ncia p[úu]blica/i, "aguardando audiência pública"],
  [/mat[ée]ria com a relatoria/i, "com o relator, em análise"],
  [/remetida [àa] c[âa]mara/i, "enviada à Câmara dos Deputados"],
];

/** The official status in everyday words, when there is a known translation. */
export function situacaoEmPalavras(situacao?: string): string | undefined {
  if (!situacao) return undefined;
  return EM_PALAVRAS.find(([re]) => re.test(situacao))?.[1] ?? situacao.charAt(0).toLowerCase() + situacao.slice(1);
}
