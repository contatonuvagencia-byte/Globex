"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LeadPainel } from "@/components/LeadPainel";
import { hojeISO } from "@/lib/format";
import { ORDEM_STATUS, ROT_IG, ROT_NICHO, ROT_SITE, ROT_STATUS, type LeadResumo } from "@/lib/leads-rotulos";

const ABERTOS = ["novo", "contatado", "respondeu", "reuniao", "proposta"];

export default function Leads() {
  const [leads, setLeads] = useState<LeadResumo[]>([]);
  const [erro, setErro] = useState("");
  const [visao, setVisao] = useState<"funil" | "lista">("funil");
  const [nicho, setNicho] = useState("");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const hoje = hojeISO();

  const carregar = useCallback(async () => {
    const r = await fetch("/api/leads");
    const j = await r.json();
    if (r.ok) setLeads(j.leads);
    else setErro(j.erro);
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);
  const fechar = useCallback(() => setAberto(null), []);

  const filtrados = useMemo(
    () =>
      leads.filter(
        (l) =>
          (!nicho || l.niche === nicho) &&
          (!busca || `${l.name} ${l.category ?? ""} ${l.neighborhood ?? ""}`.toLowerCase().includes(busca.toLowerCase())),
      ),
    [leads, nicho, busca],
  );

  const followups = leads.filter((l) => l.next_followup_at && l.next_followup_at.slice(0, 10) <= hoje && ABERTOS.includes(l.status));
  const ativos = leads.filter((l) => ABERTOS.includes(l.status)).length;
  const fechados = leads.filter((l) => l.status === "fechado").length;
  const contatados = leads.filter((l) => l.status !== "novo").length;

  async function criar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/leads", {
      method: "POST",
      body: JSON.stringify({
        name: f.get("name"),
        niche: f.get("niche"),
        category: f.get("category") || null,
        city: f.get("city") || null,
        instagram: f.get("instagram") || null,
        whatsapp: f.get("whatsapp") || null,
        diagnosis: f.get("diagnosis") || null,
      }),
    });
    const j = await r.json();
    if (!r.ok) return setErro(j.erro);
    setNovo(false);
    await carregar();
    setAberto(j.id);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-5 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="text-sm text-ink-2">Prospecção</p>
          <h1 className="text-2xl font-semibold">Leads</h1>
        </div>
        <button className="btn-primary" onClick={() => setNovo((v) => !v)}>{novo ? "Cancelar" : "+ Novo lead"}</button>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Em andamento", ativos],
          ["Já contatados", contatados],
          ["Fechados", fechados],
          ["Follow-up hoje", followups.length],
        ].map(([r, v]) => (
          <div key={r} className="card p-4">
            <p className="text-xs font-medium text-ink-2">{r}</p>
            <p className="tabular mt-1 text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </div>

      {erro && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm text-[#a1261f]">{erro}</p>}

      {followups.length > 0 && (
        <section className="mb-4 rounded-2xl border border-[#f5d48a] bg-[#fdf6e3] p-4">
          <h2 className="text-sm font-semibold text-[#8a5a00]">⏰ Follow-ups para hoje</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {followups.map((l) => (
              <button key={l.id} onClick={() => setAberto(l.id)} className="chip bg-white px-3 py-1 text-sm text-ink shadow-[0_0_0_1px_rgba(0,0,0,0.08)] hover:text-nuv">
                {l.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {novo && (
        <form onSubmit={criar} className="card mb-4 grid gap-3 p-4 sm:grid-cols-3">
          <input name="name" className="input" placeholder="Nome da empresa" required />
          <select name="niche" className="input" defaultValue="outro">
            {Object.entries(ROT_NICHO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
          </select>
          <input name="category" className="input" placeholder="Categoria (ex.: clínica odontológica)" />
          <input name="city" className="input" placeholder="Cidade" defaultValue="Belo Horizonte" />
          <input name="instagram" className="input" placeholder="@instagram" />
          <input name="whatsapp" className="input" placeholder="WhatsApp" />
          <textarea name="diagnosis" className="input sm:col-span-2" placeholder="Diagnóstico: o que você viu no digital deles" />
          <button className="btn-primary self-end">Criar lead</button>
        </form>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input w-full sm:w-64" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar lead" />
        <select className="input w-auto" value={nicho} onChange={(e) => setNicho(e.target.value)} aria-label="Nicho">
          <option value="">Todos os nichos</option>
          {Object.entries(ROT_NICHO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
        </select>
        <div className="ml-auto flex rounded-xl border border-black/10 bg-white p-0.5 text-sm">
          {(["funil", "lista"] as const).map((v) => (
            <button key={v} onClick={() => setVisao(v)} className={`rounded-lg px-3 py-1 font-medium ${visao === v ? "bg-ink text-white" : "text-ink-2"}`}>
              {v === "funil" ? "Funil" : "Lista"}
            </button>
          ))}
        </div>
      </div>

      {visao === "funil" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {ORDEM_STATUS.map((s) => {
            const coluna = filtrados.filter((l) => l.status === s);
            return (
              <section key={s} className="w-64 shrink-0">
                <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">
                  {ROT_STATUS[s]} <span className="tabular rounded-full bg-white px-1.5 text-ink">{coluna.length}</span>
                </h2>
                <div className="space-y-2">
                  {coluna.map((l) => (
                    <button key={l.id} onClick={() => setAberto(l.id)} className="card block w-full p-3 text-left transition hover:border-nuv/40">
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-sm font-medium leading-snug">{l.name}</p>
                        <span className="tabular text-xs font-semibold text-nuv" title="Pontuação">{l.score}</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-ink-2">{l.category}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="chip bg-surface-2 text-ink-2">{ROT_NICHO[l.niche]}</span>
                        {l.next_followup_at && ABERTOS.includes(l.status) && (
                          <span className={`chip ${l.next_followup_at.slice(0, 10) <= hoje ? "bg-[#fdf3dc] text-[#8a5a00]" : "bg-surface-2 text-ink-2"}`}>
                            ⏰ {l.next_followup_at.slice(8, 10)}/{l.next_followup_at.slice(5, 7)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface text-left text-xs text-ink-2">
              <tr>
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-3 py-2 font-medium">Nicho</th>
                <th className="px-3 py-2 font-medium">Site</th>
                <th className="px-3 py-2 font-medium">Instagram</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l) => (
                <tr key={l.id} className="cursor-pointer border-t border-black/5 hover:bg-surface" onClick={() => setAberto(l.id)}>
                  <td className="px-4 py-2">
                    <p className="font-medium">{l.name}</p>
                    <p className="text-xs text-ink-3">{[l.category, l.neighborhood].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className="px-3 py-2 text-ink-2">{ROT_NICHO[l.niche]}</td>
                  <td className="px-3 py-2 text-ink-2">{ROT_SITE[l.site_status]}</td>
                  <td className="px-3 py-2 text-ink-2">{ROT_IG[l.ig_status]}</td>
                  <td className="px-3 py-2">{ROT_STATUS[l.status]}</td>
                  <td className="tabular px-4 py-2 text-right font-semibold text-nuv">{l.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aberto && <LeadPainel id={aberto} onClose={fechar} onMudou={carregar} />}
    </div>
  );
}
