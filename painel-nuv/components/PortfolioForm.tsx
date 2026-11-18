"use client";
import { FileText, Film, ImagePlus, Star, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ArquivoPf = { path: string; nome: string; tipo: string; tamanho: number; mini?: string | null; url?: string; urlMini?: string | null };
export type ItemPf = {
  id: string;
  titulo: string;
  cliente: string | null;
  categoria: string;
  descricao: string | null;
  link: string | null;
  arquivos: ArquivoPf[];
  destaque: boolean;
  publico: boolean;
  data: string | null;
  capa: string | null;
  created_at: string;
};

export const tamanhoBR = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Versão pequena da imagem (640 px) para a grade carregar rápido. */
async function miniatura(f: File): Promise<Blob | null> {
  if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) return null;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.82));
  } catch {
    return null;
  }
}

async function pedirLink(nome: string, tamanho: number, pasta: string | null) {
  const r = await fetch("/api/portfolio", { method: "POST", body: JSON.stringify({ acao: "link_envio", nome, tamanho, pasta }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.erro ?? "Erro ao preparar o envio");
  return j as { path: string; url: string; pasta: string };
}
/** Mesmo formato que o supabase-js usa no uploadToSignedUrl (formulário com cacheControl + arquivo). */
async function subir(url: string, corpo: Blob, tipo: string) {
  const form = new FormData();
  form.append("cacheControl", "31536000");
  form.append("", corpo instanceof File ? corpo : new File([corpo], "arquivo", { type: tipo }));
  const r = await fetch(url, { method: "PUT", body: form, headers: { "x-upsert": "false" } });
  if (!r.ok) throw new Error(`O armazenamento recusou o arquivo (${r.status}).`);
}

export function PortfolioForm({ item, categorias, clientes, limite, onFechar, onSalvo }: {
  item: ItemPf | null;
  categorias: string[];
  clientes: string[];
  limite: number;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [f, setF] = useState({
    titulo: item?.titulo ?? "",
    cliente: item?.cliente ?? "",
    categoria: item?.categoria ?? categorias[0],
    descricao: item?.descricao ?? "",
    link: item?.link ?? "",
    data: item?.data ?? "",
    destaque: item?.destaque ?? false,
    publico: item?.publico ?? true,
  });
  const [arquivos, setArquivos] = useState<ArquivoPf[]>(item?.arquivos ?? []);
  const [enviando, setEnviando] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [sobre, setSobre] = useState(false);
  const pasta = useRef<string | null>(item?.arquivos[0]?.path.split("/")[1] ?? null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !enviando && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar, enviando]);

  async function adicionar(lista: FileList | File[]) {
    setErro("");
    const arr = [...lista];
    for (const [i, a] of arr.entries()) {
      if (a.size > limite) {
        setErro(`${a.name}: maior que ${tamanhoBR(limite)}. Para vídeos grandes, coloque o link do YouTube/Drive no campo Link.`);
        continue;
      }
      setEnviando(arr.length > 1 ? `Enviando ${i + 1} de ${arr.length}...` : "Enviando...");
      try {
        const alvo = await pedirLink(a.name, a.size, pasta.current);
        pasta.current = alvo.pasta;
        await subir(alvo.url, a, a.type);
        let mini: string | null = null;
        const m = await miniatura(a);
        if (m) {
          const alvoMini = await pedirLink(`mini-${a.name.replace(/\.\w+$/, "")}.jpg`, m.size, pasta.current);
          await subir(alvoMini.url, m, "image/jpeg").then(() => (mini = alvoMini.path)).catch(() => {});
        }
        const local = URL.createObjectURL(a);
        setArquivos((x) => [...x, { path: alvo.path, nome: a.name, tipo: a.type || "application/octet-stream", tamanho: a.size, mini, url: local, urlMini: local }]);
      } catch (e) {
        setErro(`${a.name}: ${(e as Error).message}`);
      }
    }
    setEnviando("");
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    const dados = {
      ...f,
      cliente: f.cliente || null,
      data: f.data || null,
      link: f.link.trim() || null,
      arquivos: arquivos.map(({ path, nome, tipo, tamanho, mini }) => ({ path, nome, tipo, tamanho, mini: mini ?? null })),
    };
    const r = await fetch("/api/portfolio", { method: "POST", body: JSON.stringify(item ? { acao: "atualizar", id: item.id, dados } : { acao: "criar", dados }) });
    const j = await r.json();
    setSalvando(false);
    if (!r.ok) return setErro(j.erro ?? "Erro ao salvar");
    onSalvo();
  }

  const campo = "block text-xs font-semibold text-ink-2";
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => !enviando && onFechar()}>
      <form onSubmit={salvar} onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-2xl flex-col bg-creme shadow-xl" role="dialog" aria-modal="true">
        <header className="flex items-center gap-3 bg-ink px-6 py-5 text-white">
          <div className="flex-1">
            <p className="text-xs font-semibold text-white/60">{item ? "Editar trabalho" : "Novo trabalho no portfólio"}</p>
            <h2 className="text-xl font-bold">{f.titulo || "Sem título"}</h2>
          </div>
          <button type="button" onClick={onFechar} disabled={!!enviando} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Fechar"><X size={16} /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {erro && <p className="rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#a1261f]">{erro}</p>}

          <section
            className={`card p-4 transition ${sobre ? "ring-2 ring-azul" : ""}`}
            onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setSobre(true); } }}
            onDragLeave={() => setSobre(false)}
            onDrop={(e) => { e.preventDefault(); setSobre(false); adicionar(e.dataTransfer.files); }}
          >
            <div className="mb-3 flex items-center gap-2">
              <p className="text-sm font-bold">Arquivos</p>
              <span className="text-xs text-ink-3">imagens, vídeos, PDF · até {tamanhoBR(limite)} cada</span>
              <button type="button" className="btn-azul ml-auto px-3 py-1.5 text-xs" disabled={!!enviando} onClick={() => input.current?.click()}>
                <ImagePlus size={14} /> {enviando || "Adicionar"}
              </button>
              <input ref={input} type="file" multiple accept="image/*,video/*,application/pdf" className="hidden" onChange={(e) => { if (e.target.files) adicionar(e.target.files); e.target.value = ""; }} />
            </div>
            {!arquivos.length ? (
              <p className="rounded-2xl border border-dashed border-black/15 p-6 text-center text-sm text-ink-2">Arraste as artes, vídeos ou PDFs para cá. A primeira imagem vira a capa.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {arquivos.map((a, i) => (
                  <li key={a.path} className="group relative overflow-hidden rounded-xl bg-surface">
                    {a.tipo.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.urlMini ?? a.url} alt={a.nome} className="aspect-square w-full object-cover" />
                    ) : (
                      <span className="flex aspect-square flex-col items-center justify-center gap-1 p-2 text-center text-ink-2">
                        {a.tipo.startsWith("video/") ? <Film size={20} /> : <FileText size={20} />}
                        <span className="line-clamp-2 break-all text-[10px]">{a.nome}</span>
                      </span>
                    )}
                    {i === 0 && a.tipo.startsWith("image/") && <span className="absolute left-1 top-1 rounded-full bg-ink px-1.5 text-[10px] font-bold text-white">capa</span>}
                    <span className="absolute inset-x-1 bottom-1 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                      {i > 0 && (
                        <button type="button" title="Usar como capa" onClick={() => setArquivos((x) => [a, ...x.filter((y) => y !== a)])} className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink shadow"><Star size={12} /></button>
                      )}
                      <button type="button" title="Tirar" onClick={() => setArquivos((x) => x.filter((y) => y !== a))} className="grid h-6 w-6 place-items-center rounded-full bg-white text-[#a1261f] shadow"><Trash2 size={12} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card grid gap-3 p-4 sm:grid-cols-2">
            <label className={`${campo} sm:col-span-2`}>Título<input className="input mt-1" required value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Ex.: Campanha Black Friday" /></label>
            <label className={campo}>Cliente
              <input className="input mt-1" list="pf-clientes" value={f.cliente} onChange={(e) => setF({ ...f, cliente: e.target.value })} placeholder="Opcional" />
              <datalist id="pf-clientes">{clientes.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
            <label className={campo}>Categoria
              <select className="input mt-1" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
                {categorias.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className={campo}>Link (site, Behance, YouTube...)<input className="input mt-1" type="url" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://" /></label>
            <label className={campo}>Quando foi feito<input className="input mt-1" type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></label>
            <label className={`${campo} sm:col-span-2`}>Descrição<textarea className="input mt-1 min-h-[90px]" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Desafio, o que foi feito, resultados..." /></label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="h-4 w-4 accent-[#1f3fd1]" checked={f.publico} onChange={(e) => setF({ ...f, publico: e.target.checked })} /> Mostrar na vitrine pública
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="h-4 w-4 accent-[#1f3fd1]" checked={f.destaque} onChange={(e) => setF({ ...f, destaque: e.target.checked })} /> Destaque (aparece primeiro)
            </label>
          </section>
        </div>
        <footer className="flex items-center gap-2 border-t border-black/5 bg-white px-6 py-4">
          <button type="button" onClick={onFechar} disabled={!!enviando} className="btn-ghost ml-auto">Cancelar</button>
          <button className="btn-primary" disabled={salvando || !!enviando}>{salvando ? "Salvando..." : "Salvar"}</button>
        </footer>
      </form>
    </div>
  );
}
