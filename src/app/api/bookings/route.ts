import { NextRequest, NextResponse } from "next/server";
import { authenticatedCustomer } from "@/lib/customerSession";
import { CheckoutError, checkoutDb, checkoutResponse, createCheckoutQuote, getCheckoutOrder, isOrderId, reconcileCheckoutPayment, type CheckoutOrder } from "@/lib/checkout";
import { checkoutPaymentConfigured, createMercadoPagoPayment, findMercadoPagoPayment, getMercadoPagoPayment, mercadoPagoConfig, MercadoPagoError } from "@/lib/mercadopago";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const customer = await authenticatedCustomer(request);
  if (!customer) return json({ error: "Entre na sua conta para reservar." }, 401);
  const config = mercadoPagoConfig();
  if (!config || !checkoutPaymentConfigured()) return json({ error: "Pagamento temporariamente indisponível." }, 503);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || ["cardNumber", "cardExpiry", "cardCvv", "securityCode"].some((field) => Object.hasOwn(body, field))) {
    return json({ error: "Dados de pagamento inválidos." }, 400);
  }

  try {
    if (body.action === "quote") {
      if (body.paymentModality === "CARD" && !config.publicKey) {
        return json({ error: "Cartão temporariamente indisponível. Se preferir, selecione Pix." }, 503);
      }
      const order = await createCheckoutQuote(customer, body, config.mode);
      return json({ ...checkoutResponse(order), publicKey: order.payload.method === "card" ? config.publicKey : undefined });
    }
    if (body.action !== "pay" || !isOrderId(body.orderId)) return json({ error: "Cotação inválida." }, 400);
    const order = await getCheckoutOrder(body.orderId, customer);
    if (!order) return json({ error: "Cotação não encontrada." }, 404);
    if (order.state !== "quoted") return json(checkoutResponse(order));
    if (order.payload.mode !== config.mode) return json({ error: "Cotação expirada. Confira novamente o preço." }, 409);
    if (new Date(order.expires_at).getTime() <= Date.now()) return json({ error: "Cotação expirada. Confira novamente o preço." }, 409);
    let card;
    if (order.payload.method === "card") {
      const { token, methodId } = body.card || {};
      if (typeof token !== "string" || !/^[a-z0-9_-]{10,256}$/i.test(token) ||
          typeof methodId !== "string" || !/^[a-z0-9_-]{1,32}$/i.test(methodId) || methodId === "pix") {
        return json({ error: "Confira os dados do cartão no formulário." }, 400);
      }
      card = { token, methodId };
    }
    const db = await checkoutDb();
    const { rows: [claimed] } = await db.query<CheckoutOrder>(
      "UPDATE checkout_orders SET state = 'paying', updated_at = NOW() WHERE id = $1 AND state = 'quoted' AND expires_at > NOW() RETURNING *",
      [order.id]
    );
    if (!claimed) {
      const current = await getCheckoutOrder(order.id, customer);
      return current && current.state !== "quoted" ? json(checkoutResponse(current)) :
        json({ error: "Cotação expirada. Confira novamente o preço." }, 409);
    }
    try {
      const booking = claimed.payload.booking;
      const payment = await createMercadoPagoPayment({
        orderId: claimed.id, amountCents: claimed.amount_cents,
        method: claimed.payload.method, installments: booking.installments || 1,
        email: booking.primaryEmail, cpf: booking.primaryCpf, card,
      });
      const reconciled = await reconcileCheckoutPayment(payment);
      return json(checkoutResponse(reconciled || claimed));
    } catch (error) {
      if (error instanceof MercadoPagoError && [400, 401, 403, 404, 422].includes(error.status)) {
        const { rows: [rejected] } = await db.query<CheckoutOrder>(
          "UPDATE checkout_orders SET state = 'rejected', updated_at = NOW() WHERE id = $1 AND state = 'paying' RETURNING *", [claimed.id]
        );
        if (rejected) return json(checkoutResponse(rejected));
      }
      console.warn("[Checkout] Cobrança aguardando reconciliação.", claimed.id);
      return json(checkoutResponse(claimed), 202);
    }
  } catch (error) {
    if (error instanceof CheckoutError) return json({ error: error.message }, error.status);
    console.error("[Checkout] Não foi possível concluir a operação.");
    return json({ error: "Checkout temporariamente indisponível." }, 503);
  }
}

export async function GET(request: NextRequest) {
  const customer = await authenticatedCustomer(request);
  if (!customer) return json({ error: "Entre na sua conta." }, 401);
  const id = request.nextUrl.searchParams.get("orderId");
  if (!isOrderId(id)) return json({ error: "Pedido inválido." }, 400);
  try {
    const order = await getCheckoutOrder(id, customer);
    if (!order) return json({ error: "Pedido não encontrado." }, 404);
    if (order.payload.mode === mercadoPagoConfig()?.mode && (order.state === "paying" || order.state === "pending")) {
      try {
        const payment = order.payment_id ? await getMercadoPagoPayment(order.payment_id) : await findMercadoPagoPayment(id, new Date(order.created_at).toISOString());
        if (payment) {
          const updated = await reconcileCheckoutPayment(payment);
          if (updated?.id === order.id) return json(checkoutResponse(updated));
        }
      } catch {
        // A notificação também pode conciliar o pagamento em seguida.
      }
    }
    return json(checkoutResponse(order));
  } catch {
    return json({ error: "Consulta temporariamente indisponível." }, 503);
  }
}
