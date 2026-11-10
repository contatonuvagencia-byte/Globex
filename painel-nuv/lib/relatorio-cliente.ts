// Gera a versão do relatório que vai para o cliente: uma página HTML única,
// com todo o CSS embutido, que funciona tanto no link público quanto como arquivo baixado.

type Metrica = { nome: string; grupo: string; periodo_atual: number | null; periodo_anterior: number | null; unidade: string };
type PostM = {
  descricao: string;
  formato: string | null;
  data: string | null;
  visualizacoes: number | null;
  alcance: number | null;
  curtidas: number | null;
  comentarios: number | null;
  compartilhamentos: number | null;
  salvamentos: number | null;
};
export type RelatorioSalvo = {
  cliente: string;
  rede: string;
  periodo_atual: string;
  periodo_anterior: string | null;
  metricas: Metrica[];
  posts: PostM[];
  analise: { resumo?: string; deu_certo?: string[]; deu_errado?: string[]; recomendacoes?: string[]; perfil?: string | null };
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const nf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const fmt = (v: number | null, unidade = "") =>
  v === null || v === undefined ? "–" : unidade === "%" ? `${nf.format(v)}%` : unidade === "R$" ? `R$ ${nf.format(v)}` : nf.format(v);

const INVERTIDA = /deixaram|unfollow|perd|custo|cpc|cpm|rejei/i;

function variacao(m: Metrica) {
  if (m.periodo_atual === null || m.periodo_anterior === null || m.periodo_anterior === 0) return null;
  const rel = ((m.periodo_atual - m.periodo_anterior) / Math.abs(m.periodo_anterior)) * 100;
  const bom = INVERTIDA.test(m.nome) ? rel < 0 : rel > 0;
  return { rel, bom, texto: `${rel > 0 ? "▲ +" : rel < 0 ? "▼ " : ""}${nf.format(rel)}%` };
}

// as métricas que o cliente entende de primeira vão para os cartões de destaque
const PRIORIDADE = [/alcan/i, /visualiza/i, /seguidores|novos seguidores/i, /intera|engaj/i, /clique|visita/i];

function destaques(metricas: Metrica[]) {
  const usados = new Set<Metrica>();
  const lista: Metrica[] = [];
  for (const re of PRIORIDADE) {
    const m = metricas.find((x) => re.test(x.nome) && x.periodo_atual !== null && !usados.has(x) && !INVERTIDA.test(x.nome));
    if (m) {
      usados.add(m);
      lista.push(m);
    }
    if (lista.length === 4) break;
  }
  for (const m of metricas) {
    if (lista.length >= 4) break;
    if (!usados.has(m) && m.periodo_atual !== null) lista.push(m);
  }
  return lista;
}

function lista(itens: string[] | undefined) {
  if (!itens?.length) return "";
  return `<ul>${itens.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
}

export function gerarHtmlCliente(r: RelatorioSalvo): string {
  const cards = destaques(r.metricas)
    .map((m) => {
      const v = variacao(m);
      return `<div class="kpi">
        <p class="kpi-nome">${esc(m.nome)}</p>
        <p class="kpi-valor">${esc(fmt(m.periodo_atual, m.unidade))}</p>
        ${v ? `<p class="var ${v.bom ? "bom" : "ruim"}">${esc(v.texto)} <span>vs ${esc(r.periodo_anterior ?? "anterior")}</span></p>` : ""}
      </div>`;
    })
    .join("");

  const grupos = new Map<string, Metrica[]>();
  r.metricas.forEach((m) => grupos.set(m.grupo || "Outros", [...(grupos.get(m.grupo || "Outros") ?? []), m]));
  const tabela = [...grupos.entries()]
    .map(
      ([g, ms]) => `<tr class="grupo"><td colspan="4">${esc(g)}</td></tr>` +
        ms
          .map((m) => {
            const v = variacao(m);
            return `<tr><td>${esc(m.nome)}</td><td class="n mute">${esc(fmt(m.periodo_anterior, m.unidade))}</td><td class="n forte">${esc(fmt(m.periodo_atual, m.unidade))}</td><td class="n ${v ? (v.bom ? "bom" : "ruim") : "mute"}">${v ? esc(v.texto) : "–"}</td></tr>`;
          })
          .join(""),
    )
    .join("");

  const topPosts = [...r.posts]
    .sort((a, b) => (b.alcance ?? b.visualizacoes ?? 0) - (a.alcance ?? a.visualizacoes ?? 0))
    .slice(0, 3)
    .map((p, i) => {
      const nums = [
        ["Alcance", p.alcance],
        ["Visualizações", p.visualizacoes],
        ["Curtidas", p.curtidas],
        ["Compart.", p.compartilhamentos],
        ["Salvam.", p.salvamentos],
      ].filter(([, v]) => v !== null && v !== undefined);
      return `<div class="post">
        <span class="pos">${i + 1}</span>
        <div><p class="post-t">${esc(p.descricao)}</p><p class="mute pequeno">${esc([p.formato, p.data?.split("-").reverse().join("/")].filter(Boolean).join(" · "))}</p>
        <p class="nums">${nums.map(([k, v]) => `<span><b>${esc(fmt(v as number))}</b> ${esc(k)}</span>`).join("")}</p></div>
      </div>`;
    })
    .join("");

  const a = r.analise ?? {};
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(r.cliente)} · Relatório ${esc(r.periodo_atual)} · Agência NUV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800&display=swap" rel="stylesheet">
<style>
  :root { --azul:#1f3fd1; --azul-escuro:#0f1f6e; --preto:#0b0b0c; --cinza:#5b5d66; --cinza-claro:#eef0f5; --branco:#fff; --bom:#0f7a3a; --ruim:#b42318; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Inter, system-ui, sans-serif; background: var(--cinza-claro); color: var(--preto); line-height: 1.5; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 960px; margin: 0 auto; padding: 0 20px; }
  header { background: var(--preto); color: var(--branco); padding: 28px 0 64px; }
  .marca { display: flex; justify-content: space-between; align-items: center; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: #b9bdcc; }
  .marca b { color: var(--branco); font-weight: 800; letter-spacing: .02em; font-size: 18px; text-transform: none; }
  h1 { font-size: clamp(32px, 6vw, 52px); font-weight: 800; line-height: 1.05; margin-top: 44px; letter-spacing: -.02em; }
  h1 span { color: #7f97ff; }
  .sub { color: #b9bdcc; margin-top: 10px; }
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: -40px; }
  .kpi { background: var(--branco); border-radius: 16px; padding: 18px 20px; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
  .kpi-nome { font-size: 13px; color: var(--cinza); }
  .kpi-valor { font-size: 30px; font-weight: 800; letter-spacing: -.02em; margin-top: 2px; font-variant-numeric: tabular-nums; }
  .var { font-size: 13px; font-weight: 600; margin-top: 2px; } .var span { color: var(--cinza); font-weight: 400; }
  .bom { color: var(--bom); } .ruim { color: var(--ruim); } .mute { color: var(--cinza); }
  section { background: var(--branco); border-radius: 16px; padding: 28px; margin-top: 16px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: var(--azul); margin-bottom: 12px; }
  .resumo { font-size: 20px; line-height: 1.5; font-weight: 500; }
  .tres { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
  .tres > div { background: var(--cinza-claro); border-radius: 12px; padding: 18px; }
  .tres h3 { font-size: 15px; margin-bottom: 8px; }
  ul { padding-left: 18px; } li { margin: 6px 0; font-size: 15px; }
  table { width: 100%; border-collapse: collapse; font-size: 15px; }
  th { text-align: left; font-size: 12px; color: var(--cinza); font-weight: 500; padding: 8px 0; border-bottom: 1px solid var(--cinza-claro); }
  td { padding: 10px 0; border-bottom: 1px solid var(--cinza-claro); }
  .n { text-align: right; font-variant-numeric: tabular-nums; padding-left: 12px; } .forte { font-weight: 600; }
  tr.grupo td { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--cinza); padding-top: 20px; border: 0; }
  .tabela { overflow-x: auto; }
  .post { display: flex; gap: 16px; padding: 14px 0; border-top: 1px solid var(--cinza-claro); } .post:first-of-type { border-top: 0; }
  .pos { flex: none; width: 36px; height: 36px; border-radius: 10px; background: var(--azul); color: var(--branco); display: grid; place-items: center; font-weight: 800; }
  .post-t { font-weight: 600; } .pequeno { font-size: 13px; }
  .nums { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 6px; font-size: 13px; color: var(--cinza); } .nums b { color: var(--preto); }
  footer { text-align: center; padding: 40px 0 56px; color: var(--cinza); font-size: 13px; }
  footer b { color: var(--preto); }
  @media print { body { background: #fff; } section, .kpi { box-shadow: none; border: 1px solid var(--cinza-claro); break-inside: avoid; } }
</style>
</head>
<body>
<header>
  <div class="wrap">
    <div class="marca"><b>NUV</b><span>Relatório de resultados</span></div>
    <h1>${esc(r.cliente)}<br><span>${esc(r.periodo_atual)}</span></h1>
    <p class="sub">${esc(r.rede)}${a.perfil ? ` · ${esc(a.perfil)}` : ""}${r.periodo_anterior ? ` · comparado com ${esc(r.periodo_anterior)}` : ""}</p>
  </div>
</header>
<main class="wrap">
  <div class="kpis">${cards}</div>
  ${a.resumo ? `<section><h2>Em resumo</h2><p class="resumo">${esc(a.resumo)}</p></section>` : ""}
  <section>
    <div class="tres">
      ${a.deu_certo?.length ? `<div><h3>O que funcionou</h3>${lista(a.deu_certo)}</div>` : ""}
      ${a.deu_errado?.length ? `<div><h3>Pontos de atenção</h3>${lista(a.deu_errado)}</div>` : ""}
      ${a.recomendacoes?.length ? `<div><h3>Próximos passos</h3>${lista(a.recomendacoes)}</div>` : ""}
    </div>
  </section>
  ${topPosts ? `<section><h2>Destaques do período</h2>${topPosts}</section>` : ""}
  <section>
    <h2>Todos os números</h2>
    <div class="tabela"><table>
      <thead><tr><th>Métrica</th><th class="n">${esc(r.periodo_anterior ?? "Anterior")}</th><th class="n">${esc(r.periodo_atual)}</th><th class="n">Variação</th></tr></thead>
      <tbody>${tabela}</tbody>
    </table></div>
  </section>
</main>
<footer><b>Agência NUV</b> · @nuv.social<br>Hold the vision. Trust the process.</footer>
</body>
</html>`;
}
