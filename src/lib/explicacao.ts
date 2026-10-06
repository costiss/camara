/** Plain-language explanations for people who do not follow Congress day to day. */
import type { Etapa } from "./linguagem";
import type { Casa } from "./types";

export interface Significado {
  sim: string;
  nao: string;
  nota?: string;
}

/** What a Sim or a Não meant in this kind of vote. */
export function significadoDoVoto(etapa: Etapa): Significado {
  switch (etapa.tipo) {
    case "urgencia":
      return {
        sim: "acelerar a tramitação: a proposta pode ir direto ao Plenário, sem esperar as comissões.",
        nao: "manter o ritmo normal, com análise nas comissões antes.",
      };
    case "requerimento":
      return {
        sim: "aceitar o pedido (por exemplo, adiar a votação ou retirar o tema da pauta).",
        nao: "recusar o pedido e seguir como estava.",
      };
    case "preliminar":
      return {
        sim: "considerar que a proposta pode seguir (é constitucional, tem urgência ou cabe no orçamento).",
        nao: "barrar a proposta antes de discutir o conteúdo.",
      };
    case "redacao":
    case "ajuste":
      return {
        sim: "confirmar a forma final do texto já aprovado.",
        nao: "não confirmar a redação; o conteúdo já foi decidido antes.",
      };
    case "senado":
      return {
        sim: "aceitar a mudança feita pelo Senado.",
        nao: "manter a versão aprovada antes pela Câmara.",
      };
    case "emenda":
      return {
        sim: "incluir no texto a mudança proposta pela emenda.",
        nao: "deixar o texto como estava.",
      };
    case "destaque":
      return {
        sim: "depende da pergunta do destaque: em geral, manter o trecho como está no texto.",
        nao: "em geral, retirar ou mudar esse trecho.",
        nota: "Cada destaque tem sua própria pergunta; confira a descrição oficial para o sentido exato.",
      };
    default:
      return {
        sim: "aprovar a proposta.",
        nao: "rejeitar a proposta.",
      };
  }
}

const MEMBROS: Record<Casa, string> = { camara: "513 deputados", senado: "81 senadores" };

/** Why this many Sim votes were needed, in everyday words. */
export function explicarQuorum(casa: Casa, tipo?: string): string {
  if (tipo === "PEC") {
    const n = casa === "camara" ? "308 dos 513 deputados" : "49 dos 81 senadores";
    return `Mudar a Constituição exige 3/5 de todos os membros: ${n} precisam votar Sim, e isso em dois turnos. Quem falta ou se abstém conta, na prática, contra.`;
  }
  if (tipo === "PLP") {
    const n = casa === "camara" ? "257 dos 513 deputados" : "41 dos 81 senadores";
    return `Lei complementar exige maioria absoluta: ${n} precisam votar Sim, não apenas a maioria de quem estava presente. Por isso ausências pesam contra.`;
  }
  return `Basta ter mais votos Sim do que Não entre os presentes, desde que pelo menos metade dos ${MEMBROS[casa]} esteja na sessão.`;
}

