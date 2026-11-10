import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import type { Lead, Status, Template, Niche } from "./lib/types";
import { STATUSES } from "./lib/types";
import { followupFor, relDays } from "./lib/utils";
import Login from "./components/Login";
import Pipeline from "./components/Pipeline";
import Followups from "./components/Followups";
import ImportView from "./components/ImportView";
import TemplatesView from "./components/TemplatesView";
import LeadDrawer from "./components/LeadDrawer";
import { CloudMark } from "./components/Logo";

export type View = "pipeline" | "followups" | "import" | "templates";

export interface Ctx {
  leads: Lead[];
  templates: Template[];
  reload: () => Promise<void>;
  open: (id: string) => void;
  toast: (msg: string, err?: boolean) => void;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<boolean>;
  changeStatus: (lead: Lead, status: Status, note?: string) => Promise<void>;
  createLead: (name: string, niche: Niche) => Promise<void>;
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [view, setView] = useState<View>("pipeline");
  const [openId, setOpenId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ msg: string; err?: boolean } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const toast = useCallback((msg: string, err?: boolean) => {
    setToastMsg({ msg, err });
    window.setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const reload = useCallback(async () => {
    const [l, t] = await Promise.all([
      supabase.from("leads").select("*").order("score", { ascending: false }).limit(5000),
      supabase.from("templates").select("*").order("name"),
    ]);
    if (l.error) toast(l.error.message, true);
    setLeads((l.data as Lead[]) ?? []);
    setTemplates((t.data as Template[]) ?? []);
  }, [toast]);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("team_members")
      .select("email")
      .limit(1)
      .then(({ data }) => {
        const ok = !!data && data.length > 0;
        setAllowed(ok);
        if (ok) reload();
      });
  }, [session, reload]);

  // Atualizações em tempo real quando outra pessoa mexer nos leads
  useEffect(() => {
    if (!allowed) return;
    const ch = supabase
      .channel("leads-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => reload())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [allowed, reload]);

  const updateLead = useCallback(
    async (id: string, patch: Partial<Lead>) => {
      const { data, error } = await supabase.from("leads").update(patch).eq("id", id).select().single();
      if (error) {
        toast(error.message, true);
        return false;
      }
      setLeads((ls) => ls.map((l) => (l.id === id ? (data as Lead) : l)));
      return true;
    },
    [toast],
  );

  const changeStatus = useCallback(
    async (lead: Lead, status: Status, note?: string) => {
      if (lead.status === status) return;
      const patch: Partial<Lead> = { status, next_followup_at: followupFor(status) };
      if (status === "contatado" && !lead.last_contact_at) patch.last_contact_at = new Date().toISOString();
      const ok = await updateLead(lead.id, patch);
      if (!ok) return;
      const from = STATUSES.find((s) => s.key === lead.status)?.label;
      const to = STATUSES.find((s) => s.key === status)?.label;
      await supabase.from("interactions").insert({
        lead_id: lead.id,
        type: "status",
        content: `${from} → ${to}${note ? `\n${note}` : ""}`,
      });
      toast(`${lead.name} → ${to}`);
    },
    [updateLead, toast],
  );

  const createLead = useCallback(
    async (name: string, niche: Niche) => {
      const { data, error } = await supabase.from("leads").insert({ name, niche, source: "manual" }).select().single();
      if (error) return toast(error.message.includes("duplicate") ? "Esse lead já existe." : error.message, true);
      setLeads((ls) => [data as Lead, ...ls]);
      setOpenId((data as Lead).id);
    },
    [toast],
  );

  const dueCount = useMemo(
    () =>
      leads.filter((l) => {
        const r = relDays(l.next_followup_at);
        return r && (r.overdue || r.today) && !["fechado", "perdido"].includes(l.status);
      }).length,
    [leads],
  );

  if (session === undefined) return null;
  if (!session) return <Login />;
  if (allowed === false)
    return (
      <div className="login-form" style={{ minHeight: "100%" }}>
        <div style={{ maxWidth: 420 }}>
          <h2>Sem acesso</h2>
          <p className="muted">
            O e-mail <b>{session.user.email}</b> não está na equipe. Peça para incluírem você na tabela <code>team_members</code>.
          </p>
          <button className="btn" onClick={() => supabase.auth.signOut()}>Sair</button>
        </div>
      </div>
    );
  if (allowed === null) return null;

  const ctx: Ctx = { leads, templates, reload, open: setOpenId, toast, updateLead, changeStatus, createLead };
  const openLead = leads.find((l) => l.id === openId) ?? null;

  const nav: { key: View; label: string; badge?: number }[] = [
    { key: "pipeline", label: "Pipeline", badge: leads.length },
    { key: "followups", label: "Follow-ups", badge: dueCount || undefined },
    { key: "import", label: "Importar" },
    { key: "templates", label: "Mensagens" },
  ];

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <CloudMark className="brand-mark" />
          <div>
            <h1>nuv</h1>
            <small>Leads</small>
          </div>
        </div>
        {nav.map((n) => (
          <button key={n.key} className={`nav-btn ${view === n.key ? "active" : ""}`} onClick={() => setView(n.key)}>
            {n.label}
            {n.badge ? <span className="pill">{n.badge}</span> : null}
          </button>
        ))}
        <button className="nav-btn mobile-only" onClick={() => supabase.auth.signOut()}>Sair</button>
        <div className="side-foot">
          <em>Hold the vision. Trust the process.</em>
          {session.user.email}
          <br />
          <button className="link-btn" onClick={() => supabase.auth.signOut()}>Sair</button>
        </div>
      </aside>

      <main className="main">
        {view === "pipeline" && <Pipeline ctx={ctx} />}
        {view === "followups" && <Followups ctx={ctx} />}
        {view === "import" && <ImportView ctx={ctx} />}
        {view === "templates" && <TemplatesView ctx={ctx} />}
      </main>

      {openLead && <LeadDrawer ctx={ctx} lead={openLead} onClose={() => setOpenId(null)} />}
      {toastMsg && <div className={`toast ${toastMsg.err ? "err" : ""}`}>{toastMsg.msg}</div>}
    </div>
  );
}
