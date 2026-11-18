"use client";
import { ExternalLink, FileText, Film, Images, Link2, Pencil, Plus, Star, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PortfolioForm, tamanhoBR, type ItemPf } from "@/components/PortfolioForm";
import { useUsuario } from "@/components/Usuario";
import { dataBR } from "@/lib/format";

type Dados = { itens: ItemPf[]; categorias: string[]; usado: number; limiteArquivo: number };
const GRATIS = 1024 * 1024 * 1024; // 1 GB do plano grátis do Supabase

export default function Portfolio() {
  const { podeEditar, nivel } = useUsuario();
  const [d, setD] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [cat, setCat] = useState("");
  const [cliente, setCliente] = useState("");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<ItemPf | "novo" | null>(null);
  const [aberto, setAberto] = useState<ItemPf | null>(null);
  const [clientes, setClientes] = useState<string[]>([]);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/portfolio");
    const j = await r.json();
    if (!r.ok) return setErro(j.erro ?? "Erro");
    setD(j);
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);
  useEffect(() => {
    if (nivel("clientes") === "nenhum") return;
    fetch("/api/clientes").then((r) => r.json()).then((j) => setClientes((j.clientes ?? []).map((c: { nome: string }) => c.nome))).catch(() => {});
  }, [nivel]);

  const nomesClientes = useMemo(() => [...new Set([...clientes, ...(d?.itens ?? []).map((i) => i.cliente).filter(Boolean) as string[]])].sort(), [clientes, d]);
  const lista = (d?.itens ?? []).filter(
    (i) =>
      (!cat || i.categoria === cat) &&
      (!cliente || i.cliente === cliente) &&
      (!busca || `${i.titulo} ${i.cliente ?? ""} ${i.descricao ?? ""}`.toLowerCase().includes(busca.toLowerCase())),
  );
  const contagem = (c: string) => (d?.itens ?? []).filter((i) => i.categoria === c).length;

  async function excluir(i: ItemPf) {
    if (!confirm(`Excluir “${i.titulo}” e os ${i.arquivos.length} arquivo(s) dele?`)) return;
    const r = await fetch("/api/portfolio", { method: "POST", body: JSON.stringify({ acao: "excluir", id: i.id }) });
    const j = await r.json();
    if (!r.ok) return setErro(j.erro ?? "Erro");
    setAberto(null);
    carregar();
  }

  function copiarVitrine() {
    const url = `${window.location.origin}/vitrine${cat ? `?categoria=${encodeURIComponent(cat)}` : ""}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setAviso(`Link da vitrine copiado${cat ? ` (só ${cat})` : ""}: ${url}`);
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-6 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="text-sm font-medium text-ink-2">Agência</p>
          <h1 className="titulo-pagina">Portfólio</h1>
          <p className="mt-1 text-sm text-ink-2">Os melhores trabalhos da NUV num lugar só, com uma vitrine pública para mandar aos leads.</p>
        </div>
        <button className="btn-ghost" onClick={copiarVitrine}><Link2 size={15} /> Copiar link da vitrine</button>
        <a className="btn-ghost" href={`/vitrine${cat ? `?categoria=${encodeURIComponent(cat)}` : ""}`} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Ver vitrine</a>
        <button className="so-editor btn-primary" onClick={() => setEditando("novo")}><Plus size={16} /> Novo trabalho</button>
      </header>

      {erro && <p className="mb-4 rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#a1261f]">{erro}</p>}
      {aviso && (
        <p className="mb-4 flex items-center gap-2 break-all rounded-2xl bg-azul-claro px-4 py-3 text-sm font-semibold text-azul-escuro">
          {aviso}<button className="ml-auto" onClick={() => setAviso("")} aria-label="Fechar">×</button>
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className={`chip px-3 py-1.5 text-xs ${!cat ? "bg-ink text-white" : "bg-white text-ink-2"}`} onClick={() => setCat("")}>Tudo · {d?.itens.length ?? 0}</button>
        {(d?.categorias ?? []).filter((c) => contagem(c)).map((c) => (
          <button key={c} className={`chip px-3 py-1.5 text-xs ${cat === c ? "bg-ink text-white" : "bg-white text-ink-2"}`} onClick={() => setCat(cat === c ? "" : c)}>{c} · {contagem(c)}</button>
        ))}
        <div className="ml-auto flex gap-2">
          <select className="input w-auto py-1.5 text-sm" value={cliente} onChange={(e) => setCliente(e.target.value)} aria-label="Filtrar cliente">
            <option value="">Todos os clientes</option>
            {nomesClientes.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input className="input w-44 py-1.5 text-sm" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      </div>

      {!d && !erro && <p className="text-sm text-ink-2">Carregando...</p>}
      {d && !lista.length && (
        <div className="card p-10 text-center text-sm text-ink-2">
          <Images className="mx-auto mb-2 text-ink-3" />
          {d.itens.length ? "Nada com esse filtro." : "Nenhum trabalho ainda. Clique em “Novo trabalho” e arraste as artes, vídeos ou PDFs."}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {lista.map((i) => (
          <button key={i.id} onClick={() => setAberto(i)} className="group overflow-hidden rounded-[24px] bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="relative aspect-[4/5] bg-surface-2">
              {i.capa ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.capa} alt={i.titulo} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full place-items-center text-ink-3">{i.arquivos.some((a) => a.tipo.startsWith("video/")) ? <Film size={28} /> : <FileText size={28} />}</span>
              )}
              {i.destaque && <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-white"><Star size={10} /> destaque</span>}
              {!i.publico && <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-ink-2">interno</span>}
              {i.arquivos.length > 1 && <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">{i.arquivos.length} arquivos</span>}
            </div>
            <div className="p-3">
              <p className="text-[11px] font-semibold text-azul">{i.categoria}</p>
              <p className="line-clamp-2 font-bold leading-snug">{i.titulo}</p>
              {i.cliente && <p className="truncate text-xs text-ink-2">{i.cliente}</p>}
            </div>
          </button>
        ))}
      </div>

      {d && (
        <p className="mt-6 text-xs text-ink-3">
          Espaço usado: {tamanhoBR(d.usado)} de 1 GB grátis ({Math.round((d.usado / GRATIS) * 100)}%). Vídeos pesados: prefira colocar o link do YouTube ou Drive.
        </p>
      )}

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-6" onClick={() => setAberto(null)}>
          <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-[26px] bg-white sm:rounded-[26px]" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-black/5 bg-white px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-azul">{aberto.categoria}{aberto.cliente ? ` · ${aberto.cliente}` : ""}{aberto.data ? ` · ${dataBR(aberto.data)}` : ""}</p>
                <h2 className="text-xl font-bold">{aberto.titulo}</h2>
              </div>
              {podeEditar("portfolio") && (
                <>
                  <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => { setEditando(aberto); setAberto(null); }}><Pencil size={13} /> Editar</button>
                  <button className="px-2 text-xs font-semibold text-ink-3 hover:text-[#a1261f]" onClick={() => excluir(aberto)}>Excluir</button>
                </>
              )}
              <button className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2" onClick={() => setAberto(null)} aria-label="Fechar"><X size={16} /></button>
            </header>
            <div className="space-y-4 p-5">
              {aberto.descricao && <p className="whitespace-pre-wrap text-sm leading-relaxed">{aberto.descricao}</p>}
              {aberto.link && <a className="inline-flex items-center gap-1 text-sm font-semibold text-azul" href={aberto.link} target="_blank" rel="noreferrer">{aberto.link.replace(/^https?:\/\//, "")} <ExternalLink size={13} /></a>}
              <div className="grid gap-3 sm:grid-cols-2">
                {aberto.arquivos.map((a) =>
                  a.tipo.startsWith("image/") ? (
                    <a key={a.path} href={a.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl bg-surface">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.url} alt={a.nome} loading="lazy" className="w-full" />
                    </a>
                  ) : a.tipo.startsWith("video/") ? (
                    <video key={a.path} src={a.url} controls className="w-full rounded-2xl bg-black" />
                  ) : (
                    <a key={a.path} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-surface p-4 text-sm font-semibold hover:bg-surface-2">
                      <FileText size={20} className="text-azul" /> <span className="min-w-0 flex-1 truncate">{a.nome}</span> <span className="text-xs text-ink-3">{tamanhoBR(a.tamanho)}</span>
                    </a>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {editando && d && (
        <PortfolioForm
          item={editando === "novo" ? null : editando}
          categorias={d.categorias}
          clientes={nomesClientes}
          limite={d.limiteArquivo}
          onFechar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null);
            setAviso("Trabalho salvo no portfólio.");
            carregar();
          }}
        />
      )}
    </div>
  );
}
