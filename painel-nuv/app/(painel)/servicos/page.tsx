"use client";
import { AlertTriangle, CalendarClock, ExternalLink, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { brl, dataBR, hojeISO } from "@/lib/format";
import { TIPOS, planoRecebimento, type Tipo } from "@/lib/servicos-plano";

type Parcela = { id: string; valor: number; data: string; pago: boolean; parcela: number; descricao: string };
type Servico = {
  id: string;
  tipo: Tipo;
  titulo: string | null;
  cliente: string;
  contato: string | null;
  valor: number;
  custo: number;
  pagamento: "avista" | "sinal" | "parcelado";
  parcelas: number;
  forma_pagamento: string | null;
  data_inicio: string;
  prazo: string | null;
  entregue_em: string | null;
  status: "orcamento" | "andamento" | "entregue" | "cancelado";
  observacoes: string | null;
  link: string | null;
  parcelasFin: Parcela[];
  custoFin: Parcela | null;
  recebido: number;
  aReceber: number;
  atrasado: boolean;
};

const STATUS: Record<Servico["status"], { r: string; cls: string }> = {
  orcamento: { r: "Orçamento", cls: "bg-white text-ink-2 ring-1 ring-black/10" },
  andamento: { r: "Em andamento", cls: "bg-azul text-white" },
  entregue: { r: "Entregue", cls: "bg-ink text-white" },
  cancelado: { r: "Cancelado", cls: "bg-surface-2 text-ink-3" },
};
const PAGAMENTO = { avista: "À vista", sinal: "50% de sinal + 50% na entrega", parcelado: "Parcelado" } as const;
const FORMAS = ["Pix", "Transferência", "Cartão", "Boleto", "Dinheiro"];

async function enviar(corpo: unknown) {
  const r = await fetch("/api/servicos", { method: "POST", body: JSON.stringify(corpo) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.erro ?? "Erro ao salvar");
  return j;
}

export default function Servicos() {
  const hoje = hojeISO();
  const [lista, setLista] = useState<Servico[] | null>(null);
  const [erro, setErro] = useState("");
  const [tipo, setTipo] = useState<Tipo | "">("");
  const [status, setStatus] = useState<Servico["status"] | "" | "abertos">("abertos");
  const [editando, setEditando] = useState<Servico | "novo" | null>(null);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/servicos");
    const j = await r.json();
    if (!r.ok) return setErro(j.erro ?? "Erro ao carregar");
    setLista(j.servicos);
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  const todos = lista ?? [];
  const filtrados = useMemo(
    () =>
      todos.filter(
        (s) =>
          (!tipo || s.tipo === tipo) &&
          (status === "" ? true : status === "abertos" ? s.status === "andamento" || s.status === "orcamento" : s.status === status),
      ),
    [todos, tipo, status],
  );

  const vendidos = todos.filter((s) => s.status === "andamento" || s.status === "entregue");
  const mes = hoje.slice(0, 7);
  const recebidoMes = vendidos.flatMap((s) => s.parcelasFin).filter((p) => p.pago && p.data.startsWith(mes)).reduce((t, p) => t + p.valor, 0);

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-6 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="text-sm font-medium text-ink-2">Projetos avulsos</p>
          <h1 className="titulo-pagina">Serviços freela</h1>
          <p className="mt-1 text-sm text-ink-2">Cada serviço entra sozinho no Financeiro, com as parcelas e o custo.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditando("novo")}><Plus size={16} /> Novo serviço</button>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([
          ["Em andamento", String(todos.filter((s) => s.status === "andamento").length), "bg-azul text-white"],
          ["A receber", brl(vendidos.reduce((t, s) => t + s.aReceber, 0)), "bg-white"],
          ["Recebido este mês", brl(recebidoMes), "bg-azul-claro"],
          ["Orçamentos abertos", String(todos.filter((s) => s.status === "orcamento").length), "bg-white"],
        ] as const).map(([r, v, cls]) => (
          <div key={r} className={`rounded-[26px] p-5 ${cls}`}>
            <p className={`text-xs font-semibold ${cls.includes("text-white") ? "text-white/70" : "text-ink-2"}`}>{r}</p>
            <p className="tabular mt-1 text-2xl font-bold tracking-tight md:text-3xl">{lista ? v : "–"}</p>
          </div>
        ))}
      </div>

      {erro && <p className="mb-4 rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#a1261f]">{erro}</p>}

      <div className="mb-3 flex flex-wrap gap-2">
        <button onClick={() => setTipo("")} className={`rounded-full px-4 py-2 text-sm font-semibold ${tipo === "" ? "bg-ink text-white" : "bg-white text-ink-2"}`}>Todos</button>
        {(Object.keys(TIPOS) as Tipo[]).map((t) => (
          <button key={t} onClick={() => setTipo(t)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${tipo === t ? "bg-ink text-white" : "bg-white text-ink-2"}`}>
            {TIPOS[t]}
            <span className={`tabular rounded-full px-1.5 text-xs ${tipo === t ? "bg-white/20" : "bg-surface-2"}`}>{todos.filter((s) => s.tipo === t && s.status !== "cancelado").length}</span>
          </button>
        ))}
      </div>
      <div className="pill-tabs mb-5">
        {([["abertos", "Abertos"], ["andamento", "Em andamento"], ["entregue", "Entregues"], ["orcamento", "Orçamentos"], ["cancelado", "Cancelados"], ["", "Todos"]] as const).map(([v, r]) => (
          <button key={v} onClick={() => setStatus(v)} className={`pill-tab ${status === v ? "pill-tab-ativo" : ""}`}>{r}</button>
        ))}
      </div>

      {!lista && !erro && <p className="text-sm text-ink-2">Carregando...</p>}
      {lista && filtrados.length === 0 && (
        <div className="card p-8 text-center">
          <p className="font-semibold">Nenhum serviço aqui.</p>
          <p className="mt-1 text-sm text-ink-2">Clique em “Novo serviço” para cadastrar uma área de membros, landing page, e-book, arte, vídeo ou Notion.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtrados.map((s) => {
          const atrasadoEntrega = s.status === "andamento" && s.prazo && s.prazo < hoje;
          const pct = s.valor > 0 ? Math.min(100, (s.recebido / s.valor) * 100) : 0;
          return (
            <button key={s.id} onClick={() => setEditando(s)} className={`card block p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${s.status === "cancelado" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="chip bg-azul-claro text-azul-escuro">{TIPOS[s.tipo]}</span>
                <span className={`chip ${STATUS[s.status].cls}`}>{STATUS[s.status].r}</span>
                {s.atrasado && <span className="chip bg-[#fdecea] text-[#a1261f]"><AlertTriangle size={11} /> pagamento atrasado</span>}
              </div>
              <p className="mt-3 text-lg font-bold leading-tight">{s.cliente}</p>
              {s.titulo && <p className="text-sm text-ink-2">{s.titulo}</p>}
              <p className="tabular mt-3 text-2xl font-bold tracking-tight">{brl(s.valor)}</p>
              {s.status !== "orcamento" && s.status !== "cancelado" && s.valor > 0 && (
                <>
                  <div className="mt-2 h-2 rounded-full bg-surface-2">
                    <div className="h-2 rounded-full bg-azul" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="tabular mt-1 text-xs text-ink-2">
                    {brl(s.recebido)} recebido{s.aReceber > 0 ? ` · faltam ${brl(s.aReceber)}` : " · quitado"}
                  </p>
                </>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-2">
                {s.prazo && (
                  <span className={`flex items-center gap-1 ${atrasadoEntrega ? "font-semibold text-[#a1261f]" : ""}`}>
                    <CalendarClock size={13} /> Entrega {dataBR(s.prazo).slice(0, 5)}
                  </span>
                )}
                <span>{s.pagamento === "parcelado" ? `${s.parcelas}x` : PAGAMENTO[s.pagamento]}</span>
                {s.custo > 0 && <span>Custo {brl(s.custo)}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {editando && (
        <Formulario
          servico={editando === "novo" ? null : editando}
          tipoInicial={tipo || "landing_page"}
          onFechar={() => setEditando(null)}
          onSalvo={async () => {
            setEditando(null);
            await carregar();
          }}
          onRecarregar={carregar}
        />
      )}
    </div>
  );
}

function Formulario({ servico, tipoInicial, onFechar, onSalvo, onRecarregar }: {
  servico: Servico | null; tipoInicial: Tipo; onFechar: () => void; onSalvo: () => void; onRecarregar: () => Promise<void>;
}) {
  const hoje = hojeISO();
  const [f, setF] = useState({
    tipo: servico?.tipo ?? tipoInicial,
    titulo: servico?.titulo ?? "",
    cliente: servico?.cliente ?? "",
    contato: servico?.contato ?? "",
    valor: servico ? String(servico.valor).replace(".", ",") : "",
    custo: servico?.custo ? String(servico.custo).replace(".", ",") : "",
    pagamento: servico?.pagamento ?? "sinal",
    parcelas: servico?.parcelas ?? 2,
    forma_pagamento: servico?.forma_pagamento ?? "Pix",
    data_inicio: servico?.data_inicio ?? hoje,
    prazo: servico?.prazo ?? "",
    entregue_em: servico?.entregue_em ?? "",
    status: servico?.status ?? "andamento",
    observacoes: servico?.observacoes ?? "",
    link: servico?.link ?? "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [parcelas, setParcelas] = useState<Parcela[]>(servico?.parcelasFin ?? []);
  const set = (k: keyof typeof f, v: string | number) => setF((x) => ({ ...x, [k]: v }));
  const numero = (s: string) => Number(String(s).replace(/\./g, "").replace(",", ".")) || 0;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  const previa = planoRecebimento({
    valor: numero(f.valor),
    pagamento: f.pagamento,
    parcelas: f.pagamento === "parcelado" ? Number(f.parcelas) : 1,
    data_inicio: f.data_inicio,
    prazo: f.prazo || null,
  });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      const dados = {
        ...f,
        valor: numero(f.valor),
        custo: numero(f.custo),
        parcelas: f.pagamento === "parcelado" ? Number(f.parcelas) : f.pagamento === "sinal" ? 2 : 1,
        prazo: f.prazo || null,
        entregue_em: f.status === "entregue" ? f.entregue_em || hoje : f.entregue_em || null,
      };
      await enviar(servico ? { acao: "atualizar", id: servico.id, dados } : { acao: "criar", dados });
      onSalvo();
    } catch (er) {
      setErro((er as Error).message);
      setSalvando(false);
    }
  }

  async function alternarParcela(p: Parcela) {
    setParcelas((l) => l.map((x) => (x.id === p.id ? { ...x, pago: !p.pago } : x)));
    try {
      await enviar({ acao: "parcela", lancamentoId: p.id, pago: !p.pago });
      await onRecarregar();
    } catch (er) {
      setErro((er as Error).message);
      setParcelas((l) => l.map((x) => (x.id === p.id ? p : x)));
    }
  }

  async function excluir() {
    if (!servico || !confirm(`Excluir o serviço de ${servico.cliente}? O que ainda não foi pago sai do Financeiro; o que já foi pago fica como histórico.`)) return;
    try {
      await enviar({ acao: "excluir", id: servico.id });
      onSalvo();
    } catch (er) {
      setErro((er as Error).message);
    }
  }

  const campo = "block text-xs font-semibold text-ink-2";
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onFechar}>
      <form onSubmit={salvar} onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-xl flex-col bg-creme shadow-xl" role="dialog" aria-modal="true">
        <header className="flex items-center gap-3 bg-ink px-6 py-5 text-white">
          <div className="flex-1">
            <p className="text-xs font-semibold text-white/60">{servico ? "Editar serviço" : "Novo serviço"}</p>
            <h2 className="text-xl font-bold">{f.cliente || TIPOS[f.tipo]}</h2>
          </div>
          <button type="button" onClick={onFechar} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Fechar"><X size={16} /></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {erro && <p className="rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#a1261f]">{erro}</p>}

          <div>
            <span className={campo}>Serviço</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(Object.keys(TIPOS) as Tipo[]).map((t) => (
                <button type="button" key={t} onClick={() => set("tipo", t)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${f.tipo === t ? "bg-azul text-white" : "bg-white text-ink-2"}`}>
                  {TIPOS[t]}
                </button>
              ))}
            </div>
          </div>

          <section className="card grid gap-3 p-4 sm:grid-cols-2">
            <label className={campo}>Quem contratou<input className="input mt-1" value={f.cliente} onChange={(e) => set("cliente", e.target.value)} required /></label>
            <label className={campo}>Contato (WhatsApp, e-mail, @)<input className="input mt-1" value={f.contato} onChange={(e) => set("contato", e.target.value)} /></label>
            <label className={`${campo} sm:col-span-2`}>Descrição curta<input className="input mt-1" placeholder="Ex.: LP de lançamento do curso" value={f.titulo} onChange={(e) => set("titulo", e.target.value)} /></label>
            <label className={campo}>Status
              <select className="input mt-1" value={f.status} onChange={(e) => set("status", e.target.value)}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.r}</option>)}
              </select>
            </label>
            <label className={campo}>Link (briefing, Drive, entrega)<input className="input mt-1" value={f.link} onChange={(e) => set("link", e.target.value)} /></label>
            <label className={campo}>Início<input type="date" className="input mt-1" value={f.data_inicio} onChange={(e) => set("data_inicio", e.target.value)} required /></label>
            <label className={campo}>Prazo de entrega<input type="date" className="input mt-1" value={f.prazo} onChange={(e) => set("prazo", e.target.value)} /></label>
            {f.status === "entregue" && (
              <label className={campo}>Entregue em<input type="date" className="input mt-1" value={f.entregue_em || hoje} onChange={(e) => set("entregue_em", e.target.value)} /></label>
            )}
          </section>

          <section className="card grid gap-3 p-4 sm:grid-cols-2">
            <label className={campo}>Valor (R$)<input className="input tabular mt-1" inputMode="decimal" placeholder="0,00" value={f.valor} onChange={(e) => set("valor", e.target.value)} required /></label>
            <label className={campo}>Custo (freela, ferramenta) — opcional<input className="input tabular mt-1" inputMode="decimal" placeholder="0,00" value={f.custo} onChange={(e) => set("custo", e.target.value)} /></label>
            <label className={campo}>Como vai receber
              <select className="input mt-1" value={f.pagamento} onChange={(e) => set("pagamento", e.target.value)}>
                {Object.entries(PAGAMENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            {f.pagamento === "parcelado" ? (
              <label className={campo}>Número de parcelas
                <input type="number" min={2} max={24} className="input mt-1" value={f.parcelas} onChange={(e) => set("parcelas", Number(e.target.value))} />
              </label>
            ) : (
              <label className={campo}>Forma
                <select className="input mt-1" value={f.forma_pagamento} onChange={(e) => set("forma_pagamento", e.target.value)}>
                  {FORMAS.map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
            )}
            {f.status !== "orcamento" && f.status !== "cancelado" && previa.length > 0 && !servico && (
              <div className="rounded-2xl bg-azul-claro p-3 text-sm sm:col-span-2">
                <p className="font-semibold text-azul-escuro">Vai entrar no Financeiro:</p>
                <ul className="tabular mt-1 space-y-0.5 text-ink">
                  {previa.map((p) => <li key={p.parcela}>{dataBR(p.data)} · {brl(p.valor)}</li>)}
                  {numero(f.custo) > 0 && <li className="text-ink-2">Saída: custo de {brl(numero(f.custo))} na entrega</li>}
                </ul>
              </div>
            )}
            {f.status === "orcamento" && <p className="text-xs text-ink-2 sm:col-span-2">Orçamento ainda não entra no Financeiro. Quando fechar, mude o status para “Em andamento”.</p>}
          </section>

          {servico && parcelas.length > 0 && (
            <section className="card p-4">
              <p className="mb-2 text-sm font-bold">Recebimentos no Financeiro</p>
              <ul className="space-y-1.5">
                {parcelas.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-[#1f3fd1]" checked={p.pago} onChange={() => alternarParcela(p)} aria-label="Recebido" />
                    <span className="tabular">{dataBR(p.data)}</span>
                    <span className="tabular ml-auto font-semibold">{brl(p.valor)}</span>
                    <span className={`chip ${p.pago ? "bg-azul text-white" : p.data < hoje ? "bg-[#fdecea] text-[#a1261f]" : "bg-white text-ink-2"}`}>
                      {p.pago ? "Recebido" : p.data < hoje ? "Atrasado" : "A receber"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink-3">Marque quando receber. Ao mudar valor ou forma de pagamento, só as parcelas não recebidas são recalculadas.</p>
            </section>
          )}

          <label className={`${campo} card block p-4`}>Observações
            <textarea className="input mt-1 min-h-[90px]" value={f.observacoes} onChange={(e) => set("observacoes", e.target.value)} placeholder="Escopo, combinados, acessos, revisões incluídas..." />
          </label>
          {f.link && /^https?:\/\//.test(f.link) && (
            <a href={f.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-azul">Abrir link <ExternalLink size={13} /></a>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-black/5 bg-white px-6 py-4">
          {servico && (
            <button type="button" onClick={excluir} className="btn-ghost text-[#b42318]"><Trash2 size={15} /> Excluir</button>
          )}
          <button type="button" onClick={onFechar} className="btn-ghost ml-auto">Cancelar</button>
          <button className="btn-primary" disabled={salvando}>{salvando ? "Salvando..." : servico ? "Salvar" : "Cadastrar serviço"}</button>
        </footer>
      </form>
    </div>
  );
}
