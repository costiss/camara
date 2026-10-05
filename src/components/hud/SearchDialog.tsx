import { useMemo, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MemberAvatar } from "@/components/shared";
import { useDeputados } from "@/hooks/useCamara";
import { useSenadores } from "@/hooks/useSenado";
import { useDeliberacoes } from "@/hooks/useDeliberacoes";
import { navigate, useDebouncedValue } from "@/hooks/useUi";
import { formatDate } from "@/lib/format";
import type { Parlamentar } from "@/lib/types";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function moveFocus(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-result]")];
  if (!items.length) return;
  e.preventDefault();
  const i = items.indexOf(document.activeElement as HTMLElement);
  const next = e.key === "ArrowDown" ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1);
  items[i === -1 ? 0 : next].focus();
}

export function SearchDialog({
  open,
  onOpenChange,
  onSelectMember,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMember: (p: Parlamentar) => void;
}) {
  const [q, setQ] = useState("");
  const query = norm(useDebouncedValue(q, 120).trim());
  const deputados = useDeputados();
  const senadores = useSenadores();
  const { deliberacoes } = useDeliberacoes();

  const membros = useMemo(() => {
    if (query.length < 2) return [];
    return [...(senadores.data ?? []), ...(deputados.data ?? [])]
      .filter((m) => norm(`${m.nome} ${m.partido} ${m.uf}`).includes(query))
      .slice(0, 8);
  }, [query, deputados.data, senadores.data]);

  const votacoes = useMemo(() => {
    if (query.length < 2) return [];
    return deliberacoes
      .filter((d) => norm(`${d.proposicao ?? ""} ${d.ementa ?? ""} ${d.principal.descricao}`).includes(query))
      .slice(0, 6);
  }, [query, deliberacoes]);

  const close = () => {
    onOpenChange(false);
    setQ("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="top-[12vh] w-[min(560px,calc(100vw-2rem))] translate-y-0 data-[state=open]:animate-[overlay-in_160ms_var(--ease-out)]" hideClose>
        <DialogTitle className="sr">Buscar</DialogTitle>
        <div onKeyDown={moveFocus}>
          <label className="flex items-center gap-3 border-b border-line px-4">
            <Search className="h-4 w-4 text-fg-4" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Deputado, senador, partido, PL 123/2026…"
              className="h-12 flex-1 bg-transparent text-[14px] outline-none placeholder:text-fg-5"
              aria-label="Buscar"
            />
            <span className="kbd">Esc</span>
          </label>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {query.length < 2 && (
              <p className="px-3 py-6 text-center text-[12px] text-fg-4">
                Digite ao menos duas letras para buscar parlamentares e votações recentes.
              </p>
            )}
            {query.length >= 2 && membros.length === 0 && votacoes.length === 0 && (
              <p className="px-3 py-6 text-center text-[12px] text-fg-4">Nada encontrado para “{q}”.</p>
            )}
            {membros.length > 0 && <p className="label px-3 pb-1 pt-2">Parlamentares</p>}
            {membros.map((m) => (
              <button
                key={m.id}
                data-result
                type="button"
                className="ev grid-cols-[32px_minmax(0,1fr)_auto] items-center"
                onClick={() => {
                  close();
                  onSelectMember(m);
                }}
              >
                <MemberAvatar name={m.nome} photo={m.foto} party={m.partido} size={28} />
                <span className="truncate text-fg">{m.nome}</span>
                <span className="text-[12px] text-fg-3">
                  {m.casa === "camara" ? "Deputado" : "Senador"} · {m.partido}-{m.uf}
                </span>
              </button>
            ))}
            {votacoes.length > 0 && <p className="label px-3 pb-1 pt-3">Votações recentes</p>}
            {votacoes.map((d) => (
              <button
                key={d.key}
                data-result
                type="button"
                className="ev grid-cols-[minmax(0,1fr)_auto] items-center"
                onClick={() => {
                  close();
                  navigate("votacoes", d.principal.id);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg">{d.proposicao ?? "Votação"}</span>
                  <span className="block truncate text-[12px] text-fg-3">{d.ementa ?? d.principal.descricao}</span>
                </span>
                <span className="text-[12px] text-fg-4">
                  {d.casa === "camara" ? "Câmara" : "Senado"} · {formatDate(d.data)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
