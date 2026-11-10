import { useMemo, useState } from "react";
import type { Ctx } from "../App";
import type { Lead, Niche, Status } from "../lib/types";
import { IG_LABEL, NICHES, SITE_LABEL, SIZE_LABEL, STATUSES } from "../lib/types";
import { relDays, scoreTone, fmtDate } from "../lib/utils";

type SortKey = "score" | "name" | "updated_at" | "next_followup_at";

export function Score({ value }: { value: number }) {
  return <span className={`score ${scoreTone(value)}`} title="Nota de qualificação (0–100)">{value}</span>;
}

function LeadTags({ lead }: { lead: Lead }) {
  const fu = relDays(lead.next_followup_at);
  return (
    <div className="tags">
      {lead.ig_status !== "desconhecido" && lead.ig_status !== "ativo" && <span className="tag blue">IG {IG_LABEL[lead.ig_status].toLowerCase()}</span>}
      {lead.site_status === "sem_site" && <span className="tag blue">Sem site</span>}
      {(lead.size === "medio" || lead.size === "grande") && <span className="tag dark">{SIZE_LABEL[lead.size]}</span>}
      {fu && !["fechado", "perdido"].includes(lead.status) && (
        <span className={`tag ${fu.overdue ? "red" : fu.today ? "blue" : ""}`}>Follow-up {fu.label}</span>
      )}
    </div>
  );
}

