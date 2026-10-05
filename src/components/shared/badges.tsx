import {
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  XCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { partyColor, statusTone, withAlpha } from "@/lib/parties";
import type { StatusTone } from "@/lib/types";

const TONE_ICON = {
  success: CheckCircle2,
  danger: XCircle,
  warning: AlertCircle,
  info: Clock,
  accent: AlertCircle,
  neutral: HelpCircle,
} as const;

export function StatusBadge({
  status,
  className,
  icon = true,
  maxLength = 34,
}: {
  status?: string;
  className?: string;
  icon?: boolean;
  maxLength?: number;
}) {
  if (!status) return null;
  const tone: StatusTone = statusTone(status);
  const Icon = TONE_ICON[tone];
  const text = status.length > maxLength ? status.slice(0, maxLength - 1) + "…" : status;
  return (
    <Badge tone={tone} className={cn("max-w-full", className)} title={status}>
      {icon && <Icon className="h-3 w-3 shrink-0" />}
      <span className="truncate">{text}</span>
    </Badge>
  );
}

export function AprovacaoBadge({
  aprovacao,
  className,
}: {
  aprovacao?: number | null;
  className?: string;
}) {
  if (aprovacao === 1) {
    return (
      <Badge tone="success" className={className}>
        <CheckCircle2 className="h-3 w-3" />
        Aprovada
      </Badge>
    );
  }
  if (aprovacao === 0) {
    return (
      <Badge tone="danger" className={className}>
        <XCircle className="h-3 w-3" />
        Rejeitada
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" className={className}>
      <Clock className="h-3 w-3" />
      Em votação
    </Badge>
  );
}

export function PartyTag({
  sigla,
  short,
  className,
}: {
  sigla: string;
  short?: boolean;
  className?: string;
}) {
  const color = partyColor(sigla);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
        className
      )}
      style={{ color, backgroundColor: withAlpha(color, 0.12) }}
      title={sigla}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {short && sigla.length > 8 ? sigla.slice(0, 8) : sigla}
    </span>
  );
}

export function MemberAvatar({
  name,
  photo,
  party,
  size = 36,
  className,
}: {
  name: string;
  photo?: string;
  party?: string;
  size?: number;
  className?: string;
}) {
  const color = party ? partyColor(party) : "#85827C";
  return (
    <Avatar
      className={cn("border border-line-2", className)}
      style={{ width: size, height: size, boxShadow: `inset 0 0 0 1px ${withAlpha(color, 0.25)}` }}
    >
      {photo && <AvatarImage src={photo} alt={name} loading="lazy" />}
      <AvatarFallback
        style={{ backgroundColor: withAlpha(color, 0.16), color }}
        className="font-semibold"
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
