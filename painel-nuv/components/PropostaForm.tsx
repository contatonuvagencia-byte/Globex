"use client";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { brl } from "@/lib/format";

export type Item = { descricao: string; valor: number; recorrente: boolean };
export type PropostaUI = {
  id: string;
  lead_id: string | null;
  cliente: string;
  titulo: string;
  apresentacao: string | null;
  itens: Item[];
  condicoes: string | null;
  validade: string | null;
  status: "rascunho" | "enviada" | "vista" | "aceita" | "recusada";
  token_publico: string | null;
  visualizacoes: number;
  visto_em: string | null;
  enviada_em: string | null;
  respondido_em: string | null;
  respondido_por: string | null;
  resposta_obs: string | null;
  created_at: string;
};
type LeadMin = { id: string; name: string; status: string };

const PRONTOS: Item[] = [
  { descricao: "Gestão de redes sociais (planejamento, criação e publicação)", valor: 0, recorrente: true },
  { descricao: "Tráfego pago (gestão de anúncios)", valor: 0, recorrente: true },
  { descricao: "Landing page", valor: 0, recorrente: false },
  { descricao: "Identidade visual", valor: 0, recorrente: false },
  { descricao: "Produção de vídeos", valor: 0, recorrente: false },
];

const APRESENTACAO =
  "Olá! Preparamos esta proposta a partir do que conversamos. A ideia é organizar a presença digital de vocês com estratégia, constância e conteúdo que conversa com o público certo.";
const CONDICOES = "Contrato mínimo de 6 meses. Pagamento mensal via Pix ou boleto, com vencimento no dia 10. Início em até 7 dias após o aceite.";

