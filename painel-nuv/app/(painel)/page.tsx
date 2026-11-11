"use client";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, CheckSquare, Handshake, Package, PhoneCall, RefreshCw, Target, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Miniatura } from "@/components/Miniatura";
import { PostModal } from "@/components/PostModal";
import { StatusBadge } from "@/components/StatusBadge";
import { useUsuario } from "@/components/Usuario";
import { saudacao, tom } from "@/lib/cores";
import { brl, dataBR, diaSemanaLongo } from "@/lib/format";
import { linkWhatsapp } from "@/lib/leads-rotulos";
import { TIPOS } from "@/lib/servicos-plano";
import type { Post } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Resumo = {
  hoje: string;
  posts: { calendarios: { id: string; nome: string; cor: string }[]; hoje: Post[]; atrasados: Post[]; aguardando: Post[]; semana: number; erros: number } | null;
  demandas: { lista: { id: string; titulo: string; cliente: string | null; data: string; responsavel: string | null; url: string; minha: boolean }[] } | null;
  leads: { followups: { id: string; name: string; status: string; next_followup_at: string; whatsapp: string | null; phone: string | null }[]; propostasVistas: { id: string; cliente: string; titulo: string; visto_em: string; visualizacoes: number }[] } | null;
  financeiro: { receber: any[]; totalReceber: number; atrasadoReceber: number; pagar: any[]; totalPagar: number } | null;
  servicos: { id: string; tipo: keyof typeof TIPOS; titulo: string | null; cliente: string; prazo: string }[] | null;
  contratos: { id: string; nome: string; fim: string; dias: number; situacao: string }[] | null;
  meta: { meta: any; feito: any } | null;
  falhas: string[];
};

