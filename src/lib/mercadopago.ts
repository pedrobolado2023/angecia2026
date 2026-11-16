import "server-only";
import QRCode from "qrcode";

export type CheckoutMode = "test" | "live";

export type MercadoPagoPayment = {
  id: string;
  status: string;
  mode: CheckoutMode;
  method: string;
  externalReference: string;
  amountCents: number;
  currency: string;
  pix?: { qrCode: string; qrCodeBase64: string; ticketUrl?: string; expiresAt?: string };
};

type PaymentInput = {
  orderId: string;
  amountCents: number;
  method: "pix" | "card";
  installments: number;
  email: string;
  cpf: string;
  card?: { token: string; methodId: string };
};

export class MercadoPagoError extends Error {
  constructor(public status: number) {
    super(`Mercado Pago retornou HTTP ${status}.`);
  }
}

export function mercadoPagoConfig() {
  const mode = process.env.CHECKOUT_MODE;
  if (mode !== "test" && mode !== "live") return null;
  return {
    mode: mode as CheckoutMode,
    accessToken: mode === "test" ? process.env.MERCADOPAGO_TEST_ACCESS_TOKEN : process.env.MERCADOPAGO_ACCESS_TOKEN,
    publicKey: mode === "test" ? process.env.MERCADOPAGO_TEST_PUBLIC_KEY : process.env.MERCADOPAGO_PUBLIC_KEY,
    webhookSecret: mode === "test" ? process.env.MERCADOPAGO_TEST_WEBHOOK_SECRET : process.env.MERCADOPAGO_WEBHOOK_SECRET,
  };
}

export function checkoutPaymentConfigured() {
  const config = mercadoPagoConfig();
  const { HOTELBEDS_ENVIRONMENT, HOTELBEDS_ENDPOINT_URL, HOTELBEDS_API_KEY, HOTELBEDS_SECRET } = process.env;
  if (!config?.accessToken || !config.webhookSecret || !HOTELBEDS_API_KEY || !HOTELBEDS_SECRET) return false;
  const live = config.mode === "live";
  if (HOTELBEDS_ENVIRONMENT !== (live ? "production" : "test")) return false;
  if (HOTELBEDS_ENDPOINT_URL && process.env.NODE_ENV === "production") {
    const endpoint = live ? "https://api.hotelbeds.com" : "https://api.test.hotelbeds.com";
    if (HOTELBEDS_ENDPOINT_URL.replace(/\/+$/, "") !== endpoint) return false;
  }
  return true;
}

export function isMercadoPagoOrderId(id: unknown): id is string {
  return typeof id === "string" && /^ORD[A-Z0-9]{10,70}$/i.test(id);
}

async function mercadoPagoRequest(path: string, init: RequestInit = {}) {
  const config = mercadoPagoConfig();
  if (!config?.accessToken) throw new Error("Pagamento temporariamente indisponível.");
  const base = config.mode === "test" && process.env.NODE_ENV !== "production"
    ? process.env.MERCADOPAGO_TEST_API_URL : undefined;
  const response = await fetch(`${base || "https://api.mercadopago.com"}${path}`, {
    ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) throw new MercadoPagoError(response.status);
  return { data: await response.json(), mode: config.mode };
}

function cents(amount: unknown) {
  if (typeof amount !== "string" || !/^\d+(\.\d{1,2})?$/.test(amount)) return NaN;
  return Math.round(Number(amount) * 100);
}

async function normalizePayment(data: any, mode: CheckoutMode): Promise<MercadoPagoPayment> {
  if (!isMercadoPagoOrderId(data?.id) || data.type !== "online" ||
      typeof data.status !== "string" || typeof data.external_reference !== "string" ||
      (typeof data.live_mode === "boolean" && data.live_mode !== (mode === "live"))) {
    throw new Error("Resposta de pagamento incompatível.");
  }
  const payments = data.transactions?.payments;
  const payment = Array.isArray(payments) && payments.length === 1 ? payments[0] : undefined;
  const paymentMethod = payment?.payment_method;
  const method = paymentMethod?.id === "pix" && paymentMethod.type === "bank_transfer" ? "pix" :
    paymentMethod?.type === "credit_card" && paymentMethod.id !== "pix" && paymentMethod.id ? "card" : "";
  const amountCents = cents(data.total_amount);
  const currency = data.currency_id ?? data.currency ?? (data.country_code === "BRA" ? "BRL" : "");
  const refunded = Boolean(data.transactions?.refunds?.length) || [data.status, payment?.status].includes("refunded");
  let status = "review";
  if (!refunded && data.status === "processed" && data.status_detail === "accredited" &&
      payment?.status === "processed" && payment.status_detail === "accredited" &&
      cents(data.total_paid_amount) === amountCents && cents(payment.paid_amount) === amountCents) {
    status = "approved";
  } else if (!refunded && ["created", "processing", "pending", "action_required"].includes(data.status)) {
    status = "pending";
  } else if (!refunded && ["failed", "canceled", "expired"].includes(data.status)) {
    status = "rejected";
  }

  let pix;
  const qrCode = paymentMethod?.qr_code;
  if (method === "pix" && status === "pending" && typeof qrCode === "string" && qrCode.length <= 2048 && qrCode) {
    const qrCodeBase64 = (await QRCode.toDataURL(qrCode)).split(",")[1];
    pix = { qrCode, qrCodeBase64 };
  }
  return {
    id: data.id, status, mode, method, currency, externalReference: data.external_reference,
    amountCents: cents(payment?.amount) === amountCents ? amountCents : NaN,
    pix,
  };
}

export async function createMercadoPagoPayment(input: PaymentInput) {
  if (input.method === "card" && !input.card) throw new Error("Informe um cartão válido.");
  const amount = (input.amountCents / 100).toFixed(2);
  const payer = input.method === "pix" && mercadoPagoConfig()?.mode === "test"
    ? { email: "test_payer@example.com", first_name: "APRO" }
    : { email: input.email, identification: { type: "CPF", number: input.cpf } };
  const payment = input.method === "card" && input.card
    ? { amount, payment_method: { id: input.card.methodId, type: "credit_card", token: input.card.token, installments: input.installments } }
    : { amount, expiration_time: "PT31M", payment_method: { id: "pix", type: "bank_transfer" } };
  const { data, mode } = await mercadoPagoRequest("/v1/orders", {
    method: "POST",
    headers: { "X-Idempotency-Key": input.orderId },
    body: JSON.stringify({
      type: "online", processing_mode: "automatic", external_reference: input.orderId,
      total_amount: amount, payer, transactions: { payments: [payment] },
    }),
  });
  return normalizePayment(data, mode);
}

export async function getMercadoPagoPayment(id: string) {
  if (!isMercadoPagoOrderId(id)) throw new Error("Identificador de pagamento inválido.");
  const { data, mode } = await mercadoPagoRequest(`/v1/orders/${id}`);
  return normalizePayment(data, mode);
}

export async function findMercadoPagoPayment(orderId: string, createdAt: string) {
  const params = new URLSearchParams({
    external_reference: orderId, type: "online", page_size: "10",
    begin_date: new Date(new Date(createdAt).getTime() - 60000).toISOString(),
    end_date: new Date().toISOString(),
  });
  const { data } = await mercadoPagoRequest(`/v1/orders?${params}`);
  const results: unknown = data.data;
  if (!Array.isArray(results)) return null;
  const matches = results.filter((item) => item?.external_reference === orderId);
  return matches.length === 1 && isMercadoPagoOrderId(matches[0].id) ? getMercadoPagoPayment(matches[0].id) : null;
}
