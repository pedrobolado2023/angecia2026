import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionProfile, syncCustomerToLocalStore, CustomerCRMRecord } from "@/lib/customerStore";
import { findCustomerInPostgres } from "@/lib/postgres";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("hospede_customer_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ ok: true, authenticated: false });
    }

    let sessionData: { customerId?: string; email?: string } = {};
    try {
      const decoded = Buffer.from(sessionCookie, "base64").toString("utf-8");
      sessionData = JSON.parse(decoded);
    } catch {
      return NextResponse.json({ ok: true, authenticated: false });
    }

    if (!sessionData.customerId && !sessionData.email) {
      return NextResponse.json({ ok: true, authenticated: false });
    }

    let customer: CustomerCRMRecord | null = null;

    // 1. Tenta buscar no PostgreSQL (banco de dados real do Easypanel)
    if (sessionData.customerId) {
      try {
        customer = await findCustomerInPostgres(sessionData.customerId);
      } catch {}
    }

    if (!customer && sessionData.email) {
      try {
        customer = await findCustomerInPostgres(sessionData.email);
      } catch {}
    }

    // 2. Se não encontrou no Postgres, busca no cache local JSON
    if (!customer && sessionData.customerId) {
      customer = getCustomerSessionProfile(sessionData.customerId);
    }

    if (!customer) {
      return NextResponse.json({ ok: true, authenticated: false });
    }

    // Sincroniza localmente
    try {
      syncCustomerToLocalStore(customer);
    } catch {}

    return NextResponse.json({
      ok: true,
      authenticated: true,
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
  } catch {
    return NextResponse.json({ ok: true, authenticated: false });
  }
}

