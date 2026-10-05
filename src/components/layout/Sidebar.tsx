import { cn } from "@/lib/utils";
import {
  Landmark,
  FileText,
  Users,
  BarChart3,
  Home,
  ScrollText,
} from "lucide-react";

interface SidebarProps {
  active: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Visão Geral", icon: Home },
  { id: "pecs", label: "PECs", icon: FileText },
  { id: "deputados", label: "Deputados", icon: Users },
  { id: "senadores", label: "Senadores", icon: Landmark },
  { id: "metricas", label: "Métricas", icon: BarChart3 },
  { id: "atividades", label: "Atividades", icon: ScrollText },
];

export function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-40 h-full w-56 border-r border-line bg-panel/50 backdrop-blur-md">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/15">
            <Landmark className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h1 className="font-serif text-base font-semibold tracking-tight text-fg">
              Congresso
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-fg-5">
              Dados Abertos
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] transition-all duration-150",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-fg-3 hover:bg-panel-2 hover:text-fg"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-line p-4">
          <p className="text-[10px] leading-relaxed text-fg-5">
            Dados oficiais da Câmara dos Deputados e Senado Federal
          </p>
        </div>
      </div>
    </aside>
  );
}
