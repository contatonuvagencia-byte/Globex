"use client";
/* eslint-disable @next/next/no-img-element */
import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Post } from "@/lib/types";
import { useUsuario } from "./Usuario";

type Resposta = {
  configurado: boolean;
  erro?: string;
  quadro?: { nome: string; url: string } | null;
  escolhaManual?: boolean;
  card?: { id: string; nome: string; url: string; lista: string } | null;
  imagens?: { nome: string; src: string; original: string }[];
  opcoes?: { id: string; nome: string; lista: string; artes: number }[];
};

/**
 * Artes do Trello do post: acha o card do quadro do cliente com o título mais parecido
 * (ou o que foi escolhido à mão) e mostra as imagens anexadas.
 */
export function ArteTrello({ post, onQuantidade }: { post: Post; onQuantidade: (n: number) => void }) {
  const editavel = useUsuario().podeEditar("calendario");
  const [r, setR] = useState<Resposta | null>(null);
  const [trocando, setTrocando] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const q = new URLSearchParams({ cliente: post.cliente, id: post.id, titulo: post.titulo });
    const res = await fetch(`/api/trello/post?${q}`).catch(() => null);
    const j: Resposta = res ? await res.json().catch(() => ({ configurado: true, erro: "Erro ao ler o Trello" })) : { configurado: true, erro: "Erro ao ler o Trello" };
    setR(j);
    onQuantidade(j.imagens?.length ?? 0);
  }, [post.cliente, post.id, post.titulo, onQuantidade]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function escolher(valor: string) {
    setTrocando(false);
    setR((x) => (x ? { ...x, imagens: undefined } : x));
    const cardId = valor === "__auto" ? undefined : valor === "__nenhum" ? null : valor;
    await fetch("/api/trello/post", { method: "POST", body: JSON.stringify({ cliente: post.cliente, postId: post.id, cardId }) });
    carregar();
  }

  if (!r || !r.configurado || r.quadro === null) return null; // sem Trello ou cliente sem quadro: não mostra nada
  if (r.erro) return <p className="rounded-xl bg-surface p-3 text-xs text-ink-2">Trello: {r.erro}</p>;

  return (
    <div className="rounded-2xl bg-surface p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="chip bg-azul text-white">Trello</span>
        {r.card ? (
          <>
            <span className="font-semibold">{r.card.nome}</span>
            <span className="text-ink-3">· {r.card.lista}{r.escolhaManual ? " · escolhido à mão" : ""}</span>
            <a href={r.card.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-azul hover:underline">
              abrir card <ExternalLink size={11} />
            </a>
          </>
        ) : (
          <span className="text-ink-2">
            {r.escolhaManual ? "Marcado como sem card no Trello." : `Nenhum card com título parecido em “${r.quadro?.nome}”.`}
          </span>
        )}
        {editavel && (
          <button className="ml-auto font-semibold text-ink-2 hover:text-ink" onClick={() => setTrocando((v) => !v)}>
            {trocando ? "cancelar" : r.card ? "trocar card" : "escolher card"}
          </button>
        )}
      </div>

      {trocando && (
        <select className="input mb-2 text-xs" defaultValue="" onChange={(e) => e.target.value && escolher(e.target.value)} aria-label="Escolher card do Trello">
          <option value="" disabled>Escolha o card deste post…</option>
          <option value="__auto">↻ Achar sozinho pelo título</option>
          <option value="__nenhum">Este post não tem card no Trello</option>
          {r.opcoes?.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome} — {o.lista}{o.artes ? ` (${o.artes} arte${o.artes > 1 ? "s" : ""})` : ""}
            </option>
          ))}
        </select>
      )}

      {r.imagens === undefined ? (
        <p className="text-xs text-ink-2">Carregando artes do Trello…</p>
      ) : r.card && r.imagens.length === 0 ? (
        <p className="text-xs text-ink-2">O card ainda não tem imagens anexadas.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {r.imagens.map((img) => (
            <button key={img.src} onClick={() => setAberta(img.original)} className="block overflow-hidden rounded-xl border border-black/5 bg-white" title={img.nome}>
              <img src={img.src} alt={img.nome} className="aspect-[4/5] w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {aberta && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4" onClick={() => setAberta(null)} role="dialog" aria-label="Arte em tamanho grande">
          <img src={aberta} alt="Arte" className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
