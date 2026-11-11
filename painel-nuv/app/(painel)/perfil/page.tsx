"use client";
import { Camera, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useUsuario } from "@/components/Usuario";
import { AREAS, PERFIS, type Area } from "@/lib/permissoes";

export default function Perfil() {
  const { usuario, nivel, recarregar } = useUsuario();
  const arquivo = useRef<HTMLInputElement>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [msgFoto, setMsgFoto] = useState<{ ok: boolean; t: string } | null>(null);

  /** Corta no centro em quadrado, reduz para 256px e manda como JPEG (~20 KB). */
  async function escolherFoto(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setMsgFoto({ ok: false, t: "Escolha um arquivo de imagem (JPG, PNG...)." });
    setEnviandoFoto(true);
    try {
      const img = await createImageBitmap(f);
      const lado = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      canvas.getContext("2d")!.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 256, 256);
      const foto = canvas.toDataURL("image/jpeg", 0.85);
      const r = await fetch("/api/eu", { method: "POST", body: JSON.stringify({ foto }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro ?? "Não consegui salvar a foto");
      setMsgFoto({ ok: true, t: "Foto atualizada." });
      recarregar();
    } catch (e) {
      setMsgFoto({ ok: false, t: (e as Error).message });
    } finally {
      setEnviandoFoto(false);
      if (arquivo.current) arquivo.current.value = "";
    }
  }

  async function removerFoto() {
    await fetch("/api/eu", { method: "POST", body: JSON.stringify({ foto: null }) });
    setMsgFoto({ ok: true, t: "Foto removida." });
    recarregar();
  }
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
      <header className="mb-6 flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={() => arquivo.current?.click()}
          className="group relative rounded-full"
          aria-label="Trocar foto de perfil"
          title="Trocar foto"
        >
          <Avatar nome={usuario.nome} foto={usuario.foto} tamanho={96} className="ring-4 ring-white" />
          <span className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full bg-ink text-white ring-4 ring-creme transition group-hover:bg-azul">
            <Camera size={16} />
          </span>
        </button>
        <input ref={arquivo} type="file" accept="image/*" className="hidden" onChange={(e) => escolherFoto(e.target.files?.[0])} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-2">Meu perfil</p>
          <h1 className="titulo-pagina">{usuario.nome}</h1>
          <p className="mt-1 text-sm text-ink-2">{usuario.email ?? "Administração"} · {PERFIS[usuario.papel]?.nome ?? usuario.papel}</p>
          <div className="mt-2 flex gap-3 text-xs font-semibold">
            <button type="button" className="text-azul hover:underline" onClick={() => arquivo.current?.click()} disabled={enviandoFoto}>
              {enviandoFoto ? "Enviando..." : usuario.foto ? "Trocar foto" : "Adicionar foto"}
            </button>
            {usuario.foto && (
              <button type="button" className="flex items-center gap-1 text-ink-2 hover:text-[#b42318]" onClick={removerFoto}>
                <Trash2 size={12} /> Remover
              </button>
            )}
          </div>
        </div>
      </header>
      {msgFoto && (
        <p className={`mb-4 rounded-2xl px-4 py-2.5 text-sm ${msgFoto.ok ? "bg-azul-claro text-azul-escuro" : "bg-[#fdecea] text-[#a1261f]"}`}>{msgFoto.t}</p>
      )}

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
