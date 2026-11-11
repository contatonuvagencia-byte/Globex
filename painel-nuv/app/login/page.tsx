"use client";
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    const res = await fetch("/api/login", { method: "POST", body: JSON.stringify({ email, senha }) });
    if (res.ok) window.location.href = "/";
    else {
      const j = await res.json().catch(() => ({}));
      setErro(j.erro ?? "Não foi possível entrar");
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={entrar} className="card w-full max-w-sm p-8 md:p-10">
        <div className="mb-8">
          <p className="text-4xl font-extrabold tracking-tight">nuv<span className="text-azul">.</span></p>
          <h1 className="mt-4 text-2xl font-bold">Bem-vinda de volta</h1>
          <p className="text-sm text-ink-2">Conteúdo, demandas, métricas e financeiro num lugar só.</p>
        </div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="seu@email.com" />
        <p className="mt-1 text-[11px] text-ink-3">Administração: deixe em branco e use a senha principal.</p>
        <label className="label mt-4" htmlFor="senha">Senha</label>
        <input id="senha" type="password" className="input" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" autoFocus />
        {erro && <p className="mt-3 text-sm text-[#c4302b]">{erro}</p>}
        <button className="btn-primary mt-5 w-full" disabled={carregando || !senha}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
