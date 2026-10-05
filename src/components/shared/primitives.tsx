import type { ReactNode } from "react";
import { AlertTriangle, Landmark, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Casa, StatusTone } from "@/lib/types";
import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------- KPI card ------------------------------- */

const TONE_TEXT: Record<StatusTone, string> = {
  neutral: "text-fg",
  accent: "text-accent",
  success: "text-green",
  danger: "text-red",
  warning: "text-yellow",
  info: "text-blue",
};

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: React.ElementType;
  tone?: StatusTone;
  loading?: boolean;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  loading,
  onClick,
  active,
  className,
}: KpiCardProps) {
  const interactive = !!onClick;
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (interactive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "surface surface-hover flex flex-col gap-3 p-4",
        interactive && "cursor-pointer",
        active && "border-accent/50 bg-accent-dim/40",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="label">{label}</span>
        {Icon && <Icon className={cn("h-4 w-4", TONE_TEXT[tone])} />}
      </div>
      <div className="flex items-end justify-between gap-2">
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <span className={cn("fig text-[30px]", TONE_TEXT[tone])}>{value}</span>
        )}
        {hint && (
          <span className="pb-0.5 text-right text-[11px] leading-tight text-fg-4">
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Section header --------------------------- */

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="section-title">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[12px] text-fg-4">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ------------------------------- Empty state ---------------------------- */

export function EmptyState({
  icon: Icon = Landmark,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ElementType;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-14 text-center",
        className
      )}
    >
      <div className="mb-1 grid h-11 w-11 place-items-center rounded-full border border-line bg-panel-2">
        <Icon className="h-5 w-5 text-fg-4" />
      </div>
      <p className="text-[13px] font-medium text-fg-2">{title}</p>
      {description && (
        <p className="max-w-sm text-[12px] leading-relaxed text-fg-4">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ------------------------------- Error state ---------------------------- */

export function ErrorState({
  title = "Não foi possível carregar os dados",
  description,
  onRetry,
  compact,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 text-center",
        compact ? "py-8" : "py-16"
      )}
    >
      <div className="mb-1 grid h-11 w-11 place-items-center rounded-full border border-red/25 bg-red/10">
        <AlertTriangle className="h-5 w-5 text-red" />
      </div>
      <p className="text-[13px] font-medium text-fg-2">{title}</p>
      {description && (
        <p className="max-w-sm text-[12px] leading-relaxed text-fg-4">{description}</p>
      )}
      {onRetry && (
        <Button size="sm" variant="ghost" className="mt-1" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

/* ------------------------------ Refresh button -------------------------- */

export interface RefreshButtonProps extends Omit<ButtonProps, "children"> {
  loading?: boolean;
  label?: string;
}

export function RefreshButton({
  loading,
  label = "Atualizar",
  onClick,
  ...props
}: RefreshButtonProps) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onClick}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  );
}

/* -------------------------------- Info row ------------------------------ */

export function InfoRow({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-1.5", className)}>
      <span className="shrink-0 text-[11px] uppercase tracking-wider text-fg-5">
        {label}
      </span>
      <span className="text-right text-[12px] text-fg-2">{value}</span>
    </div>
  );
}

/* ------------------------------- House tag ------------------------------ */

export function HouseTag({ casa, className }: { casa: Casa; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider",
        casa === "camara" ? "text-blue" : "text-purple",
        className
      )}
    >
      {casa === "camara" ? "Câmara" : "Senado"}
    </span>
  );
}

/* ------------------------------ Loading list ---------------------------- */

export function LoadingRows({ rows = 6, height = 68 }: { rows?: number; height?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="w-full" style={{ height }} />
      ))}
    </div>
  );
}
