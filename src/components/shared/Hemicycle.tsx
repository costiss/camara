import { memo, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { partyColor, voteColor, voteRank } from "@/lib/parties";
import { formatNumber } from "@/lib/format";
import { pct } from "@/lib/aggregate";
import type { VotoParlamentar } from "@/lib/types";

/**
 * Parliament hemicycle: every voter is one seat, laid out on concentric
 * arcs and coloured either by how they voted or by their party. Hover a
 * seat to see the name; the same seat is highlighted in the roll-call.
 */
export interface HemicycleProps {
  votos: VotoParlamentar[];
  colorBy?: "voto" | "partido";
  onSeatHover?: (voto: VotoParlamentar | null) => void;
  onSeatClick?: (voto: VotoParlamentar) => void;
  className?: string;
}

interface PlacedSeat {
  x: number;
  y: number;
  r: number;
  color: string;
  voto: VotoParlamentar;
}

interface Category {
  name: string;
  count: number;
  color: string;
}

function computeLayout(votos: VotoParlamentar[], colorBy: "voto" | "partido") {
  const N = votos.length;
  const viewW = 1000;
  const pad = 12;
  if (N === 0) {
    return { seats: [] as PlacedSeat[], categories: [] as Category[], viewW, viewH: 320 };
  }

  const rMax = viewW / 2 - pad * 2;
  const rMin = rMax * 0.4;
  const rows = Math.max(5, Math.min(14, Math.round(Math.sqrt(N) / 1.25)));
  const radii = Array.from({ length: rows }, (_, i) =>
    rows === 1 ? rMax : rMin + (rMax - rMin) * (i / (rows - 1))
  );

  // Largest-remainder allocation of seats across rows (∝ radius).
  const sumR = radii.reduce((a, b) => a + b, 0);
  const exact = radii.map((r) => (N * r) / sumR);
  const counts = exact.map(Math.floor);
  const remainder = N - counts.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder; k += 1) counts[order[k % rows].i] += 1;

  const rowGap = rows > 1 ? (rMax - rMin) / (rows - 1) : rMax;
  const innerSpacing = counts[0] > 0 ? (Math.PI * rMin) / counts[0] : 24;
  const seatR = Math.max(1.5, Math.min(innerSpacing * 0.34, rowGap * 0.36));

  const baseY = rMax + pad;
  const viewH = baseY + seatR + 4;

  const geo: { x: number; y: number; angle: number; row: number }[] = [];
  radii.forEach((rad, row) => {
    const n = counts[row];
    if (n <= 0) return;
    for (let j = 0; j < n; j += 1) {
      const t = n === 1 ? 0.5 : (j + 0.5) / n;
      const angle = Math.PI * (1 - t); // π (left) → 0 (right)
      geo.push({
        x: viewW / 2 + rad * Math.cos(angle),
        y: baseY - rad * Math.sin(angle),
        angle,
        row,
      });
    }
  });
  // Wedges run left→right, inner→outer.
  geo.sort((a, b) => b.angle - a.angle || a.row - b.row);

  // Order voters so each category forms a contiguous block of seats.
  const ordered = [...votos];
  if (colorBy === "voto") {
    ordered.sort(
      (a, b) =>
        voteRank(a.voto) - voteRank(b.voto) || a.nome.localeCompare(b.nome, "pt-BR")
    );
  } else {
    const size = new Map<string, number>();
    for (const v of votos) size.set(v.partido, (size.get(v.partido) ?? 0) + 1);
    ordered.sort(
      (a, b) =>
        (size.get(b.partido) ?? 0) - (size.get(a.partido) ?? 0) ||
        a.partido.localeCompare(b.partido, "pt-BR") ||
        a.nome.localeCompare(b.nome, "pt-BR")
    );
  }

  const seats: PlacedSeat[] = geo.map((g, i) => {
    const voto = ordered[i];
    return {
      x: g.x,
      y: g.y,
      r: seatR,
      voto,
      color: colorBy === "voto" ? voteColor(voto.voto) : partyColor(voto.partido),
    };
  });

  const catMap = new Map<string, Category>();
  for (const s of seats) {
    const name = colorBy === "voto" ? s.voto.voto : s.voto.partido;
    const entry = catMap.get(name);
    if (entry) entry.count += 1;
    else
      catMap.set(name, {
        name,
        count: 1,
        color: colorBy === "voto" ? voteColor(name) : partyColor(name),
      });
  }
  const categories = [...catMap.values()].sort(
    (a, b) =>
      (colorBy === "voto" ? voteRank(a.name) - voteRank(b.name) : 0) ||
      b.count - a.count
  );

  return { seats, categories, viewW, viewH };
}

const SeatCircle = memo(function SeatCircle({
  x,
  y,
  r,
  color,
  voto,
  onHover,
  onSelect,
}: {
  x: number;
  y: number;
  r: number;
  color: string;
  voto: VotoParlamentar;
  onHover: (voto: VotoParlamentar, x: number, y: number) => void;
  onSelect?: (voto: VotoParlamentar) => void;
}) {
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      fill={color}
      className="seat"
      onMouseEnter={() => onHover(voto, x, y)}
      onClick={() => onSelect?.(voto)}
    >
      <title>{`${voto.nome} · ${voto.partido}/${voto.uf} · ${voto.voto}`}</title>
    </circle>
  );
});

export function Hemicycle({
  votos,
  colorBy = "voto",
  onSeatHover,
  onSeatClick,
  className,
}: HemicycleProps) {
  const { seats, categories, viewW, viewH } = useMemo(
    () => computeLayout(votos, colorBy),
    [votos, colorBy]
  );
  const [hover, setHover] = useState<{
    voto: VotoParlamentar;
    x: number;
    y: number;
  } | null>(null);

  const handleHover = useCallback(
    (voto: VotoParlamentar, x: number, y: number) => {
      setHover({ voto, x, y });
      onSeatHover?.(voto);
    },
    [onSeatHover]
  );

  const clearHover = useCallback(() => {
    setHover(null);
    onSeatHover?.(null);
  }, [onSeatHover]);

  const total = votos.length;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative w-full" onMouseLeave={clearHover}>
        <svg
          viewBox={`0 0 ${viewW} ${viewH}`}
          className="w-full"
          style={{ display: "block" }}
          role="img"
          aria-label={`Plenário com ${total} votantes`}
        >
          {seats.map((s, i) => (
            <SeatCircle
              key={`${s.voto.parlamentarId || i}`}
              x={s.x}
              y={s.y}
              r={s.r}
              color={s.color}
              voto={s.voto}
              onHover={handleHover}
              onSelect={onSeatClick}
            />
          ))}
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-lg border border-line-2 bg-panel-2/95 px-2.5 py-1.5 shadow-xl backdrop-blur"
            style={{
              left: `${(hover.x / viewW) * 100}%`,
              top: `${(hover.y / viewH) * 100}%`,
            }}
          >
            <p className="text-[11.5px] font-medium text-fg">{hover.voto.nome}</p>
            <p className="text-[10.5px] text-fg-4">
              <span style={{ color: partyColor(hover.voto.partido) }}>
                {hover.voto.partido}
              </span>{" "}
              · {hover.voto.uf} ·{" "}
              <span style={{ color: voteColor(hover.voto.voto) }}>
                {hover.voto.voto}
              </span>
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {categories.map((c) => (
          <div key={c.name} className="flex items-center gap-1.5 text-[11.5px]">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: c.color }}
            />
            <span className="text-fg-2">{c.name}</span>
            <span className="tn text-fg-4">{formatNumber(c.count)}</span>
            <span className="tn text-fg-5">{pct(c.count, total)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
