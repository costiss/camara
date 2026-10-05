import { addDays, isoDate } from "./format";

export interface Intervalo {
  ini: string;
  fim: string;
}

/** A named time window: the last N days or a calendar year. */
export class Periodo implements Intervalo {
  static readonly PADRAO = "90d";
  private static readonly DIAS: Record<string, number> = { "30d": 30, "90d": 90 };

  readonly valor: string;
  readonly label: string;
  readonly ini: string;
  readonly fim: string;

  private constructor(valor: string, label: string, ini: string, fim: string) {
    this.valor = valor;
    this.label = label;
    this.ini = ini;
    this.fim = fim;
  }

  static opcoes(hoje = new Date()): Periodo[] {
    const ano = hoje.getFullYear();
    return [
      ...Object.keys(Periodo.DIAS).map((v) => Periodo.de(v, hoje)),
      ...[0, 1, 2, 3].map((i) => Periodo.de(String(ano - i), hoje)),
    ];
  }

  static de(valor: string, hoje = new Date()): Periodo {
    const dias = Periodo.DIAS[valor];
    if (dias) return new Periodo(valor, `${dias} dias`, isoDate(addDays(hoje, -(dias - 1))), isoDate(hoje));
    const ano = Number(valor);
    if (/^\d{4}$/.test(valor) && ano >= 2000 && ano <= hoje.getFullYear()) {
      const fim = ano === hoje.getFullYear() ? isoDate(hoje) : `${ano}-12-31`;
      return new Periodo(valor, valor, `${ano}-01-01`, fim);
    }
    return Periodo.de(Periodo.PADRAO, hoje);
  }

  /** Splits the window into pieces the Câmara API accepts (at most 3 months each). */
  janelasTrimestrais(): Intervalo[] {
    const out: Intervalo[] = [];
    let ini = new Date(`${this.ini}T12:00:00`);
    const fim = new Date(`${this.fim}T12:00:00`);
    while (ini <= fim) {
      const limite = new Date(ini);
      limite.setMonth(limite.getMonth() + 3);
      const corte = addDays(limite, -1) < fim ? addDays(limite, -1) : fim;
      out.push({ ini: isoDate(ini), fim: isoDate(corte) });
      ini = addDays(corte, 1);
    }
    return out;
  }
}
