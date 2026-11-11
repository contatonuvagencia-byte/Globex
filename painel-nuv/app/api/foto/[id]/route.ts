import { lerFoto } from "@/lib/fotos";
import { exigir, negado } from "@/lib/usuarios";

// Serve a foto de perfil (só para quem está logado).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const eu = await exigir("logado");
  if (negado(eu)) return eu;
  const img = await lerFoto(decodeURIComponent(params.id).slice(0, 64));
  const m = img?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return new Response(null, { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "content-type": m[1], "cache-control": "private, max-age=31536000, immutable" },
  });
}
