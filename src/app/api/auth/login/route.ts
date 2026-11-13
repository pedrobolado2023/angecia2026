import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomerCredentials, syncCustomerToLocalStore, CustomerCRMRecord } from "@/lib/customerStore";
import { authenticateCustomerInPostgres } from "@/lib/postgres";

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

    let customer: CustomerCRMRecord | null = null;
    let authError: string | null = null;

    // 1. Tenta autenticar diretamente no PostgreSQL (banco de dados oficial)
    try {
      customer = await authenticateCustomerInPostgres(
        identifier,
        secret,
        mode === "code" ? "code" : "password"
      );
    } catch (pgErr) {
      authError = pgErr instanceof Error ? pgErr.message : "Erro na autenticação PostgreSQL";
    }

    // 2. Se não encontrou no PostgreSQL, tenta autenticar no store local (contingência)
    if (!customer) {
      try {
        customer = authenticateCustomerCredentials(
          identifier,
          secret,
          mode === "code" ? "code" : "password"
        );
        authError = null;
      } catch (jsonErr) {
        if (!authError) {
          authError = jsonErr instanceof Error ? jsonErr.message : "Falha na autenticação.";
        }
      }
    }

    if (!customer) {
      return NextResponse.json({ ok: false, error: authError || "Credenciais inválidas." }, { status: 400 });
    }

    // Sincroniza bidirecionalmente no cache local
    try {
      syncCustomerToLocalStore(customer);
    } catch {}

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

