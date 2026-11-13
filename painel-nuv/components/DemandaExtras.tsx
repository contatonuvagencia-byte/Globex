"use client";
import { FileText, Film, ImageIcon, Paperclip, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Anexo = { id: string | null; tipo: "imagem" | "video" | "pdf" | "arquivo"; nome: string; url: string };
type Comentario = { id: string; autor: string; texto: string; em: string };
type Detalhe = { anexos: Anexo[]; comentarios: Comentario[]; avisoComentarios: string | null };

const LIMITE = 4.5 * 1024 * 1024;
const ICONE = { imagem: ImageIcon, video: Film, pdf: FileText, arquivo: Paperclip };
const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Observações, arquivos e comentários de uma demanda (tudo fica na página dela no Notion). */
export function DemandaExtras({ id, observacoes, temObservacoes, onObservacoes }: {
  id: string;
  observacoes: string | null;
  temObservacoes: boolean;
  onObservacoes: (texto: string | null) => void;
}) {
  const [d, setD] = useState<Detalhe | null>(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState("");
  const [comentario, setComentario] = useState("");
  const [obs, setObs] = useState(observacoes ?? "");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/demandas/${id}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.erro ?? "Erro");
        if (vivo) setD(j);
      })
      .catch((e) => vivo && setErro(e.message));
    return () => {
      vivo = false;
    };
  }, [id]);

  async function post(corpo: FormData | object) {
    setErro("");
    const r = await fetch(`/api/demandas/${id}`, { method: "POST", body: corpo instanceof FormData ? corpo : JSON.stringify(corpo) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.erro ?? "Erro");
    return j;
  }

  async function anexar(arquivos: FileList | File[]) {
    for (const [i, a] of [...arquivos].entries()) {
      if (a.size > LIMITE) {
        setErro(`${a.name}: maior que 4,5 MB. Para arquivos grandes, cole o link do Drive nas observações.`);
        continue;
      }
      setEnviando(arquivos.length > 1 ? `Enviando ${i + 1} de ${arquivos.length}...` : "Enviando...");
      const f = new FormData();
      f.append("arquivo", a);
      try {
        setD(await post(f));
      } catch (e) {
        setErro((e as Error).message);
      }
    }
    setEnviando("");
  }

  async function remover(a: Anexo) {
    if (!a.id || !confirm(`Tirar “${a.nome}” desta demanda? Ele sai da página no Notion.`)) return;
    try {
      setD(await post({ acao: "remover_anexo", blocoId: a.id }));
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function comentar(ev: React.FormEvent) {
    ev.preventDefault();
    const texto = comentario.trim();
    if (!texto) return;
    try {
      const j = await post({ acao: "comentar", texto });
      setD((x) => (x ? { ...x, comentarios: [...x.comentarios, j.comentario] } : x));
      setComentario("");
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <div
      className="space-y-3 sm:col-span-2"
      onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        anexar(e.dataTransfer.files);
      }}
    >
      {temObservacoes && (
        <label className="block text-xs text-ink-2">Observações
          <textarea
            className="input mt-0.5 min-h-[70px] py-1.5 text-xs [.somente-leitura_&]:pointer-events-none"
            placeholder="Detalhes, links do Drive, o que o cliente pediu..."
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            onBlur={() => obs !== (observacoes ?? "") && onObservacoes(obs.trim() || null)}
          />
        </label>
      )}

      <div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-ink-2">Arquivos</p>
          <button type="button" className="so-editor ml-auto flex items-center gap-1 text-xs font-semibold text-azul" disabled={!!enviando} onClick={() => input.current?.click()}>
            <Paperclip size={12} /> {enviando || "Anexar"}
          </button>
          <input ref={input} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files) anexar(e.target.files); e.target.value = ""; }} />
        </div>
        {!d && !erro && <p className="mt-1 text-xs text-ink-3">Carregando...</p>}
        {d && !d.anexos.length && <p className="mt-1 text-xs text-ink-3">Nenhum arquivo. Clique em Anexar ou arraste para cá (até 4,5 MB).</p>}
        {d && d.anexos.length > 0 && (
          <ul className="mt-1.5 grid grid-cols-2 gap-1.5">
            {d.anexos.map((a, i) => {
              const Icone = ICONE[a.tipo];
              return (
                <li key={a.id ?? i} className="group relative overflow-hidden rounded-xl bg-white">
                  <a href={a.url} target="_blank" rel="noreferrer" className="block">
                    {a.tipo === "imagem" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.url} alt={a.nome} loading="lazy" className="h-20 w-full object-cover" />
                    ) : (
                      <span className="flex h-20 flex-col items-center justify-center gap-1 px-2 text-center text-ink-2">
                        <Icone size={18} />
                        <span className="line-clamp-2 break-all text-[10px]">{a.nome}</span>
                      </span>
                    )}
                  </a>
                  {a.id && (
                    <button type="button" onClick={() => remover(a)} className="so-editor absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100" aria-label={`Tirar ${a.nome}`}>
                      <X size={11} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <p className="text-xs text-ink-2">Comentários</p>
        {d?.avisoComentarios && <p className="mt-1 text-xs text-[#8a5a00]">{d.avisoComentarios}</p>}
        {d && !d.comentarios.length && !d.avisoComentarios && <p className="mt-1 text-xs text-ink-3">Nenhum comentário ainda.</p>}
        {d && d.comentarios.length > 0 && (
          <ul className="mt-1.5 space-y-1.5">
            {d.comentarios.map((c) => (
              <li key={c.id} className="rounded-xl bg-white px-2.5 py-1.5 text-xs">
                <p><b>{c.autor}</b> <span className="text-ink-3">{quando(c.em)}</span></p>
                <p className="mt-0.5 whitespace-pre-wrap">{c.texto}</p>
              </li>
            ))}
          </ul>
        )}
        {!d?.avisoComentarios && (
          <form onSubmit={comentar} className="so-editor mt-1.5 flex gap-1.5">
            <input className="input py-1.5 text-xs" placeholder="Escreva um comentário..." value={comentario} onChange={(e) => setComentario(e.target.value)} maxLength={1900} />
            <button className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-white disabled:opacity-40" disabled={!comentario.trim()} aria-label="Enviar comentário"><Send size={13} /></button>
          </form>
        )}
      </div>
      {erro && <p className="text-xs text-[#a1261f]">{erro}</p>}
    </div>
  );
}
