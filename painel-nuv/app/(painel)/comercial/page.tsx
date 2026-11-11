"use client";
import { ChevronLeft, ChevronRight, Copy, Eye, FileText, MessageCircle, Plus, Target } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PropostaForm, type PropostaUI } from "@/components/PropostaForm";
import { useUsuario } from "@/components/Usuario";
import { brl, dataBR, hojeISO, rotuloMes, somaMes } from "@/lib/format";
import { ORDEM_STATUS, ROT_STATUS } from "@/lib/leads-rotulos";

type LeadMin = { id: string; name: string; status: string; whatsapp: string | null; phone: string | null };
type Progresso = {
  mes: string;
  meta: { faturamento: number | null; clientes: number | null; leads_contatados: number | null; propostas: number | null } | null;
  feito: { faturamento: number | null; recebido: number | null; clientes: number; novosClientes: string[]; leads_contatados: number; propostas: number; aceitas: number; novoMRR: number | null };
};

const ST: Record<PropostaUI["status"], { r: string; cls: string }> = {
  rascunho: { r: "Rascunho", cls: "bg-surface-2 text-ink-2" },
  enviada: { r: "Enviada", cls: "bg-azul-claro text-azul-escuro" },
  vista: { r: "Visualizada", cls: "bg-ink text-white" },
  aceita: { r: "Aceita", cls: "bg-azul text-white" },
  recusada: { r: "Recusada", cls: "bg-[#fdecea] text-[#a1261f]" },
};

const total = (p: PropostaUI) => ({
  mensal: p.itens.filter((i) => i.recorrente).reduce((t, i) => t + Number(i.valor), 0),
  unico: p.itens.filter((i) => !i.recorrente).reduce((t, i) => t + Number(i.valor), 0),
});

function Barra({ rotulo, feito, meta, dinheiro, extra }: { rotulo: string; feito: number | null; meta: number | null | undefined; dinheiro?: boolean; extra?: string }) {
  if (feito === null) return null;
  const pct = meta ? Math.min(100, Math.round((feito / meta) * 100)) : 0;
  const f = (v: number) => (dinheiro ? brl(v) : String(v));
  return (
    <div className="rounded-[22px] bg-white p-4">
      <p className="text-xs font-semibold text-ink-2">{rotulo}</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
        <span className="tabular text-xl font-bold xl:text-2xl">{f(feito)}</span>
        {meta ? <span className="tabular text-sm text-ink-3">/ {f(meta)}</span> : <span className="text-xs text-ink-3">sem meta</span>}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full ${pct >= 100 ? "bg-ink" : "bg-azul"}`} style={{ width: `${meta ? Math.max(pct, 3) : 0}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-ink-3">{meta ? (pct >= 100 ? "Meta batida!" : `${pct}% da meta`) : ""}{extra ? `${meta ? " · " : ""}${extra}` : ""}</p>
    </div>
  );
}

