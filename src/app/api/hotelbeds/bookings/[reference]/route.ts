import { NextRequest, NextResponse } from "next/server";
import { getHotelbedsBookingDetail, cancelHotelbedsBooking } from "@/lib/hotelbeds";

import { authenticatedCustomer } from "@/lib/customerSession";
import { ownsHotelbedsBooking, saveHotelbedsReservationStatus } from "@/lib/postgres";
import { getServerOmnibeesConfig } from "@/lib/serverEnv";
import { timingSafeEqual } from "node:crypto";

async function checkAccess(request: NextRequest, reference: string) {
  const expected = getServerOmnibeesConfig().adminSessionSecret;
  const adminCookie = request.cookies.get("hospede_admin_session")?.value ||
    request.cookies.get("velluto_admin_session")?.value;
  if (expected && adminCookie) {
    const actual = Buffer.from(adminCookie);
    const secret = Buffer.from(expected);
    if (actual.length === secret.length && timingSafeEqual(actual, secret)) return null;
  }
  const customer = await authenticatedCustomer(request);
  if (!customer) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  try {
    if (await ownsHotelbedsBooking(reference, customer.id, customer.email)) return null;
    return NextResponse.json({ error: "Reserva não encontrada." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Consulta temporariamente indisponível." }, { status: 503 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reference: string }> }
) {
  const { reference } = await context.params;
  if (!reference) {
    return NextResponse.json({ error: "Código de referência é obrigatório" }, { status: 400 });
  }

  const denied = await checkAccess(request, reference);
  if (denied) return denied;

  const result = await getHotelbedsBookingDetail(reference);
  if (result.ok && !result.isSimulation && result.booking?.reference === reference && result.booking?.status) {
    await saveHotelbedsReservationStatus(reference, result.booking.status);
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400, headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ reference: string }> }
) {
  const { reference } = await context.params;
  if (!reference) {
    return NextResponse.json({ error: "Código de referência é obrigatório" }, { status: 400 });
  }

  const url = new URL(request.url);
  const flag = url.searchParams.get("cancellationFlag") === "SIMULATION" ? "SIMULATION" : "CANCELLATION";

  const denied = await checkAccess(request, reference);
  if (denied) return denied;

  const result = await cancelHotelbedsBooking(reference, flag);
  if (flag === "CANCELLATION" && result.ok && !result.isSimulation && result.status === "CANCELLED") {
    await saveHotelbedsReservationStatus(reference, "CANCELLED");
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400, headers: { "Cache-Control": "private, no-store" } });
}

