import { NextResponse } from "next/server";

// Endpoint legado: não ativa planos, não gera QR Code e não efetua cobrança.
export async function POST() {
  return NextResponse.json({ ok: false, error: "A conta de membro agora é gratuita e não precisa de assinatura. Atualize a página." },
    { status: 410, headers: { "Cache-Control": "private, no-store" } });
}
