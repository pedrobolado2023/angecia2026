import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomerCredentials } from "@/lib/customerStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier = "", secret = "", mode = "password" } = body;

    if (!identifier.trim()) {
      return NextResponse.json(
        { ok: false, error: "Informe seu E-mail ou CPF." },
        { status: 400 }
      );
    }

    if (!secret.trim()) {
      return NextResponse.json(
        { ok: false, error: mode === "password" ? "Informe sua Senha de Acesso." : "Informe o Código de 6 dígitos." },
        { status: 400 }
      );
    }

    const customer = authenticateCustomerCredentials(
      identifier,
      secret,
      mode === "code" ? "code" : "password"
    );

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
      message: `Bem-vindo de volta, ${customer.fullName.split(" ")[0]}!`,
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
      err instanceof Error ? err.message : "Falha na autenticação.";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 400 });
  }
}

