import { useState } from "react";
import type { Ctx } from "../App";
import { supabase } from "../lib/supabase";
import { parseCSV } from "../lib/utils";

const FIELDS = [
  "name", "niche", "category", "city", "neighborhood", "address", "phone", "whatsapp", "email",
  "website", "site_status", "instagram", "ig_status", "ig_followers", "google_rating", "google_reviews",
  "maps_url", "size", "units", "diagnosis", "opportunity", "notes", "source",
] as const;

// Aceita cabeçalhos em português também
const ALIASES: Record<string, (typeof FIELDS)[number]> = {
  nome: "name", empresa: "name", nicho: "niche", categoria: "category", cidade: "city", bairro: "neighborhood",
  endereco: "address", "endereço": "address", telefone: "phone", site: "website", nota: "google_rating",
  avaliacoes: "google_reviews", "avaliações": "google_reviews", seguidores: "ig_followers", porte: "size",
  unidades: "units", diagnostico: "diagnosis", "diagnóstico": "diagnosis", oportunidade: "opportunity",
  observacoes: "notes", "observações": "notes", origem: "source",
};

const NUM = new Set(["ig_followers", "google_rating", "google_reviews", "units"]);

const EXAMPLE = `[
  {
    "name": "Clínica Exemplo",
    "niche": "saude",
    "category": "Clínica odontológica",
    "neighborhood": "Savassi",
    "phone": "(31) 3333-3333",
    "website": "",
    "site_status": "sem_site",
    "instagram": "@clinicaexemplo",
    "ig_status": "parado",
    "google_rating": 4.8,
    "google_reviews": 210,
    "size": "medio",
    "diagnosis": "Instagram sem post desde maio. Não tem site.",
    "opportunity": "Gestão de redes + landing page de agendamento."
  }
]`;

function normalize(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k0, v] of Object.entries(row)) {
    const k = k0.trim().toLowerCase();
    const field = (FIELDS as readonly string[]).includes(k) ? k : ALIASES[k];
    if (!field || v === "" || v === null || v === undefined) continue;
    out[field] = NUM.has(field) ? Number(String(v).replace(",", ".")) || null : v;
  }
  return out;
}

export default function ImportView({ ctx }: { ctx: Ctx }) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  async function run() {
    setResult("");
    let rows: Record<string, unknown>[];
    try {
      const t = raw.trim();
      rows = t.startsWith("[") || t.startsWith("{") ? [JSON.parse(t)].flat() : parseCSV(t);
    } catch (e) {
      return ctx.toast(`Não consegui ler: ${(e as Error).message}`, true);
    }
    const leads = rows.map(normalize).filter((r) => r.name);
    if (!leads.length) return ctx.toast("Nenhuma linha com nome encontrada.", true);

    setBusy(true);
    const existing = new Set(ctx.leads.map((l) => `${l.name.toLowerCase()}|${(l.city ?? "").toLowerCase()}`));
    const fresh = leads.filter((l) => {
      const key = `${String(l.name).toLowerCase()}|${String(l.city ?? "Belo Horizonte").toLowerCase()}`;
      if (existing.has(key)) return false;
      existing.add(key);
      return true;
    });
    let ok = 0;
    if (fresh.length) {
      const { data, error } = await supabase.from("leads").insert(fresh).select("id");
      if (error) {
        setBusy(false);
        return ctx.toast(error.message, true);
      }
      ok = data?.length ?? 0;
    }
    setBusy(false);
    setResult(`${ok} leads importados · ${leads.length - fresh.length} duplicados ignorados`);
    setRaw("");
    ctx.reload();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Importar</h2>
          <p>Cole a lista que o Claude pesquisou (JSON) ou uma planilha em CSV. Duplicados são ignorados.</p>
        </div>
      </div>
      <div className="panel">
        <div className="field">
          <label>JSON ou CSV</label>
          <textarea className="input" style={{ minHeight: 280, fontFamily: "ui-monospace, monospace", fontSize: 12 }} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={EXAMPLE} />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
          <button className="btn primary" disabled={busy || !raw.trim()} onClick={run}>{busy ? "Importando…" : "Importar leads"}</button>
          {result && <b>{result}</b>}
        </div>
        <p className="hint">
          Campos aceitos: {FIELDS.map((f) => <code key={f} style={{ marginRight: 4 }}>{f}</code>)}
          <br />
          Valores: <code>niche</code> = saude | b2b | institucional | outro · <code>ig_status</code> = inexistente | parado | fraco | ativo ·{" "}
          <code>site_status</code> = sem_site | fraco | bom · <code>size</code> = pequeno | medio | grande. A nota é calculada sozinha.
        </p>
      </div>
    </>
  );
}
