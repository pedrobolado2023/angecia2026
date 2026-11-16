import { NextRequest, NextResponse } from "next/server";
import { customerSessionConfigured } from "@/lib/customerSession";
import { getPostgresPool, issuePasswordResetCode, resetCustomerPassword } from "@/lib/postgres";
import { sendWhatsAppVerificationCode } from "@/lib/wacliService";

export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!customerSessionConfigured() || !getPostgresPool()) {
    return NextResponse.json({ ok: false, error: "Recuperação de senha temporariamente indisponível." }, { status: 503, headers });
  }
  const body = await request.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
  if (!identifier || identifier.length > 254) {
    return NextResponse.json({ ok: false, error: "Informe o e-mail ou CPF cadastrado." }, { status: 400, headers });
  }

  if (body.action === "send") {
    try {
      const issued = await issuePasswordResetCode(identifier);
      if (issued) {
        await sendWhatsAppVerificationCode({
          phone: issued.customer.whatsapp, code: issued.code, customerName: issued.customer.fullName,
          purpose: "password-reset",
        });
      }
    } catch {
      console.warn("[Recuperação de senha] Não foi possível concluir o envio.");
    }
    return NextResponse.json({
      ok: true, message: "Se houver uma conta com esse cadastro, o código será enviado ao WhatsApp cadastrado.",
    }, { headers });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const password = body.password;
  if (body.action !== "reset" || !/^\d{6}$/.test(code) || typeof password !== "string" ||
      password.length < 8 || password.length > 128 || !password.trim()) {
    return NextResponse.json({ ok: false, error: "Use o código de seis dígitos e uma nova senha de 8 a 128 caracteres." }, { status: 400, headers });
  }
  try {
    if (!(await resetCustomerPassword(identifier, code, password))) {
      return NextResponse.json({ ok: false, error: "Código inválido ou expirado. Confira o código ou solicite outro." }, { status: 400, headers });
    }
    const response = NextResponse.json({ ok: true, message: "Senha alterada. Entre com a nova senha." }, { headers });
    response.cookies.delete("hospede_customer_session");
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: "Não foi possível alterar a senha agora. Tente novamente." }, { status: 503, headers });
  }
}
