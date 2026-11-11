"use client";
import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import type { Post } from "@/lib/types";

const LIMITE = 4.5 * 1024 * 1024;

/** Imagem grande demais: reduz para no máximo 2160 px no lado maior (qualidade de feed) antes de enviar. */
async function caber(arquivo: File): Promise<File> {
  if (arquivo.size <= LIMITE || !/^image\/(png|jpe?g|webp)$/.test(arquivo.type)) return arquivo;
  const bmp = await createImageBitmap(arquivo);
  const escala = Math.min(1, 2160 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * escala);
  canvas.height = Math.round(bmp.height * escala);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  for (const q of [0.92, 0.85, 0.75]) {
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", q));
    if (blob && blob.size <= LIMITE) return new File([blob], arquivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  }
  return arquivo;
}

/** Envia a arte pelo painel para a página do post no Notion e/ou para o card do Trello. */
export function EnviarArte({ post, onEnviada }: { post: Post; onEnviada: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [notion, setNotion] = useState(true);
  const [trello, setTrello] = useState(true);
  const [enviando, setEnviando] = useState("");
  const [msgs, setMsgs] = useState<{ ok: string[]; erros: string[] } | null>(null);
  const [sobre, setSobre] = useState(false);

  async function enviar(arquivos: FileList | File[]) {
    const lista = [...arquivos];
    if (!lista.length) return;
    setMsgs(null);
    const ok: string[] = [];
    const erros: string[] = [];
    for (const [i, original] of lista.entries()) {
      setEnviando(lista.length > 1 ? `Enviando ${i + 1} de ${lista.length}...` : "Enviando...");
      const arquivo = await caber(original).catch(() => original);
      if (arquivo.size > LIMITE) {
        erros.push(`${original.name}: maior que 4,5 MB. Envie direto no Notion/Trello.`);
        continue;
      }
      const form = new FormData();
      form.append("arquivo", arquivo);
      form.append("cliente", post.cliente);
      form.append("titulo", post.titulo);
      form.append("notion", notion ? "1" : "0");
      form.append("trello", trello ? "1" : "0");
      try {
        const r = await fetch(`/api/posts/${post.id}/arte`, { method: "POST", body: form });
        const j = await r.json();
        if (j.notion) ok.push(`Notion: ${j.notion}`);
        if (j.trello) ok.push(`Trello: ${j.trello}`);
        erros.push(...(j.erros ?? []), ...(j.erro ? [j.erro] : []));
      } catch (e) {
        erros.push((e as Error).message);
      }
    }
    setEnviando("");
    setMsgs({ ok: [...new Set(ok)], erros: [...new Set(erros)] });
    if (ok.length) onEnviada();
  }

  return (
    <div className="so-editor">
      <div
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setSobre(true);
        }}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSobre(false);
          enviar(e.dataTransfer.files);
        }}
        className={`flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-3 transition ${sobre ? "border-azul bg-azul-claro" : "border-black/15"}`}
      >
        <button type="button" className="btn-azul px-3 py-1.5 text-xs" disabled={!!enviando || (!notion && !trello)} onClick={() => input.current?.click()}>
          <ImagePlus size={14} /> {enviando || "Anexar arte"}
        </button>
        <span className="text-xs text-ink-2">ou arraste a imagem aqui · enviar para</span>
        <label className="flex items-center gap-1 text-xs font-semibold">
          <input type="checkbox" className="accent-[#1f3fd1]" checked={notion} onChange={(e) => setNotion(e.target.checked)} /> Notion
        </label>
        <label className="flex items-center gap-1 text-xs font-semibold">
          <input type="checkbox" className="accent-[#1f3fd1]" checked={trello} onChange={(e) => setTrello(e.target.checked)} /> Trello
        </label>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) enviar(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {msgs && (
        <div className="mt-2 space-y-1 text-xs">
          {msgs.ok.map((m) => <p key={m} className="font-semibold text-azul-escuro">✓ {m}</p>)}
          {msgs.erros.map((m) => <p key={m} className="text-[#a1261f]">{m}</p>)}
        </div>
      )}
    </div>
  );
}
