import { NextRequest, NextResponse } from "next/server";
import { renderBookingVoucher } from "@/lib/bookingVoucher";
import { authenticatedCustomer } from "@/lib/customerSession";
import { checkoutDb, getCheckoutOrder, isOrderId, refreshVoucherDetails } from "@/lib/checkout";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const customer = await authenticatedCustomer(request);
  if (!customer) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401, headers });
  const orderId = request.nextUrl.searchParams.get("orderId");
  if (!isOrderId(orderId)) return NextResponse.json({ error: "Pedido inválido." }, { status: 400, headers });

  try {
    const order = await getCheckoutOrder(orderId, customer);
    if (!order?.voucher || order.state !== "confirmed" || order.payment?.status !== "approved") {
      return NextResponse.json({ error: "Voucher indisponível." }, { status: 404, headers });
    }
    const updated = await refreshVoucherDetails(order).catch(() => order);
    const db = await checkoutDb();
    const cancelled = await db.query(
      "SELECT 1 FROM bookings WHERE booking_code = $1 AND owner_member_code = $2 AND reservation_status = 'CANCELLED'",
      [order.id, customer.id]);
    if (cancelled.rowCount) return NextResponse.json({ error: "A reserva está cancelada." }, { status: 409, headers });
    const pdf = await renderBookingVoucher(updated);
    return new NextResponse(new Uint8Array(pdf), { headers: {
      ...headers, "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="voucher-${orderId}.pdf"`,
    } });
  } catch {
    return NextResponse.json({ error: "Não foi possível gerar o voucher no momento." }, { status: 503, headers });
  }
}
