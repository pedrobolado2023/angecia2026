import { NextRequest, NextResponse } from "next/server";
import { subscribeCustomerToClub, getCustomerSessionProfile } from "@/lib/customerStore";

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("hospede_customer_session")?.value;
    let customerId = "";

    if (sessionCookie) {
      try {
        const decoded = Buffer.from(sessionCookie, "base64").toString("utf-8");
        const parsed = JSON.parse(decoded);
        customerId = parsed.customerId;
      } catch {
        // ignore
      }
    }

    const body = await request.json().catch(() => ({}));
    const targetCustomerId = body.customerId || customerId;
    const paymentMethod: "PIX" | "CARD" = body.paymentMethod === "CARD" ? "CARD" : "PIX";

    if (!targetCustomerId) {
      return NextResponse.json(
        { ok: false, error: "Faça login para contratar a assinatura de Membro VIP." },
        { status: 401 }
      );
    }

    const customer = subscribeCustomerToClub(targetCustomerId, paymentMethod);

    // Mock funcional de cobrança Mercado Pago de R$ 19,90
    const paymentData = {
      priceBRL: 19.9,
      method: paymentMethod,
      pixQrCode:
        paymentMethod === "PIX"
          ? "00020101021226880014br.gov.bcb.pix2566pix.mercadopago.com/qr/v2/hospede-club-1990520400005303986540519.905802BR5925HOSPEDE CLUB BRASIL6009SAO PAULO62070503***6304E8A2"
          : undefined,
      pixCopyPaste:
        paymentMethod === "PIX"
          ? "00020101021226880014br.gov.bcb.pix2566pix.mercadopago.com/qr/v2/hospede-club-1990520400005303986540519.905802BR5925HOSPEDE CLUB BRASIL6009SAO PAULO62070503***6304E8A2"
          : undefined,
    };

    return NextResponse.json({
      ok: true,
      message: "Assinatura do Hóspede Club (R$ 19,90/mês) ativada com sucesso!",
      membership: customer.membership,
      payment: paymentData,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Erro ao processar assinatura.";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 400 });
  }
}