export default function Pipeline({ ctx }: { ctx: Ctx }) {
  const { leads } = ctx;
  const [mode, setMode] = useState<"board" | "list">("board");
  const [q, setQ] = useState("");
  const [niche, setNiche] = useState<Niche | "">("");
  const [minScore, setMinScore] = useState(0);
  const [status, setStatus] = useState<Status | "">("");
  const [sort, setSort] = useState<SortKey>("score");
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const [newName, setNewName] = useState("");
  const [newNiche, setNewNiche] = useState<Niche>("saude");
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = leads.filter(
      (l) =>
        (!niche || l.niche === niche) &&
        (!status || l.status === status) &&
        l.score >= minScore &&
        (!term ||
          [l.name, l.category, l.neighborhood, l.city, l.instagram].some((v) => v?.toLowerCase().includes(term))),
    );
    const dir = sort === "name" || sort === "next_followup_at" ? 1 : -1;
    return [...list].sort((a, b) => {
      const va = a[sort] ?? (sort === "next_followup_at" ? "9999" : "");
      const vb = b[sort] ?? (sort === "next_followup_at" ? "9999" : "");
      return va < vb ? -dir : va > vb ? dir : 0;
    });
  }, [leads, q, niche, minScore, status, sort]);

  const stats = useMemo(() => {
    const count = (s: Status[]) => leads.filter((l) => s.includes(l.status)).length;
    const contacted = leads.filter((l) => l.status !== "novo").length;
    const replied = count(["respondeu", "reuniao", "proposta", "fechado"]);
    return {
      total: leads.length,
      novos: count(["novo"]),
      hot: leads.filter((l) => l.status === "novo" && l.score >= 70).length,
      andamento: count(["respondeu", "reuniao", "proposta"]),
      fechados: count(["fechado"]),
      taxa: contacted ? Math.round((replied / contacted) * 100) : 0,
    };
  }, [leads]);

  async function drop(s: Status) {
    setOver(null);
    const lead = leads.find((l) => l.id === dragId);
    setDragId(null);
    if (lead) await ctx.changeStatus(lead, s);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await ctx.createLead(newName.trim(), newNiche);
    setNewName("");
    setAdding(false);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Pipeline</h2>
          <p>Arraste os cards entre as etapas. Clique para abrir, mandar mensagem e registrar contato.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="seg">
            <button className={mode === "board" ? "on" : ""} onClick={() => setMode("board")}>Quadro</button>
            <button className={mode === "list" ? "on" : ""} onClick={() => setMode("list")}>Lista</button>
          </div>
          <button className="btn primary" onClick={() => setAdding((a) => !a)}>+ Novo lead</button>
        </div>
      </div>

      {adding && (
        <form className="panel" onSubmit={add} style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 2, minWidth: 200 }}>
            <label>Nome da empresa</label>
            <input className="input" autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Clínica Sorriso Savassi" />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label>Nicho</label>
            <select className="input" value={newNiche} onChange={(e) => setNewNiche(e.target.value as Niche)}>
              {Object.entries(NICHES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button className="btn dark" type="submit">Criar e abrir</button>
        </form>
      )}

      <div className="kpis">
        <div className="kpi"><span>Leads</span><strong>{stats.total}</strong></div>
        <div className="kpi"><span>A contatar</span><strong>{stats.novos}</strong></div>
        <div className="kpi accent"><span>Quentes (70+)</span><strong>{stats.hot}</strong></div>
        <div className="kpi"><span>Em negociação</span><strong>{stats.andamento}</strong></div>
        <div className="kpi black"><span>Fechados</span><strong>{stats.fechados}</strong></div>
        <div className="kpi"><span>Taxa de resposta</span><strong>{stats.taxa}%</strong></div>
      </div>

      <div className="toolbar">
        <input className="input search" placeholder="Buscar por nome, categoria, bairro, @…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={niche} onChange={(e) => setNiche(e.target.value as Niche | "")}>
          <option value="">Todos os nichos</option>
          {Object.entries(NICHES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}>
          <option value={0}>Qualquer nota</option>
          <option value={45}>Nota 45+</option>
          <option value={70}>Nota 70+ (quentes)</option>
        </select>
        {mode === "list" && (
          <>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status | "")}>
              <option value="">Todas as etapas</option>
              {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="score">Maior nota</option>
              <option value="next_followup_at">Próximo follow-up</option>
              <option value="updated_at">Atualizados recentemente</option>
              <option value="name">Nome (A–Z)</option>
            </select>
          </>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="empty">
          <h3>Nenhum lead ainda</h3>
          <p>Peça ao Claude para pesquisar leads e importar aqui, ou use <b>Importar</b> para colar uma lista.</p>
        </div>
      ) : mode === "board" ? (
        <div className="board">
          {STATUSES.map((s) => {
            const items = filtered.filter((l) => l.status === s.key);
            return (
              <div
                key={s.key}
                className={`col ${s.key} ${over === s.key ? "drop" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(s.key);
                }}
                onDragLeave={() => setOver((o) => (o === s.key ? null : o))}
                onDrop={() => drop(s.key)}
              >
                <div className="col-head">
                  <h3>{s.label}</h3>
                  <span>{items.length}</span>
                </div>
                {items.map((l) => (
                  <div
                    key={l.id}
                    className="card"
                    draggable
                    onDragStart={() => setDragId(l.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => ctx.open(l.id)}
                  >
                    <div className="card-top">
                      <h4>{l.name}</h4>
                      <Score value={l.score} />
                    </div>
                    <div className="meta">
                      {l.category || NICHES[l.niche]}
                      {l.neighborhood ? ` · ${l.neighborhood}` : ""}
                    </div>
                    <LeadTags lead={l} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th onClick={() => setSort("score")}>Nota</th>
                <th onClick={() => setSort("name")}>Empresa</th>
                <th>Nicho</th>
                <th>Instagram</th>
                <th>Site</th>
                <th>Porte</th>
                <th>Etapa</th>
                <th onClick={() => setSort("next_followup_at")}>Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const fu = relDays(l.next_followup_at);
                return (
                  <tr key={l.id} onClick={() => ctx.open(l.id)}>
                    <td><Score value={l.score} /></td>
                    <td>
                      <strong>{l.name}</strong>
                      <div className="muted" style={{ fontSize: 12 }}>{l.category}{l.neighborhood ? ` · ${l.neighborhood}` : ""}</div>
                    </td>
                    <td>{NICHES[l.niche]}</td>
                    <td>{IG_LABEL[l.ig_status]}</td>
                    <td>{SITE_LABEL[l.site_status]}</td>
                    <td>{SIZE_LABEL[l.size]}</td>
                    <td>{STATUSES.find((s) => s.key === l.status)?.label}</td>
                    <td>
                      {fu && !["fechado", "perdido"].includes(l.status) ? (
                        <span className={`tag ${fu.overdue ? "red" : fu.today ? "blue" : ""}`}>{fmtDate(l.next_followup_at)} · {fu.label}</span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
