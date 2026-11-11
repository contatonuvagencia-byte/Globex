import { cookies } from "next/headers";
import { COOKIE, verificarSessao } from "@/lib/auth";
import { propostaPorToken, registrarVisita, responderProposta, totais, TOKEN, type Proposta } from "@/lib/comercial";
import { brl, dataBR } from "@/lib/format";
import { hojeBrasil } from "@/lib/supabase";

// Página pública da proposta (sem login). O cliente vê, aceita ou recusa.

const esc = (s: string | null | undefined) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const paragrafos = (s: string | null) => (s ? esc(s).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("") : "");

const HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
};

function pagina(titulo: string, corpo: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f5f5;color:#121212;font-family:"Plus Jakarta Sans",system-ui,sans-serif;line-height:1.55}
.wrap{max-width:820px;margin:0 auto;padding:24px 16px 64px}
.topo{background:#121212;color:#fff;border-radius:28px;padding:32px 28px}
.marca{font-weight:800;font-size:22px;letter-spacing:-.02em}.marca b{color:#7d95ff}
.topo small{display:block;color:rgba(255,255,255,.6);margin-top:24px;font-size:13px}
.topo h1{margin:4px 0 0;font-size:clamp(26px,5vw,38px);line-height:1.1;letter-spacing:-.02em}
.card{background:#fff;border-radius:24px;padding:24px 28px;margin-top:14px}
.card h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#6b6b6b;margin:0 0 12px}
.card p{margin:0 0 10px}
table{width:100%;border-collapse:collapse}td{padding:12px 0;border-bottom:1px solid #eee;vertical-align:top}td.v{text-align:right;white-space:nowrap;font-weight:700;padding-left:16px}
.tag{display:inline-block;background:#dfe6ff;color:#0b1f7a;border-radius:99px;padding:2px 10px;font-size:11px;font-weight:700;margin-left:6px}
.totais{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:16px}
.tot{background:#1f3fd1;color:#fff;border-radius:20px;padding:18px 20px}.tot.b{background:#f5f5f5;color:#121212}
.tot span{font-size:12px;opacity:.75}.tot strong{display:block;font-size:26px;letter-spacing:-.02em}
form{display:grid;gap:10px}input,textarea{font:inherit;border:1px solid #ddd;border-radius:14px;padding:12px 14px;width:100%}
.botoes{display:flex;gap:10px;flex-wrap:wrap}button{font:inherit;font-weight:700;border:0;border-radius:99px;padding:14px 22px;cursor:pointer}
.sim{background:#1f3fd1;color:#fff;flex:1}.nao{background:#f5f5f5;color:#121212}
.aviso{background:#dfe6ff;color:#0b1f7a;border-radius:20px;padding:18px 22px;font-weight:600}
.rodape{text-align:center;color:#8a8a8a;font-size:12px;margin-top:28px}
</style></head><body><div class="wrap">${corpo}<p class="rodape">NUV Agência · proposta enviada pelo Painel NUV</p></div></body></html>`,
    { status, headers: HEADERS },
  );
}

const indisponivel = () => pagina("Proposta indisponível", `<div class="card"><p>Este link de proposta não está mais disponível. Fale com a NUV para receber um novo.</p></div>`, 404);

function render(p: Proposta, msg?: string) {
  const t = totais(p.itens);
  const vencida = p.validade && p.validade < hojeBrasil();
  const linhas = p.itens
    .map((i) => `<tr><td>${esc(i.descricao)}${i.recorrente ? '<span class="tag">mensal</span>' : ""}</td><td class="v">${brl(Number(i.valor))}${i.recorrente ? "/mês" : ""}</td></tr>`)
    .join("");
  let resposta: string;
  if (p.status === "aceita") resposta = `<div class="aviso">Proposta aceita por ${esc(p.respondido_por)} em ${dataBR(p.respondido_em!.slice(0, 10))}. Obrigada! A NUV vai entrar em contato com os próximos passos.</div>`;
  else if (p.status === "recusada") resposta = `<div class="aviso">Proposta recusada em ${dataBR(p.respondido_em!.slice(0, 10))}. Obrigada pelo retorno!</div>`;
  else if (vencida) resposta = `<div class="aviso">Esta proposta venceu em ${dataBR(p.validade!)}. Fale com a NUV para receber uma atualizada.</div>`;
  else
    resposta = `<div class="card"><h2>Sua resposta</h2><form method="post">
<input name="nome" required maxlength="120" placeholder="Seu nome">
<textarea name="obs" maxlength="1000" rows="3" placeholder="Algum comentário? (opcional)"></textarea>
<div class="botoes"><button class="sim" name="acao" value="aceitar">Aceitar proposta</button><button class="nao" name="acao" value="recusar">Recusar</button></div>
</form></div>`;
  return pagina(
    `${p.titulo} · NUV`,
    `<header class="topo"><div class="marca">nuv<b>.</b></div><small>Proposta para ${esc(p.cliente)}</small><h1>${esc(p.titulo)}</h1></header>
${msg ? `<div class="aviso" style="margin-top:14px">${esc(msg)}</div>` : ""}
${p.apresentacao ? `<section class="card"><h2>Apresentação</h2>${paragrafos(p.apresentacao)}</section>` : ""}
<section class="card"><h2>Investimento</h2><table>${linhas}</table>
<div class="totais">${t.mensal ? `<div class="tot"><span>Mensal</span><strong>${brl(t.mensal)}</strong></div>` : ""}${t.unico ? `<div class="tot ${t.mensal ? "b" : ""}"><span>${t.mensal ? "Investimento único" : "Total"}</span><strong>${brl(t.unico)}</strong></div>` : ""}</div></section>
${p.condicoes ? `<section class="card"><h2>Condições</h2>${paragrafos(p.condicoes)}</section>` : ""}
${p.validade ? `<p class="rodape" style="margin-top:14px">Válida até ${dataBR(p.validade)}</p>` : ""}
<div style="margin-top:14px">${resposta}</div>`,
  );
}

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  if (!TOKEN.test(params.token)) return indisponivel();
  const p = await propostaPorToken(params.token).catch(() => null);
  if (!p || p.status === "rascunho") return indisponivel();
  // só conta a visita quando quem abre não é alguém logado no painel
  const daEquipe = await (async () => verificarSessao(cookies().get(COOKIE)?.value))().catch(() => null);
  if (!daEquipe) await registrarVisita(p).catch(() => {});
  return render(p);
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (!TOKEN.test(params.token)) return indisponivel();
  const p = await propostaPorToken(params.token).catch(() => null);
  if (!p || p.status === "rascunho") return indisponivel();
  const form = await req.formData().catch(() => null);
  const acao = form?.get("acao");
  const nome = String(form?.get("nome") ?? "").trim().slice(0, 120);
  const obs = String(form?.get("obs") ?? "").trim().slice(0, 1000) || null;
  if ((acao !== "aceitar" && acao !== "recusar") || !nome) return render(p, "Coloque seu nome e escolha aceitar ou recusar.");
  try {
    await responderProposta(p, acao === "aceitar", nome, obs);
  } catch (e) {
    return render(p, (e as Error).message);
  }
  return new Response(null, { status: 303, headers: { location: `/p/${params.token}` } });
}
