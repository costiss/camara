import { cn } from "@/lib/utils";
import { navigate, useRoute } from "@/hooks/useUi";
import {
  Activity,
  BarChart3,
  CalendarClock,
  FileText,
  Landmark,
  LayoutDashboard,
  Users,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Visão geral", hint: "Resumo ao vivo", icon: LayoutDashboard },
  { id: "pecs", label: "PECs", hint: "Emendas à Constituição", icon: FileText },
  { id: "agenda", label: "Agenda & votações", hint: "Próximas e recentes", icon: CalendarClock },
  { id: "deputados", label: "Deputados", hint: "Câmara", icon: Users },
  { id: "senadores", label: "Senadores", hint: "Senado Federal", icon: Landmark },
  { id: "atividades", label: "Atividades", hint: "Movimentações", icon: Activity },
  { id: "metricas", label: "Métricas", hint: "Distribuições", icon: BarChart3 },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-xl border border-accent/25 bg-accent-dim">
        <Landmark className="h-4.5 w-4.5 text-accent" />
      </div>
      <div className="leading-tight">
        <p className="font-serif text-[15px] font-medium tracking-tight text-fg">
          Congresso Aberto
        </p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-fg-5">
          Câmara · Senado
        </p>
      </div>
    </div>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const route = useRoute();

  const go = (id: string) => {
    navigate(id);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-4">
        <Brand />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = route === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150",
                active
                  ? "bg-panel-2 shadow-[inset_0_0_0_1px_var(--color-line-2)]"
                  : "hover:bg-panel-2/60"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-accent" : "text-fg-4 group-hover:text-fg-2"
                )}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-[12.5px] font-medium",
                    active ? "text-fg" : "text-fg-2 group-hover:text-fg"
                  )}
                >
                  {item.label}
                </span>
                <span className="block truncate text-[10px] text-fg-5">{item.hint}</span>
              </span>
              {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-line px-4 py-3.5">
        <p className="text-[10px] leading-relaxed text-fg-5">
          Dados abertos oficiais da Câmara dos Deputados e do Senado Federal.
        </p>
        <p className="mt-1.5 text-[10px] text-fg-5">
          Atualização automática a cada acesso.
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-[232px] border-r border-line bg-panel/40 backdrop-blur-xl lg:block">
      <SidebarContent />
    </aside>
  );
}
