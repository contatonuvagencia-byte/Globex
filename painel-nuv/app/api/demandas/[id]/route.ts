import { NextResponse } from "next/server";
import { z } from "zod";
import { anexarNaDemanda, comentarNaDemanda, demandaPorId, detalheDemanda, removerAnexo } from "@/lib/demandas";
import { veCliente } from "@/lib/permissoes";
import { exigir, negado } from "@/lib/usuarios";

export const maxDuration = 26;

const ID = /^[0-9a-f-]{32,36}$/i;
const LIMITE = 4.5 * 1024 * 1024; // Netlify ~6 MB por pedido; Notion grátis 5 MB por arquivo

async function acesso(id: string, eu: { admin: boolean; clientes: string[] }) {
  const d = await demandaPorId(id).catch(() => null);
  if (!d) return NextResponse.json({ erro: "Demanda não encontrada no Notion." }, { status: 404 });
  if (!veCliente(eu, d.cliente)) return NextResponse.json({ erro: "Seu perfil não tem acesso a este cliente." }, { status: 403 });
  return null;
}

// Arquivos e comentários de uma demanda
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const eu = await exigir("demandas", "ver");
  if (negado(eu)) return eu;
  if (!ID.test(params.id)) return NextResponse.json({ erro: "ID inválido" }, { status: 400 });
  const bloqueio = await acesso(params.id, eu);
  if (bloqueio) return bloqueio;
  return NextResponse.json(await detalheDemanda(params.id));
}

const Acao = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("comentar"), texto: z.string().trim().min(1).max(1900) }),
  z.object({ acao: z.literal("remover_anexo"), blocoId: z.string().regex(ID) }),
]);

// Anexar arquivo (multipart), comentar ou tirar um arquivo
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const eu = await exigir("demandas", "editar");
  if (negado(eu)) return eu;
  if (!ID.test(params.id)) return NextResponse.json({ erro: "ID inválido" }, { status: 400 });
  const bloqueio = await acesso(params.id, eu);
  if (bloqueio) return bloqueio;
  try {
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const arquivo = (await req.formData().catch(() => null))?.get("arquivo");
      if (!(arquivo instanceof File) || !arquivo.size) return NextResponse.json({ erro: "Escolha um arquivo." }, { status: 400 });
      if (arquivo.size > LIMITE) return NextResponse.json({ erro: "Arquivo grande demais (máximo 4,5 MB). Para arquivos maiores, cole o link do Drive nas observações." }, { status: 413 });
      await anexarNaDemanda(params.id, arquivo);
      return NextResponse.json(await detalheDemanda(params.id));
    }
    const corpo = Acao.safeParse(await req.json().catch(() => null));
    if (!corpo.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
    if (corpo.data.acao === "comentar") return NextResponse.json({ comentario: await comentarNaDemanda(params.id, eu.nome, corpo.data.texto) });
    await removerAnexo(params.id, corpo.data.blocoId);
    return NextResponse.json(await detalheDemanda(params.id));
  } catch (e) {
    const msg = (e as Error).message;
    const cap = /insert|permission|capabilit/i.test(msg);
    return NextResponse.json({ erro: cap ? "A integração do Notion precisa das capacidades “Inserir conteúdo” e “Inserir comentários”." : msg }, { status: 500 });
  }
}
