import "server-only";
import { listarClientes } from "./clientes";
import { progressoMes } from "./comercial";
import { listarDemandas } from "./demandas";
import { listarPosts } from "./notion";
import { pode, veCliente, type UsuarioPublico } from "./permissoes";
import { db, hojeBrasil } from "./supabase";

/* eslint-disable @typescript-eslint/no-explicit-any */

function somaDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const RE_AGUARDANDO = /aguardando|aprova/i;

/** Tudo o que pede atenção hoje. Cada bloco só vem se o perfil da pessoa tiver acesso (senão é null). */
export async function resumoHoje(eu: UsuarioPublico) {
  const hoje = hojeBrasil();
  const em7 = somaDias(hoje, 7);
  const sb = db();
  const se = <T,>(cond: boolean, f: () => Promise<T>) => (cond ? f() : Promise.resolve(null));

  const [posts, demandas, leads, financeiro, servicos, contratos, meta] = await Promise.allSettled([
    se(pode(eu, "calendario", "ver"), async () => {
      const r = await listarPosts(somaDias(hoje, -7), em7);
      const nomes = new Map(r.calendarios.map((c) => [c.id, c]));
      const meus = r.posts.filter((p) => veCliente(eu, nomes.get(p.cliente)?.nome));
      return {
        calendarios: r.calendarios.filter((c) => veCliente(eu, c.nome)),
        hoje: meus.filter((p) => p.data === hoje),
        atrasados: meus.filter((p) => p.data < hoje && !p.postado),
        aguardando: meus.filter((p) => p.data >= hoje && !p.postado && RE_AGUARDANDO.test(p.status) && p.status !== "Aprovado"),
        semana: meus.filter((p) => p.data > hoje).length,
        erros: r.erros.length,
      };
    }),
    se(pode(eu, "demandas", "ver"), async () => {
      const r = await listarDemandas();
      const abertas = r.demandas.filter((d) => !d.concluida && d.data && d.data <= hoje && veCliente(eu, d.cliente));
      const minha = (d: { responsavel: string | null }) => (d.responsavel ?? "").toLowerCase() === eu.nome.toLowerCase();
      return {
        lista: abertas
          .map((d) => ({
            id: d.id, titulo: d.titulo, cliente: d.cliente, data: d.data, dataFim: d.dataFim, responsavel: d.responsavel, url: d.url, prioridade: d.prioridade,
            status: d.status, fazendo: r.andamento.includes(d.status), minha: minha(d),
          }))
          .sort((a, b) => Number(b.minha) - Number(a.minha) || Number(b.fazendo) - Number(a.fazendo) || (a.data ?? "").localeCompare(b.data ?? "")),
      };
    }),
    se(pode(eu, "leads", "ver"), async () => {
      const fimHoje = new Date(Date.parse(`${somaDias(hoje, 1)}T03:00:00Z`)).toISOString();
      const [fu, vistas] = await Promise.all([
        sb.from("leads").select("id, name, status, next_followup_at, whatsapp, phone").lt("next_followup_at", fimHoje).not("status", "in", "(fechado,perdido)").order("next_followup_at").limit(30),
        sb.from("propostas").select("id, cliente, titulo, visto_em, visualizacoes").eq("status", "vista").order("visto_em", { ascending: false }).limit(10),
      ]);
      return { followups: fu.data ?? [], propostasVistas: vistas.data ?? [] };
    }),
    se(pode(eu, "financeiro", "ver"), async () => {
      const { data } = await sb
        .from("fin_lancamentos")
        .select("id, tipo, descricao, valor, data, cliente_id")
        .eq("pago", false)
        .eq("excluido", false)
        .lte("data", em7)
        .order("data");
      const l = (data ?? []).map((x: any) => ({ ...x, valor: Number(x.valor) }));
      const receber = l.filter((x) => x.tipo === "entrada" && x.data <= hoje);
      const pagar = l.filter((x) => x.tipo === "saida");
      return {
        receber,
        totalReceber: receber.reduce((t, x) => t + x.valor, 0),
        atrasadoReceber: receber.filter((x) => x.data < hoje).reduce((t, x) => t + x.valor, 0),
        pagar,
        totalPagar: pagar.reduce((t, x) => t + x.valor, 0),
      };
    }),
    se(pode(eu, "servicos", "ver"), async () => {
      const { data } = await sb.from("servicos").select("id, tipo, titulo, cliente, prazo, status").eq("status", "andamento").not("prazo", "is", null).lte("prazo", em7).order("prazo");
      return (data ?? []).filter((s: any) => veCliente(eu, s.cliente));
    }),
    se(pode(eu, "clientes", "ver"), async () => {
      const lista = await listarClientes(eu);
      return lista
        .filter((c: any) => c.ativo && (c.contrato.situacao === "vence_logo" || c.contrato.situacao === "vencido"))
        .map((c: any) => ({ id: c.id, nome: c.nome, fim: c.contrato.fim, dias: c.contrato.dias, situacao: c.contrato.situacao }));
    }),
    se(pode(eu, "leads", "ver"), () => progressoMes(hoje.slice(0, 7), eu)),
  ]);
  const v = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
  const falhas = [posts, demandas, leads, financeiro, servicos, contratos, meta].filter((r) => r.status === "rejected").map((r) => String((r as PromiseRejectedResult).reason?.message ?? r));
  return { hoje, posts: v(posts), demandas: v(demandas), leads: v(leads), financeiro: v(financeiro), servicos: v(servicos), contratos: v(contratos), meta: v(meta), falhas };
}
