import { NextResponse } from "next/server";
import { detalharPost } from "@/lib/notion";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const cliente = new URL(req.url).searchParams.get("cliente") ?? "";
  if (!/^[0-9a-f-]{32,36}$/i.test(params.id)) return NextResponse.json({ erro: "ID inválido" }, { status: 400 });
  try {
    return NextResponse.json(await detalharPost(cliente, params.id));
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
