import { listarVitrine } from "@/lib/portfolio";

// Vitrine pública do portfólio (sem login): só os trabalhos marcados como "mostrar na vitrine".
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const linkSeguro = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);

export async function GET(req: Request) {
  const categoria = new URL(req.url).searchParams.get("categoria");
  let itens: any[] = [];
  try {
    itens = await listarVitrine();
  } catch {
    itens = [];
  }
  const categorias = [...new Set(itens.map((i) => i.categoria))];
  const lista = categoria ? itens.filter((i) => i.categoria === categoria) : itens;

  const cards = lista
    .map((i) => {
      const imagens = i.arquivos.filter((a: any) => a.tipo.startsWith("image/"));
      const outros = i.arquivos.filter((a: any) => !a.tipo.startsWith("image/"));
      const link = linkSeguro(i.link);
      return `<article class="card">
  <details>
    <summary>
      <div class="capa">${i.capa ? `<img src="${esc(i.capa)}" alt="${esc(i.titulo)}" loading="lazy">` : `<span class="sem">${esc(i.categoria)}</span>`}</div>
      <div class="info"><small>${esc(i.categoria)}${i.cliente ? ` · ${esc(i.cliente)}` : ""}</small><h2>${esc(i.titulo)}</h2><span class="ver">Ver trabalho</span></div>
    </summary>
    <div class="abre">
      ${i.descricao ? `<p>${esc(i.descricao).replace(/\n/g, "<br>")}</p>` : ""}
      ${link ? `<p><a href="${esc(link)}" target="_blank" rel="noopener">${esc(link.replace(/^https?:\/\//, ""))} ↗</a></p>` : ""}
      <div class="galeria">${imagens.map((a: any) => `<a href="${esc(a.url)}" target="_blank" rel="noopener"><img src="${esc(a.urlMini ?? a.url)}" alt="${esc(a.nome)}" loading="lazy"></a>`).join("")}</div>
      ${outros
        .map((a: any) =>
          a.tipo.startsWith("video/")
            ? `<video src="${esc(a.url)}" controls preload="none"></video>`
            : `<p><a class="arq" href="${esc(a.url)}" target="_blank" rel="noopener">📄 ${esc(a.nome)}</a></p>`,
        )
        .join("")}
    </div>
  </details>
</article>`;
    })
    .join("");

  const filtros = categorias.length > 1
    ? `<nav>${[["", "Tudo"], ...categorias.map((c) => [c, c])].map(([v, r]) => `<a class="${(categoria ?? "") === v ? "on" : ""}" href="/vitrine${v ? `?categoria=${encodeURIComponent(v)}` : ""}">${esc(r)}</a>`).join("")}</nav>`
    : "";

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Portfólio · NUV Agência</title>
<meta name="description" content="Trabalhos da NUV Agência">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f5f5;color:#121212;font-family:"Plus Jakarta Sans",system-ui,sans-serif;line-height:1.5}
.wrap{max-width:1180px;margin:0 auto;padding:24px 16px 64px}
.topo{background:#121212;color:#fff;border-radius:28px;padding:36px 28px}
.marca{font-weight:800;font-size:24px;letter-spacing:-.02em}.marca b{color:#7d95ff}
.topo h1{margin:28px 0 4px;font-size:clamp(30px,6vw,52px);line-height:1.05;letter-spacing:-.03em}.topo p{margin:0;color:rgba(255,255,255,.65)}
nav{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}nav a{padding:8px 14px;border-radius:99px;background:#fff;color:#555;text-decoration:none;font-size:13px;font-weight:600}nav a.on{background:#1f3fd1;color:#fff}
.grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;margin-top:18px;align-items:start}
.card{background:#fff;border-radius:24px;overflow:hidden}
summary{list-style:none;cursor:pointer}summary::-webkit-details-marker{display:none}
.capa{aspect-ratio:4/5;background:#e9e9e9}.capa img{width:100%;height:100%;object-fit:cover;display:block}.sem{display:grid;place-items:center;height:100%;color:#999;font-weight:700}
.info{padding:14px 16px}.info small{color:#1f3fd1;font-weight:700;font-size:12px}.info h2{margin:2px 0 6px;font-size:17px;line-height:1.25}.ver{font-size:12px;font-weight:700;color:#777}
details[open] .ver{display:none}
.abre{padding:0 16px 16px;font-size:14px}.abre a{color:#1f3fd1;font-weight:600}
.galeria{display:grid;grid-template-columns:1fr 1fr;gap:6px}.galeria img{width:100%;border-radius:12px;display:block}
video{width:100%;border-radius:12px;margin-top:8px;background:#000}.arq{text-decoration:none}
.vazio{background:#fff;border-radius:24px;padding:40px;text-align:center;color:#777}
.rodape{text-align:center;color:#8a8a8a;font-size:12px;margin-top:32px}
</style></head><body><div class="wrap">
<header class="topo"><div class="marca">nuv<b>.</b></div><h1>Portfólio</h1><p>Alguns trabalhos que fizemos com nossos clientes.</p></header>
${filtros}
${lista.length ? `<div class="grade">${cards}</div>` : `<div class="vazio">Em breve, novos trabalhos por aqui.</div>`}
<p class="rodape">NUV Agência</p>
</div></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300", "referrer-policy": "no-referrer" } });
}
