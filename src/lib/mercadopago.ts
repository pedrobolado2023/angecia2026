import "server-only";

export type MercadoPagoPayment = {
  id: string;
  status: string;
  method: string;
  externalReference: string;
  amountCents: number;
  currency: string;
  pix?: { qrCode: string; qrCodeBase64: string; ticketUrl?: string; expiresAt?: string };
};

type PaymentInput = {
  orderId: string;
  amountCents: number;
  description: string;
  method: "pix" | "card";
  installments: number;
  email: string;
  cpf: string;
  card?: { token: string; methodId: string; issuerId?: string };
};

export class MercadoPagoError extends Error {
  constructor(public status: number) {
    super(`Mercado Pago retornou HTTP ${status}.`);
  }
}

export function checkoutPaymentConfigured() {
  const { CHECKOUT_MODE, HOTELBEDS_ENVIRONMENT, HOTELBEDS_ENDPOINT_URL, HOTELBEDS_API_KEY, HOTELBEDS_SECRET,
    MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_WEBHOOK_SECRET } = process.env;
  if (!MERCADOPAGO_ACCESS_TOKEN || !MERCADOPAGO_WEBHOOK_SECRET || !HOTELBEDS_API_KEY || !HOTELBEDS_SECRET) return false;
  if (HOTELBEDS_ENDPOINT_URL && process.env.NODE_ENV === "production") {
    const endpoint = CHECKOUT_MODE === "live" ? "https://api.hotelbeds.com" : "https://api.test.hotelbeds.com";
    if (HOTELBEDS_ENDPOINT_URL.replace(/\/+$/, "") !== endpoint) return false;
  }
  if (CHECKOUT_MODE === "test") {
    return HOTELBEDS_ENVIRONMENT === "test" && MERCADOPAGO_ACCESS_TOKEN.startsWith("TEST-");
  }
  return CHECKOUT_MODE === "live" && HOTELBEDS_ENVIRONMENT === "production" &&
    MERCADOPAGO_ACCESS_TOKEN.startsWith("APP_USR-");
}

async function mercadoPagoRequest(path: string, init: RequestInit = {}) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Pagamento temporariamente indisponível.");
  const base = process.env.NODE_ENV !== "production" ? process.env.MERCADOPAGO_TEST_API_URL : undefined;
  const response = await fetch(`${base || "https://api.mercadopago.com"}${path}`, {
    ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) throw new MercadoPagoError(response.status);
  return response.json();
}

function normalizePayment(data: any): MercadoPagoPayment {
  if (!data?.id || typeof data.status !== "string" || typeof data.external_reference !== "string") {
    throw new Error("Resposta de pagamento incompleta.");
  }
  const transaction = data.point_of_interaction?.transaction_data;
  const pix = typeof transaction?.qr_code === "string" && typeof transaction?.qr_code_base64 === "string"
    ? {
      qrCode: transaction.qr_code,
      qrCodeBase64: transaction.qr_code_base64,
      ticketUrl: transaction.ticket_url,
      expiresAt: data.date_of_expiration,
    } : undefined;
  return {
    id: String(data.id), status: Number(data.transaction_amount_refunded || 0) > 0 ? "refunded" : data.status,
    method: data.payment_method_id || "",
    externalReference: data.external_reference,
    amountCents: Math.round(Number(data.transaction_amount) * 100),
    currency: data.currency_id,
    pix,
  };
}

export async function createMercadoPagoPayment(input: PaymentInput) {
  if (input.method === "card" && !input.card) throw new Error("Informe um cartão válido.");
  const data = await mercadoPagoRequest("/v1/payments", {
    method: "POST",
    headers: { "X-Idempotency-Key": input.orderId },
    body: JSON.stringify({
      transaction_amount: input.amountCents / 100,
      description: input.description,
      external_reference: input.orderId,
      ...(process.env.MERCADOPAGO_NOTIFICATION_URL
        ? { notification_url: process.env.MERCADOPAGO_NOTIFICATION_URL } : {}),
      payer: { email: input.email, identification: { type: "CPF", number: input.cpf } },
      ...(input.card
        ? { payment_method_id: input.card.methodId, token: input.card.token, issuer_id: input.card.issuerId, installments: input.installments }
        : { payment_method_id: "pix", date_of_expiration: new Date(Date.now() + 31 * 60 * 1000).toISOString() }),
    }),
  });
  return normalizePayment(data);
}

export async function getMercadoPagoPayment(id: string) {
  if (!/^\d{1,30}$/.test(id)) throw new Error("Identificador de pagamento inválido.");
  return normalizePayment(await mercadoPagoRequest(`/v1/payments/${id}`));
}

export async function findMercadoPagoPayment(orderId: string) {
  const params = new URLSearchParams({ external_reference: orderId, sort: "date_created", criteria: "desc", limit: "1" });
  const data = await mercadoPagoRequest(`/v1/payments/search?${params}`);
  const match = data.results?.find((item: any) => item.external_reference === orderId);
  return match ? normalizePayment(match) : null;
}
