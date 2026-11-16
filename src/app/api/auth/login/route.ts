import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomerCredentials, syncCustomerToLocalStore } from "@/lib/customerStore";
import { authenticateCustomerInPostgres, getPostgresPool } from "@/lib/postgres";
import { customerSessionConfigured, publicCustomer, setCustomerSession } from "@/lib/customerSession";

export async function POST(request: NextRequest) {
  if (!customerSessionConfigured()) {
    return NextResponse.json({ ok: false, error: "Login temporariamente indisponível." }, { status: 503 });
  }
  try {
    const { identifier, secret, mode } = await request.json();
    if (typeof identifier !== "string" || !identifier.trim() || identifier.length > 254 ||
        typeof secret !== "string" || !secret.trim() || secret.length > 256) {
      return NextResponse.json({ ok: false, error: "Confira os dados de acesso." }, { status: 400 });
    }
    const strategy = mode === "code" ? "code" : "password";
    const customer = getPostgresPool()
      ? await authenticateCustomerInPostgres(identifier, secret, strategy)
      : authenticateCustomerCredentials(identifier, secret, strategy);
    if (getPostgresPool()) {
      try { syncCustomerToLocalStore(customer); } catch { /* O banco é a fonte de autenticação. */ }
    }
    const response = NextResponse.json({ ok: true, customer: publicCustomer(customer) },
      { headers: { "Cache-Control": "private, no-store" } });
    setCustomerSession(response, customer);
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: "Credenciais inválidas ou verificação pendente." }, { status: 401 });
  }
}
