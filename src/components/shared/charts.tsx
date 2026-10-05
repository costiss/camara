import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type { DistribuicaoItem } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { partyColor, withAlpha } from "@/lib/parties";
import { pct } from "@/lib/aggregate";

interface ChartPayload {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter = (v) => formatNumber(Number(v)),
  nameFormatter,
}: {
  active?: boolean;
  payload?: ChartPayload[];
  label?: string | number;
  formatter?: (value: number | string) => string;
  nameFormatter?: (name: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-line-2 bg-panel-2/95 px-2.5 py-2 shadow-xl backdrop-blur">
      {label !== undefined && label !== "" && (
        <div className="mb-1 text-[11px] font-medium text-fg-2">{label}</div>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: entry.color ?? "var(--color-fg-4)" }}
            />
            <span className="text-fg-4">
              {nameFormatter ? nameFormatter(String(entry.name ?? "")) : entry.name}
            </span>
            <span className="tn ml-auto font-medium text-fg">
              {formatter(entry.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- Donut -------------------------------- */

export function Donut({
  items,
  height = 220,
  colorFor = partyColor,
  centerLabel,
  centerValue,
  legend = true,
  className,
}: {
  items: DistribuicaoItem[];
  height?: number;
  colorFor?: (name: string) => string;
  centerLabel?: string;
  centerValue?: ReactNode;
  legend?: boolean;
  className?: string;
}) {
  const total = items.reduce((a, b) => a + b.value, 0);
  const slice = items.slice(0, 12);

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slice}
              dataKey="value"
              nameKey="name"
              innerRadius="66%"
              outerRadius="98%"
              paddingAngle={1.5}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {slice.map((item, i) => (
                <Cell key={i} fill={colorFor(item.name)} />
              ))}
            </Pie>
            <Tooltip
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  label={undefined}
                  payload={props.payload as unknown as ChartPayload[]}
                />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        {(centerValue !== undefined || centerLabel) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            {centerValue !== undefined && (
              <span className="fig text-[26px]">{centerValue}</span>
            )}
            {centerLabel && <span className="label mt-1">{centerLabel}</span>}
          </div>
        )}
      </div>

      {legend && (
        <div className="min-w-0 flex-1 space-y-1.5">
          {slice.map((item) => {
            const color = colorFor(item.name);
            return (
              <div key={item.name} className="flex items-center gap-2 text-[12px]">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: color }}
                />
                <span className="truncate text-fg-2">{item.name}</span>
                <span className="tn ml-auto text-fg-4">{formatNumber(item.value)}</span>
                <span className="tn w-9 text-right text-fg-5">
                  {pct(item.value, total)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Distribution ---------------------------- */

export function DistributionBars({
  items,
  total,
  colorFor = () => "var(--color-accent)",
  limit,
  onSelect,
  className,
}: {
  items: DistribuicaoItem[];
  total?: number;
  colorFor?: (name: string) => string;
  limit?: number;
  onSelect?: (name: string) => void;
  className?: string;
}) {
  const list = limit ? items.slice(0, limit) : items;
  const max = Math.max(...list.map((i) => i.value), 1);
  const sumValue = total ?? items.reduce((a, b) => a + b.value, 0);

  return (
    <div className={cn("space-y-2.5", className)}>
      {list.map((item) => {
        const color = colorFor(item.name);
        return (
          <button
            key={item.name}
            type="button"
            disabled={!onSelect}
            onClick={() => onSelect?.(item.name)}
            className={cn(
              "group flex w-full items-center gap-3 text-left",
              onSelect && "cursor-pointer"
            )}
          >
            <span className="w-20 shrink-0 truncate text-[12px] font-medium text-fg-2 group-hover:text-fg">
              {item.name}
            </span>
            <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-panel-3">
              <span
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  background: color,
                }}
              />
            </span>
            <span className="tn w-10 shrink-0 text-right text-[12px] text-fg-3">
              {formatNumber(item.value)}
            </span>
            <span className="tn w-9 shrink-0 text-right text-[11px] text-fg-5">
              {pct(item.value, sumValue)}%
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------- Trend area ---------------------------- */

export function TrendArea({
  data,
  height = 240,
  color = "#d4a853",
  dataKey = "total",
  xKey = "label",
  nameFormatter,
  className,
}: {
  data: Record<string, unknown>[];
  height?: number;
  color?: string;
  dataKey?: string;
  xKey?: string;
  nameFormatter?: (name: string) => string;
  className?: string;
}) {
  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey={xKey}
            tick={{ fill: "var(--color-fg-4)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "var(--color-fg-5)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-line-2)" }}
            content={(props) => (
              <ChartTooltip
                active={props.active}
                label={props.label as string | number | undefined}
                payload={props.payload as unknown as ChartPayload[]}
                nameFormatter={nameFormatter}
              />
            )}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${dataKey})`}
            dot={false}
            activeDot={{ r: 3, fill: color, stroke: "var(--color-bg)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------- Bars chart ----------------------------- */

export function HorizontalBars({
  items,
  color = "#60a5fa",
  height = 280,
  heightPer = 30,
  className,
}: {
  items: DistribuicaoItem[];
  color?: string;
  height?: number;
  heightPer?: number;
  className?: string;
}) {
  const computed = Math.max(height, items.length * heightPer);
  return (
    <div className={className} style={{ width: "100%", height: computed }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={items}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={44}
            tick={{ fill: "var(--color-fg-3)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(250,250,249,0.04)" }}
            content={(props) => (
              <ChartTooltip
                active={props.active}
                label={props.label as string | number | undefined}
                payload={props.payload as unknown as ChartPayload[]}
              />
            )}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {items.map((_, i) => (
              <Cell key={i} fill={withAlpha(color, 0.9)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
