/** Small presentation helpers shared across the app. */

const dt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dtLong = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const dtt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const num = new Intl.NumberFormat("pt-BR");

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (typeof value === "string" && DATE_ONLY.test(value)) return new Date(`${value}T12:00:00`);
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value?: string | Date | null): string {
  const d = toDate(value);
  return d ? dt.format(d) : "—";
}

export function formatDateLong(value?: string | Date | null): string {
  const d = toDate(value);
  return d ? dtLong.format(d) : "—";
}

const dtExtenso = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" });

/** "3 de setembro de 2026, às 17h28" — the time only when the value has one. */
export function formatQuando(value?: string | null): string {
  const d = toDate(value);
  if (!d) return "—";
  const data = dtExtenso.format(d);
  if (!value || DATE_ONLY.test(value)) return data;
  return `${data}, às ${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDateTime(value?: string | Date | null): string {
  if (typeof value === "string" && DATE_ONLY.test(value)) return formatDate(value);
  const d = toDate(value);
  return d ? dtt.format(d) : "—";
}

export function formatTime(value?: string | Date | null): string {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatMonth(value?: string | Date | null): string {
  const d = toDate(value);
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" })
    .format(d)
    .replace(".", "");
}

export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined) return "—";
  return num.format(value);
}

export function formatCompact(value?: number | null): string {
  if (value === null || value === undefined) return "—";
  if (Math.abs(value) < 1000) return String(value);
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPct(value?: number | null, digits = 0): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(digits)}%`;
}

export function relativeTime(value?: string | Date | null): string {
  const d = toDate(value);
  if (!d) return "—";
  const diff = Date.now() - d.getTime();
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const future = diff < 0;
  const prefix = future ? "em " : "";
  const suffix = future ? "" : " atrás";

  if (abs < minute) return "agora";
  if (abs < hour) return `${prefix}${Math.round(abs / minute)} min${suffix}`;
  if (abs < day) return `${prefix}${Math.round(abs / hour)} h${suffix}`;
  if (abs < 30 * day) return `${prefix}${Math.round(abs / day)} d${suffix}`;
  if (abs < 365 * day) return `${prefix}${Math.round(abs / (30 * day))} mes${suffix}`;
  return `${prefix}${Math.round(abs / (365 * day))} ano${suffix}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

/** Local calendar date (YYYY-MM-DD); the APIs and session dates are in Brasília time. */
export function isoDate(value: Date | string): string {
  const d = toDate(value) ?? new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** First day of the month, `offset` months away from now. */
export function monthStart(offset = 0): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
}