function Bloco({ titulo, Icone, href, rotuloLink, children, destaque }: { titulo: string; Icone: typeof Wallet; href?: string; rotuloLink?: string; children: React.ReactNode; destaque?: boolean }) {
  return (
    <section className={`rounded-[26px] p-5 ${destaque ? "bg-ink text-white" : "bg-white"}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`grid h-8 w-8 place-items-center rounded-xl ${destaque ? "bg-white/10" : "bg-azul-claro text-azul"}`}><Icone size={15} /></span>
        <h2 className="text-sm font-bold">{titulo}</h2>
        {href && <Link href={href} className={`ml-auto flex items-center gap-1 text-xs font-semibold ${destaque ? "text-azul-medio" : "text-azul"}`}>{rotuloLink ?? "ver"} <ArrowRight size={12} /></Link>}
      </div>
      {children}
    </section>
  );
}
const Nada = ({ t }: { t: string }) => <p className="text-sm text-ink-3">{t}</p>;
const quando = (d: string, hoje: string) => (d === hoje ? "hoje" : dataBR(d).slice(0, 5)); // atrasado aparece em vermelho

export default function Hoje() {
  const { usuario } = useUsuario();
  const [r, setR] = useState<Resumo | null>(null);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState<Post | null>(null);
  const fechar = useCallback(() => setAberto(null), []);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/hoje");
      const j = await res.json();
      if (!res.ok) throw new Error(j.erro ?? "Erro");
      setR(j);
    } catch (e) {
      setErro((e as Error).message);
    }
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  const cal = (id: string) => r?.posts?.calendarios.find((c) => c.id === id);
  const minhas = r?.demandas?.lista.filter((d) => d.minha) ?? [];
  const hoje = r?.hoje ?? "";

  const CardPost = ({ p }: { p: Post }) => {
    const c = cal(p.cliente);
    return (
      <button onClick={() => setAberto(p)} className="flex w-full items-start gap-3 rounded-[20px] p-3 text-left transition hover:-translate-y-0.5" style={{ background: tom(c?.cor ?? "#999999") }}>
        <Miniatura src={p.capa} className="h-[62px] w-[50px]" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-bold">
            <span className="h-2 w-2 rounded-full" style={{ background: c?.cor }} />{c?.nome}{p.hora ? ` · ${p.hora}` : ""}{p.data !== hoje ? ` · ${dataBR(p.data).slice(0, 5)}` : ""}
            {p.postado && <CheckCircle2 size={13} className="ml-auto" />}
          </p>
          <p className="mt-1 line-clamp-2 text-sm font-bold leading-snug">{p.titulo}</p>
          {!p.postado && <div className="mt-1.5"><StatusBadge status={p.status} /></div>}
        </div>
      </button>
    );
  };

  const tiles = r
    ? ([
        r.posts && { r: "Posts hoje", v: r.posts.hoje.length, s: r.posts.hoje.filter((p) => p.postado).length ? `${r.posts.hoje.filter((p) => p.postado).length} já postado(s)` : `${r.posts.semana} nos próximos 7 dias` },
        r.demandas && { r: "Minhas demandas", v: minhas.length, s: `${r.demandas.lista.length} da equipe para hoje/atrasadas` },
        r.leads && { r: "Follow-ups", v: r.leads.followups.length, s: r.leads.propostasVistas.length ? `${r.leads.propostasVistas.length} proposta(s) vista(s)` : "leads para chamar" },
        r.financeiro && { r: "A receber", v: brl(r.financeiro.totalReceber), s: r.financeiro.atrasadoReceber ? `${brl(r.financeiro.atrasadoReceber)} atrasado` : "vencendo hoje" },
      ].filter(Boolean) as { r: string; v: string | number; s: string }[])
    : [];

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-6 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="text-sm font-medium text-ink-2 first-letter:uppercase">{hoje ? `${diaSemanaLongo(hoje)}, ${dataBR(hoje)}` : " "}</p>
          <h1 className="titulo-pagina">{saudacao()}{usuario ? `, ${usuario.nome.split(" ")[0]}` : ""}</h1>
          <p className="mt-1 text-sm text-ink-2">O que pede atenção hoje, de todas as áreas.</p>
        </div>
        <button className="btn-ghost" onClick={() => { setR(null); carregar(); }}><RefreshCw size={14} /> Atualizar</button>
      </header>

      {erro && <p className="mb-4 rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#a1261f]">{erro}</p>}
      {!r && !erro && <p className="text-sm text-ink-2">Juntando tudo do dia...</p>}

      {r && (
        <>
          {tiles.length > 0 && (
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {tiles.map((t, i) => (
                <div key={t.r} className={`rounded-[26px] p-5 ${i === 0 ? "bg-azul text-white" : "bg-white"}`}>
                  <p className={`text-xs font-semibold ${i === 0 ? "text-white/70" : "text-ink-2"}`}>{t.r}</p>
                  <p className="tabular mt-1 text-2xl font-bold md:text-3xl">{t.v}</p>
                  <p className={`mt-1 text-xs ${i === 0 ? "text-white/70" : "text-ink-3"}`}>{t.s}</p>
                </div>
              ))}
            </div>
          )}

          {r.contratos && r.contratos.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-[22px] bg-ink px-5 py-3 text-sm text-white">
              <AlertTriangle size={15} className="text-azul-medio" />
              <b>Contratos para renovar:</b>
              {r.contratos.map((c) => (
                <Link key={c.id} href={`/clientes/${c.id}`} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20">
                  {c.nome} · {c.situacao === "vencido" ? `venceu há ${Math.abs(c.dias)}d` : c.dias === 0 ? "vence hoje" : `vence em ${c.dias}d`}
                </Link>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {r.posts && (
              <div className="space-y-4 lg:col-span-2">
                <Bloco titulo="Conteúdo de hoje" Icone={CalendarDays} href="/calendario" rotuloLink="calendário">
                  {r.posts.hoje.length ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{r.posts.hoje.map((p) => <CardPost key={p.id} p={p} />)}</div> : <Nada t="Nenhum post programado para hoje." />}
                </Bloco>
                {(r.posts.atrasados.length > 0 || r.posts.aguardando.length > 0) && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {r.posts.atrasados.length > 0 && (
                      <Bloco titulo={`Não postados (${r.posts.atrasados.length})`} Icone={AlertTriangle}>
                        <div className="space-y-2">{r.posts.atrasados.slice(0, 5).map((p) => <CardPost key={p.id} p={p} />)}</div>
                      </Bloco>
                    )}
                    {r.posts.aguardando.length > 0 && (
                      <Bloco titulo={`Aguardando aprovação (${r.posts.aguardando.length})`} Icone={CheckCircle2}>
                        <div className="space-y-2">{r.posts.aguardando.slice(0, 5).map((p) => <CardPost key={p.id} p={p} />)}</div>
                      </Bloco>
                    )}
                  </div>
                )}
              </div>
            )}

            {r.demandas && (
              <Bloco titulo="Demandas de hoje e atrasadas" Icone={CheckSquare} href="/demandas" rotuloLink="demandas">
                {r.demandas.lista.length ? (
                  <ul className="space-y-1.5">
                    {r.demandas.lista.slice(0, 12).map((d) => (
                      <li key={d.id} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm ${d.minha ? "bg-azul-claro" : ""}`}>
                        <span className={`tabular w-11 shrink-0 text-[11px] font-semibold ${d.data < hoje ? "text-[#a1261f]" : "text-ink-2"}`}>{quando(d.data, hoje)}</span>
                        <a href={d.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:underline">{d.titulo}</a>
                        <span className="shrink-0 text-[11px] text-ink-3">{d.minha ? "você" : d.responsavel?.split(" ")[0] ?? d.cliente ?? ""}</span>
                      </li>
                    ))}
                    {r.demandas.lista.length > 12 && <li className="px-2 text-xs text-ink-3">+{r.demandas.lista.length - 12} em Demandas</li>}
                  </ul>
                ) : <Nada t="Tudo em dia por aqui." />}
              </Bloco>
            )}

            {r.leads && (
              <Bloco titulo="Comercial" Icone={PhoneCall} href="/comercial" rotuloLink="comercial">
                {r.leads.propostasVistas.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {r.leads.propostasVistas.map((p) => (
                      <p key={p.id} className="rounded-xl bg-ink px-3 py-2 text-xs text-white"><b>{p.cliente}</b> abriu a proposta {p.visualizacoes}x e ainda não respondeu</p>
                    ))}
                  </div>
                )}
                {r.leads.followups.length ? (
                  <ul className="space-y-1.5">
                    {r.leads.followups.slice(0, 8).map((l) => {
                      const wa = linkWhatsapp(l.whatsapp ?? l.phone, "");
                      const d = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(l.next_followup_at));
                      return (
                        <li key={l.id} className="flex items-center gap-2 text-sm">
                          <span className={`tabular w-11 shrink-0 text-[11px] font-semibold ${d < hoje ? "text-[#a1261f]" : "text-ink-2"}`}>{quando(d, hoje)}</span>
                          <Link href="/leads" className="min-w-0 flex-1 truncate hover:underline">{l.name}</Link>
                          {wa && <a href={wa} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-azul">WhatsApp</a>}
                        </li>
                      );
                    })}
                  </ul>
                ) : <Nada t="Nenhum follow-up para hoje." />}
              </Bloco>
            )}

            {r.financeiro && (
              <Bloco titulo="Dinheiro" Icone={Wallet} href="/financeiro" rotuloLink="financeiro">
                <p className="text-xs font-semibold text-ink-2">A receber (hoje e atrasados)</p>
                {r.financeiro.receber.length ? (
                  <ul className="mb-3 mt-1 space-y-1 text-sm">
                    {r.financeiro.receber.slice(0, 6).map((l) => (
                      <li key={l.id} className="flex gap-2"><span className={`tabular w-12 text-xs ${l.data < hoje ? "font-bold text-[#a1261f]" : "text-ink-2"}`}>{dataBR(l.data).slice(0, 5)}</span><span className="min-w-0 flex-1 truncate">{l.descricao}</span><b className="tabular">{brl(l.valor)}</b></li>
                    ))}
                  </ul>
                ) : <p className="mb-3 mt-1 text-sm text-ink-3">Nada pendente.</p>}
                <p className="text-xs font-semibold text-ink-2">A pagar nos próximos 7 dias · <span className="tabular">{brl(r.financeiro.totalPagar)}</span></p>
                {r.financeiro.pagar.length ? (
                  <ul className="mt-1 space-y-1 text-sm">
                    {r.financeiro.pagar.slice(0, 6).map((l) => (
                      <li key={l.id} className="flex gap-2"><span className={`tabular w-12 text-xs ${l.data < hoje ? "font-bold text-[#a1261f]" : "text-ink-2"}`}>{dataBR(l.data).slice(0, 5)}</span><span className="min-w-0 flex-1 truncate">{l.descricao}</span><b className="tabular">{brl(l.valor)}</b></li>
                    ))}
                  </ul>
                ) : <p className="mt-1 text-sm text-ink-3">Nada a pagar.</p>}
              </Bloco>
            )}

            {r.servicos && r.servicos.length > 0 && (
              <Bloco titulo="Entregas de serviços (7 dias)" Icone={Package} href="/servicos" rotuloLink="serviços">
                <ul className="space-y-1.5 text-sm">
                  {r.servicos.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <span className={`tabular w-11 shrink-0 text-[11px] font-semibold ${s.prazo < hoje ? "text-[#a1261f]" : "text-ink-2"}`}>{quando(s.prazo, hoje)}</span>
                      <span className="min-w-0 flex-1 truncate">{TIPOS[s.tipo]}{s.titulo ? ` · ${s.titulo}` : ""}</span>
                      <span className="shrink-0 text-[11px] text-ink-3">{s.cliente}</span>
                    </li>
                  ))}
                </ul>
              </Bloco>
            )}

            {r.meta && (
              <Bloco titulo="Meta do mês" Icone={Target} href="/comercial" rotuloLink="comercial" destaque>
                <ul className="space-y-3">
                  {([
                    ["Faturamento", r.meta.feito.faturamento, r.meta.meta?.faturamento, true],
                    ["Novos clientes", r.meta.feito.clientes, r.meta.meta?.clientes, false],
                    ["Leads contatados", r.meta.feito.leads_contatados, r.meta.meta?.leads_contatados, false],
                    ["Propostas", r.meta.feito.propostas, r.meta.meta?.propostas, false],
                  ] as [string, number | null, number | null | undefined, boolean][])
                    .filter(([, f]) => f !== null)
                    .map(([rot, f, m, din]) => (
                      <li key={rot}>
                        <div className="flex text-xs"><span className="text-white/70">{rot}</span><span className="tabular ml-auto font-bold">{din ? brl(f!) : f}{m ? <span className="font-normal text-white/50"> / {din ? brl(m) : m}</span> : ""}</span></div>
                        <div className="mt-1 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-azul-medio" style={{ width: `${m ? Math.min(100, (f! / m) * 100) : 0}%` }} /></div>
                      </li>
                    ))}
                </ul>
                {!r.meta.meta && <p className="mt-3 text-xs text-white/60">Defina a meta em Comercial.</p>}
              </Bloco>
            )}
          </div>

          {r.falhas.length > 0 && <p className="mt-4 text-xs text-ink-3">Algumas partes não carregaram: {r.falhas.join(" · ")}</p>}
          {!tiles.length && !r.contratos?.length && (
            <div className="card p-8 text-center text-sm text-ink-2"><Handshake className="mx-auto mb-2 text-ink-3" />Seu perfil ainda não tem áreas liberadas. Peça para a administração.</div>
          )}
        </>
      )}

      {aberto && (
        <PostModal
          post={aberto}
          cliente={cal(aberto.cliente)}
          onClose={fechar}
          onAtualizado={(p) => {
            setAberto(p);
            setR((x) => x && x.posts ? { ...x, posts: { ...x.posts, hoje: x.posts.hoje.map((y) => (y.id === p.id ? p : y)), atrasados: x.posts.atrasados.filter((y) => y.id !== p.id || !p.postado), aguardando: x.posts.aguardando.map((y) => (y.id === p.id ? p : y)) } } : x);
          }}
        />
      )}
    </div>
  );
}
