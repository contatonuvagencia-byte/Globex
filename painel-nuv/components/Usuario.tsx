"use client";
import { Eye, Lock } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { nivelDe, type Area, type Nivel, type UsuarioPublico } from "@/lib/permissoes";

type Ctx = { usuario: UsuarioPublico | null; nivel: (a: Area) => Nivel; podeEditar: (a: Area) => boolean; recarregar: () => void };
const Contexto = createContext<Ctx>({ usuario: null, nivel: () => "nenhum", podeEditar: () => false, recarregar: () => {} });

export function ProvedorUsuario({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioPublico | null>(null);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    fetch("/api/eu")
      .then((r) => (r.status === 401 ? (window.location.href = "/login", null) : r.json()))
      .then((j) => j?.usuario && setUsuario(j.usuario))
      .catch(() => {});
  }, [versao]);
  const nivel = (a: Area) => nivelDe(usuario, a);
  return <Contexto.Provider value={{ usuario, nivel, podeEditar: (a) => nivel(a) === "editar", recarregar: () => setVersao((v) => v + 1) }}>{children}</Contexto.Provider>;
}

export const useUsuario = () => useContext(Contexto);

/** Qual área do painel é cada endereço. */
export function areaDaRota(path: string): Area | "admin" | null {
  if (path === "/") return null; // Hoje: cada bloco já vem filtrado pelo perfil
  if (path.startsWith("/calendario") && !path.startsWith("/calendarios")) return "calendario";
  if (path.startsWith("/calendarios") || path.startsWith("/equipe")) return "admin";
  if (path.startsWith("/comercial")) return "leads";
  for (const a of ["clientes", "demandas", "metricas", "leads", "servicos", "financeiro"] as const) if (path.startsWith(`/${a}`)) return a;
  return null;
}

/**
 * Sem acesso: mostra um aviso no lugar da página.
 * Só visualizar: esconde tudo marcado com a classe "so-editor" e avisa no topo.
 * (As rotas da API também conferem, então isto é só para a tela ficar limpa.)
 */
export function GuardaArea({ children }: { children: React.ReactNode }) {
  const { usuario, nivel } = useUsuario();
  const area = areaDaRota(usePathname());
  if (!usuario) return <div className="opacity-0">{children}</div>;
  const n: Nivel = area === "admin" ? (usuario.admin ? "editar" : "nenhum") : area ? nivel(area) : "editar";
  if (n === "nenhum") {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-[26px] bg-white p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-azul-claro text-azul"><Lock size={20} /></span>
        <p className="mt-4 text-lg font-bold">Sem acesso a esta área</p>
        <p className="mt-1 text-sm text-ink-2">Seu perfil não inclui esta parte do painel. Se precisar, peça para a administração liberar.</p>
      </div>
    );
  }
  return (
    <div className={n === "ver" ? "somente-leitura" : ""}>
      {n === "ver" && (
        <p className="mx-auto mb-4 flex max-w-[1400px] items-center gap-2 rounded-2xl bg-azul-claro px-4 py-2.5 text-sm font-semibold text-azul-escuro">
          <Eye size={15} /> Você pode ver esta área, mas não editar.
        </p>
      )}
      {children}
    </div>
  );
}
