import { NextResponse } from "next/server";
import { resumoHoje } from "@/lib/hoje";
import { exigir, negado } from "@/lib/usuarios";

export const maxDuration = 26;

export async function GET() {
  const eu = await exigir("logado");
  if (negado(eu)) return eu;
  return NextResponse.json(await resumoHoje(eu));
}
