"use client";
import { useState } from "react";

export default function Login() {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    const res = await fetch("/api/login", { method: "POST", body: JSON.stringify({ senha }) });
    if (res.ok) window.location.href = "/";
    else {
      setErro("Senha incorreta");
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={entrar} className="card w-full max-w-sm p-8 md:p-10">
        <div className="mb-8">
          <p className="text-4xl font-extrabold tracking-tight">nuv<span className="text-nuv">.</span></p>
          <h1 className="mt-4 text-2xl font-bold">Bem-vinda de volta</h1>
          <p className="text-sm text-ink-2">Conteúdo, demandas, métricas e financeiro num lugar só.</p>
        </div>
        <label className="label" htmlFor="senha">Senha</label>
        <input id="senha" type="password" className="input" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />
        {erro && <p className="mt-2 text-sm text-[#c4302b]">{erro}</p>}
        <button className="btn-primary mt-4 w-full" disabled={carregando || !senha}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
