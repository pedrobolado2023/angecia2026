import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { reconcileCheckoutPayment } from "@/lib/checkout";
import { getMercadoPagoPayment, isMercadoPagoOrderId, mercadoPagoConfig } from "@/lib/mercadopago";

export async function POST(request: NextRequest) {
  const secret = mercadoPagoConfig()?.webhookSecret;
  if (!secret) return NextResponse.json({ ok: false }, { status: 503 });
  const id = request.nextUrl.searchParams.get("data.id");
  const requestId = request.headers.get("x-request-id");
  const rawSignature = request.headers.get("x-signature");
  if (!isMercadoPagoOrderId(id) || !requestId || !rawSignature) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const signature = new Map(rawSignature.split(",").map((part) => part.trim().split("=") as [string, string]));
  const timestamp = signature.get("ts");
  const digest = signature.get("v1");
  if (!timestamp || !/^\d{9,14}$/.test(timestamp) || !digest || !/^[a-f0-9]{64}$/i.test(digest)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const supplied = Buffer.from(digest, "hex");
  const expected = [id.toLowerCase(), id].map((signedId) => createHmac("sha256", secret).update(`id:${signedId};request-id:${requestId};ts:${timestamp};`).digest());
  if (!expected.some((candidate) => timingSafeEqual(candidate, supplied))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    await reconcileCheckoutPayment(await getMercadoPagoPayment(id));
    return NextResponse.json({ ok: true });
  } catch {
    console.warn("[Checkout] Falha ao conciliar notificação do Mercado Pago.");
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
