"use client";
import { useCallback, useEffect, useState } from "react";
import { pedidoLeadParaClaude } from "@/lib/prompts-leads";
import { ORDEM_STATUS, ROT_IG, ROT_INTERACAO, ROT_NICHO, ROT_PORTE, ROT_SITE, ROT_STATUS, linkWhatsapp, preencherModelo } from "@/lib/leads-rotulos";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Lead = Record<string, any>;
type Interacao = { id: string; created_at: string; type: string; content: string | null };
type Modelo = { id: string; name: string; niche: string | null; channel: string; subject: string | null; body: string };

const CANAIS = [
  { v: "whatsapp", r: "WhatsApp" },
  { v: "instagram", r: "Direct" },
  { v: "email", r: "E-mail" },
];

async function post(id: string, corpo: unknown) {
  const r = await fetch(`/api/leads/${id}`, { method: "POST", body: JSON.stringify(corpo) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.erro ?? "Erro");
  return j;
}

function Campo({ rotulo, valor, onSalvar, tipo = "text", opcoes, area }: {
  rotulo: string; valor: any; onSalvar: (v: any) => void; tipo?: string; opcoes?: Record<string, string>; area?: boolean;
}) {
  const comum = { className: "input py-1.5 text-sm", "aria-label": rotulo };
  return (
    <label className="block">
      <span className="label">{rotulo}</span>
      {opcoes ? (
        <select {...comum} value={valor ?? ""} onChange={(e) => onSalvar(e.target.value)}>
          {Object.entries(opcoes).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
        </select>
      ) : area ? (
        <textarea {...comum} className={`${comum.className} min-h-[72px]`} defaultValue={valor ?? ""} onBlur={(e) => e.target.value !== (valor ?? "") && onSalvar(e.target.value || null)} />
      ) : (
        <input {...comum} type={tipo} defaultValue={valor ?? ""} onBlur={(e) => e.target.value !== String(valor ?? "") && onSalvar(e.target.value === "" ? null : e.target.value)} />
      )}
    </label>
  );
}

export function LeadPainel({ id, onClose, onMudou }: { id: string; onClose: () => void; onMudou: () => void }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState<"mensagem" | "ficha" | "historico">("mensagem");
  const [canal, setCanal] = useState("whatsapp");
  const [texto, setTexto] = useState("");
  const [pedido, setPedido] = useState("");
  const [gerando, setGerando] = useState(false);
  const [nota, setNota] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [iaLigada, setIaLigada] = useState(false);
  const [pedidoCopiado, setPedidoCopiado] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((j) => setIaLigada(Boolean(j.ia)))
      .catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/leads/${id}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro);
      setLead(j.lead);
      setInteracoes(j.interacoes);
      setModelos(j.modelos);
    } catch (e) {
      setErro((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    carregar();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [carregar, onClose]);

  async function executar(corpo: unknown) {
    setErro("");
    try {
      const j = await post(id, corpo);
      await carregar();
      onMudou();
      return j;
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  const salvar = (campo: string) => (valor: any) => {
    setLead((l) => (l ? { ...l, [campo]: valor } : l));
    executar({ acao: "atualizar", dados: { [campo]: valor } });
  };

  async function gerar() {
    setGerando(true);
    setErro("");
    try {
      const j = await post(id, { acao: "gerar_mensagem", canal, rascunho: texto, pedido });
      setTexto(j.mensagem);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setGerando(false);
    }
  }

  const modelosDoCanal = modelos.filter(
    (m) => (m.channel === canal || m.channel === "followup") && (!m.niche || m.niche === lead?.niche),
  );
  const wa = lead ? linkWhatsapp(lead.whatsapp ?? lead.phone, texto) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside className="flex h-full w-full max-w-2xl flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {!lead ? (
          <p className="p-6 text-sm text-ink-2">{erro || "Carregando..."}</p>
        ) : (
          <>
            <header className="border-b border-black/5 p-5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-2">
                    {ROT_NICHO[lead.niche]} · {[lead.category, lead.neighborhood, lead.city].filter(Boolean).join(" · ")}
                  </p>
                  <h2 className="mt-0.5 text-xl font-semibold">{lead.name}</h2>
                </div>
                <span className="tabular rounded-xl bg-nuv-soft px-2.5 py-1 text-sm font-semibold text-nuv" title="Pontuação de oportunidade (0 a 100)">
                  {lead.score}
                </span>
                <button onClick={onClose} className="rounded-lg p-1 text-xl leading-none text-ink-2 hover:bg-surface-2" aria-label="Fechar">×</button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select className="input w-auto py-1 text-sm font-medium" value={lead.status} onChange={(e) => salvar("status")(e.target.value)} aria-label="Status">
                  {ORDEM_STATUS.map((s) => <option key={s} value={s}>{ROT_STATUS[s]}</option>)}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-ink-2">
                  Próximo follow-up
                  <input
                    type="date"
                    className="input w-auto py-1 text-xs"
                    value={lead.next_followup_at ? lead.next_followup_at.slice(0, 10) : ""}
                    onChange={(e) => salvar("next_followup_at")(e.target.value ? new Date(`${e.target.value}T12:00:00-03:00`).toISOString() : null)}
                  />
                </label>
                {lead.instagram && <a className="chip bg-surface-2 text-ink-2 hover:text-nuv" href={lead.instagram.startsWith("http") ? lead.instagram : `https://instagram.com/${lead.instagram.replace("@", "")}`} target="_blank" rel="noreferrer">Instagram ↗</a>}
                {lead.website && <a className="chip bg-surface-2 text-ink-2 hover:text-nuv" href={lead.website} target="_blank" rel="noreferrer">Site ↗</a>}
                {lead.maps_url && <a className="chip bg-surface-2 text-ink-2 hover:text-nuv" href={lead.maps_url} target="_blank" rel="noreferrer">Maps ↗</a>}
              </div>
              <nav className="mt-4 flex gap-1 text-sm">
                {(["mensagem", "ficha", "historico"] as const).map((a) => (
                  <button key={a} onClick={() => setAba(a)} className={`rounded-lg px-3 py-1.5 font-medium ${aba === a ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-2"}`}>
                    {a === "mensagem" ? "Mensagem" : a === "ficha" ? "Ficha" : `Histórico (${interacoes.length})`}
                  </button>
                ))}
              </nav>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {erro && <p className="rounded-xl bg-[#fdecea] p-3 text-sm text-[#a1261f]">{erro}</p>}

              {aba === "mensagem" && (
                <>
                  <div className="rounded-xl bg-surface p-4 text-sm">
                    <p><b>Diagnóstico:</b> {lead.diagnosis ?? "–"}</p>
                    <p className="mt-1"><b>Oportunidade:</b> {lead.opportunity ?? "–"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CANAIS.map((c) => (
                      <button key={c.v} onClick={() => setCanal(c.v)} className={`chip px-3 py-1 text-xs ${canal === c.v ? "bg-nuv text-white" : "bg-white text-ink-2 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"}`}>
                        {c.r}
                      </button>
                    ))}
                  </div>
                  <div>
                    <span className="label">Começar de um modelo</span>
                    <div className="flex flex-wrap gap-1.5">
                      {modelosDoCanal.map((m) => (
                        <button
                          key={m.id}
                          className="chip bg-surface-2 px-2.5 py-1 text-xs text-ink hover:bg-nuv-soft"
                          onClick={() => setTexto(preencherModelo((m.subject ? `Assunto: ${m.subject}\n\n` : "") + m.body, lead))}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea className="input min-h-[200px] text-sm leading-relaxed" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escolha um modelo, escreva, ou peça para a IA escrever." aria-label="Mensagem" />
                  <div className="flex flex-wrap gap-2">
                    <input className="input flex-1 text-sm" placeholder="Pedido extra (opcional): mais curto, citar o case do SINAIT..." value={pedido} onChange={(e) => setPedido(e.target.value)} />
                    {iaLigada ? (
                      <button className="btn-ghost" onClick={gerar} disabled={gerando}>
                        {gerando ? "Escrevendo..." : texto ? "Refinar com IA" : "Escrever com IA"}
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn-ghost"
                          onClick={async () => {
                            await navigator.clipboard.writeText(pedidoLeadParaClaude(lead, canal, texto, pedido));
                            setPedidoCopiado(true);
                            setTimeout(() => setPedidoCopiado(false), 2000);
                          }}
                        >
                          {pedidoCopiado ? "Pedido copiado!" : texto ? "Copiar pedido para refinar no Claude" : "Copiar pedido para o Claude"}
                        </button>
                        <a className="btn-ghost" href="https://claude.ai/new" target="_blank" rel="noreferrer">Abrir o Claude ↗</a>
                      </>
                    )}
                  </div>
                  {!iaLigada && (
                    <p className="text-xs text-ink-3">
                      Grátis: o pedido já leva a ficha do lead e o jeito NUV de escrever. Cole numa conversa do Claude e traga a mensagem de volta para a caixa acima.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 border-t border-black/5 pt-4">
                    <button
                      className="btn-ghost"
                      disabled={!texto}
                      onClick={async () => {
                        await navigator.clipboard.writeText(texto);
                        setCopiado(true);
                        setTimeout(() => setCopiado(false), 1500);
                      }}
                    >
                      {copiado ? "Copiado!" : "Copiar"}
                    </button>
                    {canal === "whatsapp" && wa && texto && (
                      <a className="btn-ghost" href={wa} target="_blank" rel="noreferrer">Abrir no WhatsApp</a>
                    )}
                    <button
                      className="btn-primary ml-auto"
                      disabled={!texto}
                      onClick={async () => {
                        await executar({ acao: "interacao", tipo: canal, conteudo: texto, followupDias: 3 });
                        setTexto("");
                        setAba("historico");
                      }}
                    >
                      Registrar como enviada
                    </button>
                  </div>
                  <p className="text-xs text-ink-3">Ao registrar: o lead vai para “Contatado” (se era novo) e o follow-up é marcado para daqui a 3 dias.</p>
                </>
              )}

              {aba === "ficha" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Campo rotulo="Nome" valor={lead.name} onSalvar={salvar("name")} />
                  <Campo rotulo="Nicho" valor={lead.niche} onSalvar={salvar("niche")} opcoes={ROT_NICHO} />
                  <Campo rotulo="Categoria" valor={lead.category} onSalvar={salvar("category")} />
                  <Campo rotulo="Porte" valor={lead.size} onSalvar={salvar("size")} opcoes={ROT_PORTE} />
                  <Campo rotulo="Cidade" valor={lead.city} onSalvar={salvar("city")} />
                  <Campo rotulo="Bairro" valor={lead.neighborhood} onSalvar={salvar("neighborhood")} />
                  <Campo rotulo="WhatsApp" valor={lead.whatsapp} onSalvar={salvar("whatsapp")} />
                  <Campo rotulo="Telefone" valor={lead.phone} onSalvar={salvar("phone")} />
                  <Campo rotulo="E-mail" valor={lead.email} onSalvar={salvar("email")} />
                  <Campo rotulo="Site" valor={lead.website} onSalvar={salvar("website")} />
                  <Campo rotulo="Situação do site" valor={lead.site_status} onSalvar={salvar("site_status")} opcoes={ROT_SITE} />
                  <Campo rotulo="Instagram" valor={lead.instagram} onSalvar={salvar("instagram")} />
                  <Campo rotulo="Situação do Instagram" valor={lead.ig_status} onSalvar={salvar("ig_status")} opcoes={ROT_IG} />
                  <Campo rotulo="Seguidores" valor={lead.ig_followers} onSalvar={(v) => salvar("ig_followers")(v === null ? null : Number(v))} tipo="number" />
                  <Campo rotulo="Nota no Google" valor={lead.google_rating} onSalvar={(v) => salvar("google_rating")(v === null ? null : Number(String(v).replace(",", ".")))} />
                  <Campo rotulo="Avaliações no Google" valor={lead.google_reviews} onSalvar={(v) => salvar("google_reviews")(v === null ? null : Number(v))} tipo="number" />
                  <div className="sm:col-span-2"><Campo rotulo="Endereço" valor={lead.address} onSalvar={salvar("address")} /></div>
                  <div className="sm:col-span-2"><Campo rotulo="Link do Google Maps" valor={lead.maps_url} onSalvar={salvar("maps_url")} /></div>
                  <div className="sm:col-span-2"><Campo rotulo="Diagnóstico" valor={lead.diagnosis} onSalvar={salvar("diagnosis")} area /></div>
                  <div className="sm:col-span-2"><Campo rotulo="Oportunidade para a NUV" valor={lead.opportunity} onSalvar={salvar("opportunity")} area /></div>
                  <div className="sm:col-span-2"><Campo rotulo="Observações" valor={lead.notes} onSalvar={salvar("notes")} area /></div>
                  {lead.status === "perdido" && <div className="sm:col-span-2"><Campo rotulo="Motivo da perda" valor={lead.lost_reason} onSalvar={salvar("lost_reason")} /></div>}
                  <p className="text-xs text-ink-3 sm:col-span-2">Fonte: {lead.source ?? "–"}. A pontuação é recalculada sozinha quando site, Instagram, porte ou avaliações mudam.</p>
                </div>
              )}

              {aba === "historico" && (
                <>
                  <form
                    className="flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await executar({ acao: "interacao", tipo: "nota", conteudo: nota });
                      setNota("");
                    }}
                  >
                    <input className="input text-sm" placeholder="Adicionar nota (ex.: respondeu pedindo proposta)" value={nota} onChange={(e) => setNota(e.target.value)} required />
                    <button className="btn-ghost">Salvar</button>
                  </form>
                  {interacoes.length === 0 ? (
                    <p className="text-sm text-ink-2">Nenhum contato registrado ainda.</p>
                  ) : (
                    <ol className="space-y-3">
                      {interacoes.map((i) => (
                        <li key={i.id} className="rounded-xl border border-black/5 bg-surface p-3">
                          <div className="flex items-center gap-2 text-xs text-ink-2">
                            <span className="chip bg-white font-medium text-ink">{ROT_INTERACAO[i.type] ?? i.type}</span>
                            {new Date(i.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                            <button className="ml-auto text-ink-3 hover:text-[#b42318]" onClick={() => confirm("Apagar este registro?") && executar({ acao: "excluir_interacao", interacaoId: i.id })}>Apagar</button>
                          </div>
                          {i.content && (
                            <p className="mt-2 whitespace-pre-wrap text-sm">
                              {i.type === "status" ? i.content.split(" → ").map((s) => ROT_STATUS[s] ?? s).join(" → ") : i.content}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
