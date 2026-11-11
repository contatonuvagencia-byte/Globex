"use client";
import { ArrowLeft, AtSign, Globe, Mail, MessageCircle, Pencil, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FichaForm, SITUACAO, type ClienteFicha } from "@/components/FichaForm";
import { StatusBadge } from "@/components/StatusBadge";
import { brl, dataBR } from "@/lib/format";
import { linkWhatsapp } from "@/lib/leads-rotulos";
import { TIPOS } from "@/lib/servicos-plano";
import type { Post } from "@/lib/types";

type Ficha = {
  cliente: ClienteFicha;
  posts: { lista: Post[]; calendarios: { id: string; nome: string }[] } | null;
  demandas: { id: string; titulo: string; data: string | null; prioridade: string | null; responsavel: string | null; url: string }[] | null;
  relatorios: { id: string; rede: string; periodo_atual: string; created_at: string; token_publico: string | null }[] | null;
  financeiro: { lancamentos: { id: string; tipo: string; descricao: string; valor: number; data: string; pago: boolean; atrasado: boolean }[]; recebidoAno: number; emAtraso: number } | null;
  servicos: { id: string; tipo: keyof typeof TIPOS; titulo: string | null; valor: number; status: string; prazo: string | null }[] | null;
  lead: { id: string; name: string; created_at: string } | null;
  podeEditar: boolean;
  podeEditarFinanceiro: boolean;
  hoje: string;
};

function Bloco({ titulo, acao, children }: { titulo: string; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-bold">{titulo}</h2>
        <div className="ml-auto">{acao}</div>
      </div>
      {children}
    </section>
  );
}

function Vazio({ t }: { t: string }) {
  return <p className="text-sm text-ink-3">{t}</p>;
}

