import { useState } from "react";
import type { Ctx } from "../App";
import type { Template } from "../lib/types";
import { NICHES } from "../lib/types";
import { supabase } from "../lib/supabase";

const CH: Record<Template["channel"], string> = { whatsapp: "WhatsApp", instagram: "Direct", email: "E-mail", followup: "Follow-up" };

function Editor({ ctx, t, onDone }: { ctx: Ctx; t: Partial<Template>; onDone: () => void }) {
  const [f, setF] = useState<Partial<Template>>(t);
  async function save() {
    if (!f.name || !f.body || !f.channel) return ctx.toast("Preencha nome, canal e texto.", true);
    const row = { name: f.name, niche: f.niche || null, channel: f.channel, subject: f.subject || null, body: f.body };
    const { error } = f.id ? await supabase.from("templates").update(row).eq("id", f.id) : await supabase.from("templates").insert(row);
    if (error) return ctx.toast(error.message, true);
    ctx.toast("Modelo salvo");
    await ctx.reload();
    onDone();
  }
  async function del() {
    if (!f.id || !window.confirm("Excluir este modelo?")) return;
    await supabase.from("templates").delete().eq("id", f.id);
    await ctx.reload();
    onDone();
  }
  return (
    <div className="panel" style={{ display: "grid", gap: 12 }}>
      <div className="grid3">
        <div className="field"><label>Nome</label><input className="input" value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="field">
          <label>Canal</label>
          <select className="input" value={f.channel ?? "whatsapp"} onChange={(e) => setF({ ...f, channel: e.target.value as Template["channel"] })}>
            {Object.entries(CH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Nicho</label>
          <select className="input" value={f.niche ?? ""} onChange={(e) => setF({ ...f, niche: (e.target.value || null) as Template["niche"] })}>
            <option value="">Todos</option>
            {Object.entries(NICHES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      {f.channel === "email" && (
        <div className="field"><label>Assunto</label><input className="input" value={f.subject ?? ""} onChange={(e) => setF({ ...f, subject: e.target.value })} /></div>
      )}
      <div className="field"><label>Texto</label><textarea className="input" style={{ minHeight: 220 }} value={f.body ?? ""} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn primary" onClick={save}>Salvar</button>
        <button className="btn" onClick={onDone}>Cancelar</button>
        {f.id && <button className="btn ghost" style={{ marginLeft: "auto", color: "var(--danger)" }} onClick={del}>Excluir</button>}
      </div>
    </div>
  );
}

export default function TemplatesView({ ctx }: { ctx: Ctx }) {
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  return (
    <>
      <div className="page-head">
        <div>
          <h2>Mensagens</h2>
          <p>
            Modelos por nicho e canal. Variáveis: <code>{"{empresa}"}</code> <code>{"{categoria}"}</code> <code>{"{bairro}"}</code>{" "}
            <code>{"{diagnostico}"}</code> <code>{"{diagnostico_curto}"}</code> <code>{"{oportunidade}"}</code>
          </p>
        </div>
        <button className="btn primary" onClick={() => setEditing({ channel: "whatsapp" })}>+ Novo modelo</button>
      </div>
      {editing && <div style={{ marginBottom: 16 }}><Editor ctx={ctx} t={editing} onDone={() => setEditing(null)} /></div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Modelo</th><th>Canal</th><th>Nicho</th><th>Prévia</th></tr></thead>
          <tbody>
            {ctx.templates.map((t) => (
              <tr key={t.id} onClick={() => setEditing(t)}>
                <td><strong>{t.name}</strong></td>
                <td>{CH[t.channel]}</td>
                <td>{t.niche ? NICHES[t.niche] : "Todos"}</td>
                <td className="muted" style={{ maxWidth: 420, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.body}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
