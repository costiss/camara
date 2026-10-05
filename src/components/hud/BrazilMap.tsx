import { memo, type ReactNode } from "react";
import { BRAZIL_UFS, BRAZIL_VIEWBOX } from "@/lib/geo/brazilShapes";
import { cn } from "@/lib/utils";

export interface UfDatum {
  fill: string;
  value?: string;
  title?: string;
}

const CALLOUTS: Record<string, number> = {
  RN: 262,
  PB: 304,
  PE: 346,
  AL: 388,
  SE: 430,
  ES: 628,
  RJ: 676,
};
const BOX_X = 1040;
const BOX_W = 120;
const BOX_H = 34;
const VIEW_W = BOX_X + BOX_W + 4;
const EMPTY = "#22201D";

interface BrazilMapProps {
  data: Record<string, UfDatum>;
  activeUf?: string | null;
  onSelect?: (uf: string | null) => void;
  label: string;
  overlay?: ReactNode;
  className?: string;
  /** Shapes only: no labels or callout boxes, for small corner previews. */
  compacto?: boolean;
}

function Callout({ uf, cx, cy, datum, active, onSelect }: {
  uf: string;
  cx: number;
  cy: number;
  datum?: UfDatum;
  active: boolean;
  onSelect?: (uf: string) => void;
}) {
  const y = CALLOUTS[uf];
  return (
    <g className="cursor-pointer" onClick={() => onSelect?.(uf)}>
      <path
        d={`M${cx},${cy}L${BOX_X - 18},${y + BOX_H / 2}L${BOX_X},${y + BOX_H / 2}`}
        fill="none"
        stroke="rgba(250,250,249,0.25)"
        strokeWidth={1}
      />
      <rect
        x={BOX_X}
        y={y}
        width={BOX_W}
        height={BOX_H}
        rx={4}
        fill={datum?.fill ?? EMPTY}
        stroke={active ? "#FAFAF9" : "none"}
        strokeWidth={2}
      />
      <text x={BOX_X + 10} y={y + 23} className="uf-label">{uf}</text>
      {datum?.value && (
        <text x={BOX_X + BOX_W - 10} y={y + 23} textAnchor="end" className="uf-sub">
          {datum.value}
        </text>
      )}
    </g>
  );
}

export const BrazilMap = memo(function BrazilMap({
  data,
  activeUf,
  onSelect,
  label,
  overlay,
  className,
  compacto = false,
}: BrazilMapProps) {
  const toggle = (uf: string) => onSelect?.(activeUf === uf ? null : uf);
  return (
    <div className={cn("relative flex w-full items-center justify-center", !compacto && "min-[1180px]:h-full min-[1180px]:min-h-0", className)}>
      <svg
        viewBox={`0 0 ${compacto ? BRAZIL_VIEWBOX.width : VIEW_W} ${BRAZIL_VIEWBOX.height}`}
        className={cn("h-full max-h-full w-full", activeUf && "map-dim")}
        role="group"
        aria-label={label}
      >
        {BRAZIL_UFS.map((s) => {
          const datum = data[s.uf];
          return (
            <path
              key={s.uf}
              d={s.d}
              fill={datum?.fill ?? EMPTY}
              className="uf-shape"
              data-active={activeUf === s.uf}
              role="button"
              tabIndex={onSelect ? 0 : -1}
              aria-label={datum?.title ?? s.uf}
              aria-pressed={activeUf === s.uf}
              onClick={() => toggle(s.uf)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(s.uf);
                }
              }}
            >
              <title>{datum?.title ?? s.uf}</title>
            </path>
          );
        })}
        {!compacto && BRAZIL_UFS.filter((s) => !(s.uf in CALLOUTS)).map((s) => {
          const datum = data[s.uf];
          const small = s.uf === "DF";
          return (
            <g key={`l-${s.uf}`} aria-hidden="true">
              <text x={s.cx} y={s.cy - (small ? -6 : 2)} textAnchor="middle" className="uf-label">
                {s.uf}
              </text>
              {datum?.value && !small && (
                <text x={s.cx} y={s.cy + 18} textAnchor="middle" className="uf-sub">
                  {datum.value}
                </text>
              )}
            </g>
          );
        })}
        {!compacto && BRAZIL_UFS.filter((s) => s.uf in CALLOUTS).map((s) => (
          <Callout
            key={`c-${s.uf}`}
            uf={s.uf}
            cx={s.cx}
            cy={s.cy}
            datum={data[s.uf]}
            active={activeUf === s.uf}
            onSelect={toggle}
          />
        ))}
      </svg>
      {overlay}
    </div>
  );
});
