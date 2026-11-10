import { useMemo } from "react";
import type { Ctx } from "../App";
import { STATUSES } from "../lib/types";
import { fmtDate, relDays } from "../lib/utils";
import { Score } from "./Pipeline";

export default function Followups({ ctx }: { ctx: Ctx }) {
  const groups = useMemo(() => {
    const active = ctx.leads
      .filter((l) => l.next_followup_at && !["fechado", "perdido"].includes(l.status))
      .sort((a, b) => (a.next_followup_at! < b.next_followup_at! ? -1 : 1));
    const due = active.filter((l) => {
      const r = relDays(l.next_followup_at)!;
      return r.overdue || r.today;
    });
    const week = active.filter((l) => !due.includes(l)).slice(0, 50);
    const hotNew = ctx.leads.filter((l) => l.status === "novo" && l.score >= 70).slice(0, 10);
    return { due, week, hotNew };
  }, [ctx.leads]);

  const Row = ({ id }: { id: string }) => {
    const l = ctx.leads.find((x) => x.id === id)!;
    const r = relDays(l.next_followup_at);
    return (
      <div className="fu" onClick={() => ctx.open(l.id)}>
        <Score value={l.score} />
        <div>
          <h4>{l.name}</h4>
          <div className="muted" style={{ fontSize: 12 }}>
            {STATUSES.find((s) => s.key === l.status)?.label} · último contato {fmtDate(l.last_contact_at)}
            {l.category ? ` · ${l.category}` : ""}
          </div>
        </div>
        {r ? (
          <span className={`when ${r.overdue ? "overdue" : r.today ? "today" : ""}`}>{fmtDate(l.next_followup_at)} · {r.label}</span>
        ) : (
          <span className="when">nunca contatado</span>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Follow-ups</h2>
          <p>Quem precisa de um toque hoje. Ninguém fica esquecido no funil.</p>
        </div>
      </div>

      <h3 style={{ margin: "0 0 10px" }}>Para hoje ({groups.due.length})</h3>
      {groups.due.length === 0 ? (
        <div className="empty" style={{ padding: 30, marginBottom: 24 }}>Nada atrasado. Bom momento para abordar leads novos.</div>
      ) : (
        <div className="fu-list" style={{ marginBottom: 28 }}>{groups.due.map((l) => <Row key={l.id} id={l.id} />)}</div>
      )}

      {groups.hotNew.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 10px" }}>Leads quentes ainda não abordados</h3>
          <div className="fu-list" style={{ marginBottom: 28 }}>{groups.hotNew.map((l) => <Row key={l.id} id={l.id} />)}</div>
        </>
      )}

      <h3 style={{ margin: "0 0 10px" }}>Próximos</h3>
      {groups.week.length === 0 ? (
        <p className="muted">Nenhum follow-up agendado.</p>
      ) : (
        <div className="fu-list">{groups.week.map((l) => <Row key={l.id} id={l.id} />)}</div>
      )}
    </>
  );
}
