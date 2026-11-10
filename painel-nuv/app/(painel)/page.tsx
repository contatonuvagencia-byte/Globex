"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PostModal } from "@/components/PostModal";
import { StatusBadge } from "@/components/StatusBadge";
import { CLIENTES, clientePorSlug } from "@/lib/clients";
import { DIAS_SEMANA, dataBR, diaSemanaLongo, gradeDoMes, hojeISO, rotuloMes, somaMes } from "@/lib/format";
import type { Post } from "@/lib/types";

export default function Calendario() {
  const hoje = hojeISO();
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const [dia, setDia] = useState(hoje);
  const [posts, setPosts] = useState<Post[]>([]);
  const [erros, setErros] = useState<{ cliente: string; mensagem: string }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocultos, setOcultos] = useState<string[]>([]);
  const [aberto, setAberto] = useState<Post | null>(null);
  const fechar = useCallback(() => setAberto(null), []);

  const grade = useMemo(() => gradeDoMes(mes), [mes]);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    fetch(`/api/posts?inicio=${grade[0]}&fim=${grade[grade.length - 1]}`)
      .then((r) => r.json())
      .then((j) => {
        if (!vivo) return;
        setPosts(j.posts ?? []);
        setErros(j.erros ?? (j.erro ? [{ cliente: "Notion", mensagem: j.erro }] : []));
      })
      .catch((e) => vivo && setErros([{ cliente: "Notion", mensagem: e.message }]))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [grade]);

  const visiveis = posts.filter((p) => !ocultos.includes(p.cliente));
  const porDia = useMemo(() => {
    const m = new Map<string, Post[]>();
    for (const p of visiveis) m.set(p.data, [...(m.get(p.data) ?? []), p]);
    return m;
  }, [visiveis]);

  const doDia = porDia.get(dia) ?? [];
  const proximos = visiveis.filter((p) => p.data > hoje).slice(0, 8);

  function irPara(novoMes: string) {
    setMes(novoMes);
    setDia(novoMes === hoje.slice(0, 7) ? hoje : `${novoMes}-01`);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-5 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="text-sm text-ink-2">Calendário de conteúdo</p>
          <h1 className="text-2xl font-semibold">{rotuloMes(mes)}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-ghost px-3" onClick={() => irPara(somaMes(mes, -1))} aria-label="Mês anterior">‹</button>
          <button className="btn-ghost" onClick={() => irPara(hoje.slice(0, 7))}>Hoje</button>
          <button className="btn-ghost px-3" onClick={() => irPara(somaMes(mes, 1))} aria-label="Próximo mês">›</button>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar clientes">
        {CLIENTES.map((c) => {
          const ativo = !ocultos.includes(c.slug);
          const qtd = posts.filter((p) => p.cliente === c.slug && p.data.startsWith(mes)).length;
          return (
            <button
              key={c.slug}
              onClick={() => setOcultos((o) => (ativo ? [...o, c.slug] : o.filter((x) => x !== c.slug)))}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                ativo ? "border-black/10 bg-white" : "border-transparent bg-transparent text-ink-3 line-through"
              }`}
              aria-pressed={ativo}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: ativo ? c.cor : "#c9c8c3" }} />
              {c.nome}
              <span className="tabular text-xs text-ink-2">{qtd}</span>
            </button>
          );
        })}
      </div>

      {erros.length > 0 && (
        <div className="mb-4 rounded-xl border border-[#f3c4c0] bg-[#fdecea] p-3 text-sm text-[#a1261f]">
          {erros.map((e, i) => (
            <p key={i}>
              <b>{e.cliente}:</b> {e.mensagem}
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-black/5 bg-surface text-center text-[11px] font-medium uppercase tracking-wide text-ink-2">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className={`grid grid-cols-7 ${carregando ? "opacity-50" : ""}`}>
            {grade.map((d) => {
              const lista = porDia.get(d) ?? [];
              const foraDoMes = !d.startsWith(mes);
              const selecionado = d === dia;
              const clientesDoDia = CLIENTES.filter((c) => lista.some((p) => p.cliente === c.slug));
              return (
                <button
                  key={d}
                  onClick={() => setDia(d)}
                  className={`relative min-h-[64px] border-b border-r border-black/5 p-1.5 text-left align-top transition sm:min-h-[104px] sm:p-2 ${
                    selecionado ? "bg-nuv-soft" : "hover:bg-surface"
                  } ${foraDoMes ? "text-ink-3" : ""}`}
                  aria-label={`${dataBR(d)}: ${lista.length} posts`}
                >
                  <span
                    className={`tabular inline-grid h-6 w-6 place-items-center rounded-full text-xs font-medium ${
                      d === hoje ? "bg-nuv text-white" : ""
                    }`}
                  >
                    {Number(d.slice(8))}
                  </span>
                  {/* celular: bolinhas; telas maiores: um rótulo por cliente */}
                  <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                    {clientesDoDia.map((c) => (
                      <span key={c.slug} className="h-2 w-2 rounded-full" style={{ background: c.cor }} />
                    ))}
                  </div>
                  <div className="mt-1 hidden space-y-1 sm:block">
                    {clientesDoDia.map((c) => {
                      const n = lista.filter((p) => p.cliente === c.slug).length;
                      return (
                        <div key={c.slug} className="flex items-center gap-1.5 truncate rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-ink shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.cor }} />
                          <span className="truncate">{c.nome}</span>
                          {n > 1 && <span className="tabular ml-auto text-ink-2">{n}</span>}
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-2">{dia === hoje ? "Hoje" : diaSemanaLongo(dia)}</p>
            <h2 className="text-lg font-semibold">{dataBR(dia)}</h2>
            {doDia.length === 0 ? (
              <p className="mt-3 text-sm text-ink-2">{carregando ? "Carregando..." : "Nenhum conteúdo programado nesse dia."}</p>
            ) : (
              <>
                <p className="mt-1 text-sm text-ink-2">
                  {CLIENTES.filter((c) => doDia.some((p) => p.cliente === c.slug))
                    .map((c) => c.nome)
                    .join(" · ")}
                </p>
                <ul className="mt-3 space-y-2">
                  {doDia.map((p) => (
                    <li key={p.id}>
                      <CartaoPost post={p} onClick={() => setAberto(p)} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {mes === hoje.slice(0, 7) && proximos.length > 0 && (
            <section className="card p-4">
              <h2 className="mb-3 text-sm font-semibold">Próximos conteúdos</h2>
              <ul className="space-y-2">
                {proximos.map((p) => (
                  <li key={p.id}>
                    <CartaoPost post={p} mostrarData onClick={() => setAberto(p)} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {aberto && <PostModal post={aberto} onClose={fechar} />}
    </div>
  );
}

function CartaoPost({ post, onClick, mostrarData }: { post: Post; onClick: () => void; mostrarData?: boolean }) {
  const c = clientePorSlug(post.cliente);
  return (
    <button onClick={onClick} className="w-full rounded-xl border border-black/5 bg-surface p-3 text-left transition hover:border-nuv/40 hover:bg-white">
      <div className="flex items-center gap-2 text-xs text-ink-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c?.cor }} />
        <span className="font-medium text-ink">{c?.nome}</span>
        {mostrarData && <span>· {dataBR(post.data).slice(0, 5)}</span>}
        {post.hora && <span>· {post.hora}</span>}
        {post.formato && <span className="ml-auto">{post.formato}</span>}
      </div>
      <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug">{post.titulo}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={post.status} />
        {post.redes.map((r) => (
          <span key={r} className="chip bg-white text-ink-2">{r}</span>
        ))}
      </div>
    </button>
  );
}
