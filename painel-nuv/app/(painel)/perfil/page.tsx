"use client";
import { useState } from "react";
import { useUsuario } from "@/components/Usuario";
import { AREAS, PERFIS, type Area } from "@/lib/permissoes";

export default function Perfil() {
  const { usuario, nivel } = useUsuario();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function trocar(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/eu", { method: "POST", body: JSON.stringify({ atual, nova }) });
    const j = await r.json();
    setMsg(r.ok ? { ok: true, t: "Senha trocada. Use a nova no próximo login." } : { ok: false, t: j.erro ?? "Erro" });
    if (r.ok) {
      setAtual("");
      setNova("");
    }
  }

  if (!usuario) return null;
  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <p className="text-sm font-medium text-ink-2">Meu perfil</p>
        <h1 className="titulo-pagina">{usuario.nome}</h1>
        <p className="mt-1 text-sm text-ink-2">{usuario.email ?? "Administração"} · {PERFIS[usuario.papel]?.nome ?? usuario.papel}</p>
      </header>

      <section className="card mb-4 p-5">
        <p className="mb-3 text-sm font-bold">O que você pode fazer</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(AREAS) as Area[]).map((a) => {
            const n = nivel(a);
            return (
              <li key={a} className="flex items-center justify-between rounded-2xl bg-surface px-3 py-2 text-sm">
                <span className="font-semibold">{AREAS[a]}</span>
                <span className={`chip ${n === "editar" ? "bg-azul text-white" : n === "ver" ? "bg-azul-claro text-azul-escuro" : "bg-surface-2 text-ink-3"}`}>
                  {n === "editar" ? "Editar" : n === "ver" ? "Só ver" : "Sem acesso"}
                </span>
              </li>
            );
          })}
        </ul>
        {usuario.clientes.length > 0 && <p className="mt-3 text-sm text-ink-2">Clientes: {usuario.clientes.join(", ")}</p>}
      </section>

      {usuario.admin && !usuario.email ? (
        <p className="card p-5 text-sm text-ink-2">A senha da administração é a <b>APP_PASSWORD</b>. Para trocar, mude essa variável no Netlify e publique de novo.</p>
      ) : (
        <form onSubmit={trocar} className="card space-y-3 p-5">
          <p className="text-sm font-bold">Trocar minha senha</p>
          {msg && <p className={`rounded-2xl px-4 py-2.5 text-sm ${msg.ok ? "bg-azul-claro text-azul-escuro" : "bg-[#fdecea] text-[#a1261f]"}`}>{msg.t}</p>}
          <label className="block text-xs font-semibold text-ink-2">Senha atual<input type="password" className="input mt-1" value={atual} onChange={(e) => setAtual(e.target.value)} required autoComplete="current-password" /></label>
          <label className="block text-xs font-semibold text-ink-2">Senha nova (mínimo 8)<input type="password" className="input mt-1" value={nova} onChange={(e) => setNova(e.target.value)} minLength={8} required autoComplete="new-password" /></label>
          <button className="btn-primary">Trocar senha</button>
        </form>
      )}
    </div>
  );
}
