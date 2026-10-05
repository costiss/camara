/** Plain-Portuguese readings of legislative codes, summaries and vote steps. */

export interface TipoProposta {
  codigo: string;
  nome: string;
  curto: string;
  explica: string;
}

const TIPOS: Record<string, Omit<TipoProposta, "codigo">> = {
  PEC: {
    nome: "Proposta de Emenda à Constituição",
    curto: "Emenda à Constituição",
    explica: "Muda a Constituição. Precisa de 3/5 dos votos (308 deputados e 49 senadores), em dois turnos em cada Casa.",
  },
  PLP: {
    nome: "Projeto de Lei Complementar",
    curto: "Lei complementar",
    explica: "Detalha pontos que a Constituição manda regular em lei própria. Precisa da maioria absoluta: 257 deputados ou 41 senadores.",
  },
  PL: {
    nome: "Projeto de Lei",
    curto: "Projeto de lei",
    explica: "Cria ou muda uma lei comum. Basta a maioria dos parlamentares presentes.",
  },
  PLS: { nome: "Projeto de Lei do Senado", curto: "Projeto de lei", explica: "Projeto de lei apresentado no Senado." },
  PLC: { nome: "Projeto de Lei da Câmara", curto: "Projeto de lei", explica: "Projeto de lei que veio da Câmara e está no Senado." },
  MPV: {
    nome: "Medida Provisória",
    curto: "Medida provisória",
    explica: "Norma do Presidente da República que já vale, mas perde efeito se o Congresso não a aprovar em até 120 dias.",
  },
  PLV: {
    nome: "Projeto de Lei de Conversão",
    curto: "Medida provisória",
    explica: "Texto de uma medida provisória modificado pelo Congresso.",
  },
  PDL: {
    nome: "Projeto de Decreto Legislativo",
    curto: "Decreto legislativo",
    explica: "Decisão que só cabe ao Congresso, como aprovar tratados ou escolher ministros do TCU. Não passa pela sanção do Presidente.",
  },
  PDC: { nome: "Projeto de Decreto Legislativo", curto: "Decreto legislativo", explica: "Decisão que só cabe ao Congresso, sem sanção do Presidente." },
  REQ: {
    nome: "Requerimento",
    curto: "Requerimento",
    explica: "Pedido sobre o andamento de outra proposta, como acelerar a votação. Não muda nenhuma lei.",
  },
  MSC: {
    nome: "Mensagem do Poder Executivo",
    curto: "Mensagem do Governo",
    explica: "Documento enviado pelo Governo ao Congresso, em geral um tratado internacional para análise.",
  },
  PLN: {
    nome: "Projeto de Lei do Congresso Nacional",
    curto: "Orçamento",
    explica: "Trata do Orçamento da União e é votado em sessão conjunta de deputados e senadores.",
  },
  PRC: { nome: "Projeto de Resolução da Câmara", curto: "Resolução", explica: "Regra interna da Câmara dos Deputados." },
  PRS: { nome: "Projeto de Resolução do Senado", curto: "Resolução", explica: "Assunto que só cabe ao Senado, como limites de dívida de estados e municípios." },
};

export function tipoDaProposta(sigla?: string): TipoProposta | undefined {
  const codigo = sigla?.trim().split(/[\s/]/)[0]?.toUpperCase();
  const t = codigo ? TIPOS[codigo] : undefined;
  return t && codigo ? { codigo, ...t } : undefined;
}

/* ------------------------------ summaries ------------------------------ */