/** The road ahead for the proposal, given what kind it is and what this vote decided. */
export function proximosPassos(opts: {
  casa: Casa;
  tipo?: string;
  etapa: Etapa;
  aprovada: boolean;
  rejeitada: boolean;
  /** Where the proposal stands today, when the API says so; it beats the generic path. */
  hoje?: { situacao?: string; norma?: string; vetos?: "parcial" | "total" };
}): string {
  const { casa, tipo, etapa, aprovada, rejeitada, hoje } = opts;
  if (etapa.tipo === "urgencia") {
    return aprovada
      ? "Com a urgência aprovada, a proposta pode entrar na pauta do Plenário rapidamente, sem passar antes pelas comissões."
      : "Sem urgência, a proposta segue o caminho normal, passando pelas comissões antes de chegar ao Plenário.";
  }
  if (etapa.tipo === "requerimento") {
    return "Requerimentos tratam do andamento da sessão. A proposta em si continua sendo discutida.";
  }
  if (["destaque", "emenda", "ajuste", "redacao"].includes(etapa.tipo)) {
    return "Esta votação ajustou o texto. O destino da proposta depende da votação do texto principal e das etapas seguintes.";
  }
  const real = hoje && passoReal(hoje, casa);
  if (real) return real;
  if (rejeitada && etapa.tipo === "principal") {
    return "Quando o texto principal é rejeitado, a proposta normalmente é arquivada.";
  }
  switch (tipo) {
    case "PEC":
      return "Uma emenda à Constituição precisa ser aprovada em dois turnos na Câmara e dois no Senado. Depois, é promulgada pelo próprio Congresso, sem passar pela sanção do Presidente.";
    case "MPV":
    case "PLV":
      return "A medida provisória já vale desde que foi publicada. Ela precisa ser aprovada pela Câmara e pelo Senado em até 120 dias; se não for, perde a validade.";
    case "PDL":
      return "O decreto legislativo não vai para a sanção do Presidente: aprovado na Câmara e no Senado, é promulgado pelo Congresso.";
    case "MSC":
      return "Tratados enviados pelo Governo são analisados como decreto legislativo e precisam passar pelas duas Casas.";
    default:
      return casa === "camara"
        ? "Em geral, aprovado na Câmara, o projeto segue para o Senado. Se o Senado aprovar sem mudanças, vai para a sanção do Presidente da República, que pode vetar trechos. Se o Senado mudar o texto, ele volta para a Câmara."
        : "Em geral, se o projeto veio da Câmara e o Senado não mudou o texto, ele vai para a sanção do Presidente da República. Se mudou, volta para a Câmara. Se começou no Senado, segue agora para a Câmara.";
  }
}

function passoReal(hoje: { situacao?: string; norma?: string; vetos?: "parcial" | "total" }, casa: Casa): string | null {
  const s = hoje.situacao ?? "";
  if (hoje.norma) {
    const veto =
      hoje.vetos === "parcial"
        ? " O Presidente vetou alguns trechos; o Congresso ainda pode derrubar esses vetos em sessão conjunta."
        : hoje.vetos === "total"
          ? " O Presidente vetou o texto; o Congresso pode derrubar o veto em sessão conjunta."
          : "";
    return `A tramitação terminou: a proposta virou a ${hoje.norma} e já faz parte da legislação.${veto}`;
  }
  if (/arquivad/i.test(s)) return "A proposta foi arquivada e não segue adiante, a menos que seja desarquivada.";
  if (/san[çc][ãa]o/i.test(s)) return "Aprovada no Congresso, aguarda a sanção do Presidente da República, que tem 15 dias úteis para sancionar ou vetar, no todo ou em parte.";
  if (casa === "camara" && /senado/i.test(s)) return "Agora a proposta está no Senado, que pode aprovar, mudar ou rejeitar. Se aprovar sem mudanças, segue para a sanção do Presidente; se mudar, volta para a Câmara.";
  if (casa === "senado" && /c[âa]mara/i.test(s)) return "Agora a proposta está na Câmara dos Deputados, que dá a próxima palavra.";
  return null;
}

export const GLOSSARIO: { termo: string; explica: string }[] = [
  { termo: "Votação nominal", explica: "Cada parlamentar registra o voto no painel eletrônico, e dá para saber como cada um votou." },
  { termo: "Votação simbólica", explica: "Os parlamentares se manifestam em conjunto e a Presidência anuncia o resultado, sem registro individual." },
  { termo: "Abstenção", explica: "O parlamentar está presente e registra que não vota nem Sim nem Não." },
  { termo: "Obstrução", explica: "Estratégia para atrasar ou impedir a votação; quem obstrui não conta para o quórum." },
  { termo: "Presidente (Art. 17)", explica: "Quem preside a sessão normalmente não vota, exceto em casos de empate." },
  { termo: "Orientação", explica: "Recomendação do líder do partido ou do Governo sobre como votar. \"Liberado\" significa que cada um vota como quiser." },
  { termo: "Destaque", explica: "Pedido para votar um trecho do texto separadamente, depois do texto principal." },
  { termo: "Substitutivo", explica: "Nova versão do texto, preparada pelo relator, que substitui a proposta original." },
  { termo: "Urgência", explica: "Regime que acelera a tramitação e permite votar direto no Plenário." },
  { termo: "Quórum", explica: "Número mínimo de parlamentares presentes ou de votos Sim exigido para a decisão valer." },
  { termo: "Sanção e veto", explica: "Depois de aprovado no Congresso, o Presidente da República pode sancionar (concordar) ou vetar o projeto, no todo ou em parte. O Congresso pode derrubar o veto." },
];
