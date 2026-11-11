"use client";
import { useCallback, useEffect, useState } from "react";
import { dataBR } from "@/lib/format";
import type { Post, PostDetalhe } from "@/lib/types";
import { ArteTrello } from "./ArteTrello";
import { EnviarArte } from "./EnviarArte";
import { StatusBadge } from "./StatusBadge";

function BlocoTexto({ titulo, texto }: { titulo: string; texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <section className="rounded-xl border border-black/5 bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-2">{titulo}</h3>
        <button
          className="text-xs font-medium text-nuv hover:underline"
          onClick={async () => {
            await navigator.clipboard.writeText(texto);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
          }}
        >
          {copiado ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{texto}</p>
    </section>
  );
}

export function PostModal({
  post,
  cliente,
  onClose,
  onAtualizado,
  onArte,
}: {
  post: Post;
  cliente?: { nome: string; cor: string };
  onClose: () => void;
  onAtualizado: (p: Post) => void;
  onArte?: (id: string) => void;
}) {
  const [recarga, setRecarga] = useState(0);
  const [detalhe, setDetalhe] = useState<PostDetalhe | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function alternarPostado() {
    await atualizar({ postado: !post.postado });
  }

  async function mudarDia(novaData: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(novaData) || novaData === post.data) return;
    await atualizar({ data: novaData });
  }

  async function atualizar(mudanca: { postado: boolean } | { data: string }) {
    setSalvando(true);
    setErro("");
    try {
      const r = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify({ cliente: post.cliente, ...mudanca }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro ?? "Não consegui atualizar o Notion");
      onAtualizado(j);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => {
    let vivo = true;
    fetch(`/api/posts/${post.id}?cliente=${post.cliente}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.erro ?? "Erro ao abrir o post");
        if (vivo) setDetalhe(j);
      })
      .catch((e) => vivo && setErro(e.message));
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      vivo = false;
      window.removeEventListener("keydown", esc);
    };
  }, [post.id, post.cliente, onClose, recarga]);

  const d = detalhe;
  const [artesTrello, setArtesTrello] = useState(0);
  const contarTrello = useCallback((n: number) => setArtesTrello(n), []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={post.titulo}
      >
        <header className="sticky top-0 z-10 border-b border-black/5 bg-white px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ background: cliente?.cor }} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink-2">
                {cliente?.nome} · {dataBR(post.data)}
                {post.hora ? ` · ${post.hora}` : ""}
              </p>
              <h2 className="mt-0.5 text-lg font-semibold leading-snug">{post.titulo}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusBadge status={post.status} />
                {post.formato && <span className="chip bg-surface-2 text-ink-2">{post.formato}</span>}
                {post.redes.map((r) => (
                  <span key={r} className="chip bg-surface-2 text-ink-2">{r}</span>
                ))}
                {post.pilar && <span className="chip bg-surface-2 text-ink-2">{post.pilar}</span>}
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-xl leading-none text-ink-2 hover:bg-surface-2" aria-label="Fechar">
              ×
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            {post.checks?.map((c) => (
              <span key={c.nome} className={c.feito ? "text-[#0f6b2f]" : "text-ink-3"}>
                {c.feito ? "☑" : "☐"} {c.nome}
              </span>
            ))}
            <label className="so-editor ml-auto flex items-center gap-1.5 text-ink-2">
              Mudar data
              <input
                type="date"
                className="input w-auto py-1 text-xs"
                defaultValue={post.data}
                key={post.data}
                disabled={salvando}
                onChange={(e) => mudarDia(e.target.value)}
                aria-label="Mudar a data do post"
              />
            </label>
            <button
              onClick={alternarPostado}
              disabled={salvando}
              className={`so-editor ${post.postado ? "btn-ghost" : "btn-primary"} px-3 py-1.5 text-xs`}
            >
              {salvando ? "Salvando no Notion..." : post.postado ? "✓ Postado · desfazer" : "Marcar como postado"}
            </button>
          </div>
        </header>

        <div className="space-y-4 p-5">
          {erro && <p className="rounded-xl bg-[#fdecea] p-3 text-sm text-[#a1261f]">{erro}</p>}
          {!d && !erro && <p className="text-sm text-ink-2">Carregando conteúdo do Notion...</p>}
          {d && (
            <>
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-2">Arte</h3>
                <div className="space-y-2">
                {d.midias.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {d.midias.map((m, i) =>
                      m.tipo === "imagem" ? (
                        <a key={i} href={m.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-black/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.url} alt={m.nome} className="aspect-[4/5] w-full object-cover" loading="lazy" />
                        </a>
                      ) : m.tipo === "video" ? (
                        <video key={i} src={m.url} controls className="aspect-[9/16] w-full rounded-xl bg-black object-contain" />
                      ) : (
                        <a key={i} href={m.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-black/10 p-3 text-sm hover:bg-surface-2">
                          📎 <span className="truncate">{m.nome}</span>
                        </a>
                      ),
                    )}
                  </div>
                )}
                <ArteTrello key={recarga} post={post} onQuantidade={contarTrello} />
                {!d.midias.length && !artesTrello && (
                  <p className="rounded-xl border border-dashed border-black/10 p-4 text-sm text-ink-2">
                    Nenhuma arte encontrada ainda. Anexe aqui embaixo ou direto no Notion/Trello.
                  </p>
                )}
                <EnviarArte
                  post={post}
                  onEnviada={() => {
                    setRecarga((n) => n + 1);
                    onArte?.(post.id);
                  }}
                />
                </div>
              </section>
              {d.copy && <BlocoTexto titulo="Copy da arte" texto={d.copy} />}
              {d.legenda && <BlocoTexto titulo="Legenda" texto={d.legenda} />}
              {!d.copy && !d.legenda && (
                <p className="text-sm text-ink-2">Esse post ainda não tem legenda nem copy escritas no Notion.</p>
              )}
              {d.referencias && <BlocoTexto titulo="Referências" texto={d.referencias} />}
              {d.outrasSecoes.map((s, i) => (
                <BlocoTexto key={i} titulo={s.titulo || "Notas"} texto={s.texto} />
              ))}
            </>
          )}
          <a href={post.notionUrl} target="_blank" rel="noreferrer" className="btn-ghost w-full">
            Abrir no Notion ↗
          </a>
        </div>
      </div>
    </div>
  );
}
