import { NextRequest, NextResponse } from "next/server";
import { authenticatedCustomer } from "@/lib/customerSession";
import { checkoutDb } from "@/lib/checkout";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const customer = await authenticatedCustomer(request);
  if (!customer) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401, headers });
  const page = Number(request.nextUrl.searchParams.get("page") || "1");
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
    return NextResponse.json({ error: "Página inválida." }, { status: 400, headers });
  }
  try {
    const db = await checkoutDb();
    const { rows } = await db.query(
      `SELECT * FROM (
        SELECT o.id::text AS id, o.voucher AS reference, o.state,
          b.reservation_status AS reservation_status,
          o.payload->'booking'->>'hotelName' AS hotel_name,
          o.payload->'booking'->>'roomName' AS room_name,
          o.payload->'booking'->>'checkInDate' AS check_in,
          o.payload->>'checkOut' AS check_out,
          o.amount_cents, o.created_at,
          (o.state = 'confirmed' AND o.voucher IS NOT NULL AND o.payment->>'status' = 'approved'
            AND COALESCE(b.reservation_status, 'CONFIRMED') <> 'CANCELLED') AS can_download
        FROM checkout_orders o
        LEFT JOIN bookings b ON b.booking_code = o.id::text AND b.owner_member_code = $1 AND LOWER(b.primary_email) = $2
        WHERE o.customer_id = $1 AND o.customer_email = $2 AND o.state <> 'quoted'
        UNION ALL
        SELECT b.booking_code, b.hotelbeds_reference, 'confirmed', b.reservation_status,
          b.hotel_name, b.room_name, b.check_in_date::text,
          (b.check_in_date + b.nights_count)::text,
          ROUND(b.total_amount_brl * 100)::int, b.created_at, false
        FROM bookings b WHERE b.owner_member_code = $1 AND LOWER(b.primary_email) = $2
          AND NOT EXISTS (SELECT 1 FROM checkout_orders o WHERE o.id::text = b.booking_code)
      ) AS history ORDER BY created_at DESC, id DESC LIMIT 11 OFFSET $3`,
      [customer.id, customer.email.toLowerCase(), (page - 1) * 10]);
    const bookings = rows.slice(0, 10).map((row) => ({
      id: row.id, reference: row.reference, state: row.state,
      status: row.reservation_status === "CANCELLED" ? "cancelled" : row.state,
      hotelName: row.hotel_name, roomName: row.room_name,
      checkIn: row.check_in, checkOut: row.check_out, amount: row.amount_cents / 100,
      canDownload: row.can_download,
    }));
    return NextResponse.json({ bookings, page, hasMore: rows.length > 10 }, { headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar suas reservas." }, { status: 503, headers });
  }
}
