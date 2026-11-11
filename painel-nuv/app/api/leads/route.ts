import { NextResponse } from "next/server";
import { LeadIn, criarLead, listarLeads } from "@/lib/leads";
import { exigir, negado } from "@/lib/usuarios";

export async function GET() {
  const eu = await exigir("leads", "ver");
  if (negado(eu)) return eu;
  try {
    return NextResponse.json({ leads: await listarLeads() });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const eu = await exigir("leads", "editar");
  if (negado(eu)) return eu;
  const corpo = LeadIn.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ erro: "Dados inválidos", detalhes: corpo.error.issues }, { status: 400 });
  try {
    return NextResponse.json({ id: await criarLead(corpo.data) });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 400 });
  }
}
