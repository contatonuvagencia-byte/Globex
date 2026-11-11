"use client";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export type ClienteFicha = {
  id: string;
  nome: string;
  segmento: string | null;
  contato_nome: string | null;
  contato_whatsapp: string | null;
  contato_email: string | null;
  instagram: string | null;
  site: string | null;
  servicos: string[];
  briefing: string | null;
  observacoes: string | null;
  acessos: string | null;
  ativo: boolean;
  mensalidade: number | null;
  dia_vencimento: number | null;
  contrato_inicio: string | null;
  contrato_meses: number | null;
  contrato: { fim: string | null; dias: number | null; situacao: "sem_contrato" | "ativo" | "vence_logo" | "vencido" };
};

/** Como mostrar a situação do contrato. */
export const SITUACAO: Record<ClienteFicha["contrato"]["situacao"], { r: (d: number | null) => string; cls: string }> = {
  sem_contrato: { r: () => "Sem contrato", cls: "bg-surface-2 text-ink-2" },
  ativo: { r: (d) => `Contrato ativo · ${d} dias`, cls: "bg-azul-claro text-azul-escuro" },
  vence_logo: { r: (d) => (d === 0 ? "Vence hoje" : `Vence em ${d} dia${d === 1 ? "" : "s"}`), cls: "bg-ink text-white" },
  vencido: { r: (d) => `Venceu há ${Math.abs(d ?? 0)} dias`, cls: "bg-[#fdecea] text-[#a1261f]" },
};

export const SERVICOS_NUV = ["Gestão de redes sociais", "Tráfego pago", "Landing page", "Site", "Identidade visual", "Consultoria", "Notion", "Vídeos"];

