"use client";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Settings2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PostModal } from "@/components/PostModal";
import { StatusBadge } from "@/components/StatusBadge";
import type { CalendarioPublico } from "@/lib/clients";
import { saudacao, tom } from "@/lib/cores";
import { DIAS_SEMANA, dataBR, diaSemanaLongo, gradeDoMes, hojeISO, rotuloMes, somaMes } from "@/lib/format";
import type { Post } from "@/lib/types";

const INTERVALO_DESCOBERTA = 6 * 60 * 60 * 1000; // procura clientes novos no Notion a cada 6h

type Grupo = { nome: string; cor: string; ids: string[] };

function somaDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function segundaDa(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return somaDias(iso, -((d.getUTCDay() + 6) % 7));
}

export default function Calendario() {
  const hoje = hojeISO();
  const [visao, setVisao] = useState<"semana" | "mes">("semana");
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const [semana, setSemana] = useState(segundaDa(hoje));
  const [dia, setDia] = useState(hoje);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cals, setCals] = useState<CalendarioPublico[]>([]);
  const [erros, setErros] = useState<{ cliente: string; mensagem: string }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocultos, setOcultos] = useState<string[]>([]);
  const [aberto, setAberto] = useState<Post | null>(null);
  const [aviso, setAviso] = useState("");
  const [versao, setVersao] = useState(0);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const fechar = useCallback(() => setAberto(null), []);

  // a semana sempre cabe na grade do mês da sua segunda-feira
  const mesBusca = visao === "semana" ? semana.slice(0, 7) : mes;
  const grade = useMemo(() => gradeDoMes(mesBusca), [mesBusca]);
  const diasSemana = useMemo(() => Array.from({ length: 7 }, (_, i) => somaDias(semana, i)), [semana]);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    fetch(`/api/posts?inicio=${grade[0]}&fim=${grade[grade.length - 1]}`)
      .then((r) => r.json())
      .then((j) => {
        if (!vivo) return;
        setPosts(j.posts ?? []);
        setCals(j.calendarios ?? []);
        setErros(j.erros ?? (j.erro ? [{ cliente: "Notion", mensagem: j.erro }] : []));
      })
      .catch((e) => vivo && setErros([{ cliente: "Notion", mensagem: e.message }]))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [grade, versao]);

  // descoberta automática de calendários de clientes novos
  useEffect(() => {
    let ultima = 0;
    try {
      ultima = Number(localStorage.getItem("nuv_descoberta") ?? 0);
    } catch {}
    if (Date.now() - ultima < INTERVALO_DESCOBERTA) return;
    fetch("/api/calendarios", { method: "POST", body: JSON.stringify({ acao: "descobrir" }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        try {
          localStorage.setItem("nuv_descoberta", String(Date.now()));
        } catch {}
        if (j?.adicionados?.length) {
          setAviso(`Novo calendário no painel: ${j.adicionados.join(", ")}`);
          setVersao((v) => v + 1);
        }
      })
      .catch(() => {});
  }, []);

  // um "cliente" pode ter mais de um calendário: agrupa pelo nome
  const grupos = useMemo(() => {
    const m = new Map<string, Grupo>();
    for (const c of cals) {
      const g = m.get(c.nome.toLowerCase()) ?? { nome: c.nome, cor: c.cor, ids: [] };
      g.ids.push(c.id);
      m.set(c.nome.toLowerCase(), g);
    }
    return [...m.values()];
  }, [cals]);
  const grupoDe = useCallback((calId: string) => grupos.find((g) => g.ids.includes(calId)), [grupos]);

  const visiveis = posts.filter((p) => !ocultos.includes(grupoDe(p.cliente)?.nome ?? ""));
  const porDia = useMemo(() => {
    const m = new Map<string, Post[]>();
    for (const p of visiveis) m.set(p.data, [...(m.get(p.data) ?? []), p]);
    return m;
  }, [visiveis]);

  const daSemana = visiveis.filter((p) => p.data >= diasSemana[0] && p.data <= diasSemana[6]);
  const doPeriodo = visao === "semana" ? daSemana : visiveis.filter((p) => p.data.startsWith(mes));
  const postados = doPeriodo.filter((p) => p.postado).length;
  const aguardando = doPeriodo.filter((p) => /aguardando|aprova/i.test(p.status) && !p.postado && p.status !== "Aprovado").length;
  const deHoje = visiveis.filter((p) => p.data === hoje);

  function navegar(delta: number) {
    if (visao === "semana") setSemana((s) => somaDias(s, delta * 7));
    else setMes((m) => somaMes(m, delta));
  }
  function irHoje() {
    setSemana(segundaDa(hoje));
    setMes(hoje.slice(0, 7));
    setDia(hoje);
  }

  function atualizarPost(p: Post) {
    setPosts((lista) => lista.map((x) => (x.id === p.id ? p : x)));
    setAberto(p);
  }

  /** Leva o post para outro dia: muda na tela na hora e grava no Notion; se der erro, volta. */
  async function moverPost(id: string, novaData: string) {
    const post = posts.find((p) => p.id === id);
    if (!post || post.data === novaData) return;
    setPosts((lista) => lista.map((x) => (x.id === id ? { ...x, data: novaData } : x)));
    setAviso("");
    try {
      const r = await fetch(`/api/posts/${id}`, { method: "PATCH", body: JSON.stringify({ cliente: post.cliente, data: novaData }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro ?? "Não consegui mudar a data no Notion");
      setPosts((lista) => lista.map((x) => (x.id === id ? j : x)));
      setAviso(`“${post.titulo}” foi para ${dataBR(novaData)}. Já está atualizado no Notion.`);
    } catch (e) {
      setPosts((lista) => lista.map((x) => (x.id === id ? post : x)));
      setErros([{ cliente: grupoDe(post.cliente)?.nome ?? "Notion", mensagem: (e as Error).message }]);
    }
  }

  const alvoDeSoltar = (d: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("text/plain")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (alvo !== d) setAlvo(d);
    },
    onDragLeave: () => alvo === d && setAlvo(null),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain") || arrastando;
      setAlvo(null);
      setArrastando(null);
      if (id) moverPost(id, d);
    },
  });
  const arrastavel = (p: Post) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", p.id);
      e.dataTransfer.effectAllowed = "move";
      setArrastando(p.id);
    },
    onDragEnd: () => {
      setArrastando(null);
      setAlvo(null);
    },
  });

  const periodo =
    visao === "semana"
      ? `${dataBR(diasSemana[0]).slice(0, 5)} – ${dataBR(diasSemana[6]).slice(0, 5)}`
      : rotuloMes(mes);

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* cabeçalho */}
      <header className="mb-6 flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <p className="text-sm font-medium text-ink-2 first-letter:uppercase">{diaSemanaLongo(hoje)}, {dataBR(hoje)}</p>
          <h1 className="titulo-pagina">{saudacao()}, Isabela</h1>
          <p className="mt-1 text-sm text-ink-2">
            {deHoje.length ? `Hoje tem ${deHoje.length} conteúdo${deHoje.length > 1 ? "s" : ""} programado${deHoje.length > 1 ? "s" : ""}.` : "Nenhum conteúdo programado para hoje."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="pill-tabs">
            {(["semana", "mes"] as const).map((v) => (
              <button key={v} onClick={() => setVisao(v)} className={`pill-tab ${visao === v ? "pill-tab-ativo" : ""}`}>
                {v === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(18,18,18,0.04)]">
            <button className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2" onClick={() => navegar(-1)} aria-label="Anterior"><ChevronLeft size={16} /></button>
            <span className="tabular min-w-[110px] text-center text-sm font-semibold">{periodo}</span>
            <button className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2" onClick={() => navegar(1)} aria-label="Próximo"><ChevronRight size={16} /></button>
          </div>
          <button className="btn-ghost" onClick={irHoje}>Hoje</button>
        </div>
      </header>

      {/* resumo + clientes */}
      <section className="card mb-5 flex flex-wrap items-center gap-x-8 gap-y-4 px-6 py-5">
        {([
          [visao === "semana" ? "Posts na semana" : "Posts no mês", doPeriodo.length],
          ["Aguardando aprovação", aguardando],
          ["Já postados", postados],
        ] as const).map(([r, v]) => (
          <div key={r}>
            <p className="text-xs font-medium text-ink-2">{r}</p>
            <p className="tabular text-3xl font-bold tracking-tight">{carregando ? "–" : v}</p>
          </div>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar clientes">
          {grupos.map((g) => {
            const ativo = !ocultos.includes(g.nome);
            return (
              <button
                key={g.nome}
                onClick={() => setOcultos((o) => (ativo ? [...o, g.nome] : o.filter((x) => x !== g.nome)))}
                className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${ativo ? "" : "bg-surface-2 text-ink-3 line-through"}`}
                style={ativo ? { background: tom(g.cor) } : undefined}
                aria-pressed={ativo}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: ativo ? g.cor : "#c9c6bd" }} />
                {g.nome}
              </button>
            );
          })}
          <Link href="/calendarios" className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-ink-2 hover:text-ink" aria-label="Gerenciar calendários" title="Gerenciar calendários">
            <Settings2 size={15} />
          </Link>
        </div>
      </section>

      {aviso && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-lima/60 px-4 py-3 text-sm font-medium">
          {aviso}
          <button className="ml-auto" onClick={() => setAviso("")} aria-label="Fechar aviso">×</button>
        </p>
      )}
      {erros.length > 0 && (
        <div className="mb-4 rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#a1261f]">
          {erros.map((e, i) => <p key={i}><b>{e.cliente}:</b> {e.mensagem}</p>)}
        </div>
      )}

      {visao === "semana" ? (
        /* ---------- SEMANA: colunas com cartões pastel ---------- */
        <div className={`grid gap-3 md:grid-cols-7 ${carregando ? "opacity-60" : ""}`}>
          {diasSemana.map((d, i) => {
            const lista = porDia.get(d) ?? [];
            const eHoje = d === hoje;
            return (
              <section
                key={d}
                {...alvoDeSoltar(d)}
                className={`flex min-h-[120px] flex-col rounded-[26px] p-2 transition md:min-h-[520px] ${
                  alvo === d ? "bg-lima/40 ring-2 ring-ink/20" : eHoje ? "bg-white" : "bg-white/50"
                } ${!lista.length ? "max-md:hidden" : ""}`}
              >
                <header className={`mb-2 flex items-baseline justify-between rounded-[20px] px-3 py-2.5 ${eHoje ? "bg-ink text-white" : ""}`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${eHoje ? "text-white/70" : "text-ink-2"}`}>{DIAS_SEMANA[i]}</span>
                  <span className="tabular text-lg font-bold">{dataBR(d).slice(0, 5)}</span>
                </header>
                <div className="flex-1 space-y-2">
                  {lista.map((p) => {
                    const g = grupoDe(p.cliente);
                    return (
                      <button
                        key={p.id}
                        {...arrastavel(p)}
                        onClick={() => setAberto(p)}
                        className={`block w-full cursor-grab rounded-[20px] p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${arrastando === p.id ? "opacity-40" : ""}`}
                        style={{ background: tom(g?.cor ?? "#999999") }}
                        title="Clique para abrir · arraste para mudar o dia"
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-bold">
                          <span className="h-2 w-2 rounded-full" style={{ background: g?.cor }} />
                          <span className="truncate">{g?.nome}</span>
                          {p.postado && <CheckCircle2 size={14} className="ml-auto shrink-0" />}
                        </div>
                        <p className="mt-1.5 line-clamp-3 text-[13px] font-bold leading-snug">{p.titulo}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          {p.hora && <span className="chip bg-white/70"><Clock size={10} />{p.hora}</span>}
                          {p.formato && <span className="chip bg-white/70">{p.formato}</span>}
                        </div>
                        {!p.postado && <div className="mt-2"><StatusBadge status={p.status} /></div>}
                      </button>
                    );
                  })}
                  {!lista.length && <p className="hidden px-2 pt-2 text-xs text-ink-3 md:block">Livre</p>}
                </div>
              </section>
            );
          })}
          {!daSemana.length && !carregando && (
            <p className="card p-6 text-sm text-ink-2 md:hidden">Nenhum conteúdo nesta semana.</p>
          )}
        </div>
      ) : (
        /* ---------- MÊS ---------- */
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <section className="card overflow-hidden p-2">
            <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wider text-ink-2">
              {DIAS_SEMANA.map((d) => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className={`grid grid-cols-7 gap-1 ${carregando ? "opacity-50" : ""}`}>
              {grade.map((d) => {
                const lista = porDia.get(d) ?? [];
                const fora = !d.startsWith(mes);
                return (
                  <div
                    key={d}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDia(d)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setDia(d)}
                    {...alvoDeSoltar(d)}
                    className={`min-h-[64px] cursor-pointer rounded-2xl p-1.5 transition sm:min-h-[110px] sm:p-2 ${
                      alvo === d ? "bg-lima/50" : d === dia ? "bg-surface-2" : "hover:bg-surface"
                    } ${fora ? "text-ink-3" : ""}`}
                    aria-label={`${dataBR(d)}: ${lista.length} posts`}
                  >
                    <span className={`tabular inline-grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${d === hoje ? "bg-ink text-white" : ""}`}>
                      {Number(d.slice(8))}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                      {grupos.filter((g) => lista.some((p) => g.ids.includes(p.cliente))).map((g) => (
                        <span key={g.nome} className="h-2 w-2 rounded-full" style={{ background: g.cor }} />
                      ))}
                    </div>
                    <div className="mt-1 hidden space-y-1 sm:block">
                      {lista.slice(0, 3).map((p) => {
                        const g = grupoDe(p.cliente);
                        return (
                          <div
                            key={p.id}
                            {...arrastavel(p)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDia(d);
                              setAberto(p);
                            }}
                            title={`${g?.nome}: ${p.titulo}`}
                            className={`flex cursor-grab items-center gap-1 truncate rounded-lg px-1.5 py-1 text-[11px] font-semibold ${arrastando === p.id ? "opacity-40" : ""}`}
                            style={{ background: tom(g?.cor ?? "#999999") }}
                          >
                            <span className="truncate">{p.titulo}</span>
                            {p.postado && <CheckCircle2 size={11} className="ml-auto shrink-0" />}
                          </div>
                        );
                      })}
                      {lista.length > 3 && <p className="px-1 text-[11px] font-medium text-ink-2">+{lista.length - 3} mais</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <aside className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-2">{dia === hoje ? "Hoje" : diaSemanaLongo(dia)}</p>
            <h2 className="text-2xl font-bold">{dataBR(dia)}</h2>
            <ul className="mt-4 space-y-2">
              {(porDia.get(dia) ?? []).map((p) => {
                const g = grupoDe(p.cliente);
                return (
                  <li key={p.id}>
                    <button {...arrastavel(p)} onClick={() => setAberto(p)} className="block w-full rounded-[20px] p-3 text-left" style={{ background: tom(g?.cor ?? "#999999") }}>
                      <p className="text-[11px] font-bold">{g?.nome}{p.hora ? ` · ${p.hora}` : ""}</p>
                      <p className="mt-1 text-sm font-bold leading-snug">{p.titulo}</p>
                      <div className="mt-2"><StatusBadge status={p.status} /></div>
                    </button>
                  </li>
                );
              })}
              {!(porDia.get(dia) ?? []).length && <li className="text-sm text-ink-2">Nada programado.</li>}
            </ul>
          </aside>
        </div>
      )}

      {aberto && <PostModal post={aberto} cliente={grupoDe(aberto.cliente)} onClose={fechar} onAtualizado={atualizarPost} />}
    </div>
  );
}
