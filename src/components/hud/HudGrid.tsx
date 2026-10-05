import type { ReactNode } from "react";

export function HudGrid({ left, center, right, dock }: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  dock?: ReactNode;
}) {
  return (
    <div className="hud-grid">
      <div className="hud-col">{left}</div>
      <section className="hud-col hud-center flex flex-col gap-3">
        <div className="min-h-0 flex-1">{center}</div>
        {dock}
      </section>
      <div className="hud-col">{right}</div>
    </div>
  );
}
