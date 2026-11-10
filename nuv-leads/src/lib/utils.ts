import type { Lead, Template, Status } from "./types";
import { FOLLOWUP_DAYS } from "./types";

export function firstSentence(text: string | null): string {
  if (!text) return "";
  const s = text.split(/(?<=[.!?])\s/)[0].trim().replace(/[.!?]+$/, "");
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function fillTemplate(t: Pick<Template, "body" | "subject">, lead: Lead) {
  const vars: Record<string, string> = {
    empresa: lead.name,
    categoria: (lead.category || "o serviço de vocês").toLowerCase(),
    bairro: lead.neighborhood || lead.city || "BH",
    cidade: lead.city || "BH",
    diagnostico: lead.diagnosis || "[diagnóstico]",
    diagnostico_curto: firstSentence(lead.diagnosis) || "[diagnóstico]",
    oportunidade: lead.opportunity || "[o que a NUV pode fazer]",
  };
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return { subject: t.subject ? fill(t.subject) : "", body: fill(t.body) };
}

export function waNumber(raw: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d;
}

export function igHandle(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/instagram\.com\/([^/?#]+)/i);
  return (m ? m[1] : raw).replace(/^@/, "").trim() || null;
}

export function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export function followupFor(status: Status): string | null {
  const days = FOLLOWUP_DAYS[status];
  return days ? addDays(days) : null;
}

export function fmtDate(iso: string | null, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function relDays(iso: string | null): { label: string; overdue: boolean; today: boolean } | null {
  if (!iso) return null;
  const d = new Date(iso);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - start.getTime()) / 86400000);
  if (diff < 0) return { label: `atrasado ${-diff}d`, overdue: true, today: false };
  if (diff === 0) return { label: "hoje", overdue: false, today: true };
  if (diff === 1) return { label: "amanhã", overdue: false, today: false };
  return { label: `em ${diff}d`, overdue: false, today: false };
}

export function scoreTone(score: number): "hot" | "warm" | "cold" {
  if (score >= 70) return "hot";
  if (score >= 45) return "warm";
  return "cold";
}

// CSV simples com cabeçalho (separador , ou ;, aspas duplas)
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
      } else if (c === sep && !q) { out.push(cur); cur = ""; } else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const head = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((l) => {
    const cells = split(l);
    const row: Record<string, string> = {};
    head.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}
