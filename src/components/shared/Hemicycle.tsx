import { memo, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Seat {
  id: string;
  color: string;
  title: string;
  dim?: boolean;
}

interface Placed {
  x: number;
  y: number;
}

const VIEW_W = 600;
const PAD = 8;

/** Seat centres on concentric arcs, ordered left→right then inner→outer. */
class HemicycleLayout {
  readonly points: Placed[];
  readonly seatR: number;
  readonly viewH: number;

  constructor(n: number) {
    const rows = Math.max(4, Math.min(13, Math.round(Math.sqrt(n) / 1.6)));
    const outer = VIEW_W / 2 - PAD;
    const rowGap0 = (outer * 0.58) / (rows - 1);
    this.seatR = Math.max(2, Math.min(15, rowGap0 * 0.4));
    const rMax = VIEW_W / 2 - this.seatR - 2;
    const rMin = rMax * 0.46;
    const radii = Array.from({ length: rows }, (_, i) => rMin + ((rMax - rMin) * i) / (rows - 1));
    const sumR = radii.reduce((a, b) => a + b, 0);
    const exact = radii.map((r) => (n * r) / sumR);
    const counts = exact.map(Math.floor);
    const order = exact.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((a, b) => b.f - a.f);
    const resto = n - counts.reduce((a, b) => a + b, 0);
    for (let k = 0; k < resto; k += 1) counts[order[k % rows].i] += 1;
    const arcGap = counts[0] > 1 ? (Math.PI * rMin) / (counts[0] - 1) : 40;
    this.seatR = Math.max(2, Math.min(this.seatR, arcGap * 0.44));
    const baseY = rMax + this.seatR + 2;
    this.viewH = baseY + this.seatR + 2;

    const geo: { x: number; y: number; a: number; row: number }[] = [];
    radii.forEach((rad, row) => {
      const c = counts[row];
      for (let j = 0; j < c; j += 1) {
        const a = Math.PI * (1 - (c === 1 ? 0.5 : j / (c - 1)));
        geo.push({ x: VIEW_W / 2 + rad * Math.cos(a), y: baseY - rad * Math.sin(a), a, row });
      }
    });
    geo.sort((p, q) => q.a - p.a || p.row - q.row);
    this.points = geo;
  }
}

export const Hemicycle = memo(function Hemicycle({
  seats,
  center,
  label,
  onSeatClick,
  className,
}: {
  seats: Seat[];
  center?: ReactNode;
  label: string;
  onSeatClick?: (id: string) => void;
  className?: string;
}) {
  const layout = useMemo(() => new HemicycleLayout(seats.length), [seats.length]);
  const [hover, setHover] = useState<{ seat: Seat; p: Placed } | null>(null);
  const anyDim = seats.some((s) => s.dim);

  return (
    <div className={cn("relative w-full", className)} onMouseLeave={() => setHover(null)}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${layout.viewH}`}
        className={cn("block w-full", anyDim && "seats-dim")}
        role="img"
        aria-label={label}
      >
        {seats.map((s, i) => {
          const p = layout.points[i];
          if (!p) return null;
          return (
            <circle
              key={s.id}
              cx={p.x}
              cy={p.y}
              r={layout.seatR}
              fill={s.color}
              className="seat"
              data-dim={s.dim || undefined}
              onMouseEnter={() => setHover({ seat: s, p })}
              onClick={() => onSeatClick?.(s.id)}
            />
          );
        })}
      </svg>
      {center && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center">
          {center}
        </div>
      )}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-lg border border-line-2 bg-panel-2/95 px-2.5 py-1.5 text-[12px] shadow-xl backdrop-blur"
          style={{ left: `${(hover.p.x / VIEW_W) * 100}%`, top: `${(hover.p.y / layout.viewH) * 100}%` }}
        >
          {hover.seat.title}
        </div>
      )}
    </div>
  );
});
