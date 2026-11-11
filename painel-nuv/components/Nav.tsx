"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", rotulo: "Calendário", icone: "▦" },
  { href: "/demandas", rotulo: "Demandas", icone: "☑" },
  { href: "/metricas", rotulo: "Métricas", icone: "↗" },
  { href: "/leads", rotulo: "Leads", icone: "◎" },
  { href: "/financeiro", rotulo: "Financeiro", icone: "R$" },
];

export function Nav() {
  const path = usePathname();
  async function sair() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <aside className="sticky top-0 z-20 border-b border-black/5 bg-white/90 backdrop-blur md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center gap-2 px-4 py-3 md:px-5 md:py-6">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-nuv text-sm font-bold text-white">N</span>
        <span className="font-semibold">Painel NUV</span>
        <button onClick={sair} className="ml-auto text-xs text-ink-2 hover:text-ink md:hidden">Sair</button>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3">
        {ITENS.map((i) => {
          const ativo = i.href === "/" ? path === "/" || path.startsWith("/calendarios") : path.startsWith(i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium ${
                ativo ? "bg-nuv-soft text-nuv" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <span className="w-5 text-center text-xs">{i.icone}</span>
              {i.rotulo}
            </Link>
          );
        })}
      </nav>
      <button onClick={sair} className="absolute bottom-6 left-5 hidden text-xs text-ink-2 hover:text-ink md:block">
        Sair
      </button>
    </aside>
  );
}