const LEIS_FAMOSAS: [RegExp, string][] = [
  [/2\.?848/, "o Código Penal"],
  [/5\.?452/, "a CLT"],
  [/9\.?503/, "o Código de Trânsito"],
  [/8\.?069/, "o Estatuto da Criança e do Adolescente"],
  [/10\.?406/, "o Código Civil"],
  [/13\.?105/, "o Código de Processo Civil"],
  [/3\.?689/, "o Código de Processo Penal"],
  [/8\.?078/, "o Código de Defesa do Consumidor"],
  [/9\.?394/, "a Lei de Diretrizes e Bases da Educação"],
  [/5\.?172/, "o Código Tributário Nacional"],
  [/8\.?080/, "a Lei do SUS"],
  [/10\.?826/, "o Estatuto do Desarmamento"],
  [/7\.?210/, "a Lei de Execução Penal"],
  [/8\.?213/, "a Lei de Benefícios da Previdência"],
  [/11\.?343/, "a Lei de Drogas"],
  [/13\.?709/, "a Lei Geral de Proteção de Dados"],
  [/14\.?133/, "a Lei de Licitações"],
];

const MESES = "janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro";
const DATA_POR_EXTENSO = new RegExp(`,?\\s*de\\s+\\d{1,2}[ºo°]?\\s+de\\s+(?:${MESES})\\s+de\\s+(\\d{4})`, "gi");

function maiuscula(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1) : s;
}

function semGritos(s: string): string {
  const letras = s.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return letras.length > 12 && letras === letras.toUpperCase() ? maiuscula(s.toLocaleLowerCase("pt-BR")) : s;
}

