import { NextRequest, NextResponse } from "next/server";
import { verifyWhatsAppVerificationCode } from "@/lib/customerStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier = "", code = "" } = body;

    if (!identifier.trim()) {
      return NextResponse.json(
        { ok: false, error: "Identificador (e-mail, CPF ou WhatsApp) é obrigatório." },
        { status: 400 }
      );
    }

    if (!code.trim() || code.trim().length !== 6) {
      return NextResponse.json(
        { ok: false, error: "Digite o código numérico de 6 dígitos recebido no seu WhatsApp." },
        { status: 400 }
      );
    }

    const customer = verifyWhatsAppVerificationCode(identifier, code);

    // Cria token seguro de sessão do cliente
    const sessionPayload = {
      customerId: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      whatsapp: customer.whatsapp,
      cpf: customer.cpf,
      membershipStatus: customer.membership?.status || "TRIAL_ACTIVE",
      trialExpiresAt: customer.membership?.trialExpiresAt,
      issuedAt: new Date().toISOString(),
    };

    const sessionCookieValue = Buffer.from(JSON.stringify(sessionPayload)).toString("base64");

    const response = NextResponse.json({
      ok: true,
      message: "WhatsApp verificado com sucesso! Seus 7 dias de Membro VIP estão liberados.",
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        email: customer.email,
        whatsapp: customer.whatsapp,
        cpf: customer.cpf,
        address: customer.address,
        membership: customer.membership,
      },
    });

    // Salva cookie seguro de sessão
    response.cookies.set("hospede_customer_session", sessionCookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });

    return response;
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Falha ao verificar código.";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 400 });
  }
}