function maisDias(n: number) {
  const d = new Date(Date.now() + n * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

export function PropostaForm({ proposta, leads, leadInicial, onFechar, onSalva }: {
  proposta: PropostaUI | null;
  leads: LeadMin[];
  leadInicial?: string | null;
  onFechar: () => void;
  onSalva: (id: string) => void;
}) {
  const lead0 = leads.find((l) => l.id === (proposta?.lead_id ?? leadInicial));
  const [f, setF] = useState({
    lead_id: proposta?.lead_id ?? lead0?.id ?? null,
    cliente: proposta?.cliente ?? lead0?.name ?? "",
    titulo: proposta?.titulo ?? "Proposta de gestão de redes sociais",
    apresentacao: proposta?.apresentacao ?? APRESENTACAO,
    condicoes: proposta?.condicoes ?? CONDICOES,
    validade: proposta?.validade ?? maisDias(15),
  });
  const [itens, setItens] = useState<(Omit<Item, "valor"> & { valor: string })[]>(
    (proposta?.itens ?? [PRONTOS[0]]).map((i) => ({ ...i, valor: i.valor ? String(i.valor).replace(".", ",") : "" })),
  );
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const num = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;
  const mensal = itens.filter((i) => i.recorrente).reduce((t, i) => t + num(i.valor), 0);
  const unico = itens.filter((i) => !i.recorrente).reduce((t, i) => t + num(i.valor), 0);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    const dados = { ...f, validade: f.validade || null, itens: itens.filter((i) => i.descricao.trim()).map((i) => ({ ...i, valor: num(i.valor) })) };
    const r = await fetch("/api/propostas", { method: "POST", body: JSON.stringify(proposta ? { acao: "atualizar", id: proposta.id, dados } : { acao: "criar", dados }) });
    const j = await r.json();
    setSalvando(false);
    if (!r.ok) return setErro(j.erro ?? "Erro ao salvar");
    onSalva(j.id);
  }

  const campo = "block text-xs font-semibold text-ink-2";
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onFechar}>
      <form onSubmit={salvar} onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-2xl flex-col bg-creme shadow-xl" role="dialog" aria-modal="true">
        <header className="flex items-center gap-3 bg-ink px-6 py-5 text-white">
          <div className="flex-1">
            <p className="text-xs font-semibold text-white/60">{proposta ? "Editar proposta" : "Nova proposta"}</p>
            <h2 className="text-xl font-bold">{f.cliente || "Para quem?"}</h2>
          </div>
          <button type="button" onClick={onFechar} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Fechar"><X size={16} /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {erro && <p className="rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#a1261f]">{erro}</p>}
          <section className="card grid gap-3 p-4 sm:grid-cols-2">
            <label className={campo}>Lead
              <select
                className="input mt-1"
                value={f.lead_id ?? ""}
                onChange={(e) => {
                  const l = leads.find((x) => x.id === e.target.value);
                  setF({ ...f, lead_id: l?.id ?? null, cliente: l?.name ?? f.cliente });
                }}
              >
                <option value="">Sem lead (cliente avulso)</option>
                {leads.filter((l) => l.status !== "perdido").map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            <label className={campo}>Nome do cliente<input className="input mt-1" required value={f.cliente} onChange={(e) => setF({ ...f, cliente: e.target.value })} /></label>
            <label className={`${campo} sm:col-span-2`}>Título<input className="input mt-1" required value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></label>
            <label className={`${campo} sm:col-span-2`}>Apresentação<textarea className="input mt-1 min-h-[100px]" value={f.apresentacao} onChange={(e) => setF({ ...f, apresentacao: e.target.value })} /></label>
          </section>

          <section className="card space-y-2 p-4">
            <p className="text-sm font-bold">Itens e valores</p>
            {itens.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_110px_auto_auto] items-center gap-2">
                <input className="input py-1.5 text-sm" placeholder="O que está incluso" value={it.descricao} onChange={(e) => setItens(itens.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)))} />
                <input className="input tabular py-1.5 text-sm" inputMode="decimal" placeholder="R$" value={it.valor} onChange={(e) => setItens(itens.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))} />
                <label className="flex items-center gap-1 text-xs font-semibold text-ink-2">
                  <input type="checkbox" className="accent-[#1f3fd1]" checked={it.recorrente} onChange={(e) => setItens(itens.map((x, j) => (j === i ? { ...x, recorrente: e.target.checked } : x)))} /> mensal
                </label>
                <button type="button" className="text-ink-3 hover:text-ink" onClick={() => setItens(itens.filter((_, j) => j !== i))} aria-label="Tirar item"><Trash2 size={15} /></button>
              </div>
            ))}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button type="button" className="chip bg-ink px-3 py-1.5 text-white" onClick={() => setItens([...itens, { descricao: "", valor: "", recorrente: false }])}><Plus size={12} /> Item</button>
              {PRONTOS.filter((p) => !itens.some((i) => i.descricao === p.descricao)).map((p) => (
                <button type="button" key={p.descricao} className="chip bg-surface px-3 py-1.5 text-ink-2 hover:text-ink" onClick={() => setItens([...itens, { ...p, valor: "" }])}>
                  + {p.descricao.split(" (")[0]}
                </button>
              ))}
            </div>
            <div className="flex gap-4 border-t border-black/5 pt-3 text-sm">
              {mensal > 0 && <p>Mensal: <b className="tabular">{brl(mensal)}</b></p>}
              {unico > 0 && <p>Único: <b className="tabular">{brl(unico)}</b></p>}
            </div>
          </section>

          <section className="card grid gap-3 p-4 sm:grid-cols-[1fr_180px]">
            <label className={campo}>Condições<textarea className="input mt-1 min-h-[80px]" value={f.condicoes} onChange={(e) => setF({ ...f, condicoes: e.target.value })} /></label>
            <label className={campo}>Válida até<input className="input mt-1" type="date" value={f.validade} onChange={(e) => setF({ ...f, validade: e.target.value })} /></label>
          </section>
        </div>
        <footer className="flex items-center gap-2 border-t border-black/5 bg-white px-6 py-4">
          <button type="button" onClick={onFechar} className="btn-ghost ml-auto">Cancelar</button>
          <button className="btn-primary" disabled={salvando}>{salvando ? "Salvando..." : "Salvar proposta"}</button>
        </footer>
      </form>
    </div>
  );
}