export default function FichaCliente() {
  const { id } = useParams<{ id: string }>();
  const [f, setF] = useState<Ficha | null>(null);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    const r = await fetch(`/api/clientes/${id}`);
    const j = await r.json();
    if (!r.ok) return setErro(j.erro ?? "Erro ao abrir a ficha");
    setF(j);
  }, [id]);
  useEffect(() => {
    carregar();
  }, [carregar]);

  async function renovar(meses: number) {
    if (!confirm(`Renovar o contrato por mais ${meses} meses?`)) return;
    const r = await fetch("/api/clientes", { method: "POST", body: JSON.stringify({ acao: "renovar", id, meses }) });
    const j = await r.json();
    if (!r.ok) return setErro(j.erro ?? "Erro");
    setAviso(`Contrato renovado por ${meses} meses.`);
    carregar();
  }

  if (erro && !f) return <p className="mx-auto max-w-3xl rounded-2xl bg-[#fdecea] p-4 text-sm text-[#a1261f]">{erro}</p>;
  if (!f) return <p className="text-sm text-ink-2">Carregando a ficha...</p>;
  const c = f.cliente;
  const sit = SITUACAO[c.contrato.situacao];
  const wa = linkWhatsapp(c.contato_whatsapp, "");
  const posts = f.posts?.lista ?? [];

  return (
    <div className="mx-auto max-w-[1200px]">
      <Link href="/clientes" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-ink"><ArrowLeft size={14} /> Clientes</Link>

      <header className="mb-5 flex flex-wrap items-start gap-4 rounded-[28px] bg-ink p-6 text-white">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-azul text-xl font-extrabold">{c.nome.slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white/60">{c.segmento ?? "Cliente"}{!c.ativo && " · ex-cliente"}</p>
          <h1 className="text-3xl font-bold tracking-tight">{c.nome}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`chip ${c.contrato.situacao === "vence_logo" ? "bg-white text-ink" : sit.cls}`}>{sit.r(c.contrato.dias)}</span>
            {c.servicos.map((s) => <span key={s} className="chip bg-white/10 text-white">{s}</span>)}
          </div>
        </div>
        {f.podeEditar && (
          <button className="btn bg-white text-ink hover:bg-white/90" onClick={() => setEditando(true)}><Pencil size={14} /> Editar ficha</button>
        )}
      </header>

      {aviso && <p className="mb-4 rounded-2xl bg-azul-claro px-4 py-3 text-sm font-semibold text-azul-escuro">{aviso}</p>}
      {erro && <p className="mb-4 rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#a1261f]">{erro}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* coluna 1 */}
        <div className="space-y-4">
          <Bloco titulo="Contato">
            {c.contato_nome && <p className="mb-2 font-semibold">{c.contato_nome}</p>}
            <ul className="space-y-1.5 text-sm">
              {c.contato_whatsapp && (
                <li className="flex items-center gap-2"><MessageCircle size={14} className="text-ink-3" />
                  {wa ? <a className="font-semibold text-azul hover:underline" href={wa} target="_blank" rel="noreferrer">{c.contato_whatsapp}</a> : c.contato_whatsapp}
                </li>
              )}
              {c.contato_email && <li className="flex items-center gap-2"><Mail size={14} className="text-ink-3" /><a className="hover:underline" href={`mailto:${c.contato_email}`}>{c.contato_email}</a></li>}
              {c.instagram && (
                <li className="flex items-center gap-2"><AtSign size={14} className="text-ink-3" />
                  <a className="hover:underline" target="_blank" rel="noreferrer" href={c.instagram.startsWith("http") ? c.instagram : `https://instagram.com/${c.instagram.replace("@", "")}`}>{c.instagram}</a>
                </li>
              )}
              {c.site && <li className="flex items-center gap-2"><Globe size={14} className="text-ink-3" /><a className="truncate hover:underline" target="_blank" rel="noreferrer" href={c.site}>{c.site.replace(/^https?:\/\//, "")}</a></li>}
            </ul>
            {!c.contato_nome && !c.contato_whatsapp && !c.contato_email && !c.instagram && !c.site && <Vazio t="Sem contatos cadastrados." />}
            {f.lead && <p className="mt-3 text-xs text-ink-3">Veio dos leads: <Link className="font-semibold text-azul" href="/leads">{f.lead.name}</Link></p>}
          </Bloco>

          {(c.mensalidade !== null || f.financeiro) && (
            <Bloco
              titulo="Contrato e pagamentos"
              acao={f.podeEditarFinanceiro && c.contrato.situacao !== "sem_contrato" && (
                <span className="flex gap-1">
                  <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => renovar(6)}><RefreshCw size={12} /> +6 meses</button>
                  <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => renovar(12)}>+12</button>
                </span>
              )}
            >
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {c.mensalidade !== null && <div><dt className="text-xs text-ink-2">Mensalidade</dt><dd className="tabular text-lg font-bold">{brl(c.mensalidade)}</dd></div>}
                {c.dia_vencimento && <div><dt className="text-xs text-ink-2">Vencimento</dt><dd className="font-semibold">todo dia {c.dia_vencimento}</dd></div>}
                {c.contrato_inicio && <div><dt className="text-xs text-ink-2">Início</dt><dd className="font-semibold">{dataBR(c.contrato_inicio)}</dd></div>}
                {c.contrato.fim && <div><dt className="text-xs text-ink-2">Fim</dt><dd className="font-semibold">{dataBR(c.contrato.fim)}</dd></div>}
                {f.financeiro && <div><dt className="text-xs text-ink-2">Recebido no ano</dt><dd className="tabular font-semibold">{brl(f.financeiro.recebidoAno)}</dd></div>}
                {f.financeiro && f.financeiro.emAtraso > 0 && <div><dt className="text-xs text-[#a1261f]">Em atraso</dt><dd className="tabular font-bold text-[#a1261f]">{brl(f.financeiro.emAtraso)}</dd></div>}
              </dl>
              {c.contrato.situacao === "sem_contrato" && <p className="mt-2 text-xs text-ink-3">Coloque início e duração do contrato em “Editar ficha” para receber o aviso de renovação.</p>}
              {f.financeiro && f.financeiro.lancamentos.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-black/5 pt-3 text-xs">
                  {f.financeiro.lancamentos.filter((l) => l.tipo === "entrada").slice(0, 6).map((l) => (
                    <li key={l.id} className="flex items-center gap-2">
                      <span className="tabular text-ink-2">{dataBR(l.data).slice(0, 5)}</span>
                      <span className="truncate">{l.descricao}</span>
                      <span className="tabular ml-auto font-semibold">{brl(l.valor)}</span>
                      <span className={`chip whitespace-nowrap ${l.pago ? "bg-azul text-white" : l.atrasado ? "bg-[#fdecea] text-[#a1261f]" : "bg-surface-2 text-ink-2"}`}>{l.pago ? "pago" : l.atrasado ? "atrasado" : "a receber"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Bloco>
          )}
        </div>

        {/* coluna 2 */}
        <div className="space-y-4">
          {f.posts && (
            <Bloco titulo="Conteúdo deste mês" acao={<Link href="/calendario" className="text-xs font-semibold text-azul">calendário →</Link>}>
              {f.posts.calendarios.length === 0 ? (
                <Vazio t="Nenhum calendário do Notion ligado a este cliente. O nome precisa ser igual ao do calendário." />
              ) : (
                <>
                  <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                    {([["Posts", posts.length], ["Postados", posts.filter((p) => p.postado).length], ["Faltam", posts.filter((p) => !p.postado).length]] as const).map(([r, v]) => (
                      <div key={r} className="rounded-2xl bg-surface p-2"><p className="tabular text-xl font-bold">{v}</p><p className="text-[11px] text-ink-2">{r}</p></div>
                    ))}
                  </div>
                  <ul className="space-y-1.5">
                    {posts.filter((p) => p.data >= f.hoje || !p.postado).slice(0, 6).map((p) => (
                      <li key={p.id} className="flex items-center gap-2 text-sm">
                        <span className="tabular w-10 shrink-0 text-xs text-ink-2">{dataBR(p.data).slice(0, 5)}</span>
                        <span className="truncate">{p.titulo}</span>
                        <span className="ml-auto shrink-0"><StatusBadge status={p.status} /></span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Bloco>
          )}

          {f.demandas && (
            <Bloco titulo={`Demandas abertas (${f.demandas.length})`} acao={<Link href="/demandas" className="text-xs font-semibold text-azul">demandas →</Link>}>
              {f.demandas.length === 0 ? <Vazio t="Nada pendente." /> : (
                <ul className="space-y-1.5">
                  {f.demandas.slice(0, 8).map((d) => (
                    <li key={d.id} className="flex items-center gap-2 text-sm">
                      <span className={`tabular w-10 shrink-0 text-xs ${d.data && d.data < f.hoje ? "font-bold text-[#a1261f]" : "text-ink-2"}`}>{d.data ? dataBR(d.data).slice(0, 5) : "—"}</span>
                      <a href={d.url} target="_blank" rel="noreferrer" className="truncate hover:underline">{d.titulo}</a>
                      {d.responsavel && <span className="ml-auto shrink-0 text-xs text-ink-3">{d.responsavel.split(" ")[0]}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Bloco>
          )}

          {f.servicos && f.servicos.length > 0 && (
            <Bloco titulo="Serviços freela" acao={<Link href="/servicos" className="text-xs font-semibold text-azul">serviços →</Link>}>
              <ul className="space-y-1.5 text-sm">
                {f.servicos.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <span className="chip bg-azul-claro text-azul-escuro">{TIPOS[s.tipo]}</span>
                    <span className="truncate">{s.titulo ?? ""}</span>
                    <span className="tabular ml-auto font-semibold">{brl(s.valor)}</span>
                  </li>
                ))}
              </ul>
            </Bloco>
          )}
        </div>

        {/* coluna 3 */}
        <div className="space-y-4">
          {f.relatorios && (
            <Bloco titulo="Relatórios de métricas" acao={<Link href="/metricas" className="text-xs font-semibold text-azul">métricas →</Link>}>
              {f.relatorios.length === 0 ? <Vazio t="Nenhum relatório salvo ainda." /> : (
                <ul className="space-y-1.5 text-sm">
                  {f.relatorios.map((r) => (
                    <li key={r.id} className="flex items-center gap-2">
                      <span className="font-semibold">{r.periodo_atual}</span>
                      <span className="text-xs text-ink-2">{r.rede}</span>
                      {r.token_publico && <a className="ml-auto text-xs font-semibold text-azul" href={`/r/${r.token_publico}`} target="_blank" rel="noreferrer">link do cliente ↗</a>}
                    </li>
                  ))}
                </ul>
              )}
            </Bloco>
          )}

          <Bloco titulo="Briefing">
            {c.briefing ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.briefing}</p> : <Vazio t="Sem briefing. Use “Editar ficha” para preencher objetivo, público e tom de voz." />}
          </Bloco>
          {c.observacoes && <Bloco titulo="Observações"><p className="whitespace-pre-wrap text-sm leading-relaxed">{c.observacoes}</p></Bloco>}
          {c.acessos && <Bloco titulo="Acessos e links"><p className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{c.acessos}</p></Bloco>}
        </div>
      </div>

      {editando && (
        <FichaForm
          cliente={c}
          podeFinanceiro={f.podeEditarFinanceiro}
          onFechar={() => setEditando(false)}
          onSalvo={() => {
            setEditando(false);
            setAviso("Ficha salva.");
            carregar();
          }}
        />
      )}
    </div>
  );
}
