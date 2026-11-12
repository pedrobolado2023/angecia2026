import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionProfile } from "@/lib/customerStore";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("hospede_customer_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ ok: true, authenticated: false });
    }

    let sessionData: { customerId?: string } = {};
    try {
      const decoded = Buffer.from(sessionCookie, "base64").toString("utf-8");
      sessionData = JSON.parse(decoded);
    } catch {
      return NextResponse.json({ ok: true, authenticated: false });
    }

    if (!sessionData.customerId) {
      return NextResponse.json({ ok: true, authenticated: false });
    }

    const customer = getCustomerSessionProfile(sessionData.customerId);
    if (!customer) {
      return NextResponse.json({ ok: true, authenticated: false });
    }

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
