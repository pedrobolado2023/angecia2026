import { NextRequest, NextResponse } from "next/server";
import { authenticatedCustomer, publicCustomer } from "@/lib/customerSession";

export async function GET(request: NextRequest) {
  const customer = await authenticatedCustomer(request);
  return NextResponse.json(customer
    ? { ok: true, authenticated: true, customer: publicCustomer(customer) }
    : { ok: true, authenticated: false }, { headers: { "Cache-Control": "private, no-store" } });
}
