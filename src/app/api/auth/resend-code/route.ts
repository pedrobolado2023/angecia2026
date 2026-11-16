import { NextRequest, NextResponse } from "next/server";
import { resendCustomerWhatsAppCode } from "@/lib/customerStore";
import { sendWhatsAppVerificationCode } from "@/lib/wacliService";
import { getPostgresPool, issuePostgresCode } from "@/lib/postgres";
import { customerSessionConfigured } from "@/lib/customerSession";

export async function POST(request: NextRequest) {
  if (!customerSessionConfigured()) {
    return NextResponse.json({ ok: false, error: "Verificação temporariamente indisponível." }, { status: 503 });
  }
  const body = await request.json().catch(() => null);
  const identifier = body?.identifier;
  if (typeof identifier !== "string" || !identifier.trim() || identifier.length > 254) {
    return NextResponse.json({ ok: false, error: "Informe o identificador do cadastro." }, { status: 400 });
  }
  try {
    const issued = getPostgresPool() ? await issuePostgresCode(identifier) : resendCustomerWhatsAppCode(identifier);
    if (issued) {
      await sendWhatsAppVerificationCode({
        phone: issued.customer.whatsapp, code: issued.newCode, customerName: issued.customer.fullName,
      });
    }
  } catch {
    // A resposta não revela se o cadastro existe.
  }
  return NextResponse.json({
    ok: true, message: "Se o cadastro estiver ativo e puder receber outro código, ele será enviado ao WhatsApp cadastrado.",
  }, { headers: { "Cache-Control": "private, no-store" } });
}
