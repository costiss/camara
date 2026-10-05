import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HudGrid({ left, center, right, dock, centroPrimeiro }: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  dock?: ReactNode;
  /** On narrow screens, show the centre column before the left one. */
  centroPrimeiro?: boolean;
}) {
  return (
    <div className={cn("hud-grid", centroPrimeiro && "hud-grid-centro")}>
      <div className="hud-col">{left}</div>
      <section className="hud-col hud-center flex flex-col gap-3">
        <div className="quiet-scroll min-h-0 flex-1 overflow-y-auto">{center}</div>
        {dock}
      </section>
      <div className="hud-col">{right}</div>
    </div>
  );
}
