import { useEffect, useMemo, useState } from "react";
import type { Ctx } from "../App";
import type { Channel, Interaction, Lead, Status } from "../lib/types";
import { IG_LABEL, NICHES, SITE_LABEL, SIZE_LABEL, STATUSES } from "../lib/types";
import { supabase } from "../lib/supabase";
import { addDays, fillTemplate, fmtDate, igHandle, relDays, waNumber } from "../lib/utils";
import { Score } from "./Pipeline";

const CHANNELS: { key: Channel; label: string }[] = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram", label: "Direct" },
  { key: "email", label: "E-mail" },
];

const TL_LABEL: Record<Interaction["type"], string> = {
  whatsapp: "WhatsApp enviado",
  instagram: "Direct enviado",
  email: "E-mail enviado",
  ligacao: "Ligação",
  reuniao: "Reunião",
  nota: "Nota",
  status: "Etapa",
};

export default function LeadDrawer({ ctx, lead, onClose }: { ctx: Ctx; lead: Lead; onClose: () => void }) {
  const [history, setHistory] = useState<Interaction[]>([]);
  const [channel, setChannel] = useState<Channel>(lead.whatsapp || lead.phone ? "whatsapp" : lead.instagram ? "instagram" : "email");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState(lead.message ?? "");
  const [tplId, setTplId] = useState("");
  const [instruction, setInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState<"nota" | "ligacao" | "reuniao">("nota");
  const [form, setForm] = useState<Lead>(lead);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setForm(lead);
  }, [lead, dirty]);

  async function loadHistory() {
    const { data } = await supabase.from("interactions").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false });
    setHistory((data as Interaction[]) ?? []);
  }
  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id, lead.status]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tpls = useMemo(
    () =>
      ctx.templates.filter(
        (t) => (t.channel === channel || t.channel === "followup") && (!t.niche || t.niche === lead.niche),
      ),
    [ctx.templates, channel, lead.niche],
  );

  // Enquanto a mensagem não foi editada à mão, sugere o modelo do nicho para o canal escolhido
  const [auto, setAuto] = useState(!lead.message);
  useEffect(() => {
    if (!auto) return;
    const kind = lead.status === "novo" ? channel : "followup";
    const first =
      ctx.templates.find((t) => t.channel === kind && t.niche === lead.niche) ??
      ctx.templates.find((t) => t.channel === kind && !t.niche);
    if (first) applyTemplate(first.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, ctx.templates.length]);

  function applyTemplate(id: string) {
    setTplId(id);
    const t = ctx.templates.find((x) => x.id === id);
    if (!t) return;
    const f = fillTemplate(t, lead);
    setText(f.body);
    if (f.subject) setSubject(f.subject);
  }

  async function aiGenerate() {
    setAiLoading(true);
    const { data, error } = await supabase.functions.invoke("gerar-mensagem", {
      body: { leadId: lead.id, channel, draft: text, instruction },
    });
    setAiLoading(false);
    if (error || data?.error) {
      let msg = data?.error ?? error?.message ?? "Erro";
      try {
        const body = await (error as { context?: Response })?.context?.json?.();
        if (body?.error) msg = body.error;
      } catch { /* ignore */ }
      return ctx.toast(msg, true);
    }
    let out: string = data.message;
    const m = out.match(/^Assunto:\s*(.+)\n+/i);
    if (m) {
      setSubject(m[1].trim());
      out = out.slice(m[0].length);
    }
    setText(out.trim());
    setAuto(false);
    ctx.toast("Mensagem gerada. Revise antes de enviar.");
  }

  async function copy() {
    await navigator.clipboard.writeText(text);
    ctx.toast("Mensagem copiada");
  }

  async function openChannel() {
    if (channel === "whatsapp") {
      const n = waNumber(lead.whatsapp || lead.phone);
      if (!n) return ctx.toast("Lead sem telefone/WhatsApp cadastrado.", true);
      window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`, "_blank");
    } else if (channel === "instagram") {
      const h = igHandle(lead.instagram);
      await navigator.clipboard.writeText(text);
      if (!h) return ctx.toast("Mensagem copiada, mas o lead não tem Instagram cadastrado.", true);
      window.open(`https://instagram.com/${h}`, "_blank");
      ctx.toast("Mensagem copiada. Cole no Direct.");
    } else {
      if (!lead.email) return ctx.toast("Lead sem e-mail cadastrado.", true);
      window.open(`mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`, "_blank");
    }
  }

  async function markSent() {
    const content = channel === "email" && subject ? `Assunto: ${subject}\n\n${text}` : text;
    await supabase.from("interactions").insert({ lead_id: lead.id, type: channel, content });
    const now = new Date().toISOString();
    if (lead.status === "novo") {
      await ctx.updateLead(lead.id, { message: text, last_contact_at: now });
      await ctx.changeStatus({ ...lead, message: text, last_contact_at: now }, "contatado");
    } else {
      // Follow-up enviado: reagenda o próximo toque
      await ctx.updateLead(lead.id, {
        message: text,
        last_contact_at: now,
        next_followup_at: ["fechado", "perdido"].includes(lead.status) ? null : addDays(4),
      });
      ctx.toast("Contato registrado. Próximo follow-up em 4 dias.");
    }
    loadHistory();
  }

  async function setStage(s: Status) {
    let reason: string | undefined;
    if (s === "perdido") {
      reason = window.prompt("Motivo da perda (opcional):") ?? undefined;
      if (reason) await ctx.updateLead(lead.id, { lost_reason: reason });
    }
    await ctx.changeStatus(lead, s, reason ? `Motivo: ${reason}` : undefined);
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    await supabase.from("interactions").insert({ lead_id: lead.id, type: noteType, content: note.trim() });
    if (noteType !== "nota") await ctx.updateLead(lead.id, { last_contact_at: new Date().toISOString() });
    setNote("");
    loadHistory();
  }

  function set<K extends keyof Lead>(k: K, v: Lead[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  }

  async function save() {
    const { id, created_at, updated_at, score, ...rest } = form;
    void id; void created_at; void updated_at; void score;
    const clean = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v === "" ? null : v])) as Partial<Lead>;
    if (await ctx.updateLead(lead.id, clean)) {
      setDirty(false);
      ctx.toast("Lead salvo");
    }
  }

  async function remove() {
    if (!window.confirm(`Excluir ${lead.name}? Isso apaga também o histórico.`)) return;
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    if (error) return ctx.toast(error.message, true);
    onClose();
    ctx.reload();
  }

  const fu = relDays(lead.next_followup_at);
  const ig = igHandle(lead.instagram);
  const txt = (k: keyof Lead) => ({
    value: (form[k] as string | number | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(k, (e.target.value === "" ? null : e.target.value) as never),
  });
  const num = (k: keyof Lead) => ({
    value: (form[k] as number | null) ?? "",
    type: "number",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, (e.target.value === "" ? null : Number(e.target.value)) as never),
  });

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div className="row">
            <div>
              <h2>{lead.name}</h2>
              <div className="meta">
                {lead.category || NICHES[lead.niche]} · {[lead.neighborhood, lead.city].filter(Boolean).join(", ")}
              </div>
              <div className="links">
                {lead.maps_url && <a href={lead.maps_url} target="_blank" rel="noreferrer">Google Maps ↗</a>}
                {lead.website && <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer">Site ↗</a>}
                {ig && <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer">@{ig} ↗</a>}
                {lead.phone && <a href={`tel:${lead.phone}`}>{lead.phone}</a>}
                {lead.email && <a href={`mailto:${lead.email}`}>{lead.email}</a>}
              </div>
            </div>
            <button className="close" onClick={onClose} aria-label="Fechar">×</button>
          </div>
          <div className="stages">
            {STATUSES.map((s) => (
              <button key={s.key} className={`${lead.status === s.key ? "on" : ""} ${s.key === "perdido" ? "lost" : ""}`} onClick={() => setStage(s.key)}>
                {s.label.replace(/s$/, "")}
              </button>
            ))}
          </div>
        </div>

        <div className="drawer-body">
          <section className="panel">
            <h3>
              Diagnóstico
              <small>
                {fu && !["fechado", "perdido"].includes(lead.status) ? `Follow-up ${fmtDate(lead.next_followup_at)} (${fu.label})` : ""}
                {lead.last_contact_at ? ` · Último contato ${fmtDate(lead.last_contact_at)}` : ""}
              </small>
            </h3>
            <div className="signals" style={{ marginBottom: 14 }}>
              <div className="signal"><span>Nota</span><strong><Score value={lead.score} /></strong></div>
              <div className="signal"><span>Instagram</span><strong>{IG_LABEL[lead.ig_status]}{lead.ig_followers ? ` · ${lead.ig_followers.toLocaleString("pt-BR")}` : ""}</strong></div>
              <div className="signal"><span>Site</span><strong>{SITE_LABEL[lead.site_status]}</strong></div>
              <div className="signal"><span>Porte</span><strong>{SIZE_LABEL[lead.size]}{lead.units && lead.units > 1 ? ` · ${lead.units} un.` : ""}</strong></div>
            </div>
            <div className="grid2">
              <div className="field">
                <label>O que vimos (diagnóstico)</label>
                <textarea className="input" {...txt("diagnosis")} placeholder="Ex.: Instagram sem post desde março, sem site, 300+ avaliações no Google." />
              </div>
              <div className="field">
                <label>O que a NUV pode fazer</label>
                <textarea className="input" {...txt("opportunity")} placeholder="Ex.: Gestão de redes com foco em prova social + landing page de agendamento." />
              </div>
            </div>
            {dirty && <div style={{ marginTop: 10 }}><button className="btn dark small" onClick={save}>Salvar alterações</button></div>}
          </section>

          <section className="panel composer">
            <h3>Mensagem <small>Modelo + IA no tom da NUV</small></h3>
            <div className="tabs">
              {CHANNELS.map((c) => (
                <button key={c.key} className={channel === c.key ? "on" : ""} onClick={() => setChannel(c.key)}>{c.label}</button>
              ))}
              <select className="input" style={{ width: "auto", marginLeft: "auto" }} value={tplId} onChange={(e) => applyTemplate(e.target.value)}>
                <option value="">Usar modelo…</option>
                {tpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            {channel === "email" && (
              <div className="field" style={{ marginBottom: 10 }}>
                <label>Assunto</label>
                <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
            )}
            <textarea className="input" value={text} onChange={(e) => { setText(e.target.value); setAuto(false); }} placeholder="Escolha um modelo ou gere com IA." />
            <div className="ai-row">
              <input className="input" value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Pedido para a IA (opcional): mais curta, citar o SINAIT, focar em landing page…" />
              <button className="btn primary" onClick={aiGenerate} disabled={aiLoading}>
                {aiLoading ? "Gerando…" : text.trim() ? "Refinar com IA" : "Gerar com IA"}
              </button>
            </div>
            <div className="actions">
              <button className="btn wa" onClick={openChannel} disabled={!text.trim()}>
                {channel === "whatsapp" ? "Abrir no WhatsApp" : channel === "instagram" ? "Copiar e abrir Instagram" : "Abrir no e-mail"}
              </button>
              <button className="btn" onClick={copy} disabled={!text.trim()}>Copiar</button>
              <button className="btn primary" onClick={markSent} disabled={!text.trim()} style={{ marginLeft: "auto" }}>
                ✓ Marcar como enviado
              </button>
            </div>
            <p className="hint">
              “Marcar como enviado” registra no histórico{lead.status === "novo" ? ", move o lead para Contatados e agenda follow-up em 3 dias" : " e agenda o próximo follow-up em 4 dias"}.
            </p>
          </section>

          <section className="panel">
            <h3>Histórico</h3>
            <form onSubmit={addNote} style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <select className="input" style={{ width: "auto" }} value={noteType} onChange={(e) => setNoteType(e.target.value as typeof noteType)}>
                <option value="nota">Nota</option>
                <option value="ligacao">Ligação</option>
                <option value="reuniao">Reunião</option>
              </select>
              <input className="input" style={{ flex: 1, minWidth: 180 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: Respondeu pedindo valores, falar com o sócio na sexta." />
              <button className="btn dark" type="submit">Adicionar</button>
            </form>
            <div className="timeline">
              {history.length === 0 && <p className="muted">Nenhum contato registrado ainda.</p>}
              {history.map((h) => (
                <div key={h.id} className={`tl-item ${h.type}`}>
                  <div className="tl-dot" />
                  <div>
                    <b>{TL_LABEL[h.type]}</b>
                    <time>{fmtDate(h.created_at, true)}</time>
                    {h.content && <p>{h.content}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h3>Dados do lead {dirty && <button className="btn dark small" onClick={save}>Salvar alterações</button>}</h3>
            <div className="grid3">
              <div className="field"><label>Nome</label><input className="input" {...txt("name")} /></div>
              <div className="field">
                <label>Nicho</label>
                <select className="input" {...txt("niche")}>
                  {Object.entries(NICHES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="field"><label>Categoria</label><input className="input" {...txt("category")} placeholder="Clínica odontológica" /></div>
              <div className="field"><label>Cidade</label><input className="input" {...txt("city")} /></div>
              <div className="field"><label>Bairro</label><input className="input" {...txt("neighborhood")} /></div>
              <div className="field"><label>Endereço</label><input className="input" {...txt("address")} /></div>
              <div className="field"><label>Telefone</label><input className="input" {...txt("phone")} /></div>
              <div className="field"><label>WhatsApp</label><input className="input" {...txt("whatsapp")} placeholder="31 99999-9999" /></div>
              <div className="field"><label>E-mail</label><input className="input" {...txt("email")} /></div>
              <div className="field"><label>Site</label><input className="input" {...txt("website")} /></div>
              <div className="field">
                <label>Status do site</label>
                <select className="input" {...txt("site_status")}>
                  {Object.entries(SITE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="field"><label>Google Maps (link)</label><input className="input" {...txt("maps_url")} /></div>
              <div className="field"><label>Instagram</label><input className="input" {...txt("instagram")} placeholder="@perfil" /></div>
              <div className="field">
                <label>Status do Instagram</label>
                <select className="input" {...txt("ig_status")}>
                  {Object.entries(IG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="field"><label>Seguidores</label><input className="input" {...num("ig_followers")} /></div>
              <div className="field"><label>Nota Google</label><input className="input" step="0.1" {...num("google_rating")} /></div>
              <div className="field"><label>Nº avaliações</label><input className="input" {...num("google_reviews")} /></div>
              <div className="field">
                <label>Porte</label>
                <select className="input" {...txt("size")}>
                  {Object.entries(SIZE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="field"><label>Unidades</label><input className="input" {...num("units")} /></div>
              <div className="field">
                <label>Próximo follow-up</label>
                <input
                  className="input"
                  type="date"
                  value={form.next_followup_at ? form.next_followup_at.slice(0, 10) : ""}
                  onChange={(e) => set("next_followup_at", e.target.value ? new Date(`${e.target.value}T09:00:00`).toISOString() : null)}
                />
              </div>
              <div className="field"><label>Origem</label><input className="input" {...txt("source")} /></div>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Observações</label>
              <textarea className="input" {...txt("notes")} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
              <button className="btn ghost" style={{ color: "var(--danger)" }} onClick={remove}>Excluir lead</button>
              <button className="btn dark" onClick={save} disabled={!dirty}>Salvar alterações</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
