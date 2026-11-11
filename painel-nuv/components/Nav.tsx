"use client";
import { CalendarDays, CheckSquare, LineChart, LogOut, Settings2, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const GRUPOS = [
  {
    titulo: "Geral",
    itens: [
      { href: "/", rotulo: "Calendário", Icone: CalendarDays },
      { href: "/demandas", rotulo: "Demandas", Icone: CheckSquare },
      { href: "/metricas", rotulo: "Métricas", Icone: LineChart },
    ],
  },
  {
    titulo: "Agência",
    itens: [
      { href: "/leads", rotulo: "Leads", Icone: Users },
      { href: "/financeiro", rotulo: "Financeiro", Icone: Wallet },
    ],
  },
];

export function Nav() {
  const path = usePathname();
  const ativo = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  async function sair() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <>
      {/* celular: barra escura no topo */}
      <header className="sticky top-0 z-30 bg-ink px-4 pb-3 pt-3 text-white md:hidden">
        <div className="flex items-center gap-2">
          <span className="text-lg font-extrabold tracking-tight">nuv<span className="text-lima">.</span></span>
          <span className="text-xs text-white/50">painel</span>
          <button onClick={sair} className="ml-auto text-xs text-white/60" aria-label="Sair">Sair</button>
        </div>
        <nav className="-mx-1 mt-3 flex gap-1 overflow-x-auto">
          {GRUPOS.flatMap((g) => g.itens).map(({ href, rotulo, Icone }) => (
            <Link key={href} href={href} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${ativo(href) ? "bg-white text-ink" : "text-white/70"}`}>
              <Icone size={15} strokeWidth={2.2} /> {rotulo}
            </Link>
          ))}
        </nav>
      </header>

      {/* computador: painel escuro flutuante */}
      <aside className="sticky top-3 m-3 hidden h-[calc(100vh-24px)] w-60 shrink-0 flex-col rounded-[28px] bg-ink p-4 text-white md:flex">
        <div className="flex items-center gap-2 px-2 pb-6 pt-2">
          <span className="text-2xl font-extrabold tracking-tight">nuv<span className="text-lima">.</span></span>
          <span className="mt-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">painel</span>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto">
          {GRUPOS.map((g) => (
            <div key={g.titulo}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">{g.titulo}</p>
              <ul className="space-y-1">
                {g.itens.map(({ href, rotulo, Icone }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                        ativo(href) ? "bg-white text-ink" : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className={`grid h-7 w-7 place-items-center rounded-xl ${ativo(href) ? "bg-lima" : "bg-white/10"}`}>
                        <Icone size={15} strokeWidth={2.2} />
                      </span>
                      {rotulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="space-y-1 border-t border-white/10 pt-3">
          <Link href="/calendarios" className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold ${ativo("/calendarios") ? "bg-white text-ink" : "text-white/60 hover:text-white"}`}>
            <Settings2 size={16} /> Calendários
          </Link>
          <button onClick={sair} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-white/60 hover:text-white">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>
    </>
  );
}