export default function Comercial() {
  const { podeEditar } = useUsuario();
  const [mes, setMes] = useState(hojeISO().slice(0, 7));
  const [prog, setProg] = useState<Progresso | null>(null);
  const [propostas, setPropostas] = useState<PropostaUI[] | null>(null);
  const [leads, setLeads] = useState<LeadMin[]>([]);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState<PropostaUI | "nova" | null>(null);
  const [leadInicial, setLeadInicial] = useState<string | null>(null);
  const [editMeta, setEditMeta] = useState(false);
  const [meta, setMeta] = useState({ faturamento: "", clientes: "", leads_contatados: "", propostas: "" });
  const [filtro, setFiltro] = useState<"abertas" | "todas">("abertas");

  const carregarProg = useCallback(async () => {
    const r = await fetch(`/api/metas?mes=${mes}`);
    const j = await r.json();
    if (!r.ok) return setErro(j.erro ?? "Erro");
    setProg(j);
    setMeta({
      faturamento: j.meta?.faturamento != null ? String(j.meta.faturamento).replace(".", ",") : "",
      clientes: j.meta?.clientes != null ? String(j.meta.clientes) : "",
      leads_contatados: j.meta?.leads_contatados != null ? String(j.meta.leads_contatados) : "",
      propostas: j.meta?.propostas != null ? String(j.meta.propostas) : "",
    });
  }, [mes]);
  const carregarPropostas = useCallback(async () => {
    const r = await fetch("/api/propostas");
    const j = await r.json();
    if (!r.ok) return setErro(j.erro ?? "Erro");
    setPropostas(j.propostas);
  }, []);

  useEffect(() => {
    carregarProg();
  }, [carregarProg]);
  useEffect(() => {
    carregarPropostas();
    fetch("/api/leads").then((r) => r.json()).then((j) => {
      setLeads(j.leads ?? []);
      const id = new URLSearchParams(window.location.search).get("lead");
      if (id && (j.leads ?? []).some((l: LeadMin) => l.id === id)) {
        setLeadInicial(id);
        setEditando("nova");
      }
    });
  }, [carregarPropostas]);

  async function acao(corpo: object) {
    setErro("");
    const r = await fetch("/api/propostas", { method: "POST", body: JSON.stringify(corpo) });
    const j = await r.json();
    if (!r.ok) {
      setErro(j.erro ?? "Erro");
      return null;
    }
    await carregarPropostas();
    carregarProg();
    return j;
  }

  const link = (p: PropostaUI) => `${window.location.origin}/p/${p.token_publico}`;
  async function enviar(p: PropostaUI) {
    const j = await acao({ acao: "enviar", id: p.id });
    if (!j) return;
    const url = `${window.location.origin}/p/${j.token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setAviso(`Link da proposta copiado: ${url}`);
  }
  function whatsapp(p: PropostaUI) {
    const l = leads.find((x) => x.id === p.lead_id);
    const num = String(l?.whatsapp ?? l?.phone ?? "").replace(/\D/g, "");
    const texto = `Oi! Segue a proposta da NUV para ${p.cliente}: ${link(p)}`;
    const base = num.length >= 10 ? `https://wa.me/${num.startsWith("55") ? num : `55${num}`}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(texto)}`, "_blank");
  }

  async function salvarMeta() {
    const n = (v: string) => (v.trim() === "" ? null : Number(v.replace(/\./g, "").replace(",", ".")));
    const r = await fetch("/api/metas", {
      method: "POST",
      body: JSON.stringify({ mes, meta: { faturamento: n(meta.faturamento), clientes: n(meta.clientes), leads_contatados: n(meta.leads_contatados), propostas: n(meta.propostas) } }),
    });
    const j = await r.json();
    if (!r.ok) return setErro(j.erro ?? "Erro");
    setEditMeta(false);
    carregarProg();
  }

  const funil = ORDEM_STATUS.filter((s) => s !== "perdido").map((s) => ({ s, n: leads.filter((l) => l.status === s).length }));
  const maxFunil = Math.max(1, ...funil.map((x) => x.n));
  const lista = (propostas ?? []).filter((p) => filtro === "todas" || ["rascunho", "enviada", "vista"].includes(p.status));
  const abertas = (propostas ?? []).filter((p) => ["enviada", "vista"].includes(p.status));
  const emAberto = abertas.reduce((t, p) => t + total(p).mensal, 0);

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-6 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="text-sm font-medium text-ink-2">Vendas</p>
          <h1 className="titulo-pagina">Comercial</h1>
          <p className="mt-1 text-sm text-ink-2">Meta do mês, funil de leads e propostas com link para o cliente aceitar.</p>
        </div>
        <button className="so-editor btn-primary" onClick={() => { setLeadInicial(null); setEditando("nova"); }}><Plus size={16} /> Nova proposta</button>
      </header>

      {erro && <p className="mb-4 rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#a1261f]">{erro}</p>}
      {aviso && (
        <p className="mb-4 flex items-center gap-2 break-all rounded-2xl bg-azul-claro px-4 py-3 text-sm font-semibold text-azul-escuro">
          {aviso}<button className="ml-auto" onClick={() => setAviso("")} aria-label="Fechar">×</button>
        </p>
      )}

      {/* meta */}
      <section className="mb-5 rounded-[28px] bg-ink p-5 text-white">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Target size={18} className="text-azul-medio" />
          <h2 className="text-lg font-bold">Meta do mês</h2>
          <div className="ml-auto flex items-center gap-1 rounded-full bg-white/10 p-1">
            <button className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/10" onClick={() => setMes(somaMes(mes, -1))} aria-label="Mês anterior"><ChevronLeft size={15} /></button>
            <span className="min-w-[120px] text-center text-sm font-semibold">{rotuloMes(mes)}</span>
            <button className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/10" onClick={() => setMes(somaMes(mes, 1))} aria-label="Próximo mês"><ChevronRight size={15} /></button>
          </div>
          <button className="so-editor rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink" onClick={() => setEditMeta((v) => !v)}>{editMeta ? "Fechar" : "Definir meta"}</button>
        </div>
        {editMeta && (
          <div className="mb-4 grid gap-2 rounded-[20px] bg-white/10 p-3 sm:grid-cols-5">
            {podeEditar("financeiro") && (
              <label className="text-xs text-white/70">Faturamento (R$)<input className="input tabular mt-1 py-1.5 text-ink" inputMode="decimal" value={meta.faturamento} onChange={(e) => setMeta({ ...meta, faturamento: e.target.value })} /></label>
            )}
            <label className="text-xs text-white/70">Novos clientes<input className="input tabular mt-1 py-1.5 text-ink" type="number" min={0} value={meta.clientes} onChange={(e) => setMeta({ ...meta, clientes: e.target.value })} /></label>
            <label className="text-xs text-white/70">Leads contatados<input className="input tabular mt-1 py-1.5 text-ink" type="number" min={0} value={meta.leads_contatados} onChange={(e) => setMeta({ ...meta, leads_contatados: e.target.value })} /></label>
            <label className="text-xs text-white/70">Propostas enviadas<input className="input tabular mt-1 py-1.5 text-ink" type="number" min={0} value={meta.propostas} onChange={(e) => setMeta({ ...meta, propostas: e.target.value })} /></label>
            <button className="btn-azul self-end py-2" onClick={salvarMeta}>Salvar meta</button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-ink lg:grid-cols-4">
          {prog ? (
            <>
              <Barra rotulo="Faturamento do mês" feito={prog.feito.faturamento} meta={prog.meta?.faturamento} dinheiro extra={prog.feito.recebido !== null ? `${brl(prog.feito.recebido)} já recebido` : undefined} />
              <Barra rotulo="Novos clientes" feito={prog.feito.clientes} meta={prog.meta?.clientes} extra={prog.feito.novosClientes.join(", ")} />
              <Barra rotulo="Leads contatados" feito={prog.feito.leads_contatados} meta={prog.meta?.leads_contatados} />
              <Barra rotulo="Propostas enviadas" feito={prog.feito.propostas} meta={prog.meta?.propostas} extra={`${prog.feito.aceitas} aceita${prog.feito.aceitas === 1 ? "" : "s"}${prog.feito.novoMRR ? ` · +${brl(prog.feito.novoMRR)}/mês` : ""}`} />
            </>
          ) : (
            <p className="text-sm text-white/60">Carregando...</p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        {/* funil */}
        <section className="card h-fit p-5">
          <div className="mb-3 flex items-center">
            <h2 className="text-sm font-bold">Funil de leads</h2>
            <Link href="/leads" className="ml-auto text-xs font-semibold text-azul">leads →</Link>
          </div>
          <ul className="space-y-2">
            {funil.map(({ s, n }) => (
              <li key={s}>
                <div className="flex text-xs font-semibold"><span>{ROT_STATUS[s]}</span><span className="tabular ml-auto">{n}</span></div>
                <div className="mt-1 h-2 rounded-full bg-surface-2"><div className={`h-full rounded-full ${s === "fechado" ? "bg-ink" : "bg-azul"}`} style={{ width: `${(n / maxFunil) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
          {abertas.length > 0 && (
            <p className="mt-4 rounded-2xl bg-azul-claro p-3 text-xs text-azul-escuro">
              <b>{abertas.length}</b> proposta{abertas.length > 1 ? "s" : ""} aguardando resposta{emAberto ? <> · <b>{brl(emAberto)}/mês</b> em jogo</> : ""}
            </p>
          )}
        </section>

        {/* propostas */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-bold">Propostas</h2>
            <div className="pill-tabs ml-auto">
              {(["abertas", "todas"] as const).map((v) => (
                <button key={v} className={`pill-tab ${filtro === v ? "pill-tab-ativo" : ""}`} onClick={() => setFiltro(v)}>{v === "abertas" ? "Em aberto" : "Todas"}</button>
              ))}
            </div>
          </div>
          {!propostas && <p className="text-sm text-ink-2">Carregando...</p>}
          {propostas && !lista.length && (
            <div className="card p-8 text-center text-sm text-ink-2">
              <FileText className="mx-auto mb-2 text-ink-3" />
              Nenhuma proposta {filtro === "abertas" ? "em aberto" : "ainda"}. Crie uma em “Nova proposta” ou pelo botão “Fazer proposta” dentro do lead.
            </div>
          )}
          <div className="space-y-3">
            {lista.map((p) => {
              const t = total(p);
              const fechada = p.status === "aceita" || p.status === "recusada";
              return (
                <article key={p.id} className="card p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink-2">{p.cliente}</p>
                      <h3 className="truncate text-base font-bold">{p.titulo}</h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
                        <span className={`chip ${ST[p.status].cls}`}>{ST[p.status].r}</span>
                        {p.visualizacoes > 0 && <span className="chip bg-surface text-ink-2"><Eye size={11} /> aberta {p.visualizacoes}x</span>}
                        {p.enviada_em && <span>enviada {dataBR(p.enviada_em.slice(0, 10))}</span>}
                        {p.validade && !fechada && <span>· válida até {dataBR(p.validade)}</span>}
                        {p.respondido_em && <span>· {p.status === "aceita" ? "aceita" : "recusada"} por {p.respondido_por} em {dataBR(p.respondido_em.slice(0, 10))}</span>}
                      </div>
                      {p.resposta_obs && <p className="mt-1.5 text-xs italic text-ink-2">“{p.resposta_obs}”</p>}
                    </div>
                    <div className="text-right">
                      {t.mensal > 0 && <p className="tabular text-lg font-bold">{brl(t.mensal)}<span className="text-xs font-semibold text-ink-3">/mês</span></p>}
                      {t.unico > 0 && <p className="tabular text-sm font-semibold text-ink-2">{brl(t.unico)} único</p>}
                    </div>
                  </div>
                  <div className="so-editor mt-3 flex flex-wrap gap-1.5 border-t border-black/5 pt-3">
                    {!fechada && <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setEditando(p)}>Editar</button>}
                    {p.status === "rascunho" ? (
                      <button className="btn-azul px-3 py-1.5 text-xs" onClick={() => enviar(p)}>Gerar link e enviar</button>
                    ) : (
                      <>
                        <button className="btn-ghost px-3 py-1.5 text-xs" onClick={async () => { await navigator.clipboard.writeText(link(p)); setAviso("Link copiado."); }}><Copy size={12} /> Copiar link</button>
                        <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => whatsapp(p)}><MessageCircle size={12} /> WhatsApp</button>
                        <a className="btn-ghost px-3 py-1.5 text-xs" href={link(p)} target="_blank" rel="noreferrer">Ver como cliente ↗</a>
                      </>
                    )}
                    <button className="btn-ghost px-3 py-1.5 text-xs" onClick={async () => { const j = await acao({ acao: "duplicar", id: p.id }); if (j) setAviso("Cópia criada como rascunho."); }}>Duplicar</button>
                    {p.status === "aceita" && p.lead_id && <Link className="btn-ghost px-3 py-1.5 text-xs" href="/leads">Abrir lead para virar cliente →</Link>}
                    <button className="ml-auto px-2 text-xs font-semibold text-ink-3 hover:text-[#a1261f]" onClick={() => confirm("Excluir esta proposta? O link para o cliente deixa de funcionar.") && acao({ acao: "excluir", id: p.id })}>Excluir</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {editando && (
        <PropostaForm
          proposta={editando === "nova" ? null : editando}
          leads={leads}
          leadInicial={leadInicial}
          onFechar={() => setEditando(null)}
          onSalva={() => {
            setEditando(null);
            setAviso("Proposta salva. Quando estiver pronta, clique em “Gerar link e enviar”.");
            carregarPropostas();
          }}
        />
      )}
    </div>
  );
}
