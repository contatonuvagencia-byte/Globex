"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PALETA, type Calendario } from "@/lib/clients";

const ROTULOS: Record<string, string> = {
  data: "Data",
  formato: "Formato",
  rede: "Rede",
  status: "Status",
  etapa: "Etapa",
  pilar: "Pilar",
  arquivos: "Arquivos",
  legenda: "Legenda",
  referencias: "Referências",
};

export default function Calendarios() {
  const [lista, setLista] = useState<Calendario[]>([]);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [link, setLink] = useState("");
  const [nome, setNome] = useState("");
  const [ocupado, setOcupado] = useState<"" | "adicionar" | "descobrir">("");
  const [quadros, setQuadros] = useState<{ id: string; nome: string }[] | null>(null);

  async function carregar() {
    const r = await fetch("/api/calendarios");
    const j = await r.json();
    if (r.ok) setLista(j.calendarios);
    else setErro(j.erro);
  }
  useEffect(() => {
    carregar();
    fetch("/api/trello/quadros")
      .then((r) => r.json())
      .then((j) => setQuadros(j.configurado ? j.quadros : null))
      .catch(() => {});
  }, []);

  async function enviar(corpo: unknown) {
    setErro("");
    setMsg("");
    const r = await fetch("/api/calendarios", { method: "POST", body: JSON.stringify(corpo) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.erro ?? "Erro");
    return j;
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado("adicionar");
    try {
      const j = await enviar({ acao: "adicionar", link, nome: nome || undefined });
      setMsg(`“${j.titulo}” entrou no calendário como ${j.nome}.`);
      setLink("");
      setNome("");
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado("");
    }
  }

  async function procurar() {
    setOcupado("descobrir");
    try {
      const j = await enviar({ acao: "descobrir" });
      try {
        localStorage.setItem("nuv_descoberta", String(Date.now()));
      } catch {}
      const partes = [];
      if (j.adicionados.length) partes.push(`Adicionados: ${j.adicionados.join(", ")}.`);
      if (j.desligados.length) partes.push(`Encontrados e deixados desligados (o cliente já tem calendário): ${j.desligados.join(", ")}.`);
      setMsg(partes.join(" ") || "Nenhum calendário novo encontrado.");
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado("");
    }
  }

  async function atualizar(id: string, dados: Partial<Calendario>) {
    setLista((l) => l.map((c) => (c.id === id ? { ...c, ...dados } : c)));
    try {
      await enviar({ acao: "atualizar", id, dados });
    } catch (e) {
      setErro((e as Error).message);
      carregar();
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <Link href="/" className="text-sm text-ink-2 hover:text-nuv">← Calendário</Link>
        <h1 className="titulo-pagina">Calendários dos clientes</h1>
        <p className="mt-1 text-sm text-ink-2">
          Todo cliente marcado como <b>Ativo</b> em CLIENTES no Notion que tiver um banco “Gestão de Mídias”, “Calendário” ou
          “Editorial” na página dele entra aqui sozinho. O painel confere isso a cada 6 horas.
        </p>
      </header>

      {erro && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm text-[#a1261f]">{erro}</p>}
      {msg && <p className="mb-4 rounded-xl bg-nuv-soft p-3 text-sm text-nuv">{msg}</p>}

      <section className="card mb-5 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-sm font-semibold">Adicionar</h2>
          <button className="btn-ghost" onClick={procurar} disabled={!!ocupado}>
            {ocupado === "descobrir" ? "Procurando no Notion..." : "Procurar clientes novos agora"}
          </button>
        </div>
        <form onSubmit={adicionar} className="mt-4 grid gap-3 sm:grid-cols-[1fr_200px_auto]">
          <div>
            <label className="label" htmlFor="link">Ou cole o link do banco no Notion</label>
            <input id="link" className="input" placeholder="https://www.notion.so/..." value={link} onChange={(e) => setLink(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="nome">Nome do cliente (opcional)</label>
            <input id="nome" className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <button className="btn-primary self-end" disabled={!!ocupado || !link}>
            {ocupado === "adicionar" ? "Lendo..." : "Adicionar"}
          </button>
        </form>
        <p className="mt-2 text-xs text-ink-3">
          No Notion, abra o banco como página inteira e copie o link da barra. Ele precisa estar conectado à integração do painel (••• › Conexões).
        </p>
      </section>

      <ul className="space-y-3">
        {lista.map((c) => (
          <li key={c.id} className={`card p-4 ${c.ativo ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1" role="radiogroup" aria-label={`Cor de ${c.nome}`}>
                {PALETA.map((cor) => (
                  <button
                    key={cor}
                    onClick={() => atualizar(c.id, { cor })}
                    className={`h-5 w-5 rounded-full ${c.cor === cor ? "ring-2 ring-ink ring-offset-2" : ""}`}
                    style={{ background: cor }}
                    aria-label={cor}
                    aria-checked={c.cor === cor}
                    role="radio"
                  />
                ))}
              </div>
              <input
                className="input w-44 py-1 font-medium"
                defaultValue={c.nome}
                onBlur={(e) => e.target.value.trim() && e.target.value !== c.nome && atualizar(c.id, { nome: e.target.value.trim() })}
                aria-label="Nome do cliente"
              />
              <span className="chip bg-surface-2 text-ink-2">{c.origem === "auto" ? "encontrado sozinho" : "manual"}</span>
              <label className="ml-auto flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-[#1f3fd1]" checked={c.ativo} onChange={(e) => atualizar(c.id, { ativo: e.target.checked })} />
                Mostrar no calendário
              </label>
            </div>
            <p className="mt-2 text-sm text-ink-2">{c.titulo_notion}</p>
            {quadros && (
              <label className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-2">
                Artes do Trello:
                <select
                  className="input w-auto py-1 text-xs"
                  value={c.trello_board ?? ""}
                  onChange={(e) => atualizar(c.id, { trello_board: e.target.value || null })}
                >
                  <option value="">
                    Achar pelo nome{(() => {
                      const q = quadros.find((x) => x.nome.toLowerCase().includes(c.nome.toLowerCase()));
                      return q ? ` (${q.nome})` : " (nenhum encontrado)";
                    })()}
                  </option>
                  {quadros.map((q) => <option key={q.id} value={q.id}>{q.nome}</option>)}
                </select>
              </label>
            )}
            <p className="mt-1 text-xs text-ink-3">
              {Object.entries(c.campos)
                .filter(([k]) => ROTULOS[k])
                .map(([k, v]) => `${ROTULOS[k]}: ${v}`)
                .join(" · ")}
              {c.campos.checks?.postado ? ` · Postado: ${c.campos.checks.postado}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
