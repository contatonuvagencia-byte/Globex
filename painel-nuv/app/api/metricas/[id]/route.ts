import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await db().from("metricas_relatorios").select("*").eq("id", params.id).single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ relatorio: data });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await db().from("metricas_relatorios").delete().eq("id", params.id);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
