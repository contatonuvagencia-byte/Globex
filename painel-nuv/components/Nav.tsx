"use client";
import { Briefcase, Building2, CalendarDays, Handshake, CheckSquare, LineChart, LogOut, Settings2, UserCog, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Area } from "@/lib/permissoes";
import { Avatar } from "./Avatar";
import { useUsuario } from "./Usuario";

const GRUPOS: { titulo: string; itens: { href: string; rotulo: string; Icone: typeof CalendarDays; area: Area }[] }[] = [
  {
    titulo: "Geral",
    itens: [
      { href: "/", rotulo: "Calendário", Icone: CalendarDays, area: "calendario" },
      { href: "/demandas", rotulo: "Demandas", Icone: CheckSquare, area: "demandas" },
      { href: "/metricas", rotulo: "Métricas", Icone: LineChart, area: "metricas" },
    ],
  },
  {
    titulo: "Agência",
    itens: [
      { href: "/clientes", rotulo: "Clientes", Icone: Building2, area: "clientes" },
      { href: "/servicos", rotulo: "Serviços freela", Icone: Briefcase, area: "servicos" },
      { href: "/comercial", rotulo: "Comercial", Icone: Handshake, area: "leads" },
      { href: "/leads", rotulo: "Leads", Icone: Users, area: "leads" },
      { href: "/financeiro", rotulo: "Financeiro", Icone: Wallet, area: "financeiro" },
    ],
  },
];

export function Nav() {
  const path = usePathname();
  const { usuario, nivel } = useUsuario();
  const ativo = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const grupos = GRUPOS.map((g) => ({ ...g, itens: g.itens.filter((i) => usuario && nivel(i.area) !== "nenhum") })).filter((g) => g.itens.length);
  async function sair() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <>
      {/* celular: barra escura no topo */}
      <header className="sticky top-0 z-30 bg-ink px-4 pb-3 pt-3 text-white md:hidden">
        <div className="flex items-center gap-2">
          <span className="text-lg font-extrabold tracking-tight">nuv<span className="text-azul-medio">.</span></span>
          <Link href="/perfil" className="ml-auto flex items-center gap-2 text-xs text-white/70">
            {usuario?.nome.split(" ")[0]} {usuario && <Avatar nome={usuario.nome} foto={usuario.foto} />}
          </Link>
        </div>
        <nav className="-mx-1 mt-3 flex gap-1 overflow-x-auto">
          {grupos.flatMap((g) => g.itens).map(({ href, rotulo, Icone }) => (
            <Link key={href} href={href} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${ativo(href) ? "bg-white text-ink" : "text-white/70"}`}>
              <Icone size={15} strokeWidth={2.2} /> {rotulo}
            </Link>
          ))}
          {usuario?.admin && (
            <Link href="/equipe" className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${ativo("/equipe") ? "bg-white text-ink" : "text-white/70"}`}>
              <UserCog size={15} /> Equipe
            </Link>
          )}
        </nav>
      </header>

      {/* computador: painel escuro flutuante */}
      <aside className="sticky top-3 m-3 hidden h-[calc(100vh-24px)] w-60 shrink-0 flex-col rounded-[28px] bg-ink p-4 text-white md:flex">
        <div className="flex items-center gap-2 px-2 pb-6 pt-2">
          <span className="text-2xl font-extrabold tracking-tight">nuv<span className="text-azul-medio">.</span></span>
          <span className="mt-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">painel</span>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto">
          {grupos.map((g) => (
            <div key={g.titulo}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">{g.titulo}</p>
              <ul className="space-y-1">
                {g.itens.map(({ href, rotulo, Icone, area }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                        ativo(href) ? "bg-white text-ink" : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className={`grid h-7 w-7 place-items-center rounded-xl ${ativo(href) ? "bg-azul text-white" : "bg-white/10"}`}>
                        <Icone size={15} strokeWidth={2.2} />
                      </span>
                      {rotulo}
                      {nivel(area) === "ver" && <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider opacity-50">ver</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="space-y-1 border-t border-white/10 pt-3">
          {usuario?.admin && (
            <>
              <Link href="/equipe" className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold ${ativo("/equipe") ? "bg-white text-ink" : "text-white/60 hover:text-white"}`}>
                <UserCog size={16} /> Equipe
              </Link>
              <Link href="/calendarios" className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold ${ativo("/calendarios") ? "bg-white text-ink" : "text-white/60 hover:text-white"}`}>
                <Settings2 size={16} /> Calendários
              </Link>
            </>
          )}
          {usuario && (
            <Link href="/perfil" className={`mt-2 flex items-center gap-3 rounded-2xl px-2 py-2 ${ativo("/perfil") ? "bg-white/10" : "hover:bg-white/5"}`}>
              <Avatar nome={usuario.nome} foto={usuario.foto} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{usuario.nome}</span>
                <span className="block truncate text-[11px] text-white/50">{usuario.admin ? "Administração" : "Meu perfil"}</span>
              </span>
            </Link>
          )}
          <button onClick={sair} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-white/60 hover:text-white">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>
    </>
  );
}
