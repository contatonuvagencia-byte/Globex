import { NextResponse } from "next/server";
import { enviarArte, LIMITE_ARTE } from "@/lib/arte";
import { calendarioPorId } from "@/lib/calendarios";
import { veCliente } from "@/lib/permissoes";
import { exigir, negado } from "@/lib/usuarios";

export const maxDuration = 26;

const TIPOS = /^(image\/(png|jpe?g|webp|gif|heic)|video\/(mp4|quicktime)|application\/pdf)$/;

// Recebe uma arte enviada no painel e manda para o Notion e/ou o card do Trello do post.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const eu = await exigir("calendario", "editar");
  if (negado(eu)) return eu;
  if (!/^[0-9a-f-]{32,36}$/i.test(params.id)) return NextResponse.json({ erro: "ID inválido" }, { status: 400 });
  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  const calId = String(form?.get("cliente") ?? "");
  if (!(arquivo instanceof File) || !arquivo.size) return NextResponse.json({ erro: "Escolha um arquivo." }, { status: 400 });
  if (arquivo.size > LIMITE_ARTE) return NextResponse.json({ erro: "Arquivo grande demais (máximo 4,5 MB). Para vídeos, envie direto no Notion/Trello." }, { status: 413 });
  if (!TIPOS.test(arquivo.type)) return NextResponse.json({ erro: "Formato não aceito. Use PNG, JPG, WEBP, GIF, MP4 ou PDF." }, { status: 400 });
  const cal = await calendarioPorId(calId).catch(() => null);
  if (!cal || !veCliente(eu, cal.nome)) return NextResponse.json({ erro: "Seu perfil não tem acesso a este cliente." }, { status: 403 });
  const paraNotion = form?.get("notion") === "1";
  const paraTrello = form?.get("trello") === "1";
  if (!paraNotion && !paraTrello) return NextResponse.json({ erro: "Escolha Notion, Trello ou os dois." }, { status: 400 });
  const r = await enviarArte({ calId, pageId: params.id, titulo: String(form?.get("titulo") ?? "").slice(0, 300), arquivo, notion: paraNotion, trello: paraTrello });
  const algumOk = Boolean(r.notion || r.trello);
  return NextResponse.json(r, { status: algumOk ? 200 : 502 });
}
