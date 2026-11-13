import { NextRequest, NextResponse } from "next/server";
import { getHotelbedsBookingDetail, cancelHotelbedsBooking } from "@/lib/hotelbeds";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reference: string }> }
) {
  const { reference } = await context.params;
  if (!reference) {
    return NextResponse.json({ error: "Código de referência é obrigatório" }, { status: 400 });
  }

  const result = await getHotelbedsBookingDetail(reference);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
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

  const result = await cancelHotelbedsBooking(reference, flag);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

