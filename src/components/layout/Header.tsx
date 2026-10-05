import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function Header({ title, subtitle, className }: HeaderProps) {
  return (
    <header className={cn("border-b border-line px-6 py-4", className)}>
      <h2 className="font-serif text-xl font-medium tracking-tight text-fg">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-0.5 text-xs text-fg-4">{subtitle}</p>
      )}
    </header>
  );
}
