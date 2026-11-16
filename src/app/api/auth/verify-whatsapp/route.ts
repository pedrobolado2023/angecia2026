import { NextRequest, NextResponse } from "next/server";
import { verifyWhatsAppVerificationCode, syncCustomerToLocalStore } from "@/lib/customerStore";
import { authenticateCustomerInPostgres, getPostgresPool } from "@/lib/postgres";
import { customerSessionConfigured, publicCustomer, setCustomerSession } from "@/lib/customerSession";

export async function POST(request: NextRequest) {
  if (!customerSessionConfigured()) {
    return NextResponse.json({ ok: false, error: "Verificação temporariamente indisponível." }, { status: 503 });
  }

  try {
    const { identifier, code } = await request.json();
    if (typeof identifier !== "string" || !identifier.trim() || identifier.length > 254 ||
        typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
      return NextResponse.json({ ok: false, error: "Informe o código de seis dígitos." }, { status: 400 });
    }
    const customer = getPostgresPool()
      ? await authenticateCustomerInPostgres(identifier, code, "code")
      : verifyWhatsAppVerificationCode(identifier, code);
    if (getPostgresPool()) {
      try { syncCustomerToLocalStore(customer); } catch { /* O banco é a fonte de autenticação. */ }
    }
    const response = NextResponse.json({ ok: true, message: "WhatsApp verificado com sucesso.", customer: publicCustomer(customer) },
      { headers: { "Cache-Control": "private, no-store" } });
    setCustomerSession(response, customer);
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: "Código inválido, expirado ou com limite de tentativas atingido." }, { status: 401 });
  }
}