/** Criar ou editar a ficha de um cliente. */
export function FichaForm({ cliente, podeFinanceiro, onFechar, onSalvo }: {
  cliente: ClienteFicha | null;
  podeFinanceiro: boolean;
  onFechar: () => void;
  onSalvo: (id: string) => void;
}) {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const [f, setF] = useState({
    nome: cliente?.nome ?? "",
    segmento: cliente?.segmento ?? "",
    contato_nome: cliente?.contato_nome ?? "",
    contato_whatsapp: cliente?.contato_whatsapp ?? "",
    contato_email: cliente?.contato_email ?? "",
    instagram: cliente?.instagram ?? "",
    site: cliente?.site ?? "",
    servicos: cliente?.servicos ?? ["Gestão de redes sociais"],
    briefing: cliente?.briefing ?? "",
    observacoes: cliente?.observacoes ?? "",
    acessos: cliente?.acessos ?? "",
    ativo: cliente?.ativo ?? true,
    mensalidade: cliente?.mensalidade != null ? String(cliente.mensalidade).replace(".", ",") : "",
    dia_vencimento: cliente?.dia_vencimento ?? 10,
    contrato_inicio: cliente?.contrato_inicio ?? (cliente ? "" : hoje),
    contrato_meses: cliente?.contrato_meses ?? (cliente ? "" : 6),
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = (k: keyof typeof f, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    const dados: Record<string, unknown> = { ...f };
    if (podeFinanceiro) {
      dados.mensalidade = Number(String(f.mensalidade).replace(/\./g, "").replace(",", ".")) || 0;
      dados.dia_vencimento = Number(f.dia_vencimento) || 10;
      dados.contrato_inicio = f.contrato_inicio || null;
      dados.contrato_meses = f.contrato_meses ? Number(f.contrato_meses) : null;
    } else {
      for (const k of ["mensalidade", "dia_vencimento", "contrato_inicio", "contrato_meses"]) delete dados[k];
    }
    const r = await fetch("/api/clientes", {
      method: "POST",
      body: JSON.stringify(cliente ? { acao: "atualizar", id: cliente.id, dados } : { acao: "criar", dados }),
    });
    const j = await r.json();
    setSalvando(false);
    if (!r.ok) return setErro(j.erro ?? "Erro ao salvar");
    onSalvo(j.id);
  }

  const campo = "block text-xs font-semibold text-ink-2";
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onFechar}>
      <form onSubmit={salvar} onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-xl flex-col bg-creme shadow-xl" role="dialog" aria-modal="true">
        <header className="flex items-center gap-3 bg-ink px-6 py-5 text-white">
          <div className="flex-1">
            <p className="text-xs font-semibold text-white/60">{cliente ? "Editar ficha" : "Novo cliente"}</p>
            <h2 className="text-xl font-bold">{f.nome || "Sem nome"}</h2>
          </div>
          <button type="button" onClick={onFechar} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Fechar"><X size={16} /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {erro && <p className="rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#a1261f]">{erro}</p>}

          <section className="card grid gap-3 p-4 sm:grid-cols-2">
            <label className={campo}>Nome do cliente<input className="input mt-1" value={f.nome} onChange={(e) => set("nome", e.target.value)} required /></label>
            <label className={campo}>Segmento<input className="input mt-1" placeholder="Ex.: sindicato, comex, saúde" value={f.segmento} onChange={(e) => set("segmento", e.target.value)} /></label>
            <label className={campo}>Pessoa de contato<input className="input mt-1" value={f.contato_nome} onChange={(e) => set("contato_nome", e.target.value)} /></label>
            <label className={campo}>WhatsApp<input className="input mt-1" value={f.contato_whatsapp} onChange={(e) => set("contato_whatsapp", e.target.value)} /></label>
            <label className={campo}>E-mail<input className="input mt-1" type="email" value={f.contato_email} onChange={(e) => set("contato_email", e.target.value)} /></label>
            <label className={campo}>Instagram<input className="input mt-1" placeholder="@perfil" value={f.instagram} onChange={(e) => set("instagram", e.target.value)} /></label>
            <label className={`${campo} sm:col-span-2`}>Site<input className="input mt-1" value={f.site} onChange={(e) => set("site", e.target.value)} /></label>
            <div className="sm:col-span-2">
              <span className={campo}>Serviços contratados</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SERVICOS_NUV.map((s) => {
                  const on = f.servicos.includes(s);
                  return (
                    <button type="button" key={s} onClick={() => set("servicos", on ? f.servicos.filter((x) => x !== s) : [...f.servicos, s])} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${on ? "bg-azul text-white" : "bg-surface text-ink-2"}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            {cliente && (
              <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
                <input type="checkbox" className="h-4 w-4 accent-[#1f3fd1]" checked={f.ativo} onChange={(e) => set("ativo", e.target.checked)} />
                Cliente ativo
              </label>
            )}
          </section>

          <section className="card grid gap-3 p-4 sm:grid-cols-2">
            <p className="text-sm font-bold sm:col-span-2">Contrato e mensalidade</p>
            {!podeFinanceiro && <p className="text-xs text-ink-2 sm:col-span-2">Só quem edita o Financeiro muda valores e contrato.</p>}
            <fieldset disabled={!podeFinanceiro} className="contents">
              <label className={campo}>Mensalidade (R$)<input className="input tabular mt-1" inputMode="decimal" value={f.mensalidade} onChange={(e) => set("mensalidade", e.target.value)} /></label>
              <label className={campo}>Vence todo dia<input className="input tabular mt-1" type="number" min={1} max={28} value={f.dia_vencimento} onChange={(e) => set("dia_vencimento", e.target.value)} /></label>
              <label className={campo}>Início do contrato<input className="input mt-1" type="date" value={f.contrato_inicio} onChange={(e) => set("contrato_inicio", e.target.value)} /></label>
              <label className={campo}>Duração
                <select className="input mt-1" value={String(f.contrato_meses)} onChange={(e) => set("contrato_meses", e.target.value)}>
                  <option value="">Sem prazo</option>
                  {[3, 6, 12, 24].map((m) => <option key={m} value={m}>{m} meses</option>)}
                </select>
              </label>
            </fieldset>
          </section>

          <section className="card space-y-3 p-4">
            <label className={campo}>Briefing<textarea className="input mt-1 min-h-[110px]" placeholder="Objetivo, público, tom de voz, pilares, concorrentes..." value={f.briefing} onChange={(e) => set("briefing", e.target.value)} /></label>
            <label className={campo}>Observações<textarea className="input mt-1 min-h-[80px]" value={f.observacoes} onChange={(e) => set("observacoes", e.target.value)} /></label>
            <label className={campo}>
              Acessos e links (Drive, Canva, Meta Business...)
              <textarea className="input mt-1 min-h-[80px] font-mono text-xs" value={f.acessos} onChange={(e) => set("acessos", e.target.value)} />
              <span className="mt-1 block font-normal text-ink-3">Só quem edita fichas vê este campo. Para senhas, prefira um gerenciador de senhas e coloque aqui só o link.</span>
            </label>
          </section>
        </div>
        <footer className="flex items-center gap-2 border-t border-black/5 bg-white px-6 py-4">
          <button type="button" onClick={onFechar} className="btn-ghost ml-auto">Cancelar</button>
          <button className="btn-primary" disabled={salvando}>{salvando ? "Salvando..." : cliente ? "Salvar" : "Criar cliente"}</button>
        </footer>
      </form>
    </div>
  );
}