function limpar(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/^.*?NOVA EMENTA:\s*/i, "")
    .replace(/^Esta Lei\s+/i, "")
    .replace(/\s*[.;]\s*$/, "")
    .replace(/,?\s+e\s+(?:altera|revoga|acrescenta|modifica|d[áa] nova reda[çc][ãa]o)\b.*$/i, "")
    .replace(/,?\s+(?:previst[oa]s?|estabelecid[oa]s?|referid[oa]s?|de que tratam?|constantes?)\s+(?:n[oa]s?|pel[oa]s?)?\s*(?:o\s+|a\s+)?(?:arts?\.|artigos?|§|incisos?|Lei|Decreto).*$/i, "")
    .replace(/[“”"‘’]/g, "")
    .replace(/\s*,?\s*e d[áa] outras provid[êe]ncias\.?/gi, "")
    .replace(/\s*,?\s*(?:na forma que menciona|para os? fins? que especifica)$/i, "")
    .replace(/\bn\.?\s*[º°]\s*\.?\s*|\bn\.,?\s*(?=\d)/gi, "")
    .replace(DATA_POR_EXTENSO, "/$1")
    .replace(/\s+\/(\d{4})/g, "/$1")
    .replace(/\s*[.;]\s*$/, "")
    .trim();
}

function valorPorExtenso(raw: string): string {
  const n = Number(raw.replace(/[.,]+$/, "").replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return "";
  const fmt = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  if (n >= 1e9) return `R$ ${fmt(n / 1e9)} ${n >= 2e9 ? "bilhões" : "bilhão"}`;
  if (n >= 1e6) return `R$ ${fmt(n / 1e6)} ${n >= 2e6 ? "milhões" : "milhão"}`;
  return `R$ ${fmt(n / 1e3)} mil`;
}

function leiCitada(trecho: string): string {
  const famosa = LEIS_FAMOSAS.find(([re]) => re.test(trecho));
  if (famosa) return famosa[1];
  if (/Constitui[çc][ãa]o/i.test(trecho)) return "a Constituição";
  const nome = /\(([^)]{6,80})\)|\s-\s([^-]{6,80})\s-/.exec(trecho);
  if (nome) return `o ${(nome[1] ?? nome[2]).replace(/\s*-\s*[A-Z]{2,}$/, "").trim()}`;
  const lei = /(Lei Complementar|Decreto-?\s?Lei|Lei)\s+([\d.]+)(?:\/(\d{4}))?/i.exec(trecho);
  if (lei) return `a ${lei[1].replace(/Decreto-?\s?Lei/i, "Decreto-Lei")} ${lei[2]}${lei[3] ? `/${lei[3]}` : ""}`;
  return "a legislação";
}

const IRREGULARES: Record<string, string> = {
  proibir: "proíbe", reduzir: "reduz", produzir: "produz", introduzir: "introduz", incluir: "inclui",
  excluir: "exclui", instituir: "institui", substituir: "substitui", distribuir: "distribui",
  contribuir: "contribui", construir: "constrói", dispor: "dispõe", impor: "impõe", repor: "repõe",
  compor: "compõe", propor: "propõe", ser: "é", ter: "tem", manter: "mantém", conter: "contém",
  obter: "obtém", prever: "prevê", fazer: "faz", trazer: "traz", vir: "vem", ver: "vê",
};

/** "tornar permanentes os incentivos" → "torna permanentes os incentivos". */
function presente(frase: string): string | null {
  const m = /^(\p{L}+?)(ar|er|ir|or)(\s|$)/iu.exec(frase);
  if (!m) return null;
  const verbo = (m[1] + m[2]).toLocaleLowerCase("pt-BR");
  const conjugado = IRREGULARES[verbo] ?? (m[2].toLowerCase() === "ar" ? `${m[1]}a` : m[2].toLowerCase() === "or" ? null : `${m[1]}e`);
  return conjugado ? conjugado + frase.slice(m[1].length + 2) : null;
}

function regrasSobre(objeto: string): string {
  const sem = objeto.replace(/^(?:a|o|as|os)\s+/i, "");
  return /^(regras|normas|diretrizes|cria[çc][ãa]o|institui[çc][ãa]o|regulamenta[çc][ãa]o|medidas|crit[ée]rios)\b/i.test(sem)
    ? maiuscula(sem)
    : `Regras sobre ${objeto}`;
}

type Regra = (s: string) => string | null;

const REGRAS: Regra[] = [
  (s) => {
    if (!/^Requer/i.test(s) || !/urg[êe]ncia/i.test(s)) return null;
    const ref = /(?:(Proposta de Emenda à Constituição|Projeto de Lei Complementar|Projeto de Decreto Legislativo|Projeto de Lei|Medida Provisória)(?:\s+(?:PEC|PLP|PDL|PL|MPV)\b)?|\b(PEC|PLP|PDL|PL|MPV))\s*([\d.]+)\s*(?:\/\s*|,?\s+de\s+|\s+)(\d{4})(?:,?\s*que\s+(.+))?/i.exec(s);
    if (!ref) return "Pedido de urgência";
    const tipo = ref[1] ?? tipoDaProposta(ref[2])?.nome ?? ref[2];
    return `Urgência para votar: ${ref[5] ? tituloPopular(maiuscula(ref[5])) : `${tipo} ${ref[3]}/${ref[4]}`}`;
  },
  (s) => {
    const m = /^Abre cr[ée]dito extraordin[áa]rio,?\s*(?:em favor d[oa]s?\s+(.+?)(?=,\s*no valor|;|,\s*para|$))?/i.exec(s);
    if (!m) return null;
    const valor = /no valor de\s+R\$\s*([\d.,]+)/i.exec(s)?.[1];
    const quem = m[1] ? ` para ${m[1].trim().replace(/^Minist/, "o Minist")}` : "";
    return `Crédito extra${valor ? ` de ${valorPorExtenso(valor)}` : ""}${quem}`.replace(/\s+/g, " ");
  },
  (s) => {
    const m = /^(?:Altera|Acrescenta|Inclui|Modifica|Revoga|Insere|D[áa] nova reda[çc][ãa]o)\b(.*?)(?:,\s*|\s+)(?:para|a fim de|com o objetivo de|com a finalidade de)\s+(.+)$/i.exec(s);
    if (!m) return null;
    const dispor = /^dispor\s+sobre\s+(.+)$/i.exec(m[2]);
    if (dispor) return regrasSobre(dispor[1]);
    const verbo = presente(m[2]);
    return verbo ? maiuscula(verbo) : null;
  },
  (s) => {
    const m = /^(?:Altera|Acrescenta|Inclui|Insere|Modifica)\b(.*?),?\s+que\s+(?:disp[õo]e|disp[ôo]s|trata)\s+sobre\s+(.+)$/i.exec(s);
    return m ? `Muda as regras sobre ${m[2]}` : null;
  },
  (s) => {
    const m = /^(?:Altera|Acrescenta|Modifica)\b(.*?),?\s+que\s+(.+)$/i.exec(s);
    return m ? `Muda a lei que ${m[2]}` : null;
  },
  (s) => {
    const m = /^(?:Altera|Modifica)\b(.+)$/i.exec(s) ?? /^(?:Acrescenta|Inclui|Insere)\s+(?:o|os|a|as)?\s*(?:arts?\.|artigos?|§|par[áa]grafos?|incisos?|al[íi]neas?|dispositivos?)(.+)$/i.exec(s);
    return m ? `Muda ${leiCitada(m[1])}` : null;
  },
  (s) => {
    const m = /^Regulamenta\b.*?(?:,\s*que\s+disp[õo]e\s+sobre|,?\s*ao\s+dispor\s+sobre|,\s*para)\s+(.+)$/i.exec(s);
    return m ? `Regulamenta ${m[1]}` : null;
  },
  (s) => {
    const m = /^Disp[õo]es?\s+sobre\s+(.+)$/i.exec(s);
    return m ? regrasSobre(m[1]) : null;
  },
  (s) => {
    const m = /^Aprova o texto d([oa])\s+(.+?)(?:,\s*(?:celebrad|assinad|firmad|conclu[íi]d|adotad)\w*.*)?$/i.exec(s);
    return m ? `Aprova ${m[1]} ${m[2]}` : null;
  },
  (s) => {
    const m = /^(Conven[çc][ãa]o|Acordo|Tratado|Protocolo)\b.*?\bsobre\s+(.+?)(?:,\s*(?:celebrad|assinad|firmad|conclu[íi]d|adotad)\w*.*)?$/i.exec(s);
    if (!m) return null;
    const oit = /Organiza[çc][ãa]o Internacional do Trabalho|\bOIT\b/.test(s) ? " da OIT" : " internacional";
    return `${maiuscula(m[1].toLocaleLowerCase("pt-BR"))}${oit} sobre ${m[2].charAt(0).toLocaleLowerCase("pt-BR")}${m[2].slice(1)}`;
  },
  (s) =>
    /^Escolhe\b/i.test(s)
      ? s.replace(/,\s*nos termos.*$/i, "").replace(/\b(?:o Senhor|a Senhora)\s+/i, "").replace(/para o cargo de Ministr([oa])/i, "para ministr$1")
      : null,
];

const MAX_TITULO = 140;

/** A short headline in everyday language, derived from an official summary (ementa). */
export function tituloPopular(ementa?: string | null): string {
  const s = limpar(semGritos(ementa ?? ""));
  if (!s) return "";
  const titulo = limpar(REGRAS.map((r) => r(s)).find((t): t is string => !!t) ?? s);
  if (titulo.length <= MAX_TITULO) return maiuscula(titulo);
  const corte = titulo.slice(0, MAX_TITULO);
  const fim = Math.max(corte.lastIndexOf(", "), corte.lastIndexOf(" e "), corte.lastIndexOf(" "));
  return `${maiuscula(corte.slice(0, fim > 60 ? fim : MAX_TITULO).replace(/[,;:]$/, ""))}…`;
}

/* ------------------------------ vote steps ------------------------------ */

export interface Etapa {
  rotulo: string;
  explica: string;
  /** Votes on the merit (main text, amendments, highlights) versus procedure. */
  merito: boolean;
}

const ETAPAS: [RegExp, Etapa][] = [
  [/reda[çc][ãa]o final/i, { rotulo: "Redação final", explica: "Confirma a redação final do texto já aprovado. Só corrige a forma, não muda o conteúdo.", merito: false }],
  [/urg[êe]ncia|regime de tramita[çc][ãa]o/i, { rotulo: "Urgência", explica: "Pedido para acelerar a tramitação. Não decide se a proposta vira lei.", merito: false }],
  [/aprecia[çc][ãa]o preliminar|pressupostos|admissibilidade/i, { rotulo: "Análise preliminar", explica: "Verifica se a proposta pode seguir (constitucionalidade, urgência ou impacto nas contas), sem decidir o conteúdo.", merito: false }],
  [/^(?:aprovad|rejeitad)[oa]s?,?\s*(?:por unanimidade,\s*)?o\s+requerimento|^rejeitado o requerimento|requerimento/i, { rotulo: "Requerimento", explica: "Pedido sobre o andamento da votação, como adiar ou retirar de pauta. Não decide o conteúdo.", merito: false }],
  [/ressalvad/i, { rotulo: "Texto principal", explica: "Votação do texto-base. Trechos destacados são votados depois, em separado.", merito: true }],
  [/emenda de reda[çc][ãa]o/i, { rotulo: "Ajuste de redação", explica: "Corrige a redação de um trecho, sem mudar o conteúdo.", merito: false }],
  [/^(?:aprovad|rejeitad)[oa]\s+(?:o|a)\s+(?:subemenda\s+)?substitutiv|votação nominal do substitutivo/i, { rotulo: "Texto principal", explica: "Votação do texto-base na versão do relator, que substitui o original.", merito: true }],
  [/emendas? do senado/i, { rotulo: "Mudanças do Senado", explica: "Alterações feitas pelo Senado. A Câmara decide se aceita ou mantém o próprio texto.", merito: true }],
  [/^mantid[oa]|^suprimid[oa]|destaque|\bart\.\s*\d+.*destacad/i, { rotulo: "Destaque", explica: "Votação em separado de um trecho do texto principal.", merito: true }],
  [/emenda/i, { rotulo: "Emenda", explica: "Proposta de mudança em um trecho do texto.", merito: true }],
];

const TEXTO_PRINCIPAL: Etapa = {
  rotulo: "Texto principal",
  explica: "Votação do conteúdo da proposta como um todo.",
  merito: true,
};

/** What was actually decided in one vote, from its official description. */
export function etapaDaVotacao(descricao?: string | null): Etapa {
  const d = (descricao ?? "").trim();
  const base = ETAPAS.find(([re]) => re.test(d))?.[1] ?? TEXTO_PRINCIPAL;
  const turno = /(1[ºo°]|primeiro)\s+turno/i.test(d) ? " · 1º turno" : /(2[ºo°]|segundo)\s+turno/i.test(d) ? " · 2º turno" : "";
  if (base === TEXTO_PRINCIPAL && /substitutiv/i.test(d)) {
    return { ...base, rotulo: `Texto principal${turno}`, explica: "Votação do texto-base na versão do relator, que substitui o original." };
  }
  return turno ? { ...base, rotulo: base.rotulo + turno } : base;
}

/* ------------------------------ whole vote ------------------------------ */

export interface Leitura {
  /** Everyday-language headline; falls back to the spelled-out proposal name. */
  titulo: string;
  tipo?: TipoProposta;
  /** The official code, e.g. `PLP 74/2026`, shown as secondary information. */
  codigo?: string;
  etapa: Etapa;
}

export function lerVotacao(v: { proposicao?: string; proposicaoTipo?: string; ementa?: string; descricao?: string }): Leitura {
  const tipo = tipoDaProposta(v.proposicaoTipo ?? v.proposicao);
  const numero = v.proposicao?.split(/\s+/)[1];
  const titulo =
    tituloPopular(v.ementa) || (tipo && numero ? `${tipo.nome} ${numero}` : v.proposicao ?? "Votação no Plenário");
  return { titulo, tipo, codigo: v.proposicao, etapa: etapaDaVotacao(v.descricao) };
}
